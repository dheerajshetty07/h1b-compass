// src/app/api/soc-match/route.ts
// SOC Matching API - Returns top 3 matches with explainability
// Applies gating when confidence is too low

import { NextRequest, NextResponse } from 'next/server'
import { matchSoc } from '@/lib/soc-matcher'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { jobTitle, jobDescription } = body

        if (!jobTitle || typeof jobTitle !== 'string') {
            return NextResponse.json(
                { error: 'jobTitle is required' },
                { status: 400 }
            )
        }

        // Perform SOC matching
        const result = await matchSoc(jobTitle, jobDescription)

        return NextResponse.json({
            matches: result.matches.map(m => ({
                socCode: m.socCode,
                onetSocCode: m.onetSocCode,
                title: m.title,
                description: m.description,
                confidence: m.confidence,
                matchedKeywords: m.matchedKeywords,
                matchSource: m.matchSource,
                // Explainability
                whyMatched: `Matched on: ${m.matchedKeywords.slice(0, 3).join(', ')}` +
                    (m.matchedKeywords.length > 3 ? ` (+${m.matchedKeywords.length - 3} more)` : '')
            })),

            queryTerms: result.queryTerms,

            // Gating: if true, user should be warned about low confidence
            gated: result.gated,
            gateMessage: result.gated
                ? 'Low confidence match. Please verify the SOC code independently or provide more details.'
                : null,

            meta: {
                inputTitle: jobTitle,
                hasDescription: !!jobDescription,
                timestamp: new Date().toISOString()
            }
        })

    } catch (error) {
        console.error('SOC match API error:', error)
        return NextResponse.json(
            { error: 'Failed to match SOC' },
            { status: 500 }
        )
    }
}

// GET handler for testing in browser
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const jobTitle = searchParams.get('q') || searchParams.get('title')

    if (!jobTitle) {
        // Return DB stats for debugging
        const occCount = await prisma.occupation.count()
        const indexCount = await prisma.socMatchIndex.count()
        const sampleTerms = await prisma.socMatchIndex.findMany({
            take: 10,
            select: { term: true, socCode: true, tfidfWeight: true }
        })

        return NextResponse.json({
            message: 'Send a POST request with { jobTitle } to get SOC matches',
            testUrl: `/api/soc-match?q=Software+Engineer`,
            dbStats: {
                occupations: occCount,
                indexEntries: indexCount,
                sampleTerms
            }
        })
    }

    const result = await matchSoc(jobTitle)

    return NextResponse.json({
        query: jobTitle,
        matches: result.matches.map(m => ({
            socCode: m.socCode,
            onetSocCode: m.onetSocCode,
            title: m.title,
            confidence: m.confidence,
            matchedKeywords: m.matchedKeywords,
            whyMatched: `Matched on: ${m.matchedKeywords.slice(0, 3).join(', ')}`
        })),
        queryTerms: result.queryTerms,
        gated: result.gated
    })
}
