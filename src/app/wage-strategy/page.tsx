// src/app/wage-strategy/page.tsx
// Wage & Role Strategy - SOC matching, wage comparison, selection simulator
'use client'

import { useState } from 'react'
import { WageLevelDisplay } from '@/components/WageLevelDisplay'
import { SelectionSimulator } from '@/components/SelectionSimulator'
import { Search, MapPin, Briefcase, AlertTriangle, CheckCircle, Info, BarChart3, Loader2, ChevronRight, ArrowDown } from 'lucide-react'
import { searchLocations, findLocation, type LocationInfo } from '@/lib/locations'

type WorkArrangement = 'onsite' | 'hybrid' | 'remote'

interface SocMatch {
  socCode: string
  onetSocCode: string
  title: string
  description: string | null
  confidence: number
  matchedKeywords: string[]
  matchSource: string
  whyMatched: string
}

interface WageData {
  socCode: string
  location: { areaCode: string; areaType: string; displayName: string }
  oflc: {
    available: boolean
    wageYear: number | null
    levels: {
      level1: { hourly: number | null; annual: number | null }
      level2: { hourly: number | null; annual: number | null }
      level3: { hourly: number | null; annual: number | null }
      level4: { hourly: number | null; annual: number | null }
    } | null
    sourceUrl: string
    ingestedAt: string | null
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
    ingestedAt: string | null
  }
}

type AnalysisStep = 'idle' | 'matching' | 'loading-wages' | 'done'

export default function WageStrategyPage() {
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement>('onsite')
  const [areaOfEmployment, setAreaOfEmployment] = useState<string | null>(null)
  const [selectedSoc, setSelectedSoc] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null)

  // Results
  const [socMatches, setSocMatches] = useState<SocMatch[]>([])
  const [wageData, setWageData] = useState<WageData | null>(null)
  const [step, setStep] = useState<AnalysisStep>('idle')

  const needsLocationChoice = workArrangement === 'hybrid' || workArrangement === 'remote'
  const locationSuggestions = searchLocations(locationInput)
  const isAnalyzing = step === 'matching' || step === 'loading-wages'

  async function handleAnalyze() {
    if (!jobTitle) return

    setSocMatches([])
    setWageData(null)
    setStep('matching')

    try {
      // Step 1: SOC Matching
      const socRes = await fetch('/api/soc-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, jobDescription: jobDescription || undefined })
      })

      let matches: SocMatch[] = []
      if (socRes.ok) {
        const socData = await socRes.json()
        matches = socData.matches || []
        setSocMatches(matches)

        if (matches.length > 0) {
          setSelectedSoc(matches[0].socCode)
        }
      }

      // Step 2: Resolve location
      let loc = selectedLocation
      if (!loc && locationInput) {
        loc = findLocation(locationInput)
      }
      if (!loc) {
        loc = findLocation('San Francisco, CA')
      }
      setSelectedLocation(loc)

      if (loc) {
        setStep('loading-wages')

        const socCode = matches.length > 0 ? matches[0].socCode : ''
        const wageRes = await fetch(
          `/api/wages?socCode=${socCode}&areaCode=${loc.oewsAreaCode}&oewsAreaCode=${loc.oewsAreaCode}`
        )

        if (wageRes.ok) {
          const data = await wageRes.json()
          setWageData(data)
        }
      }
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setStep('done')
    }
  }

  async function handleSocSelect(match: SocMatch) {
    setSelectedSoc(match.socCode)
    setWageData(null)
    setStep('loading-wages')

    const loc = selectedLocation || findLocation(locationInput) || findLocation('San Francisco, CA')
    if (!loc) return

    try {
      const wageRes = await fetch(
        `/api/wages?socCode=${match.socCode}&areaCode=${loc.oewsAreaCode}&oewsAreaCode=${loc.oewsAreaCode}`
      )
      if (wageRes.ok) {
        const data = await wageRes.json()
        setWageData(data)
      }
    } catch (err) {
      console.error('Wage fetch failed:', err)
    } finally {
      setStep('done')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="section-header text-3xl mb-2">
          <Briefcase className="w-8 h-8" strokeWidth={1.5} />
          Wage & Role Strategy
        </h1>
        <p style={{ color: 'var(--foreground-muted)' }}>
          Map your job to an SOC code, compare prevailing vs. market wages, and understand selection weights.
        </p>
      </div>

      {/* Input Form */}
      <div className="card space-y-6">
        {/* Role Input */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            <Briefcase className="inline w-4 h-4 mr-1.5" strokeWidth={2} />
            Job Title
          </label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g., Software Engineer, Data Analyst, Product Manager"
            className="input-field"
          />
        </div>

        {/* Job Description (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
            Job Description <span style={{ color: 'var(--foreground-subtle)' }}>(optional - improves matching)</span>
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste job description for better SOC matching..."
            rows={3}
            className="input-field resize-none"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Location */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              <MapPin className="inline w-4 h-4 mr-1.5" strokeWidth={2} />
              Location
            </label>
            <input
              type="text"
              value={locationInput}
              onChange={(e) => {
                setLocationInput(e.target.value)
                setSelectedLocation(null)
              }}
              placeholder="City, State (e.g., San Francisco, CA)"
              className="input-field"
            />
            {locationSuggestions.length > 0 && !selectedLocation && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {locationSuggestions.map(s => (
                  <button
                    key={s.oewsAreaCode}
                    onClick={() => {
                      setSelectedLocation(s)
                      setLocationInput(s.displayName)
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  >
                    <span className="font-medium">{s.city}, {s.state}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{s.areaType.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedLocation && (
              <p className="text-xs mt-1 text-muted-foreground">
                Using: {selectedLocation.displayName} ({selectedLocation.areaType})
              </p>
            )}
          </div>

          {/* Work Arrangement */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Work Arrangement
            </label>
            <div className="flex gap-2">
              {(['onsite', 'hybrid', 'remote'] as WorkArrangement[]).map(arr => (
                <button
                  key={arr}
                  onClick={() => { setWorkArrangement(arr); setAreaOfEmployment(null) }}
                  className={`flex-1 py-2 rounded-lg text-sm transition-colors border ${workArrangement === arr
                    ? 'bg-[var(--accent-bg)] border-[var(--primary)]'
                    : 'bg-[var(--secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  style={{ color: workArrangement === arr ? 'var(--primary)' : 'var(--foreground-muted)' }}
                >
                  {arr.charAt(0).toUpperCase() + arr.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Area of Employment Choice (for hybrid/remote) */}
        {needsLocationChoice && (
          <div
            className="p-4 rounded-xl border"
            style={{
              background: 'var(--warning-bg)',
              borderColor: 'rgba(217, 119, 6, 0.2)'
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} strokeWidth={2} />
              <div className="flex-1">
                <p className="font-medium mb-2" style={{ color: 'var(--warning)' }}>
                  Area of Intended Employment Required
                </p>
                <p className="text-sm mb-4 opacity-80" style={{ color: 'var(--warning)' }}>
                  For hybrid/remote positions, you must specify where the work will primarily occur.
                  This determines which prevailing wage applies.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setAreaOfEmployment('employer')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${areaOfEmployment === 'employer'
                      ? 'bg-[var(--accent-bg)] border-[var(--primary)]'
                      : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                  >
                    <div className="font-medium" style={{ color: 'var(--foreground)' }}>Employer HQ / Office Location</div>
                    <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>Use the location where employer is based</div>
                  </button>
                  <button
                    onClick={() => setAreaOfEmployment('residence')}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${areaOfEmployment === 'residence'
                      ? 'bg-[var(--accent-bg)] border-[var(--primary)]'
                      : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                  >
                    <div className="font-medium" style={{ color: 'var(--foreground)' }}>Your Residence Location</div>
                    <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>Use where you will primarily work from</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!jobTitle || isAnalyzing || (needsLocationChoice && !areaOfEmployment)}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          style={{
            opacity: !jobTitle || (needsLocationChoice && !areaOfEmployment) ? 0.5 : 1,
            cursor: !jobTitle || isAnalyzing || (needsLocationChoice && !areaOfEmployment) ? 'not-allowed' : 'pointer'
          }}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {step === 'matching' ? 'Matching SOC Code...' : 'Loading Wage Data...'}
            </>
          ) : (
            <>
              <Search className="w-4 h-4" strokeWidth={2} />
              Analyze Wages
            </>
          )}
        </button>
      </div>

      {/* Results - Step Progress */}
      {step !== 'idle' && socMatches.length > 0 && (
        <div className="space-y-8 animate-fade-in">
          {/* SOC Matching */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${step === 'matching' ? 'bg-primary animate-pulse' : 'bg-success'}`}>
                {step === 'matching' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </div>
              <h2 className="section-header text-lg">
                SOC Code Matching
              </h2>
            </div>

            <div className="space-y-3">
              {socMatches.map((match) => (
                <button
                  key={match.onetSocCode}
                  onClick={() => handleSocSelect(match)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedSoc === match.socCode
                    ? 'bg-[var(--accent-bg)] border-[var(--primary)] ring-1 ring-primary/20'
                    : 'bg-[var(--secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm" style={{ color: 'var(--primary)' }}>{match.onetSocCode}</span>
                        {selectedSoc === match.socCode && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ background: 'var(--accent-bg)', color: 'var(--primary)' }}
                          >
                            SELECTED
                          </span>
                        )}
                      </div>
                      <div className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>{match.title}</div>
                      <div className="text-xs" style={{ color: 'var(--foreground-subtle)' }}>{match.whyMatched}</div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-lg font-bold"
                        style={{
                          color: match.confidence >= 80 ? 'var(--success)' :
                            match.confidence >= 50 ? 'var(--warning)' : 'var(--foreground-subtle)'
                        }}
                      >
                        {match.confidence}%
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--foreground-subtle)' }}>confidence</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wage Analysis - shown automatically or loading */}
          {step === 'loading-wages' && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Loading wage data...</span>
            </div>
          )}

          {step === 'done' && wageData && (wageData.oflc.available || wageData.oews.available) && (
            <>
              <ArrowDown className="mx-auto h-6 w-6 text-muted-foreground" />
              <div>
                <h2 className="section-header mb-4">
                  <BarChart3 className="w-5 h-5" strokeWidth={1.5} />
                  Wage Analysis — {socMatches.find(m => m.socCode === selectedSoc)?.title || 'Selected Role'}
                </h2>
                <WageLevelDisplay
                  oflc={{
                    available: wageData.oflc.available,
                    wageYear: wageData.oflc.wageYear,
                    levels: wageData.oflc.levels ? {
                      level1: { hourly: wageData.oflc.levels.level1.hourly, annual: wageData.oflc.levels.level1.annual || 0 },
                      level2: { hourly: wageData.oflc.levels.level2.hourly, annual: wageData.oflc.levels.level2.annual || 0 },
                      level3: { hourly: wageData.oflc.levels.level3.hourly, annual: wageData.oflc.levels.level3.annual || 0 },
                      level4: { hourly: wageData.oflc.levels.level4.hourly, annual: wageData.oflc.levels.level4.annual || 0 },
                    } : null,
                    sourceUrl: wageData.oflc.sourceUrl,
                    ingestedAt: wageData.oflc.ingestedAt || new Date().toISOString()
                  }}
                  oews={{
                    available: wageData.oews.available,
                    year: wageData.oews.year,
                    wages: wageData.oews.wages,
                    employment: wageData.oews.employment,
                    sourceUrl: wageData.oews.sourceUrl,
                    ingestedAt: wageData.oews.ingestedAt || new Date().toISOString()
                  }}
                  socCode={selectedSoc || wageData.socCode}
                  location={wageData.location.displayName}
                />
              </div>
            </>
          )}

          {step === 'done' && wageData && !wageData.oflc.available && !wageData.oews.available && (
            <div className="card text-center py-8">
              <Info className="inline w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No wage data available for <strong>{wageData.location.displayName}</strong>.
              </p>
              <p className="text-sm text-foreground-subtle mt-2">
                Try importing official wage data via the seed script, or check{' '}
                <a href="https://flag.dol.gov/wage-data/wage-data-downloads" target="_blank" rel="noopener noreferrer" className="text-primary">
                  DOL FLAG
                </a>{' '}
                directly.
              </p>
            </div>
          )}

          {/* Selection Simulator */}
          {step === 'done' && wageData?.oflc?.available && wageData.oflc.levels && (
            <>
              <ArrowDown className="mx-auto h-6 w-6 text-muted-foreground" />
              <SelectionSimulator
                oflcLevels={{
                  level1: wageData.oflc.levels.level1.annual,
                  level2: wageData.oflc.levels.level2.annual,
                  level3: wageData.oflc.levels.level3.annual,
                  level4: wageData.oflc.levels.level4.annual,
                }}
              />
            </>
          )}

          {/* Final Disclaimer */}
          <div
            className="text-center text-xs pt-4 border-t"
            style={{ color: 'var(--foreground-subtle)', borderColor: 'var(--border)' }}
          >
            <p>
              Wage data from DOL FLAG and BLS OEWS. Selection weights based on proposed rule effective Feb 27, 2026.
            </p>
            <p className="mt-1">
              <strong style={{ color: 'var(--foreground)' }}>Not legal advice.</strong> Consult an immigration attorney for guidance on your specific situation.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
