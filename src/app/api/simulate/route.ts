// src/app/api/simulate/route.ts
// Selection Simulation API - Returns RELATIVE WEIGHTS only
// No percentage odds or guarantees

import { NextRequest, NextResponse } from 'next/server'
import { simulateSelection, determineWageLevel } from '@/lib/selection-simulator'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            salary,
            socCode,
            areaCode,
            distribution // Optional custom distribution
        } = body

        // If SOC and area provided, fetch actual OFLC levels
        let oflcLevels = {
            level1: null as number | null,
            level2: null as number | null,
            level3: null as number | null,
            level4: null as number | null
        }

        if (socCode && areaCode) {
            const wageData = await prisma.wagesOflc.findFirst({
                where: {
                    socCode: socCode.replace(/-/g, '').substring(0, 7),
                    areaCode
                },
                orderBy: { wageYear: 'desc' }
            })

            if (wageData) {
                oflcLevels = {
                    level1: wageData.level1Annual,
                    level2: wageData.level2Annual,
                    level3: wageData.level3Annual,
                    level4: wageData.level4Annual
                }
            }
        }

        // Run simulation
        const result = simulateSelection(
            salary || null,
            oflcLevels,
            distribution
        )

        // Add wage level determination if salary provided
        let userLevelInfo = null
        if (salary && oflcLevels.level1) {
            userLevelInfo = determineWageLevel(salary, oflcLevels)
        }

        return NextResponse.json({
            simulation: {
                userWageLevel: result.userWageLevel,
                userRelativeWeight: result.userRelativeWeight,
                userLevelExplanation: userLevelInfo?.explanation || null,

                levelWeights: result.levelWeights,
                poolTotalEntries: result.poolTotalEntries
            },

            oflcLevels: oflcLevels.level1 ? {
                level1: oflcLevels.level1,
                level2: oflcLevels.level2,
                level3: oflcLevels.level3,
                level4: oflcLevels.level4,
                source: 'DOL OFLC Prevailing Wage',
                sourceUrl: 'https://flag.dol.gov/wage-data/wage-data-downloads'
            } : null,

            // CRITICAL: Strong disclaimer
            disclaimer: result.disclaimer,
            effectiveDate: result.effectiveDate,

            // Make it VERY clear this is not odds
            warning: 'IMPORTANT: This shows RELATIVE SELECTION WEIGHTS, not probabilities. ' +
                'A "2x weight" means twice as many entries in the pool, NOT twice the chance of selection. ' +
                'Actual outcomes depend on total applicants and many other factors.',

            notLegalAdvice: 'This tool is for informational purposes only and does not constitute legal advice. ' +
                'Please consult a qualified immigration attorney for guidance on your specific situation.'
        })

    } catch (error) {
        console.error('Simulation API error:', error)
        return NextResponse.json(
            { error: 'Failed to run simulation' },
            { status: 500 }
        )
    }
}
