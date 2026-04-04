// src/lib/soc-matcher.ts
// SOC Matching Engine with TF-IDF based explainable matching
// Returns top-3 matches with confidence scores and "why matched" keywords

import { prisma } from './db'

interface SocMatch {
    socCode: string
    onetSocCode: string
    title: string
    description: string | null
    confidence: number // 0-1 score
    matchedKeywords: string[] // Explainability: which terms matched
    matchSource: 'title' | 'description' | 'tasks' | 'sample_titles' | 'mixed'
}

// Stopwords to filter out
const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now'
])

// Tokenize and normalize text
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOPWORDS.has(word))
}

// Calculate TF-IDF similarity between query terms and indexed terms
async function calculateSimilarity(
    queryTerms: string[],
    socCode: string
): Promise<{ score: number, matchedTerms: string[], source: string }> {
    // Get all indexed terms for this SOC
    const indexedTerms = await prisma.socMatchIndex.findMany({
        where: { socCode },
        select: { term: true, tfidfWeight: true, source: true }
    })

    if (indexedTerms.length === 0) {
        return { score: 0, matchedTerms: [], source: 'none' }
    }

    // Build term-weight map, keeping the highest weight per term per source
    const titleTerms = new Set<string>()
    const descTerms = new Set<string>()
    const taskTerms = new Set<string>()
    const sampleTitleTerms = new Set<string>()

    for (const t of indexedTerms) {
        switch (t.source) {
            case 'title': titleTerms.add(t.term); break
            case 'description': descTerms.add(t.term); break
            case 'tasks': taskTerms.add(t.term); break
            case 'sample_titles': sampleTitleTerms.add(t.term); break
        }
    }

    // Calculate match score with source-based weighting
    let totalScore = 0
    const matchedTerms: string[] = []
    const sourceCounts: Record<string, number> = {}

    for (const queryTerm of queryTerms) {
        let termScore = 0
        let bestSource = 'none'

        // Title match (highest priority)
        if (titleTerms.has(queryTerm)) {
            termScore = Math.max(termScore, 1.0)
            bestSource = 'title'
        }
        // Sample title match
        if (sampleTitleTerms.has(queryTerm)) {
            termScore = Math.max(termScore, 0.9)
            bestSource = bestSource === 'none' ? 'sample_titles' : bestSource
        }
        // Description match
        if (descTerms.has(queryTerm)) {
            termScore = Math.max(termScore, 0.5)
            bestSource = bestSource === 'none' ? 'description' : bestSource
        }
        // Task match
        if (taskTerms.has(queryTerm)) {
            termScore = Math.max(termScore, 0.4)
            bestSource = bestSource === 'none' ? 'tasks' : bestSource
        }

        // Prefix match (low priority, only if no exact match)
        if (termScore === 0) {
            const allTerms = [...titleTerms, ...sampleTitleTerms, ...descTerms, ...taskTerms]
            for (const term of allTerms) {
                if (term.startsWith(queryTerm) || queryTerm.startsWith(term)) {
                    // Only match if the query term is at least 4 chars to avoid "engine" matching "engineer"
                    if (queryTerm.length >= 4 || term === queryTerm) {
                        termScore = 0.15
                        bestSource = titleTerms.has(term) ? 'title' : sampleTitleTerms.has(term) ? 'sample_titles' : 'mixed'
                        if (!matchedTerms.includes(term)) {
                            matchedTerms.push(term)
                        }
                        break
                    }
                }
            }
        }

        if (termScore > 0) {
            totalScore += termScore
            sourceCounts[bestSource] = (sourceCounts[bestSource] || 0) + 1
            if (!matchedTerms.includes(queryTerm)) {
                matchedTerms.push(queryTerm)
            }
        }
    }

    // Normalize score: divide by number of query terms, cap at 1
    const normalizedScore = Math.min(totalScore / Math.max(queryTerms.length, 1), 1)

    // Determine primary match source
    const primarySource = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed'

    return {
        score: normalizedScore,
        matchedTerms: matchedTerms.slice(0, 5),
        source: primarySource
    }
}

// Main SOC matching function
export async function matchSoc(
    jobTitle: string,
    jobDescription?: string
): Promise<{
    matches: SocMatch[]
    queryTerms: string[]
    gated: boolean // True if confidence below threshold
}> {
    // Combine and tokenize input
    const fullText = jobDescription
        ? `${jobTitle} ${jobDescription}`
        : jobTitle

    const queryTerms = tokenize(fullText)

    if (queryTerms.length === 0) {
        return { matches: [], queryTerms: [], gated: true }
    }

    console.log(`SOC matching for: "${jobTitle}" with ${queryTerms.length} query terms`)

    // Get all unique SOC codes from index
    const socCodes = await prisma.socMatchIndex.findMany({
        where: {
            term: { in: queryTerms }
        },
        select: { socCode: true }
    })

    const uniqueSocCodes = [...new Set(socCodes.map(s => s.socCode))]
    console.log(`Found ${uniqueSocCodes.length} candidate SOCs`)

    // Calculate similarity for each candidate
    const results: SocMatch[] = []
    const candidateCodes: string[] = []

    for (const socCode of uniqueSocCodes.slice(0, 50)) { // Limit candidates
        const { score, matchedTerms, source } = await calculateSimilarity(queryTerms, socCode)

        if (score > 0.1) { // Minimum threshold
            candidateCodes.push(socCode)
            results.push({
                socCode,
                onetSocCode: socCode,
                title: '',
                description: null,
                confidence: score,
                matchedKeywords: matchedTerms,
                matchSource: source as SocMatch['matchSource']
            })
        }
    }

    // Batch fetch all occupations in a single query
    const occupations = await prisma.occupation.findMany({
        where: { onetSocCode: { in: candidateCodes } },
        select: { title: true, description: true, onetSocCode: true, socCode: true }
    })

    const occMap = new Map(occupations.map(o => [o.onetSocCode, o]))

    // Enrich results with occupation data
    const enrichedResults = results
        .map(r => {
            const occ = occMap.get(r.onetSocCode)
            if (!occ) return null
            return {
                socCode: occ.socCode,
                onetSocCode: occ.onetSocCode,
                title: occ.title,
                description: occ.description,
                confidence: r.confidence,
                matchedKeywords: r.matchedKeywords,
                matchSource: r.matchSource
            }
        })
        .filter(Boolean) as SocMatch[]

    // Sort by confidence and take top 3
    enrichedResults.sort((a, b) => b.confidence - a.confidence)
    const top3 = enrichedResults.slice(0, 3)

    // Gate if top match confidence < 0.3 (30%)
    const gated = top3.length === 0 || top3[0].confidence < 0.3

    if (gated) {
        console.log('SOC matching gated: low confidence or no matches')
    }

    return {
        matches: top3,
        queryTerms,
        gated
    }
}

// Build TF-IDF index for an occupation
export async function buildSocIndex(
    onetSocCode: string,
    title: string,
    description: string | null,
    tasks: string[] | null,
    sampleTitles: string[] | null
): Promise<void> {
    // Clear existing index for this SOC
    await prisma.socMatchIndex.deleteMany({
        where: { socCode: onetSocCode }
    })

    // Build term frequency map
    const termFreq = new Map<string, { count: number, source: string }>()

    const addTerms = (text: string, source: string) => {
        const terms = tokenize(text)
        for (const term of terms) {
            if (!termFreq.has(term)) {
                termFreq.set(term, { count: 0, source })
            }
            termFreq.get(term)!.count++
        }
    }

    // Index title with high weight
    addTerms(title, 'title')
    addTerms(title, 'title') // Double-count title terms

    // Index description
    if (description) {
        addTerms(description, 'description')
    }

    // Index tasks
    if (tasks && Array.isArray(tasks)) {
        for (const task of tasks) {
            addTerms(task, 'tasks')
        }
    }

    // Index sample titles
    if (sampleTitles && Array.isArray(sampleTitles)) {
        for (const sampleTitle of sampleTitles) {
            addTerms(sampleTitle, 'sample_titles')
        }
    }

    // Calculate TF-IDF weights and insert
    const totalTerms = Array.from(termFreq.values()).reduce((sum, t) => sum + t.count, 0)

    const indexEntries = Array.from(termFreq.entries()).map(([term, { count, source }]) => ({
        socCode: onetSocCode,
        term,
        // TF component (log-scaled)
        tfidfWeight: (1 + Math.log(count)) / Math.log(totalTerms + 1),
        source
    }))

    // Batch insert
    await prisma.socMatchIndex.createMany({
        data: indexEntries
    })
}
