// src/components/WageLevelDisplay.tsx
'use client'

import { ExternalLink, Info, DollarSign, TrendingUp } from 'lucide-react'

interface WageLevelDisplayProps {
    oflc: {
        available: boolean
        wageYear: number | null
        levels: {
            level1: { hourly: number | null; annual: number } | null
            level2: { hourly: number | null; annual: number } | null
            level3: { hourly: number | null; annual: number } | null
            level4: { hourly: number | null; annual: number } | null
        } | null
        sourceUrl: string
        ingestedAt: string
    }
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
        ingestedAt: string
    }
    socCode: string
    location: string
}

export function WageLevelDisplay({ oflc, oews, socCode, location }: WageLevelDisplayProps) {
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'N/A'
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="grid md:grid-cols-2 gap-6">
            {/* OFLC Prevailing Wages */}
            <div className="card">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="section-header text-base">
                            <DollarSign className="w-5 h-5" strokeWidth={1.5} />
                            OFLC Prevailing Wages
                        </h3>
                        <p className="text-xs mt-1 text-foreground-subtle">
                            For LCA filings • {oflc.wageYear || 'N/A'} wage year
                        </p>
                    </div>
                    <a
                        href={oflc.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-badge"
                    >
                        <ExternalLink className="w-3 h-3" strokeWidth={2} />
                        DOL FLAG
                    </a>
                </div>

                {oflc.available && oflc.levels ? (
                    <div className="space-y-3">
                        {[
                            { key: 'level1', label: 'Level I', desc: 'Entry', data: oflc.levels.level1, entries: 1 },
                            { key: 'level2', label: 'Level II', desc: 'Qualified', data: oflc.levels.level2, entries: 2 },
                            { key: 'level3', label: 'Level III', desc: 'Experienced', data: oflc.levels.level3, entries: 3 },
                            { key: 'level4', label: 'Level IV', desc: 'Fully Competent', data: oflc.levels.level4, entries: 4 }
                        ].map(level => (
                            <div key={level.key} className={`wage-level wage-level-${level.entries}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground">{level.label}</span>
                                        <span className="text-xs text-foreground-subtle">({level.desc})</span>
                                    </div>
                                    <div className="text-lg font-semibold text-foreground">
                                        {formatCurrency(level.data?.annual || null)}
                                    </div>
                                </div>
                                <div
                                    className="text-right px-2 py-1 rounded text-xs font-medium bg-accent text-primary"
                                >
                                    {level.entries}× weight
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 rounded-lg text-center bg-secondary">
                        <p className="text-muted-foreground">No OFLC wage data available for this location/occupation.</p>
                    </div>
                )}

                <div className="mt-4 p-3 rounded-lg border text-xs bg-secondary border-border">
                    <Info className="inline w-3.5 h-3.5 mr-1.5 text-primary" strokeWidth={2} />
                    <span className="text-muted-foreground">
                        These are the official prevailing wages for H-1B LCA filings.
                        Last updated: {new Date(oflc.ingestedAt).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* BLS OEWS Market Wages */}
            <div className="card">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="section-header text-base">
                            <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
                            BLS OEWS Market Wages
                        </h3>
                        <p className="text-xs mt-1 text-foreground-subtle">
                            For context only • May {oews.year || 'N/A'} release
                        </p>
                    </div>
                    <a
                        href={oews.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-badge"
                    >
                        <ExternalLink className="w-3 h-3" strokeWidth={2} />
                        BLS
                    </a>
                </div>

                {oews.available && oews.wages ? (
                    <div className="space-y-4">
                        {/* Distribution visualization */}
                        <div className="p-4 rounded-lg bg-secondary">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-muted-foreground">Wage Distribution</span>
                                <span className="text-xs text-foreground-subtle">
                                    {oews.employment?.toLocaleString()} employed
                                </span>
                            </div>

                            {/* Percentile bars */}
                            <div className="space-y-2">
                                {[
                                    { label: '10th', value: oews.wages.p10, width: '20%' },
                                    { label: '25th', value: oews.wages.p25, width: '35%' },
                                    { label: '50th (Median)', value: oews.wages.p50, width: '50%' },
                                    { label: '75th', value: oews.wages.p75, width: '70%' },
                                    { label: '90th', value: oews.wages.p90, width: '90%' }
                                ].map(p => (
                                    <div key={p.label} className="flex items-center gap-3">
                                        <span className="w-24 text-xs text-muted-foreground">{p.label}</span>
                                        <div className="flex-1 h-2 rounded-full bg-border">
                                            <div
                                                className="h-full rounded-full bg-primary"
                                                style={{ width: p.width }}
                                            />
                                        </div>
                                        <span className="w-20 text-right text-xs font-medium text-foreground">
                                            {formatCurrency(p.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mean wage */}
                        <div
                            className="flex items-center justify-between p-3 rounded-lg border bg-card border-border"
                        >
                            <span className="text-sm font-medium text-foreground">Mean (Average)</span>
                            <span className="text-lg font-semibold text-primary">
                                {formatCurrency(oews.wages.mean)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-lg text-center bg-secondary">
                        <p className="text-muted-foreground">No OEWS wage data available for this location/occupation.</p>
                    </div>
                )}

                <div
                    className="mt-4 p-3 rounded-lg border text-xs text-warning bg-warning-bg border-warning/20"
                >
                    <Info className="inline w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                    These are market statistics only—NOT for LCA filings. Use OFLC wages for H-1B applications.
                </div>
            </div>
        </div>
    )
}
