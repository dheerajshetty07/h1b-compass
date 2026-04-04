// src/lib/soc-matcher.ts
// SOC Matching Engine - Title-first matching with TF-IDF fallback
// Returns top-3 matches with confidence scores and "why matched" keywords

import { prisma } from './db'

interface SocMatch {
    socCode: string
    onetSocCode: string
    title: string
    description: string | null
    confidence: number // 0-100 percentage
    matchedKeywords: string[]
    matchSource: 'title' | 'sample_title' | 'description' | 'tasks'
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

// Simple string similarity using Jaro-Winkler-like approach
// Returns 0-1 where 1 is exact match
function stringSimilarity(a: string, b: string): number {
    const sa = a.toLowerCase().trim()
    const sb = b.toLowerCase().trim()

    if (sa === sb) return 1.0
    if (sa.includes(sb) || sb.includes(sa)) return 0.85

    // Word overlap score
    const wordsA = sa.split(/\s+/)
    const wordsB = sb.split(/\s+/)
    const commonWords = wordsA.filter(w => wordsB.includes(w))
    const wordOverlap = commonWords.length / Math.max(wordsA.length, wordsB.length)

    if (wordOverlap > 0) return 0.5 + (wordOverlap * 0.35)

    // Character-level similarity for short strings
    if (sa.length < 20 && sb.length < 20) {
        let matches = 0
        const maxLen = Math.max(sa.length, sb.length)
        for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
            if (sa[i] === sb[i]) matches++
        }
        return matches / maxLen
    }

    return 0
}

// Main SOC matching function
export async function matchSoc(
    jobTitle: string,
    jobDescription?: string
): Promise<{
    matches: SocMatch[]
    queryTerms: string[]
    gated: boolean
}> {
    const queryTerms = tokenize(jobTitle)

    if (queryTerms.length === 0) {
        return { matches: [], queryTerms: [], gated: true }
    }

    console.log(`SOC matching for: "${jobTitle}" with ${queryTerms.length} query terms`)

    // Fetch all occupations with their data
    const occupations = await prisma.occupation.findMany({
        select: {
            onetSocCode: true,
            socCode: true,
            title: true,
            description: true,
            sampleTitles: true,
            tasks: true
        }
    })

    console.log(`Loaded ${occupations.length} occupations for matching`)

    // Score each occupation
    const scored: { occ: typeof occupations[0], score: number, source: SocMatch['matchSource'], keywords: string[] }[] = []

    for (const occ of occupations) {
        let bestScore = 0
        let bestSource: SocMatch['matchSource'] = 'description'
        const matchedKeywords: string[] = []

        // 1. Direct title match (highest priority)
        const titleSim = stringSimilarity(jobTitle, occ.title)
        if (titleSim > bestScore) {
            bestScore = titleSim
            bestSource = 'title'
        }

        // Check if query terms appear in title
        const titleLower = occ.title.toLowerCase()
        for (const term of queryTerms) {
            if (titleLower.includes(term)) {
                if (!matchedKeywords.includes(term)) matchedKeywords.push(term)
                if (bestScore < 0.7) {
                    bestScore = Math.max(bestScore, 0.7)
                    bestSource = 'title'
                }
            }
        }

        // 2. Sample/alternate title match
        if (occ.sampleTitles) {
            try {
                const sampleTitles: string[] = JSON.parse(occ.sampleTitles)
                for (const sampleTitle of sampleTitles) {
                    const sampleSim = stringSimilarity(jobTitle, sampleTitle)
                    if (sampleSim > bestScore) {
                        bestScore = sampleSim
                        bestSource = 'sample_title'
                    }
                    // Check term overlap
                    const sampleLower = sampleTitle.toLowerCase()
                    for (const term of queryTerms) {
                        if (sampleLower.includes(term) && !matchedKeywords.includes(term)) {
                            matchedKeywords.push(term)
                        }
                    }
                }
            } catch { /* ignore parse errors */ }
        }

        // 3. Description match (lower priority)
        if (bestScore < 0.5 && occ.description) {
            const descLower = occ.description.toLowerCase()
            let descMatches = 0
            for (const term of queryTerms) {
                if (descLower.includes(term)) {
                    descMatches++
                    if (!matchedKeywords.includes(term)) matchedKeywords.push(term)
                }
            }
            if (descMatches > 0) {
                const descScore = (descMatches / queryTerms.length) * 0.4
                if (descScore > bestScore) {
                    bestScore = descScore
                    bestSource = 'description'
                }
            }
        }

        // 4. Tasks match (lowest priority)
        if (bestScore < 0.3 && occ.tasks) {
            try {
                const tasks: string[] = JSON.parse(occ.tasks)
                const tasksText = tasks.join(' ').toLowerCase()
                let taskMatches = 0
                for (const term of queryTerms) {
                    if (tasksText.includes(term)) {
                        taskMatches++
                        if (!matchedKeywords.includes(term)) matchedKeywords.push(term)
                    }
                }
                if (taskMatches > 0) {
                    const taskScore = (taskMatches / queryTerms.length) * 0.25
                    if (taskScore > bestScore) {
                        bestScore = taskScore
                        bestSource = 'tasks'
                    }
                }
            } catch { /* ignore parse errors */ }
        }

        if (bestScore > 0.15) {
            scored.push({ occ, score: bestScore, source: bestSource, keywords: matchedKeywords })
        }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)

    // Take top 3
    const top3 = scored.slice(0, 3)

    const matches: SocMatch[] = top3.map(s => ({
        socCode: s.occ.socCode,
        onetSocCode: s.occ.onetSocCode,
        title: s.occ.title,
        description: s.occ.description,
        confidence: Math.round(s.score * 100),
        matchedKeywords: s.keywords.slice(0, 5),
        matchSource: s.source
    }))

    const gated = matches.length === 0 || matches[0].confidence < 25

    if (gated) {
        console.log('SOC matching gated: low confidence or no matches')
    }

    console.log(`Top match: ${matches[0]?.title || 'none'} (${matches[0]?.confidence}%)`)

    return { matches, queryTerms, gated }
}

// Build TF-IDF index for an occupation (kept for backward compatibility)
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

    // Add terms from different sources with different weights
    addTerms(title, 'title')
    if (description) addTerms(description, 'description')
    if (tasks) addTerms(tasks.join(' '), 'tasks')
    if (sampleTitles) addTerms(sampleTitles.join(' '), 'sample_titles')

    // Calculate TF-IDF weights
    const totalTerms = termFreq.size
    const entries = Array.from(termFreq.entries()).map(([term, { count, source }]) => {
        const tf = count / Math.max(tokenize(title + ' ' + (description || '')).length, 1)
        const idf = Math.log(totalTerms / Math.max(count, 1))
        return { term, tfidfWeight: tf * idf, source }
    })

    // Insert index entries
    if (entries.length > 0) {
        await prisma.socMatchIndex.createMany({
            data: entries.map(e => ({
                socCode: onetSocCode,
                term: e.term,
                tfidfWeight: e.tfidfWeight,
                source: e.source
            }))
        })
    }
}
