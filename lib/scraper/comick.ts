import * as cheerio from 'cheerio'
import { sleep } from '@/lib/utils'

// Use dynamic import for cloudscraper to avoid Next.js issues
let cloudScraper: any = null

async function getCloudScraper() {
  if (!cloudScraper) {
    cloudScraper = await import('cloudscraper')
  }
  return cloudScraper.default || cloudScraper
}

export interface ComickChapter {
  title: string
  chapterNumber: string
  releaseDate: Date
  seriesTitle: string
  comickUrl?: string
}

export interface SeriesInfo {
  title: string
  slug: string
  description?: string
  coverImage?: string
  genres: string[]
  status: 'ongoing' | 'completed' | 'hiatus'
  comickId?: string
}

export class ComickScraper {
  private static readonly BASE_URL = 'https://comick.io'
  private static readonly NEW_RELEASES_URL = `${ComickScraper.BASE_URL}/home2#view="new"`
  private static readonly COOLDOWN_MINUTES = 10
  private static readonly SERIES_LIST_URL = process.env.GOOGLE_DRIVE_SERIES_LIST_URL || ''

  private static async createScraper() {
    const cloudscraper = await getCloudScraper()
    return cloudscraper.create({
      delay: 2000, // 2 second delay between requests
      timeout: 30000, // 30 second timeout
    })
  }

  /**
   * Fetch the list of series from Google Drive
   */
  static async fetchSeriesList(): Promise<string[]> {
    if (!this.SERIES_LIST_URL) {
      throw new Error('GOOGLE_DRIVE_SERIES_LIST_URL not configured')
    }

    try {
      const scraper = await this.createScraper()
      const response = await scraper.get(this.SERIES_LIST_URL)
      
      if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch series list: HTTP ${response.statusCode}`)
      }

      return response.body
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
    } catch (error) {
      console.error('Error fetching series list:', error)
      throw error
    }
  }

  /**
   * Scrape new chapter releases from Comick
   */
  static async scrapeNewChapters(): Promise<ComickChapter[]> {
    try {
      const scraper = await this.createScraper()
      const response = await scraper.get(this.NEW_RELEASES_URL)
      
      if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch new releases: HTTP ${response.statusCode}`)
      }

      const $ = cheerio.load(response.body)
      const chapters: ComickChapter[] = []
      const now = new Date()

      // Find update cards - try multiple selectors based on the Discord bot logic
      let updateCards = $('h2:contains("Updates")')
        .next('div')
        .find('a[href]')

      // Fallback: look for any cards with the expected structure
      if (updateCards.length === 0) {
        updateCards = $('a[href]').filter((_, el) => {
          const $el = $(el)
          return (
            $el.find('p.series-title').length > 0 &&
            $el.find('p.series-chapter').length > 0 &&
            $el.find('time').length > 0
          )
        })
      }

      updateCards.each((_, card) => {
        try {
          const $card = $(card)
          const titleElement = $card.find('p.series-title')
          const chapterElement = $card.find('p.series-chapter')
          const timeElement = $card.find('time')

          if (!titleElement.length || !chapterElement.length || !timeElement.length) {
            return
          }

          const title = titleElement.text().trim()
          const chapter = chapterElement.text().trim()
          const timestamp = timeElement.attr('datetime')

          if (!title || !chapter || !timestamp) {
            return
          }

          const releaseDate = new Date(timestamp.replace('Z', '+00:00'))
          const timeDifference = (now.getTime() - releaseDate.getTime()) / (1000 * 60)

          // Only include chapters released within the cooldown period
          if (timeDifference <= this.COOLDOWN_MINUTES) {
            chapters.push({
              title,
              chapterNumber: chapter,
              releaseDate,
              seriesTitle: title,
              comickUrl: $card.attr('href') ? `${this.BASE_URL}${$card.attr('href')}` : undefined,
            })
          }
        } catch (error) {
          console.warn('Error parsing chapter card:', error)
        }
      })

      return chapters
    } catch (error) {
      console.error('Error scraping new chapters:', error)
      throw error
    }
  }

  /**
   * Search for a specific series on Comick
   */
  static async searchSeries(query: string): Promise<SeriesInfo[]> {
    try {
      const scraper = await this.createScraper()
      const searchUrl = `${this.BASE_URL}/search?q=${encodeURIComponent(query)}`
      const response = await scraper.get(searchUrl)
      
      if (response.statusCode !== 200) {
        throw new Error(`Search failed: HTTP ${response.statusCode}`)
      }

      const $ = cheerio.load(response.body)
      const results: SeriesInfo[] = []

      // Parse search results (adjust selectors based on actual Comick HTML structure)
      $('.search-result').each((_, element) => {
        try {
          const $el = $(element)
          const title = $el.find('.title').text().trim()
          const description = $el.find('.description').text().trim()
          const coverImage = $el.find('img').attr('src')
          const link = $el.find('a').attr('href')
          
          if (title) {
            results.push({
              title,
              slug: this.createSlug(title),
              description: description || undefined,
              coverImage: coverImage ? `${this.BASE_URL}${coverImage}` : undefined,
              genres: [], // Would need to parse from the page
              status: 'ongoing', // Default status
              comickId: link ? this.extractComickId(link) : undefined,
            })
          }
        } catch (error) {
          console.warn('Error parsing search result:', error)
        }
      })

      return results
    } catch (error) {
      console.error('Error searching series:', error)
      throw error
    }
  }

  /**
   * Get detailed information about a series
   */
  static async getSeriesDetails(comickId: string): Promise<SeriesInfo | null> {
    try {
      const scraper = await this.createScraper()
      const seriesUrl = `${this.BASE_URL}/comic/${comickId}`
      const response = await scraper.get(seriesUrl)
      
      if (response.statusCode !== 200) {
        return null
      }

      const $ = cheerio.load(response.body)
      
      const title = $('h1.title').text().trim()
      const description = $('.description p').text().trim()
      const coverImage = $('.cover img').attr('src')
      const status = $('.status').text().trim().toLowerCase()
      const genres = $('.genres .genre')
        .map((_, el) => $(el).text().trim())
        .get()

      if (!title) {
        return null
      }

      return {
        title,
        slug: this.createSlug(title),
        description: description || undefined,
        coverImage: coverImage ? `${this.BASE_URL}${coverImage}` : undefined,
        genres,
        status: this.normalizeStatus(status),
        comickId,
      }
    } catch (error) {
      console.error('Error getting series details:', error)
      return null
    }
  }

  private static createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  private static extractComickId(url: string): string {
    const match = url.match(/\/comic\/([^\/]+)/)
    return match ? match[1] : ''
  }

  private static normalizeStatus(status: string): 'ongoing' | 'completed' | 'hiatus' {
    const normalizedStatus = status.toLowerCase()
    if (normalizedStatus.includes('completed') || normalizedStatus.includes('finished')) {
      return 'completed'
    }
    if (normalizedStatus.includes('hiatus') || normalizedStatus.includes('pause')) {
      return 'hiatus'
    }
    return 'ongoing'
  }

  /**
   * Test the scraper connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const scraper = await this.createScraper()
      const response = await scraper.get(this.BASE_URL)
      return response.statusCode === 200
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }
} 