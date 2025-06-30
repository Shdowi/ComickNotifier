import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ComickScraper } from '@/lib/scraper/comick'

export async function GET() {
  try {
    const healthChecks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'unknown',
      scraper: 'unknown',
      environment: process.env.NODE_ENV || 'development',
    }

    // Test database connection
    try {
      await db.query.users.findFirst()
      healthChecks.database = 'healthy'
    } catch (dbError) {
      console.error('Database health check failed:', dbError)
      healthChecks.database = 'unhealthy'
      healthChecks.status = 'degraded'
    }

    // Test scraper connection
    try {
      const scraperHealthy = await ComickScraper.testConnection()
      healthChecks.scraper = scraperHealthy ? 'healthy' : 'unhealthy'
      if (!scraperHealthy) {
        healthChecks.status = 'degraded'
      }
    } catch (scraperError) {
      console.error('Scraper health check failed:', scraperError)
      healthChecks.scraper = 'unhealthy'
      healthChecks.status = 'degraded'
    }

    const statusCode = healthChecks.status === 'healthy' ? 200 : 503

    return NextResponse.json(healthChecks, { status: statusCode })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 }
    )
  }
} 