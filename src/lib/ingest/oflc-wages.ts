// src/lib/ingest/oflc-wages.ts
// OFLC Prevailing Wage data parser
// Source: https://flag.dol.gov/wage-data/wage-data-downloads
// Handles the OFLC_Wages ZIP (CSV format)

import { prisma } from '../db'
import path from 'path'
import fs from 'fs'
import AdmZip from 'adm-zip'
import { parse } from 'csv-parse/sync'

const DATA_DIR = path.join(process.cwd(), 'data', 'oflc')

// Parse OFLC ZIP file (contains CSV files)
export async function parseOflcZip(zipPath: string): Promise<{
  wages: Array<{
    socCode: string
    areaCode: string
    areaType: string
    areaName: string
    state: string
    wageYear: number
    level1Hourly: number | null
    level1Annual: number | null
    level2Hourly: number | null
    level2Annual: number | null
    level3Hourly: number | null
    level3Annual: number | null
    level4Hourly: number | null
    level4Annual: number | null
  }>
  wageYear: number
}> {
  console.log(`Extracting OFLC ZIP: ${zipPath}`)
  const zip = new AdmZip(zipPath)
  const zipEntries = zip.getEntries()

  // Find the wage data CSV (ALC_Export.csv) and Geography CSV
  const alcEntry = zipEntries.find(e =>
    !e.isDirectory && e.entryName.toLowerCase().includes('alc_export') && e.entryName.toLowerCase().endsWith('.csv')
  )
  const geoEntry = zipEntries.find(e =>
    !e.isDirectory && e.entryName.toLowerCase().includes('geography') && e.entryName.toLowerCase().endsWith('.csv')
  )

  if (!alcEntry) throw new Error('Could not find ALC_Export.csv in ZIP')

  // Parse wage data
  const alcContent = alcEntry.getData().toString('utf8')
  const alcRows = parse(alcContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  console.log(`Found ${alcRows.length} wage records in ALC_Export.csv`)

  // Parse geography data to get area names
  const geoMap = new Map<string, { name: string; state: string; type: string }>()
  if (geoEntry) {
    const geoContent = geoEntry.getData().toString('utf8')
    const geoRows = parse(geoContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    // Deduplicate: keep first occurrence of each area code
    for (const row of geoRows as Array<Record<string, string>>) {
      const area = (row['Area'] || '').trim()
      if (area && !geoMap.has(area)) {
        geoMap.set(area, {
          name: (row['AreaName'] || '').trim(),
          state: (row['StateAb'] || '').trim(),
          type: row['CountyTownName'] ? 'county' : 'msa'
        })
      }
    }
    console.log(`Found ${geoMap.size} unique geography entries`)
  }

  // Detect wage year from filename
  const yearMatch = zipPath.match(/(\d{4})/)
  const wageYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

  // Convert hourly rates to annual (2080 hours = 40 hrs/week * 52 weeks)
  const HOURLY_TO_ANNUAL = 2080

  const wages = (alcRows as Array<Record<string, string>>)
    .filter((row) => {
      // Only keep detailed occupations (not broad/major groups)
      const socCode = (row['SocCode'] || '').trim()
      // OFLC uses format like "15-1252" - we want detailed codes (has all digits after dash)
      return socCode && socCode.includes('-') && socCode.split('-')[1]?.length >= 4
    })
    .map((row: Record<string, string>) => {
      const socCode = (row['SocCode'] || '').trim().replace(/-/g, '')
      const areaCode = (row['Area'] || '').trim()
      const geo = geoMap.get(areaCode)

      const l1 = parseFloat(row['Level1'])
      const l2 = parseFloat(row['Level2'])
      const l3 = parseFloat(row['Level3'])
      const l4 = parseFloat(row['Level4'])

      return {
        socCode,
        areaCode,
        areaType: geo?.type || 'unknown',
        areaName: geo?.name || areaCode,
        state: geo?.state || '',
        wageYear,
        level1Hourly: isNaN(l1) ? null : l1,
        level1Annual: isNaN(l1) ? null : Math.round(l1 * HOURLY_TO_ANNUAL),
        level2Hourly: isNaN(l2) ? null : l2,
        level2Annual: isNaN(l2) ? null : Math.round(l2 * HOURLY_TO_ANNUAL),
        level3Hourly: isNaN(l3) ? null : l3,
        level3Annual: isNaN(l3) ? null : Math.round(l3 * HOURLY_TO_ANNUAL),
        level4Hourly: isNaN(l4) ? null : l4,
        level4Annual: isNaN(l4) ? null : Math.round(l4 * HOURLY_TO_ANNUAL),
      }
    })

  return { wages, wageYear }
}

// Main ingestion function
export async function ingestOflcWages(filePath: string): Promise<{
  success: boolean
  recordCount: number
  ingestRunId: string
  wageYear: number
}> {
  const ingestRun = await prisma.ingestRun.create({
    data: {
      dataset: 'oflc_wages',
      sourceUrl: 'https://flag.dol.gov/wage-data/wage-data-downloads',
      status: 'running'
    }
  })

  try {
    const { wages, wageYear } = await parseOflcZip(filePath)
    console.log(`Parsed ${wages.length} OFLC wage records for year ${wageYear}`)

    // Clear existing OFLC data
    await prisma.wagesOflc.deleteMany({})

    // Insert using createMany for speed (single SQL INSERT with multiple VALUES)
    const BATCH_SIZE = 5000
    let upsertCount = 0

    for (let i = 0; i < wages.length; i += BATCH_SIZE) {
      const batch = wages.slice(i, i + BATCH_SIZE)

      await prisma.wagesOflc.createMany({
        data: batch.map(w => ({
          socCode: w.socCode,
          areaCode: w.areaCode,
          areaType: w.areaType,
          areaName: w.areaName,
          state: w.state,
          wageYear: w.wageYear,
          level1Hourly: w.level1Hourly,
          level1Annual: w.level1Annual,
          level2Hourly: w.level2Hourly,
          level2Annual: w.level2Annual,
          level3Hourly: w.level3Hourly,
          level3Annual: w.level3Annual,
          level4Hourly: w.level4Hourly,
          level4Annual: w.level4Annual,
          sourceUrl: 'https://flag.dol.gov/wage-data/wage-data-downloads',
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
      where: { dataset: 'oflc_wages' },
      update: {
        lastChecked: new Date(),
        lastUpdated: new Date(),
        version: wageYear.toString(),
        status: 'success'
      },
      create: {
        dataset: 'oflc_wages',
        lastChecked: new Date(),
        lastUpdated: new Date(),
        version: wageYear.toString(),
        status: 'success'
      }
    })

    await prisma.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        recordCount: upsertCount,
        version: wageYear.toString()
      }
    })

    return { success: true, recordCount: upsertCount, ingestRunId: ingestRun.id, wageYear }

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
