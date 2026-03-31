// src/app/api/policies/route.ts
// Policy Documents API - Federal Register + USCIS links
// Returns paginated policies with source provenance

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const type = searchParams.get('type') // RULE | PRORULE | NOTICE
    const status = searchParams.get('status') // proposed | final | notice
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const search = searchParams.get('search')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (search) {
        where.OR = [
            { title: { contains: search } },
            { abstract: { contains: search } }
        ]
    }

    if (type && type !== 'all') {
        where.type = type
    }

    if (status) {
        where.status = status
    }

    if (tags && tags.length > 0) {
        where.OR = tags.map(tag => ({
            tags: { contains: tag }
        }))
    }

    if (dateFrom || dateTo) {
        where.publicationDate = {}
        if (dateFrom) {
            (where.publicationDate as Record<string, Date>).gte = new Date(dateFrom)
        }
        if (dateTo) {
            (where.publicationDate as Record<string, Date>).lte = new Date(dateTo)
        }
    }

    try {
        // Get policies with pagination
        const [policies, total, lastRefresh] = await Promise.all([
            prisma.policyDocument.findMany({
                where,
                orderBy: { publicationDate: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    ingestRun: {
                        select: {
                            startedAt: true,
                            sourceUrl: true
                        }
                    }
                }
            }),
            prisma.policyDocument.count({ where }),
            prisma.dataRefreshLog.findUnique({
                where: { dataset: 'federal_register' },
                select: { lastUpdated: true, status: true }
            })
        ])

        // Transform for response with provenance
        const items = policies.map(p => ({
            id: p.id,
            source: p.source,
            docNumber: p.docNumber,
            title: p.title,
            type: p.type,
            status: p.status,
            agencyNames: p.agencyNames.split(','),
            publicationDate: p.publicationDate.toISOString().split('T')[0],
            effectiveDate: p.effectiveDate?.toISOString().split('T')[0] || null,
            abstract: p.abstract,
            officialUrl: p.officialUrl,
            pdfUrl: p.pdfUrl,
            tags: p.tags ? p.tags.split(',') : [],
            impactSummary: p.impactSummary ? JSON.parse(p.impactSummary) : null,
            // Provenance info
            fetchedAt: p.fetchedAt.toISOString(),
            sourceUrl: p.ingestRun?.sourceUrl || 'https://www.federalregister.gov'
        }))

        return NextResponse.json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            meta: {
                lastUpdated: lastRefresh?.lastUpdated?.toISOString() || null,
                status: lastRefresh?.status || 'unknown',
                sourceUrl: 'https://www.federalregister.gov/api/v1/documents'
            }
        })

    } catch (error) {
        console.error('Policy API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch policies' },
            { status: 500 }
        )
    }
}
