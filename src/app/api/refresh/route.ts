// src/app/api/refresh/route.ts
// Data refresh endpoint - triggers Federal Register ingestion
// Use with Vercel Cron or manual calls to keep policy data fresh

import { NextRequest, NextResponse } from 'next/server'
import { ingestFederalRegister } from '@/lib/ingest/federal-register'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  // Optional: check for a refresh secret to prevent abuse
  const secret = request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.REFRESH_SECRET

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Clear cache to force re-fetch
    await prisma.dataRefreshLog.deleteMany({ where: { dataset: 'federal_register' } })
    await prisma.policyDocument.deleteMany({})

    const result = await ingestFederalRegister()

    return NextResponse.json({
      success: true,
      message: `Refreshed Federal Register data`,
      recordsProcessed: result.recordCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Refresh failed:', error)
    return NextResponse.json(
      { error: 'Refresh failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Return current data freshness status
  const logs = await prisma.dataRefreshLog.findMany({
    orderBy: { lastChecked: 'desc' }
  })

  const policyCount = await prisma.policyDocument.count()

  return NextResponse.json({
    datasets: logs.map(log => ({
      dataset: log.dataset,
      lastChecked: log.lastChecked,
      lastUpdated: log.lastUpdated,
      version: log.version,
      status: log.status
    })),
    policyDocumentCount: policyCount,
    timestamp: new Date().toISOString()
  })
}
