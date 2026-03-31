// src/lib/selection-simulator.ts
// H-1B Weighted Selection Simulator
// Outputs RELATIVE WEIGHTS ONLY - no percentage odds or guarantees
// Based on proposed rule: Level I=1, II=2, III=3, IV=4 entries

export interface WageLevelDistribution {
    level1Percent: number // 0-100
    level2Percent: number
    level3Percent: number
    level4Percent: number
}

export interface SelectionSimulationResult {
    userWageLevel: 1 | 2 | 3 | 4 | null
    userRelativeWeight: number // Relative to pool average

    poolDistribution: WageLevelDistribution
    poolTotalEntries: number // Weighted sum

    levelWeights: {
        level: 1 | 2 | 3 | 4
        entriesPerRegistration: number
        poolPercent: number // Percent of total weighted entries
        relativeAdvantage: string // e.g., "2x average" or "0.5x average"
    }[]

    disclaimer: string
    effectiveDate: string
}

// Calculate weighted selection simulation
// IMPORTANT: This is scenario-based - NOT a prediction of actual odds
export function simulateSelection(
    userSalary: number | null,
    oflcLevels: {
        level1: number | null
        level2: number | null
        level3: number | null
        level4: number | null
    },
    distribution: WageLevelDistribution = {
        level1Percent: 25,
        level2Percent: 35,
        level3Percent: 25,
        level4Percent: 15
    }
): SelectionSimulationResult {
    // Entry weights per registration (from proposed rule)
    const ENTRY_WEIGHTS = {
        1: 1,
        2: 2,
        3: 3,
        4: 4
    }

    // Normalize distribution to 100%
    const totalPercent = distribution.level1Percent + distribution.level2Percent +
        distribution.level3Percent + distribution.level4Percent
    const normalizedDist = {
        level1Percent: (distribution.level1Percent / totalPercent) * 100,
        level2Percent: (distribution.level2Percent / totalPercent) * 100,
        level3Percent: (distribution.level3Percent / totalPercent) * 100,
        level4Percent: (distribution.level4Percent / totalPercent) * 100
    }

    // Calculate weighted total (assuming 100 registrations for simplicity)
    const baseRegistrations = 100
    const weightedEntries = {
        level1: (normalizedDist.level1Percent / 100) * baseRegistrations * ENTRY_WEIGHTS[1],
        level2: (normalizedDist.level2Percent / 100) * baseRegistrations * ENTRY_WEIGHTS[2],
        level3: (normalizedDist.level3Percent / 100) * baseRegistrations * ENTRY_WEIGHTS[3],
        level4: (normalizedDist.level4Percent / 100) * baseRegistrations * ENTRY_WEIGHTS[4]
    }

    const totalWeightedEntries = weightedEntries.level1 + weightedEntries.level2 +
        weightedEntries.level3 + weightedEntries.level4

    // Calculate pool percentages
    const levelWeights = [1, 2, 3, 4].map(level => {
        const l = level as 1 | 2 | 3 | 4
        const poolPercent = (weightedEntries[`level${l}`] / totalWeightedEntries) * 100
        const averageWeight = totalWeightedEntries / baseRegistrations
        const advantage = ENTRY_WEIGHTS[l] / averageWeight

        return {
            level: l,
            entriesPerRegistration: ENTRY_WEIGHTS[l],
            poolPercent: Math.round(poolPercent * 10) / 10,
            relativeAdvantage: advantage >= 1
                ? `${Math.round(advantage * 10) / 10}x average`
                : `${Math.round(advantage * 100)}% of average`
        }
    }) as SelectionSimulationResult['levelWeights']

    // Determine user's wage level (if salary provided)
    let userWageLevel: 1 | 2 | 3 | 4 | null = null
    let userRelativeWeight = 1

    if (userSalary && oflcLevels.level1 && oflcLevels.level4) {
        if (userSalary >= oflcLevels.level4) {
            userWageLevel = 4
        } else if (oflcLevels.level3 && userSalary >= oflcLevels.level3) {
            userWageLevel = 3
        } else if (oflcLevels.level2 && userSalary >= oflcLevels.level2) {
            userWageLevel = 2
        } else {
            userWageLevel = 1
        }

        const averageWeight = totalWeightedEntries / baseRegistrations
        userRelativeWeight = ENTRY_WEIGHTS[userWageLevel] / averageWeight
    }

    return {
        userWageLevel,
        userRelativeWeight: Math.round(userRelativeWeight * 100) / 100,
        poolDistribution: normalizedDist,
        poolTotalEntries: Math.round(totalWeightedEntries),
        levelWeights,
        disclaimer: `⚠️ SCENARIO-BASED ANALYSIS ONLY: This shows relative selection weights based on the ` +
            `proposed wage-based selection rule (effective Feb 27, 2026). Actual selection depends on ` +
            `many factors including total registrations, exemptions, and USCIS procedures. ` +
            `Higher wage level = more entries in the selection pool. This is NOT a prediction of odds ` +
            `and should NOT be used as the sole basis for employment decisions. Consult an immigration attorney.`,
        effectiveDate: '2026-02-27'
    }
}

// Calculate which wage level a salary falls into
export function determineWageLevel(
    salary: number,
    levels: { level1: number | null, level2: number | null, level3: number | null, level4: number | null }
): { level: 1 | 2 | 3 | 4, explanation: string } {
    if (levels.level4 && salary >= levels.level4) {
        return {
            level: 4,
            explanation: `Salary $${salary.toLocaleString()} ≥ Level IV ($${levels.level4.toLocaleString()})`
        }
    }
    if (levels.level3 && salary >= levels.level3) {
        return {
            level: 3,
            explanation: `Salary $${salary.toLocaleString()} ≥ Level III ($${levels.level3.toLocaleString()})`
        }
    }
    if (levels.level2 && salary >= levels.level2) {
        return {
            level: 2,
            explanation: `Salary $${salary.toLocaleString()} ≥ Level II ($${levels.level2.toLocaleString()})`
        }
    }
    return {
        level: 1,
        explanation: `Salary $${salary.toLocaleString()} falls in Level I range`
    }
}
