// src/app/policy-radar/page.tsx
// Policy Radar - Federal Register feed with filters
'use client'

import { useState, useEffect } from 'react'
import { PolicyCard } from '@/components/PolicyCard'
import { Search, Filter, RefreshCw, Radar, ExternalLink } from 'lucide-react'

type FilterType = 'all' | 'RULE' | 'PRORULE' | 'NOTICE'
type TagFilter = string | null

export default function PolicyRadarPage() {
    const [typeFilter, setTypeFilter] = useState<FilterType>('all')
    const [tagFilter, setTagFilter] = useState<TagFilter>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [policies, setPolicies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [hasData, setHasData] = useState<boolean | null>(null)

    const commonTags = ['h1b', 'opt', 'stem_opt', 'wage', 'cap', 'selection', 'registration', 'f1']

    useEffect(() => {
        const fetchPolicies = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                if (typeFilter !== 'all') params.append('type', typeFilter)
                if (tagFilter) params.append('tags', tagFilter)
                if (searchQuery) params.append('search', searchQuery)
                params.append('limit', '50')

                const res = await fetch(`/api/policies?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    setPolicies(data.items)
                    setHasData(data.items.length > 0)
                } else {
                    setHasData(false)
                }
            } catch (error) {
                console.error('Failed to fetch policies', error)
                setHasData(false)
            } finally {
                setLoading(false)
            }
        }

        const timeoutId = setTimeout(() => {
            fetchPolicies()
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [typeFilter, tagFilter, searchQuery])

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="section-header text-3xl mb-2 text-foreground">
                    <Radar className="w-8 h-8 text-primary" strokeWidth={1.5} />
                    Policy Radar
                </h1>
                <p className="text-muted-foreground">
                    Track official policy changes from the Federal Register.
                </p>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle pointer-events-none"
                            strokeWidth={2}
                        />
                        <input
                            type="text"
                            placeholder="Search policies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-foreground-subtle" strokeWidth={2} />
                        <div className="flex gap-1">
                            {[
                                { value: 'all', label: 'All' },
                                { value: 'RULE', label: 'Final' },
                                { value: 'PRORULE', label: 'Proposed' },
                                { value: 'NOTICE', label: 'Notice' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTypeFilter(opt.value as FilterType)}
                                    className={typeFilter === opt.value ? 'pill-btn-active' : 'pill-btn'}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-xs pt-1 text-foreground-subtle">Topics:</span>
                    <button
                        onClick={() => setTagFilter(null)}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors border ${tagFilter === null
                            ? 'bg-accent border-primary text-primary'
                            : 'bg-secondary border-transparent hover:border-border text-muted-foreground'
                            }`}
                    >
                        All
                    </button>
                    {commonTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                            className={`text-xs px-2.5 py-1 rounded-md transition-colors border ${tagFilter === tag
                                ? 'bg-accent border-primary text-primary'
                                : 'bg-secondary border-transparent hover:border-border text-muted-foreground'
                                }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Showing {policies.length} documents
                </p>
                <div className="flex items-center gap-2 text-xs text-foreground-subtle">
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                    Last updated: {new Date().toLocaleDateString()}
                </div>
            </div>

            {/* Policy List */}
            <div className="space-y-4 stagger-children">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card h-48 animate-pulse bg-muted" />
                        ))}
                    </div>
                ) : policies.length > 0 ? (
                    policies.map(policy => (
                        <PolicyCard
                            key={policy.id}
                            title={policy.title}
                            type={policy.type}
                            status={policy.status}
                            publicationDate={policy.publicationDate}
                            effectiveDate={policy.effectiveDate}
                            abstract={policy.abstract}
                            officialUrl={policy.officialUrl}
                            pdfUrl={policy.pdfUrl}
                            tags={policy.tags}
                            impactSummary={policy.impactSummary}
                            fetchedAt={policy.fetchedAt}
                            sourceUrl={policy.sourceUrl}
                        />
                    ))
                ) : hasData === false ? (
                    <div className="card text-center py-12">
                        <Radar className="w-12 h-12 mx-auto text-muted-foreground mb-4" strokeWidth={1} />
                        <h3 className="text-lg font-semibold mb-2 text-foreground">No Policy Documents Yet</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            Run the seed script to fetch policy documents from the Federal Register API.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=H-1B"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Browse Federal Register
                            </a>
                        </div>
                        <p className="text-xs text-foreground-subtle mt-4">
                            Or run <code className="px-1.5 py-0.5 bg-secondary rounded">npm run seed</code> to import data
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No policies match your filters.</p>
                        <button
                            onClick={() => { setTypeFilter('all'); setTagFilter(null); setSearchQuery('') }}
                            className="mt-2 text-primary"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Source Attribution */}
            <div className="text-center text-xs pt-8 border-t border-border text-foreground-subtle">
                Data sourced from{' '}
                <a
                    href="https://www.federalregister.gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                >
                    Federal Register API
                </a>
                {' '}• Policy summaries are auto-generated for convenience
            </div>
        </div>
    )
}
