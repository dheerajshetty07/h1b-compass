// src/lib/ingest/federal-register.ts
// Federal Register API client with caching and pagination
// Source: https://www.federalregister.gov/developers/documentation/api/v1

import { prisma } from '../db'

const FR_API_BASE = 'https://www.federalregister.gov/api/v1'

// Cache TTL in milliseconds (6 hours)
const CACHE_TTL = 6 * 60 * 60 * 1000

interface FRAgency {
    name: string
    raw_name: string
    slug: string
}

interface FRDocument {
    document_number: string
    title: string
    type: 'RULE' | 'PRORULE' | 'NOTICE'
    abstract: string | null
    publication_date: string
    effective_on: string | null
    html_url: string
    pdf_url: string | null
    agencies: FRAgency[]
}

interface FRApiResponse {
    count: number
    results: FRDocument[]
    next_page_url: string | null
}

// Keywords for auto-tagging
const TAG_KEYWORDS: Record<string, string[]> = {
    h1b: ['h-1b', 'h1b', 'h 1b', 'specialty occupation'],
    f1: ['f-1', 'f1', 'f 1'],
    opt: ['opt', 'optional practical training', 'employment authorization'],
    stem_opt: ['stem opt', 'stem extension', '24-month', '24 month'],
    wage: ['prevailing wage', 'wage level', 'wage requirement'],
    selection: ['lottery', 'selection', 'registration', 'cap-subject', 'cap subject'],
    cap: ['annual cap', 'fiscal year cap', '65,000', '20,000']
}

// Generate tags based on title and abstract
function generateTags(title: string, abstract: string | null): string[] {
    const text = `${title} ${abstract || ''}`.toLowerCase()
    const tags: string[] = []

    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.push(tag)
        }
    }

    return tags
}

// Map FR type to status
function mapTypeToStatus(type: string): string {
    switch (type) {
        case 'RULE': return 'final'
        case 'PRORULE': return 'proposed'
        case 'NOTICE': return 'notice'
        default: return 'other'
    }
}

// Generate impact summary bullets using rule-based templates
function generateImpactSummary(doc: FRDocument): { bullets: string[] } {
    const bullets: string[] = []
    const text = `${doc.title} ${doc.abstract || ''}`.toLowerCase()
    const agencyNames = (doc.agencies || []).map(a => a.name || a.raw_name || '')

    // Rule type context
    if (doc.type === 'PRORULE') {
        bullets.push('📋 This is a PROPOSED rule - not yet in effect. Public comments may be accepted.')
    } else if (doc.type === 'RULE') {
        bullets.push('✅ This is a FINAL rule - will take effect on the effective date.')
    }

    // Effective date
    if (doc.effective_on) {
        bullets.push(`📅 Effective date: ${doc.effective_on}`)
    }

    // Topic-specific summaries
    if (text.includes('selection') || text.includes('lottery')) {
        bullets.push('🎯 Affects H-1B selection/lottery process - may impact registration strategy.')
    }
    if (text.includes('wage') && (text.includes('level') || text.includes('prevailing'))) {
        bullets.push('💰 Wage-related changes - may affect prevailing wage requirements.')
    }
    if (text.includes('stem') && text.includes('opt')) {
        bullets.push('🎓 STEM OPT related - impacts 24-month extension eligibility or requirements.')
    }

    // Ensure at least one bullet
    if (bullets.length === 0) {
        bullets.push(`📄 ${doc.type === 'NOTICE' ? 'Notice' : 'Rule'} published by ${agencyNames.join(', ') || 'Unknown Agency'}`)
    }

    return { bullets: bullets.slice(0, 3) } // Max 3 bullets
}

// Check if cache is still valid
async function isCacheValid(dataset: string): Promise<boolean> {
    const log = await prisma.dataRefreshLog.findUnique({
        where: { dataset }
    })

    if (!log) return false

    const now = new Date()
    const cacheAge = now.getTime() - log.lastChecked.getTime()
    return cacheAge < CACHE_TTL
}

// Fetch all pages from Federal Register API
async function fetchAllDocuments(): Promise<FRDocument[]> {
    const allDocs: FRDocument[] = []

    // Build search query for immigration-related documents
    const params = new URLSearchParams({
        'per_page': '100',
        'order': 'newest',
        'conditions[agencies][]': 'homeland-security-department',
    })

    // Add additional agencies
    const agencies = [
        'homeland-security-department',
        'employment-and-training-administration',
        'citizenship-and-immigration-services'
    ]

    // Search terms for relevant documents
    const searchTerms = 'H-1B OR OPT OR "F-1" OR "STEM OPT" OR "specialty occupation" OR "prevailing wage"'

    let pageUrl: string | null = `${FR_API_BASE}/documents.json?per_page=100&order=newest&conditions[term]=${encodeURIComponent(searchTerms)}`

    // Add type filters
    pageUrl += '&conditions[type][]=RULE&conditions[type][]=PRORULE&conditions[type][]=NOTICE'

    let pageCount = 0
    const maxPages = 10 // Safety limit

    while (pageUrl && pageCount < maxPages) {
        console.log(`Fetching page ${pageCount + 1}...`)

        const response = await fetch(pageUrl)
        if (!response.ok) {
            if (response.status === 429) {
                console.log('Rate limited, waiting 60 seconds...')
                await new Promise(r => setTimeout(r, 60000))
                continue
            }
            throw new Error(`Federal Register API error: ${response.status}`)
        }

        const data: FRApiResponse = await response.json()
        allDocs.push(...data.results)

        pageUrl = data.next_page_url
        pageCount++

        // Respectful delay between requests
        if (pageUrl) {
            await new Promise(r => setTimeout(r, 1000))
        }
    }

    console.log(`Fetched ${allDocs.length} documents across ${pageCount} pages`)
    return allDocs
}

// Main ingestion function
export async function ingestFederalRegister(): Promise<{
    success: boolean
    recordCount: number
    ingestRunId: string
}> {
    // Create ingest run record
    const ingestRun = await prisma.ingestRun.create({
        data: {
            dataset: 'federal_register',
            sourceUrl: FR_API_BASE,
            status: 'running'
        }
    })

    try {
        // Check cache
        const cacheValid = await isCacheValid('federal_register')
        if (cacheValid) {
            console.log('Cache still valid, skipping fetch')
            await prisma.ingestRun.update({
                where: { id: ingestRun.id },
                data: {
                    status: 'success',
                    completedAt: new Date(),
                    recordCount: 0,
                    errorMessage: 'Cache valid, skipped'
                }
            })
            return { success: true, recordCount: 0, ingestRunId: ingestRun.id }
        }

        // Fetch documents
        const documents = await fetchAllDocuments()

        // Upsert documents
        let upsertCount = 0
        for (const doc of documents) {
            const tags = generateTags(doc.title, doc.abstract)
            const impactSummary = generateImpactSummary(doc)

            await prisma.policyDocument.upsert({
                where: { docNumber: doc.document_number },
                update: {
                    title: doc.title,
                    type: doc.type,
                    agencyNames: (doc.agencies || []).map(a => a.name || a.raw_name || '').join(','),
                    publicationDate: new Date(doc.publication_date),
                    effectiveDate: doc.effective_on ? new Date(doc.effective_on) : null,
                    status: mapTypeToStatus(doc.type),
                    abstract: doc.abstract,
                    officialUrl: doc.html_url,
                    pdfUrl: doc.pdf_url,
                    tags: tags.join(','),
                    impactSummary: JSON.stringify(impactSummary),
                    fetchedAt: new Date(),
                    ingestRunId: ingestRun.id
                },
                create: {
                    source: 'federalregister',
                    docNumber: doc.document_number,
                    title: doc.title,
                    type: doc.type,
                    agencyNames: (doc.agencies || []).map(a => a.name || a.raw_name || '').join(','),
                    publicationDate: new Date(doc.publication_date),
                    effectiveDate: doc.effective_on ? new Date(doc.effective_on) : null,
                    status: mapTypeToStatus(doc.type),
                    abstract: doc.abstract,
                    officialUrl: doc.html_url,
                    pdfUrl: doc.pdf_url,
                    tags: tags.join(','),
                    impactSummary: JSON.stringify(impactSummary),
                    ingestRunId: ingestRun.id
                }
            })
            upsertCount++
        }

        // Update refresh log
        await prisma.dataRefreshLog.upsert({
            where: { dataset: 'federal_register' },
            update: {
                lastChecked: new Date(),
                lastUpdated: new Date(),
                status: 'success',
                errorMessage: null
            },
            create: {
                dataset: 'federal_register',
                lastChecked: new Date(),
                lastUpdated: new Date(),
                status: 'success'
            }
        })

        // Update ingest run
        await prisma.ingestRun.update({
            where: { id: ingestRun.id },
            data: {
                status: 'success',
                completedAt: new Date(),
                recordCount: upsertCount
            }
        })

        return { success: true, recordCount: upsertCount, ingestRunId: ingestRun.id }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'

        await prisma.ingestRun.update({
            where: { id: ingestRun.id },
            data: {
                status: 'failed',
                completedAt: new Date(),
                errorMessage: errorMsg
            }
        })

        await prisma.dataRefreshLog.upsert({
            where: { dataset: 'federal_register' },
            update: {
                lastChecked: new Date(),
                status: 'failed',
                errorMessage: errorMsg
            },
            create: {
                dataset: 'federal_register',
                lastChecked: new Date(),
                lastUpdated: new Date(),
                status: 'failed',
                errorMessage: errorMsg
            }
        })

        throw error
    }
}
