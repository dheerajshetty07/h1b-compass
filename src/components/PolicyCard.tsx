// src/components/PolicyCard.tsx
'use client'

import { ExternalLink, FileText, Calendar, Tag } from 'lucide-react'

interface PolicyCardProps {
    title: string
    type: 'RULE' | 'PRORULE' | 'NOTICE' | string
    status: string
    publicationDate: string
    effectiveDate: string | null
    abstract: string | null
    officialUrl: string
    pdfUrl: string | null
    tags: string[]
    impactSummary: { bullets: string[] } | null
    fetchedAt: string
    sourceUrl: string
}

export function PolicyCard({
    title,
    type,
    status,
    publicationDate,
    effectiveDate,
    abstract,
    officialUrl,
    pdfUrl,
    tags,
    impactSummary,
    fetchedAt,
    sourceUrl
}: PolicyCardProps) {
    const getBadgeClass = () => {
        switch (status) {
            case 'proposed': return 'badge-proposed'
            case 'final': return 'badge-final'
            case 'notice': return 'badge-notice'
            default: return 'badge'
        }
    }

    const getStatusLabel = () => {
        switch (type) {
            case 'PRORULE': return 'Proposed Rule'
            case 'RULE': return 'Final Rule'
            case 'NOTICE': return 'Notice'
            default: return type
        }
    }

    return (
        <article className="card card-hover">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <span className={getBadgeClass()}>
                    {getStatusLabel()}
                </span>
                <div className="flex items-center gap-2 text-xs text-foreground-subtle">
                    <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {publicationDate}
                </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold mb-3 leading-snug text-foreground">
                {title}
            </h3>

            {/* Impact Summary */}
            {impactSummary?.bullets && impactSummary.bullets.length > 0 && (
                <div className="space-y-2 mb-4">
                    {impactSummary.bullets.map((bullet, i) => (
                        <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                            {bullet}
                        </p>
                    ))}
                </div>
            )}

            {/* Effective Date */}
            {effectiveDate && (
                <div className="flex items-center gap-2 text-sm mb-4 font-medium text-warning">
                    <span
                        className="w-1.5 h-1.5 rounded-full bg-warning"
                    />
                    Effective: {effectiveDate}
                </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.slice(0, 4).map(tag => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 rounded-md text-xs bg-secondary text-muted-foreground"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                    <a
                        href={officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-badge"
                    >
                        <ExternalLink className="w-3 h-3" strokeWidth={2} />
                        Official Source
                    </a>
                    {pdfUrl && (
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-badge"
                        >
                            <FileText className="w-3 h-3" strokeWidth={2} />
                            PDF
                        </a>
                    )}
                </div>
                <span className="text-xs text-foreground-subtle">
                    Updated: {new Date(fetchedAt).toLocaleDateString()}
                </span>
            </div>
        </article>
    )
}
