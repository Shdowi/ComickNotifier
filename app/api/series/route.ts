import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { ComickScraper } from '@/lib/scraper/comick'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get search query from URL params
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (query) {
      // Search for specific series
      const results = await ComickScraper.searchSeries(query)
      return NextResponse.json({ series: results })
    } else {
      // Get the predefined series list
      const seriesList = await ComickScraper.fetchSeriesList()
      const formattedSeries = seriesList.map(title => ({
        title,
        slug: title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
        description: `Follow ${title} for new chapter notifications`,
        genres: [],
        status: 'ongoing' as const,
      }))
      
      return NextResponse.json({ series: formattedSeries })
    }
  } catch (error) {
    console.error('Error fetching series:', error)
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    )
  }
} 