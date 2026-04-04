// src/app/page.tsx
// Home Dashboard - Policy feed, saved scenarios, stage checklist
'use client'

import { useState, useEffect } from 'react'
import { PolicyCard } from '@/components/PolicyCard'
import { ChevronDown, ExternalLink, CheckCircle, Clock, Layers, Radio, MapPin, DollarSign } from 'lucide-react'
import Link from 'next/link'

// Demo scenarios data
const DEMO_SCENARIOS = [
  {
    id: '1',
    title: 'Software Engineer',
    location: 'San Francisco, CA',
    socCode: '15-1252',
    status: 'Level III',
    salary: 185000,
    entries: 3
  },
  {
    id: '2',
    title: 'Data Analyst',
    location: 'New York, NY',
    socCode: '15-2051',
    status: 'Level II',
    salary: 95000,
    entries: 2
  },
  {
    id: '3',
    title: 'ML Engineer',
    location: 'Seattle, WA',
    socCode: '15-2051',
    status: 'Level IV',
    salary: 220000,
    entries: 4
  }
]

// Stage checklist data
const STAGE_CHECKLISTS = {
  'F-1': [
    { label: 'Maintain valid F-1 status', done: true },
    { label: 'Apply for OPT before graduation', done: false },
    { label: 'Understand 90-day unemployment limit', done: false },
    { label: 'Research H-1B cap timeline', done: false }
  ],
  'OPT': [
    { label: 'File I-765 for EAD', done: true },
    { label: 'Report employment to school', done: true },
    { label: 'Plan for STEM OPT if eligible', done: false },
    { label: 'Monitor H-1B registration period (March)', done: false }
  ],
  'STEM OPT': [
    { label: '24-month STEM extension approved', done: true },
    { label: 'I-983 training plan filed', done: true },
    { label: 'Register for H-1B lottery (FY 2027)', done: false },
    { label: 'Negotiate wage level strategy', done: false }
  ],
  'H-1B': [
    { label: 'Selected in lottery', done: false },
    { label: 'LCA certified', done: false },
    { label: 'I-129 petition filed', done: false },
    { label: 'Visa stamping (if applicable)', done: false }
  ]
}

// Demo policy data
const DEMO_POLICIES = [
  {
    id: '1',
    source: 'federalregister',
    docNumber: 'DEMO-001',
    title: '[DEMO] H-1B Modernization Final Rule: Wage-Based Selection Process',
    type: 'RULE',
    status: 'final',
    agencyNames: ['DHS', 'USCIS'],
    publicationDate: '2024-12-18',
    effectiveDate: '2026-02-27',
    abstract: 'This final rule establishes a wage-level based selection process for H-1B cap-subject petitions.',
    officialUrl: 'https://www.federalregister.gov/documents/search?conditions%5Bagencies%5D%5B%5D=homeland-security-department&conditions%5Bterm%5D=H-1B',
    pdfUrl: null,
    tags: ['h1b', 'selection', 'wage'],
    impactSummary: {
      bullets: [
        'Final Rule - Takes effect February 27, 2026',
        'Wage levels I-IV get 1-4 entries respectively in selection pool',
        'Higher wage = more entries = greater selection weight'
      ]
    },
    fetchedAt: new Date().toISOString(),
    sourceUrl: 'https://www.federalregister.gov'
  },
  {
    id: '2',
    source: 'federalregister',
    docNumber: 'DEMO-002',
    title: '[DEMO] OPT Extension for STEM Degree Holders: Program Updates',
    type: 'NOTICE',
    status: 'notice',
    agencyNames: ['DHS', 'ICE'],
    publicationDate: '2024-11-15',
    effectiveDate: null,
    abstract: 'Notice regarding updates to the STEM OPT extension program eligibility.',
    officialUrl: 'https://www.federalregister.gov/documents/search?conditions%5Bagencies%5D%5B%5D=homeland-security-department&conditions%5Bterm%5D=STEM+OPT',
    pdfUrl: null,
    tags: ['opt', 'stem_opt'],
    impactSummary: {
      bullets: [
        'Notice regarding STEM OPT program updates',
        'Affects 24-month extension eligibility criteria'
      ]
    },
    fetchedAt: new Date().toISOString(),
    sourceUrl: 'https://www.federalregister.gov'
  }
]

export default function HomePage() {
  const [selectedStage, setSelectedStage] = useState<keyof typeof STAGE_CHECKLISTS>('STEM OPT')
  const [expandedStage, setExpandedStage] = useState(true)
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPolicies() {
      try {
        const res = await fetch('/api/policies?limit=5')
        if (res.ok) {
          const data = await res.json()
          setPolicies(data.items)
        }
      } catch (error) {
        console.error('Failed to fetch policies', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPolicies()
  }, [])

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-6 sm:py-8 px-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight text-foreground">
          Your H-1B <span className="text-primary">Command Center</span>
        </h1>
        <p className="text-base sm:text-lg max-w-2xl mx-auto text-muted-foreground">
          Track policy changes, analyze prevailing wages, and plan your immigration strategy—all from verified government sources.
        </p>
      </div>

      {/* Stage Selector */}
      <div className="flex flex-wrap justify-center gap-2 px-4">
        {Object.keys(STAGE_CHECKLISTS).map(stage => (
          <button
            key={stage}
            onClick={() => setSelectedStage(stage as keyof typeof STAGE_CHECKLISTS)}
            className={selectedStage === stage ? 'pill-btn-active' : 'pill-btn'}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 px-4">
        {/* Policy Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-header">
              <Radio className="w-5 h-5" strokeWidth={1.5} />
              What Changed?
            </h2>
            <Link href="/policy-radar" className="text-sm font-medium text-primary">
              View all →
            </Link>
          </div>

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
            ) : (
              <div className="card p-8 text-center text-muted-foreground">
                No policy updates found.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Saved Scenarios */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-header text-base">
                <Layers className="w-5 h-5" strokeWidth={1.5} />
                Your Scenarios
              </h3>
              <Link href="/wage-strategy" className="text-xs font-medium text-primary">
                + Add
              </Link>
            </div>

            <div className="space-y-3">
              {DEMO_SCENARIOS.map(scenario => (
                <div
                  key={scenario.id}
                  className="p-3 rounded-xl cursor-pointer transition-colors bg-secondary border border-border"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-medium text-sm text-foreground">{scenario.title}</div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: scenario.entries === 4 ? 'var(--success-bg)' :
                          scenario.entries === 3 ? 'rgba(139, 92, 246, 0.1)' :
                            scenario.entries === 2 ? 'var(--accent-bg)' :
                              'var(--secondary)',
                        color: scenario.entries === 4 ? 'var(--success)' :
                          scenario.entries === 3 ? '#8B5CF6' :
                            scenario.entries === 2 ? 'var(--primary)' :
                              'var(--foreground-muted)'
                      }}
                    >
                      {scenario.entries}× weight
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" strokeWidth={2} />
                    {scenario.location}
                  </div>
                  <div className="flex items-center gap-1 text-xs mt-1 text-foreground-subtle">
                    <DollarSign className="w-3 h-3" strokeWidth={2} />
                    {scenario.salary.toLocaleString()}/yr • {scenario.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage Checklist */}
          <div className="card">
            <button
              onClick={() => setExpandedStage(!expandedStage)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="section-header text-base">
                <CheckCircle className="w-5 h-5" strokeWidth={1.5} />
                {selectedStage} Checklist
              </h3>
              <ChevronDown
                className={`w-5 h-5 transition-transform text-muted-foreground ${expandedStage ? 'rotate-180' : ''}`}
                strokeWidth={1.5}
              />
            </button>

            {expandedStage && (
              <div className="mt-4 space-y-2">
                {STAGE_CHECKLISTS[selectedStage].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{
                      background: item.done ? 'var(--success-bg)' : 'var(--secondary)'
                    }}
                  >
                    {item.done ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 text-success" strokeWidth={2} />
                    ) : (
                      <Clock className="w-4 h-4 flex-shrink-0 text-foreground-subtle" strokeWidth={2} />
                    )}
                    <span
                      className={`text-sm ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card">
            <h3 className="section-header text-base mb-4">
              <ExternalLink className="w-5 h-5" strokeWidth={1.5} />
              Official Sources
            </h3>
            <div className="space-y-2">
              <a
                href="https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg transition-colors bg-secondary border border-border"
              >
                <span className="text-sm text-foreground">USCIS H-1B Page</span>
                <ExternalLink className="w-3.5 h-3.5 text-foreground-subtle" strokeWidth={2} />
              </a>
              <a
                href="https://flag.dol.gov/wage-data/wage-data-downloads"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg transition-colors bg-secondary border border-border"
              >
                <span className="text-sm text-foreground">DOL FLAG Wages</span>
                <ExternalLink className="w-3.5 h-3.5 text-foreground-subtle" strokeWidth={2} />
              </a>
              <a
                href="https://www.federalregister.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg transition-colors bg-secondary border border-border"
              >
                <span className="text-sm text-foreground">Federal Register</span>
                <ExternalLink className="w-3.5 h-3.5 text-foreground-subtle" strokeWidth={2} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
