// src/app/api/wages/route.ts
// Wage Lookup API - Returns OFLC (prevailing) and OEWS (market) SEPARATELY
// Strict separation: OFLC = regulatory levels I-IV, OEWS = market percentiles

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface WageResponse {
    socCode: string
    location: {
        areaCode: string
        areaType: string
        displayName: string
    }

    // OFLC Prevailing Wages (Regulatory - for LCA/H-1B)
    oflc: {
        available: boolean
        wageYear: number | null
        levels: {
            level1: { hourly: number | null, annual: number | null }
            level2: { hourly: number | null, annual: number | null }
            level3: { hourly: number | null, annual: number | null }
            level4: { hourly: number | null, annual: number | null }
        } | null
        sourceUrl: string
        ingestedAt: string | null
    }

    // OEWS Market Wages (BLS - for context only)
    oews: {
        available: boolean
        year: number | null
        wages: {
            mean: number | null
            p10: number | null
            p25: number | null
            p50: number | null
            p75: number | null
            p90: number | null
        } | null
        employment: number | null
        sourceUrl: string
        ingestedAt: string | null
    }

    disclaimer: string
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const socCode = searchParams.get('socCode')
    const areaCode = searchParams.get('areaCode')
    const oewsAreaCode = searchParams.get('oewsAreaCode') || areaCode

    if (!socCode || !areaCode) {
        return NextResponse.json(
            { error: 'socCode and areaCode are required' },
            { status: 400 }
        )
    }

    try {
        // Normalize SOC code (remove dashes, take first 7 chars)
        const normalizedSoc = socCode.replace(/-/g, '').substring(0, 7)

        // Fetch OFLC wages
        const oflcWage = await prisma.wagesOflc.findFirst({
            where: {
                socCode: normalizedSoc,
                areaCode: areaCode
            },
            orderBy: { wageYear: 'desc' },
            include: {
                ingestRun: {
                    select: { startedAt: true }
                }
            }
        })

        // Fetch OEWS wages (separate query - different data source)
        const oewsWage = await prisma.wagesOews.findFirst({
            where: {
                socCode: normalizedSoc,
                areaCode: oewsAreaCode || areaCode
            },
            orderBy: { year: 'desc' }
        })

        // Get refresh metadata
        const [oflcRefresh, oewsRefresh] = await Promise.all([
            prisma.dataRefreshLog.findUnique({ where: { dataset: 'oflc' } }),
            prisma.dataRefreshLog.findUnique({ where: { dataset: 'oews' } })
        ])

        const response: WageResponse = {
            socCode: normalizedSoc,
            location: {
                areaCode,
                areaType: oflcWage?.areaType || 'unknown',
                displayName: areaCode // Would need location lookup for full name
            },

            oflc: {
                available: !!oflcWage,
                wageYear: oflcWage?.wageYear || null,
                levels: oflcWage ? {
                    level1: {
                        hourly: oflcWage.level1Hourly ? Number(oflcWage.level1Hourly) : null,
                        annual: oflcWage.level1Annual
                    },
                    level2: {
                        hourly: oflcWage.level2Hourly ? Number(oflcWage.level2Hourly) : null,
                        annual: oflcWage.level2Annual
                    },
                    level3: {
                        hourly: oflcWage.level3Hourly ? Number(oflcWage.level3Hourly) : null,
                        annual: oflcWage.level3Annual
                    },
                    level4: {
                        hourly: oflcWage.level4Hourly ? Number(oflcWage.level4Hourly) : null,
                        annual: oflcWage.level4Annual
                    }
                } : null,
                sourceUrl: 'https://flag.dol.gov/wage-data/wage-data-downloads',
                ingestedAt: oflcWage?.ingestedAt?.toISOString() || oflcRefresh?.lastUpdated?.toISOString() || null
            },

            oews: {
                available: !!oewsWage,
                year: oewsWage?.year || null,
                wages: oewsWage ? {
                    mean: oewsWage.mean,
                    p10: oewsWage.p10,
                    p25: oewsWage.p25,
                    p50: oewsWage.p50,
                    p75: oewsWage.p75,
                    p90: oewsWage.p90
                } : null,
                employment: oewsWage?.employment || null,
                sourceUrl: 'https://www.bls.gov/oes/tables.htm',
                ingestedAt: oewsWage?.ingestedAt?.toISOString() || oewsRefresh?.lastUpdated?.toISOString() || null
            },

            disclaimer: 'OFLC wages are official DOL prevailing wage levels used for H-1B LCA filings. ' +
                'OEWS wages are BLS market statistics for context only. ' +
                'Always verify with official sources before filing.'
        }

        return NextResponse.json(response)

    } catch (error) {
        console.error('Wage API error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch wages' },
            { status: 500 }
        )
    }
}
