// src/app/resources/page.tsx
// Resource Library - Curated links, definitions, disclaimers
'use client'

import { ExternalLink, BookOpen, FileText, HelpCircle, AlertTriangle, Link as LinkIcon } from 'lucide-react'

const OFFICIAL_LINKS = [
    {
        category: 'USCIS',
        links: [
            {
                title: 'H-1B Specialty Occupations',
                url: 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations',
                description: 'Official USCIS H-1B program information'
            },
            {
                title: 'H-1B Cap Season',
                url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-cap-season',
                description: 'Cap season updates and registration information'
            },
            {
                title: 'H-1B Electronic Registration',
                url: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-electronic-registration-process',
                description: 'Registration process and requirements'
            },
            {
                title: 'OPT for F-1 Students',
                url: 'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/students-and-employment',
                description: 'OPT eligibility and application process'
            },
            {
                title: 'STEM OPT Extension',
                url: 'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/stem-opt-extension',
                description: '24-month STEM OPT extension requirements'
            }
        ]
    },
    {
        category: 'Department of Labor',
        links: [
            {
                title: 'FLAG Prevailing Wage Data',
                url: 'https://flag.dol.gov/wage-data/wage-data-downloads',
                description: 'Official wage data for LCA filings'
            },
            {
                title: 'Wage Data Downloads',
                url: 'https://flag.dol.gov/wage-data/wage-data-downloads',
                description: 'Download prevailing wage datasets'
            },
            {
                title: 'LCA Online Filing',
                url: 'https://flag.dol.gov/',
                description: 'Foreign Labor Application Gateway'
            }
        ]
    },
    {
        category: 'Bureau of Labor Statistics',
        links: [
            {
                title: 'OEWS Data',
                url: 'https://www.bls.gov/oes/',
                description: 'Occupational Employment and Wage Statistics'
            },
            {
                title: 'OEWS Tables',
                url: 'https://www.bls.gov/oes/tables.htm',
                description: 'Download wage tables by occupation and area'
            },
            {
                title: 'Area Definitions',
                url: 'https://www.bls.gov/oes/current/oes_stru.htm',
                description: 'Metropolitan and nonmetropolitan area definitions'
            }
        ]
    },
    {
        category: 'O*NET',
        links: [
            {
                title: 'O*NET Online',
                url: 'https://www.onetonline.org/',
                description: 'Occupation information and SOC codes'
            },
            {
                title: 'O*NET Database',
                url: 'https://www.onetcenter.org/database.html',
                description: 'Download occupation data (CC BY 4.0)'
            }
        ]
    },
    {
        category: 'Federal Register',
        links: [
            {
                title: 'Federal Register',
                url: 'https://www.federalregister.gov/',
                description: 'Official source for proposed and final rules'
            },
            {
                title: 'DHS Rules',
                url: 'https://www.federalregister.gov/agencies/homeland-security-department',
                description: 'Department of Homeland Security regulations'
            }
        ]
    }
]

const DEFINITIONS = [
    {
        term: 'Prevailing Wage',
        definition: 'The average wage paid to similarly employed workers in a specific occupation in the area of intended employment. Required for H-1B LCA filings.'
    },
    {
        term: 'Wage Levels (I-IV)',
        definition: 'DOL wage tiers based on experience: Level I (Entry, 17th percentile), Level II (Qualified, 34th), Level III (Experienced, 50th), Level IV (Fully Competent, 67th).'
    },
    {
        term: 'SOC Code',
        definition: 'Standard Occupational Classification code - a 6-digit code that categorizes occupations for statistical purposes. Used for wage determinations.'
    },
    {
        term: 'O*NET-SOC Code',
        definition: 'Extended version of SOC with 2 additional digits for more specific occupations. O*NET codes map to parent SOC codes.'
    },
    {
        term: 'Area of Intended Employment',
        definition: 'The geographic location where the H-1B worker will perform services. Determines which prevailing wage applies.'
    },
    {
        term: 'LCA (Labor Condition Application)',
        definition: 'A form filed with DOL before an H-1B petition, attesting that the employer will pay prevailing wage and provide proper working conditions.'
    },
    {
        term: 'Cap-Subject H-1B',
        definition: 'H-1B petitions subject to the annual numerical limits (65,000 + 20,000 for U.S. advanced degree holders). Subject to lottery selection.'
    },
    {
        term: 'Wage-Based Selection',
        definition: 'Proposed selection method (effective Feb 27, 2026) where registrations receive entries based on wage level: Level I=1, II=2, III=3, IV=4 entries.'
    }
]

export default function ResourcesPage() {
    return (
        <div className="space-y-8 px-4">
            {/* Header */}
            <div>
                <h1 className="section-header text-2xl sm:text-3xl mb-2">
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                    Resource Library
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                    Official government resources, key definitions, and frequently asked questions.
                </p>
            </div>

            {/* Legal Disclaimer */}
            <div className="disclaimer-box">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                        <p className="font-semibold mb-2">Important Disclaimer</p>
                        <p className="text-sm leading-relaxed opacity-90">
                            H1B Compass is an informational tool only. It does not provide legal advice
                            and should not be relied upon as such. Immigration law is complex and constantly
                            changing. Always consult a qualified immigration attorney for guidance on your
                            specific situation. Verify all information with official government sources before
                            making any decisions.
                        </p>
                    </div>
                </div>
            </div>

            {/* Key Definitions */}
            <div className="card">
                <h2 className="section-header mb-6">
                    <BookOpen className="w-5 h-5" strokeWidth={1.5} />
                    Key Definitions
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                    {DEFINITIONS.map((item, i) => (
                        <div
                            key={i}
                            className="p-4 rounded-xl border"
                            style={{
                                background: 'var(--secondary)',
                                borderColor: 'var(--border)'
                            }}
                        >
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{item.term}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>{item.definition}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Official Links */}
            <div>
                <h2 className="section-header mb-6">
                    <LinkIcon className="w-5 h-5" strokeWidth={1.5} />
                    Official Government Sources
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {OFFICIAL_LINKS.map(category => (
                        <div key={category.category} className="card">
                            <h3 className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>{category.category}</h3>
                            <div className="space-y-3">
                                {category.links.map(link => (
                                    <a
                                        key={link.url}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-3 rounded-lg transition-colors group"
                                        style={{
                                            background: 'var(--secondary)',
                                            border: '1px solid var(--border)'
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                                {link.title}
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--foreground-subtle)' }} strokeWidth={2} />
                                        </div>
                                        <p className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>{link.description}</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data Sources */}
            <div className="card">
                <h2 className="section-header mb-4">
                    <FileText className="w-5 h-5" strokeWidth={1.5} />
                    About Our Data
                </h2>

                <div className="space-y-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    <p>
                        <strong style={{ color: 'var(--foreground)' }}>Policy Documents:</strong> Sourced from the
                        Federal Register API. Includes proposed rules, final rules, and notices related
                        to H-1B, F-1, OPT, and STEM OPT. Updated daily.
                    </p>
                    <p>
                        <strong style={{ color: 'var(--foreground)' }}>Prevailing Wages (OFLC):</strong> Official DOL
                        prevailing wage data from FLAG downloads. These are the wage levels used for
                        H-1B LCA filings. Updated when new wage year data is published.
                    </p>
                    <p>
                        <strong style={{ color: 'var(--foreground)' }}>Market Wages (BLS OEWS):</strong> Bureau of
                        Labor Statistics Occupational Employment and Wage Statistics. Provides market
                        context only—NOT for LCA filings. Updated with each annual May OEWS release.
                    </p>
                    <p>
                        <strong style={{ color: 'var(--foreground)' }}>Occupation Data (O*NET):</strong> O*NET database
                        for SOC code mapping and occupation information. Licensed under CC BY 4.0.
                    </p>
                </div>
            </div>

            {/* FAQ */}
            <div className="card">
                <h2 className="section-header mb-6">
                    <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
                    Frequently Asked Questions
                </h2>

                <div className="space-y-4">
                    <div
                        className="p-4 rounded-xl"
                        style={{ background: 'var(--secondary)' }}
                    >
                        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            What does the selection weight mean?
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                            Under the wage-based selection rule (effective Feb 27, 2026), each H-1B
                            registration receives entries in the selection pool based on wage level:
                            Level I gets 1 entry, Level II gets 2, Level III gets 3, and Level IV gets 4.
                            More entries = higher relative weight in the selection, but this is NOT a
                            guarantee or probability calculation.
                        </p>
                    </div>

                    <div
                        className="p-4 rounded-xl"
                        style={{ background: 'var(--secondary)' }}
                    >
                        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            Why do OFLC and OEWS wages differ?
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                            OFLC prevailing wages are regulatory thresholds set by DOL specifically for
                            visa programs. OEWS wages are BLS market statistics showing what employers
                            actually pay. OFLC wages use a different methodology and are often lower than
                            market rates. Only OFLC wages are valid for LCA filings.
                        </p>
                    </div>

                    <div
                        className="p-4 rounded-xl"
                        style={{ background: 'var(--secondary)' }}
                    >
                        <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                            Why do I need to specify area of employment for remote work?
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                            H-1B regulations require specifying where the work will be performed. For
                            remote/hybrid positions, this could be the employer's location or your
                            residence. The choice affects which prevailing wage applies. Consult with
                            your employer and immigration attorney to determine the correct approach.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
