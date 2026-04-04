// src/lib/ingest/onet.ts
// O*NET Occupation data parser
// Source: https://www.onetcenter.org/database.html (CC BY 4.0)
// Handles the O*NET Database ZIP (40 Excel files)

import { prisma } from '../db'
import path from 'path'
import fs from 'fs'
import AdmZip from 'adm-zip'
import * as XLSX from 'xlsx'
import { buildSocIndex } from '../soc-matcher'

const ONET_DOWNLOAD_URL = 'https://www.onetcenter.org/database.html'

// Parse O*NET Database ZIP file (contains 40 .xlsx files)
export async function parseOnetZip(zipPath: string): Promise<{
  occupations: Array<{
    onetSocCode: string
    socCode: string
    title: string
    description: string | null
    tasks: string[] | null
    sampleTitles: string[] | null
  }>
  version: string
}> {
  console.log(`Extracting O*NET ZIP: ${zipPath}`)
  const zip = new AdmZip(zipPath)
  const zipEntries = zip.getEntries()

  // Detect version from filename or folder
  const versionMatch = zipPath.match(/(\d{2}\.\d)/) || zipEntries[0]?.entryName.match(/(\d{2}\.\d)/)
  const version = versionMatch ? versionMatch[1] : 'unknown'
  console.log(`Detected O*NET version: ${version}`)

  // Find XLSX files we need by name
  const findFile = (pattern: string) => {
    return zipEntries.find(e =>
      !e.isDirectory &&
      e.entryName.toLowerCase().includes(pattern.toLowerCase()) &&
      e.entryName.toLowerCase().endsWith('.xlsx')
    )
  }

  // 1. Occupation Data (title, description)
  const occEntry = findFile('occupation data')
  if (!occEntry) throw new Error('Could not find Occupation Data.xlsx in ZIP')

  const occTmp = path.join(process.cwd(), 'tmp-onet-occ.xlsx')
  fs.writeFileSync(occTmp, occEntry.getData())
  const occWb = XLSX.readFile(occTmp)
  const occRows = XLSX.utils.sheet_to_json<Record<string, string>>(occWb.Sheets[occWb.SheetNames[0]])
  fs.unlinkSync(occTmp)

  console.log(`Found ${occRows.length} occupations in Occupation Data.xlsx`)

  // 2. Task Statements
  const taskEntry = findFile('task statements')
  const taskMap = new Map<string, string[]>()
  if (taskEntry) {
    const taskTmp = path.join(process.cwd(), 'tmp-onet-task.xlsx')
    fs.writeFileSync(taskTmp, taskEntry.getData())
    const taskWb = XLSX.readFile(taskTmp)
    const taskRows = XLSX.utils.sheet_to_json<Record<string, string>>(taskWb.Sheets[taskWb.SheetNames[0]])
    fs.unlinkSync(taskTmp)

    for (const row of taskRows) {
      const code = (row['O*NET-SOC Code'] || '').trim()
      const task = (row['Task'] || '').trim()
      if (code && task) {
        if (!taskMap.has(code)) taskMap.set(code, [])
        taskMap.get(code)!.push(task)
      }
    }
    console.log(`Found tasks for ${taskMap.size} occupations`)
  }

  // 3. Sample of Reported Titles (alternate job titles)
  const titleEntry = findFile('sample of reported')
  const titleMap = new Map<string, string[]>()
  if (titleEntry) {
    const titleTmp = path.join(process.cwd(), 'tmp-onet-title.xlsx')
    fs.writeFileSync(titleTmp, titleEntry.getData())
    const titleWb = XLSX.readFile(titleTmp)
    const titleRows = XLSX.utils.sheet_to_json<Record<string, string>>(titleWb.Sheets[titleWb.SheetNames[0]])
    fs.unlinkSync(titleTmp)

    for (const row of titleRows) {
      const code = (row['O*NET-SOC Code'] || '').trim()
      const title = (row['Reported Job Title'] || '').trim()
      if (code && title) {
        if (!titleMap.has(code)) titleMap.set(code, [])
        titleMap.get(code)!.push(title)
      }
    }
    console.log(`Found sample titles for ${titleMap.size} occupations`)
  }

  // Build occupation objects
  const occupations = occRows.map(row => {
    const onetSocCode = (row['O*NET-SOC Code'] || '').trim()
    const title = (row['Title'] || '').trim()
    const description = (row['Description'] || '').trim() || null

    if (!onetSocCode || !title) return null

    // Derive SOC from O*NET-SOC (drop the last 2 decimal digits)
    // e.g., "15-1252.00" -> "15-1252" -> "151252"
    const socBase = onetSocCode.includes('.')
      ? onetSocCode.substring(0, onetSocCode.indexOf('.'))
      : onetSocCode
    const socCode = socBase.replace(/-/g, '').substring(0, 7)

    return {
      onetSocCode,
      socCode,
      title,
      description,
      tasks: taskMap.get(onetSocCode) || null,
      sampleTitles: titleMap.get(onetSocCode) || null
    }
  }).filter(Boolean) as Array<{
    onetSocCode: string
    socCode: string
    title: string
    description: string | null
    tasks: string[] | null
    sampleTitles: string[] | null
  }>

  return { occupations, version }
}

// Main ingestion function
export async function ingestOnet(filePath: string): Promise<{
  success: boolean
  recordCount: number
  ingestRunId: string
  version: string
}> {
  const ingestRun = await prisma.ingestRun.create({
    data: {
      dataset: 'onet',
      sourceUrl: ONET_DOWNLOAD_URL,
      status: 'running'
    }
  })

  try {
    const { occupations, version } = await parseOnetZip(filePath)
    console.log(`Parsed ${occupations.length} O*NET occupations for version ${version}`)

    // Clear existing data for fresh import
    await prisma.socMatchIndex.deleteMany({})
    await prisma.occupation.deleteMany({})

    // Insert occupations in batches
    const BATCH_SIZE = 100
    let upsertCount = 0

    for (let i = 0; i < occupations.length; i += BATCH_SIZE) {
      const batch = occupations.slice(i, i + BATCH_SIZE)

      await prisma.$transaction(
        batch.map(occ =>
          prisma.occupation.create({
            data: {
              onetSocCode: occ.onetSocCode,
              socCode: occ.socCode,
              title: occ.title,
              description: occ.description,
              tasks: occ.tasks ? JSON.stringify(occ.tasks) : null,
              sampleTitles: occ.sampleTitles ? JSON.stringify(occ.sampleTitles) : null,
              ingestRunId: ingestRun.id
            }
          })
        )
      )

      upsertCount += batch.length
      if (upsertCount % 200 === 0) {
        console.log(`Processed ${upsertCount}/${occupations.length} occupations`)
      }
    }

    // Build TF-IDF index for each occupation
    console.log('Building TF-IDF match index...')
    for (const occ of occupations) {
      await buildSocIndex(
        occ.onetSocCode,
        occ.title,
        occ.description,
        occ.tasks,
        occ.sampleTitles
      )
    }
    console.log(`TF-IDF index built successfully (${occupations.length} occupations indexed)`)

    // Update refresh log
    await prisma.dataRefreshLog.upsert({
      where: { dataset: 'onet' },
      update: {
        lastChecked: new Date(),
        lastUpdated: new Date(),
        version,
        status: 'success'
      },
      create: {
        dataset: 'onet',
        lastChecked: new Date(),
        lastUpdated: new Date(),
        version,
        status: 'success'
      }
    })

    // Update ingest run
    await prisma.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        recordCount: upsertCount,
        version
      }
    })

    return { success: true, recordCount: upsertCount, ingestRunId: ingestRun.id, version }

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

// Seed demo occupations if no O*NET file is available
export async function seedDemoOccupations(): Promise<{
  success: boolean
  recordCount: number
}> {
  console.log('Seeding demo occupations...')

  await prisma.socMatchIndex.deleteMany({})
  await prisma.occupation.deleteMany({})

  const demoOccupations = [
    { onetSocCode: '15-1252.00', socCode: '151252', title: 'Software Developers', description: 'Research, design, and develop computer and network software or specialized utility programs.', tasks: ['Analyze user needs', 'Design and develop software', 'Modify existing software'], sampleTitles: ['Software Engineer', 'Application Developer', 'Full Stack Developer'] },
    { onetSocCode: '15-1256.00', socCode: '151256', title: 'Software Developers and QA Analysts', description: 'Develop, create, and modify general computer applications software.', tasks: ['Develop test procedures', 'Design software applications'], sampleTitles: ['QA Engineer', 'Software Tester'] },
    { onetSocCode: '15-2051.00', socCode: '152051', title: 'Data Scientists', description: 'Develop analytics applications to transform raw data into meaningful information.', tasks: ['Analyze large datasets', 'Develop predictive models'], sampleTitles: ['Data Analyst', 'Data Scientist', 'ML Engineer'] },
    { onetSocCode: '15-1299.00', socCode: '151299', title: 'Computer Occupations, All Other', description: 'All computer occupations not listed separately.', tasks: ['Perform computer-related tasks'], sampleTitles: ['IT Specialist', 'Systems Administrator'] },
    { onetSocCode: '15-1211.00', socCode: '151211', title: 'Computer Systems Analysts', description: 'Analyze data processing problems to implement and improve computer systems.', tasks: ['Analyze user requirements', 'Design computer systems'], sampleTitles: ['Systems Analyst', 'IT Analyst'] },
    { onetSocCode: '15-1212.00', socCode: '151212', title: 'Information Security Analysts', description: 'Plan, implement, upgrade, or monitor security measures.', tasks: ['Monitor security breaches', 'Implement security measures'], sampleTitles: ['Security Analyst', 'Cybersecurity Analyst'] },
    { onetSocCode: '15-1244.00', socCode: '151244', title: 'Network and Computer Systems Administrators', description: 'Install, configure, and maintain networks and systems.', tasks: ['Maintain network infrastructure', 'Configure servers'], sampleTitles: ['Network Administrator', 'DevOps Engineer'] },
    { onetSocCode: '15-1243.00', socCode: '151243', title: 'Computer Network Architects', description: 'Design and implement computer and information networks.', tasks: ['Design network infrastructure', 'Implement security measures'], sampleTitles: ['Network Architect', 'Cloud Architect'] },
    { onetSocCode: '11-3021.00', socCode: '113021', title: 'Computer and Information Systems Managers', description: 'Plan, direct, or coordinate IT activities.', tasks: ['Direct IT department', 'Manage technology budgets'], sampleTitles: ['IT Manager', 'CTO', 'VP of Engineering'] },
    { onetSocCode: '15-1221.00', socCode: '151221', title: 'Computer and Information Research Scientists', description: 'Conduct research into fundamental computer and information science.', tasks: ['Conduct research', 'Develop new technologies'], sampleTitles: ['Research Scientist', 'AI Researcher'] },
    { onetSocCode: '13-2011.00', socCode: '132011', title: 'Accountants and Auditors', description: 'Examine, analyze, and interpret accounting records.', tasks: ['Analyze financial records', 'Prepare financial statements'], sampleTitles: ['Accountant', 'Auditor', 'CPA'] },
    { onetSocCode: '15-1253.00', socCode: '151253', title: 'Software Quality Assurance Analysts and Testers', description: 'Develop and execute software tests to identify problems.', tasks: ['Create test plans', 'Document defects'], sampleTitles: ['QA Analyst', 'Test Engineer'] },
    { onetSocCode: '15-1232.00', socCode: '151232', title: 'Computer User Support Specialists', description: 'Provide technical assistance to computer users.', tasks: ['Answer user questions', 'Install software'], sampleTitles: ['IT Support', 'Help Desk Technician'] },
    { onetSocCode: '15-2051.01', socCode: '152051', title: 'Business Intelligence Analysts', description: 'Produce financial and market intelligence by querying data repositories.', tasks: ['Analyze business data', 'Create dashboards'], sampleTitles: ['Business Analyst', 'BI Developer'] },
    { onetSocCode: '15-2099.01', socCode: '152099', title: 'Bioinformatics Technicians', description: 'Apply bioinformatics to assist scientists.', tasks: ['Develop bioinformatics tools', 'Analyze biological data'], sampleTitles: ['Bioinformatics Analyst'] },
  ]

  let count = 0
  for (const occ of demoOccupations) {
    await prisma.occupation.create({
      data: {
        onetSocCode: occ.onetSocCode,
        socCode: occ.socCode,
        title: occ.title,
        description: occ.description,
        tasks: JSON.stringify(occ.tasks),
        sampleTitles: JSON.stringify(occ.sampleTitles)
      }
    })
    await buildSocIndex(occ.onetSocCode, occ.title, occ.description, occ.tasks, occ.sampleTitles)
    count++
  }

  await prisma.dataRefreshLog.upsert({
    where: { dataset: 'onet' },
    update: { lastChecked: new Date(), lastUpdated: new Date(), version: 'demo', status: 'success' },
    create: { dataset: 'onet', lastChecked: new Date(), lastUpdated: new Date(), version: 'demo', status: 'success' }
  })

  console.log(`Seeded ${count} demo occupations with TF-IDF index`)
  return { success: true, recordCount: count }
}
