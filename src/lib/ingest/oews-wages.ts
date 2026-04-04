// src/lib/ingest/oews-wages.ts
// BLS OEWS Wage data parser
// Source: https://www.bls.gov/oes/tables.htm
// Handles the OEWS MSA ZIP (XLSX format)

import { prisma } from '../db'
import path from 'path'
import fs from 'fs'
import AdmZip from 'adm-zip'
import * as XLSX from 'xlsx'

const DATA_DIR = path.join(process.cwd(), 'data', 'oews')

// Parse OEWS ZIP file (contains XLSX files)
export async function parseOewsZip(zipPath: string): Promise<{
  wages: Array<{
    socCode: string
    socTitle: string
    areaCode: string
    areaTitle: string
    areaType: string
    year: number
    mean: number | null
    p10: number | null
    p25: number | null
    p50: number | null
    p75: number | null
    p90: number | null
    employment: number | null
  }>
  year: number
}> {
  console.log(`Extracting OEWS ZIP: ${zipPath}`)
  const zip = new AdmZip(zipPath)
  const zipEntries = zip.getEntries()

  // Find the MSA data file
  const msaEntry = zipEntries.find(e =>
    !e.isDirectory && e.entryName.toLowerCase().includes('msa') && e.entryName.toLowerCase().endsWith('.xlsx')
  )

  if (!msaEntry) throw new Error('Could not find MSA XLSX file in ZIP')

  // Extract to temp file
  const tmpPath = path.join(process.cwd(), 'tmp-oews.xlsx')
  fs.writeFileSync(tmpPath, msaEntry.getData())

  const wb = XLSX.readFile(tmpPath)
  const sheetName = wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName])

  fs.unlinkSync(tmpPath)

  console.log(`Found ${rows.length} rows in MSA data`)

  // Detect year from filename (e.g., MSA_M2024_dl.xlsx -> 2024)
  const yearMatch = zipPath.match(/m(\d{4})/i) || msaEntry.entryName.match(/m(\d{4})/i)
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  // Filter to detailed occupations only (O_GROUP = 'detailed')
  // and cross-industry (NAICS = '000000')
  const detailedRows = rows.filter(row => {
    const oGroup = String(row['O_GROUP'] || '').trim().toLowerCase()
    const naics = String(row['NAICS'] || '').trim()
    return oGroup === 'detailed' && naics === '000000'
  })

  console.log(`Filtered to ${detailedRows.length} detailed occupation records`)

  const wages = detailedRows.map(row => {
    const socCode = String(row['OCC_CODE'] || '').trim().replace(/-/g, '')
    const areaCode = String(row['AREA'] || '').trim()
    const areaTitle = String(row['AREA_TITLE'] || '').trim()
    const areaType = String(row['AREA_TYPE'] || '').trim()

    // OEWS AREA_TYPE codes: 1=National, 2=State, 3=MSA, 4=Nonmetropolitan, 5=BLS-defined
    const areaTypeLabel = areaType === '3' ? 'msa' : areaType === '4' ? 'nonmetro' : areaType === '2' ? 'state' : 'unknown'

    // Parse percentiles - "#" means suppressed data
    const parseNum = (val: unknown): number | null => {
      const s = String(val || '').trim()
      if (s === '#' || s === '' || s === '(X)') return null
      const n = parseFloat(s)
      return isNaN(n) ? null : n
    }

    return {
      socCode,
      socTitle: String(row['OCC_TITLE'] || '').trim(),
      areaCode,
      areaTitle,
      areaType: areaTypeLabel,
      year,
      mean: parseNum(row['A_MEAN']),
      p10: parseNum(row['A_PCT10']),
      p25: parseNum(row['A_PCT25']),
      p50: parseNum(row['A_MEDIAN']),
      p75: parseNum(row['A_PCT75']),
      p90: parseNum(row['A_PCT90']),
      employment: parseNum(row['TOT_EMP'])
    }
  })

  return { wages, year }
}

// Main ingestion function
export async function ingestOewsWages(filePath: string): Promise<{
  success: boolean
  recordCount: number
  ingestRunId: string
  year: number
}> {
  const ingestRun = await prisma.ingestRun.create({
    data: {
      dataset: 'oews_wages',
      sourceUrl: 'https://www.bls.gov/oes/tables.htm',
      status: 'running'
    }
  })

  try {
    const { wages, year } = await parseOewsZip(filePath)
    console.log(`Parsed ${wages.length} OEWS wage records for year ${year}`)

    // Clear existing OEWS data
    await prisma.wagesOews.deleteMany({})

    // Insert using createMany for speed (single SQL INSERT with multiple VALUES)
    const BATCH_SIZE = 5000
    let upsertCount = 0

    for (let i = 0; i < wages.length; i += BATCH_SIZE) {
      const batch = wages.slice(i, i + BATCH_SIZE)

      await prisma.wagesOews.createMany({
        data: batch.map(w => ({
          socCode: w.socCode,
          socTitle: w.socTitle,
          areaCode: w.areaCode,
          areaTitle: w.areaTitle,
          areaType: w.areaType,
          year: w.year,
          mean: w.mean,
          p10: w.p10,
          p25: w.p25,
          p50: w.p50,
          p75: w.p75,
          p90: w.p90,
          employment: w.employment,
          sourceUrl: 'https://www.bls.gov/oes/tables.htm',
          ingestedAt: new Date()
        }))
      })

      upsertCount += batch.length
      if (upsertCount % 50000 === 0) {
        console.log(`Processed ${upsertCount}/${wages.length} wage records`)
      }
    }

    // Update refresh log
    await prisma.dataRefreshLog.upsert({
      where: { dataset: 'oews_wages' },
      update: {
        lastChecked: new Date(),
        lastUpdated: new Date(),
        version: year.toString(),
        status: 'success'
      },
      create: {
        dataset: 'oews_wages',
        lastChecked: new Date(),
        lastUpdated: new Date(),
        version: year.toString(),
        status: 'success'
      }
    })

    await prisma.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        recordCount: upsertCount,
        version: year.toString()
      }
    })

    return { success: true, recordCount: upsertCount, ingestRunId: ingestRun.id, year }

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

    throw error
  }
}
