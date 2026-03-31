// src/app/api/soc-match/route.ts
// SOC Matching API - Returns top 3 matches with explainability
// Applies gating when confidence is too low

import { NextRequest, NextResponse } from 'next/server'
import { matchSoc } from '@/lib/soc-matcher'

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
                confidence: Math.round(m.confidence * 100), // Convert to percentage
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
