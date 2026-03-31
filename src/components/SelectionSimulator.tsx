// src/components/SelectionSimulator.tsx
'use client'

import { useState } from 'react'
import { AlertTriangle, Info, Scale } from 'lucide-react'

interface SelectionSimulatorProps {
    oflcLevels: {
        level1: number | null
        level2: number | null
        level3: number | null
        level4: number | null
    }
}

export function SelectionSimulator({ oflcLevels }: SelectionSimulatorProps) {
    const [salary, setSalary] = useState<string>('')

    // Determine which level the salary falls into
    const getWageLevel = (salaryNum: number) => {
        if (!oflcLevels.level1 || !oflcLevels.level2 || !oflcLevels.level3 || !oflcLevels.level4) {
            return null
        }

        if (salaryNum >= oflcLevels.level4) return 4
        if (salaryNum >= oflcLevels.level3) return 3
        if (salaryNum >= oflcLevels.level2) return 2
        if (salaryNum >= oflcLevels.level1) return 1
        return 0 // Below Level I
    }

    const salaryNum = parseFloat(salary.replace(/[^0-9.]/g, ''))
    const wageLevel = !isNaN(salaryNum) ? getWageLevel(salaryNum) : null

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'N/A'
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="card space-y-6">
            {/* Header */}
            <div>
                <h2 className="section-header">
                    <Scale className="w-5 h-5" strokeWidth={1.5} />
                    Selection Weight Simulator
                </h2>
                <p className="text-sm mt-2 text-muted-foreground">
                    Under the wage-based selection rule (effective Feb 27, 2026), your wage level determines
                    how many entries you receive in the selection pool.
                </p>
            </div>

            {/* Important Disclaimer */}
            <div className="disclaimer-box">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                        <p className="font-semibold mb-1">Not a Probability Calculator</p>
                        <p className="text-sm opacity-90">
                            This shows relative selection <strong>weight</strong>, not odds or probability.
                            A Level IV position gets 4× the entries of Level I, but actual selection depends
                            on the total pool composition, which varies each year.
                        </p>
                    </div>
                </div>
            </div>

            {/* Salary Input */}
            <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                    Your Annual Salary (Offered/Expected)
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-foreground-subtle">$</span>
                    <input
                        type="text"
                        value={salary}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '')
                            setSalary(val ? parseInt(val).toLocaleString() : '')
                        }}
                        placeholder="e.g., 150,000"
                        className="input-field text-lg"
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
            </div>

            {/* Wage Level Visualization */}
            <div className="space-y-3">
                {[
                    { level: 4, label: 'Level IV', sublabel: 'Fully Competent', threshold: oflcLevels.level4, entries: 4, colorClass: 'text-success', bgClass: 'bg-card', borderClass: 'border-success' },
                    { level: 3, label: 'Level III', sublabel: 'Experienced', threshold: oflcLevels.level3, entries: 3, colorClass: 'text-purple-500', bgClass: 'bg-card', borderClass: 'border-purple-500' },
                    { level: 2, label: 'Level II', sublabel: 'Qualified', threshold: oflcLevels.level2, entries: 2, colorClass: 'text-primary', bgClass: 'bg-card', borderClass: 'border-primary' },
                    { level: 1, label: 'Level I', sublabel: 'Entry', threshold: oflcLevels.level1, entries: 1, colorClass: 'text-foreground-subtle', bgClass: 'bg-secondary', borderClass: 'border-border' }
                ].map(item => {
                    const isActive = wageLevel === item.level
                    // We need dynamic styles for the active state borders/colors if using mapped values, or we can use classes.
                    // For now, I'll simplify leveraging the isActive logic with inline consistency or classes.
                    // Given the dynamic nature of the color map previously used, I will keep some inline styles for the SPECIFIC colors 
                    // where utility classes might not cover everything (like the purple), OR I'll map them to closest theme vars.

                    // Actually, let's try to map to semantic vars where possible.
                    // Level 3 was #8B5CF6 (Violet 500). I don't have a semantic var for that. I'll use inline for that specific color or add a utility.
                    // But to be consistent with "remove inline styles", I should ideally use a class. 
                    // However, `globals.css` doesn't have a "purple" semantic token.
                    // I will leave the dynamic logic but use `var(--...)` refs where possible.

                    // Re-implementing structure:
                    return (
                        <div
                            key={item.level}
                            className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-card border-2' : 'bg-secondary border'}`}
                            style={{
                                borderColor: isActive ? (item.level === 3 ? '#8B5CF6' : item.level === 4 ? 'var(--success)' : item.level === 2 ? 'var(--primary)' : 'var(--border)') : 'var(--border)'
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Weight indicator */}
                                    <div className="flex gap-1">
                                        {[...Array(4)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-2.5 h-8 rounded-sm transition-colors"
                                                style={{
                                                    background: i < item.entries ? (item.level === 3 ? '#8B5CF6' : item.level === 4 ? 'var(--success)' : item.level === 2 ? 'var(--primary)' : 'var(--foreground-subtle)') : 'var(--border)'
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-foreground-subtle">
                                                ({item.sublabel})
                                            </span>
                                            {isActive && (
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                                    style={{
                                                        background: item.level === 3 ? '#8B5CF6' : item.level === 4 ? 'var(--success)' : item.level === 2 ? 'var(--primary)' : 'var(--foreground-subtle)'
                                                    }}
                                                >
                                                    Your Level
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm mt-0.5 text-foreground-subtle">
                                            ≥ {formatCurrency(item.threshold)}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div
                                        className="text-2xl font-bold"
                                        style={{ color: isActive ? (item.level === 3 ? '#8B5CF6' : item.level === 4 ? 'var(--success)' : item.level === 2 ? 'var(--primary)' : 'var(--foreground-muted)') : 'var(--foreground-muted)' }}
                                    >
                                        {item.entries}×
                                    </div>
                                    <div className="text-xs text-foreground-subtle">entries</div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Result Summary */}
            {wageLevel !== null && wageLevel > 0 && (
                <div
                    className="p-4 rounded-xl border text-center bg-accent border-primary"
                >
                    <p className="text-sm text-muted-foreground">
                        At <strong className="text-foreground">{formatCurrency(salaryNum)}</strong>, you would qualify for
                    </p>
                    <p className="text-3xl font-bold my-2 text-primary">
                        Level {wageLevel} • {wageLevel}× Weight
                    </p>
                    <p className="text-xs text-foreground-subtle">
                        This means {wageLevel} entries in the selection pool
                    </p>
                </div>
            )}

            {wageLevel === 0 && (
                <div
                    className="p-4 rounded-xl border text-center bg-error-bg border-error/20"
                >
                    <p className="text-sm text-error">
                        This salary is below Level I ({formatCurrency(oflcLevels.level1)}). You would need at
                        least Level I wage for a valid H-1B petition.
                    </p>
                </div>
            )}

            {/* Additional Info */}
            <div
                className="p-3 rounded-lg border text-xs bg-secondary border-border text-muted-foreground"
            >
                <Info className="inline w-3.5 h-3.5 mr-1.5 text-primary" strokeWidth={2} />
                Wage-based selection applies to cap-subject H-1B petitions only. Cap-exempt employers
                (universities, nonprofits, research institutions) are not subject to this selection process.
            </div>
        </div>
    )
}
