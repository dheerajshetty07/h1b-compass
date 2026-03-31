// scripts/seed.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { ingestFederalRegister } from '../src/lib/ingest/federal-register'
import { ingestOflcWages } from '../src/lib/ingest/oflc-wages'
import { ingestOewsWages } from '../src/lib/ingest/oews-wages'
import { ingestOnet, seedDemoOccupations } from '../src/lib/ingest/onet'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // 1. Seed O*NET Occupations (required for SOC matching)
    console.log('\n--- O*NET Occupation Data ---')
    const onetDir = path.join(process.cwd(), 'data', 'onet')
    if (fs.existsSync(onetDir)) {
    const files = fs.readdirSync(onetDir).filter(f => f.endsWith('.zip'))
    if (files.length > 0) {
            for (const file of files) {
                console.log(`Processing O*NET data: ${file}`)
                try {
                    const result = await ingestOnet(path.join(onetDir, file))
                    console.log(`✅ O*NET (${result.version}): Processed ${result.recordCount} occupations`)
                } catch (error) {
                    console.error(`❌ O*NET Ingestion Failed for ${file}:`, error)
                }
            }
        } else {
            console.log('⚠️ No .xlsx files found in data/onet. Seeding demo occupations.')
            await seedDemoOccupations()
        }
    } else {
        console.log('⚠️ data/onet directory not found. Creating it and seeding demo occupations.')
        fs.mkdirSync(onetDir, { recursive: true })
        await seedDemoOccupations()
    }

    // 2. Ingest Federal Register Data (API)
    console.log('\n--- Federal Register Ingestion ---')
    try {
        const frResult = await ingestFederalRegister()
        console.log(`✅ Federal Register: Processed ${frResult.recordCount} documents`)
    } catch (error) {
        console.error('❌ Federal Register Ingestion Failed:', error)
    }

    // 3. Check for OFLC Wage Data
    console.log('\n--- OFLC Wage Data Ingestion ---')
    const oflcDir = path.join(process.cwd(), 'data', 'oflc')
    if (fs.existsSync(oflcDir)) {
        const files = fs.readdirSync(oflcDir).filter(f => f.endsWith('.zip'))
        if (files.length > 0) {
            for (const file of files) {
                console.log(`Processing OFLC data: ${file}`)
                try {
                    const result = await ingestOflcWages(path.join(oflcDir, file))
                    console.log(`✅ OFLC Wages (${result.wageYear}): Processed ${result.recordCount} records`)
                } catch (error) {
                    console.error(`❌ OFLC Ingestion Failed for ${file}:`, error)
                }
            }
        } else {
            console.log('⚠️ No .zip files found in data/oflc. Skipping OFLC ingestion.')
            console.log('👉 Download wage data from https://flag.dol.gov/wage-data/wage-data-downloads')
        }
    } else {
        console.log('⚠️ data/oflc directory not found. Creating it...')
        fs.mkdirSync(oflcDir, { recursive: true })
        console.log('👉 Please place OFLC wage ZIP files in data/oflc')
    }

    // 4. Check for OEWS Wage Data
    console.log('\n--- OEWS Wage Data Ingestion ---')
    const oewsDir = path.join(process.cwd(), 'data', 'oews')
    if (fs.existsSync(oewsDir)) {
        // Check for ZIP files first (need to extract)
        const zipFiles = fs.readdirSync(oewsDir).filter(f => f.endsWith('.zip'))
        const xlsxFiles = fs.readdirSync(oewsDir).filter(f => f.endsWith('.xlsx'))

        if (zipFiles.length > 0) {
            for (const file of zipFiles) {
                console.log(`Processing OEWS data: ${file}`)
                try {
                    const result = await ingestOewsWages(path.join(oewsDir, file))
                    console.log(`✅ OEWS Wages (${result.year}): Processed ${result.recordCount} records`)
                } catch (error) {
                    console.error(`❌ OEWS Ingestion Failed for ${file}:`, error)
                }
            }
        } else if (xlsxFiles.length > 0) {
            for (const file of xlsxFiles) {
                console.log(`Processing OEWS data: ${file}`)
                try {
                    const result = await ingestOewsWages(path.join(oewsDir, file))
                    console.log(`✅ OEWS Wages (${result.year}): Processed ${result.recordCount} records`)
                } catch (error) {
                    console.error(`❌ OEWS Ingestion Failed for ${file}:`, error)
                }
            }
        } else {
            console.log('⚠️ No .zip or .xlsx files found in data/oews. Skipping OEWS ingestion.')
            console.log('👉 Download OEWS data from https://www.bls.gov/oes/tables.htm')
        }
    } else {
        console.log('⚠️ data/oews directory not found. Creating it...')
        fs.mkdirSync(oewsDir, { recursive: true })
        console.log('👉 Please place OEWS Excel files in data/oews')
    }

    console.log('\n✅ Seeding process completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
