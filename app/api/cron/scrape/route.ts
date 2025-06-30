import { NextRequest, NextResponse } from 'next/server'
import { ComickScraper } from '@/lib/scraper/comick'
import { db, series, chapters, subscriptions, notifications } from '@/lib/db'
import { EmailNotificationService } from '@/lib/notifications/email'
import { eq, and, not } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting automated chapter scraping...')
    
    // Scrape new chapters
    const newChapters = await ComickScraper.scrapeNewChapters()
    console.log(`Found ${newChapters.length} new chapters`)

    if (newChapters.length === 0) {
      return NextResponse.json({
        message: 'No new chapters found',
        timestamp: new Date().toISOString(),
      })
    }

    let processedChapters = 0
    let notificationsSent = 0

    for (const chapter of newChapters) {
      try {
        // Find or create series
        let existingSeries = await db.query.series.findFirst({
          where: eq(series.title, chapter.seriesTitle)
        })

        if (!existingSeries) {
          // Create new series if it doesn't exist
          const newSeries = await db.insert(series).values({
            title: chapter.seriesTitle,
            slug: chapter.seriesTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
            status: 'ongoing',
            lastChapter: chapter.chapterNumber,
            lastUpdated: chapter.releaseDate,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning()
          
          existingSeries = newSeries[0]
        }

        // Check if chapter already exists
        const existingChapter = await db.query.chapters.findFirst({
          where: and(
            eq(chapters.seriesId, existingSeries.id),
            eq(chapters.chapterNumber, chapter.chapterNumber)
          )
        })

        if (existingChapter) {
          continue // Skip if chapter already processed
        }

        // Insert new chapter
        const newChapter = await db.insert(chapters).values({
          seriesId: existingSeries.id,
          title: chapter.title,
          chapterNumber: chapter.chapterNumber,
          releaseDate: chapter.releaseDate,
          comickUrl: chapter.comickUrl,
          isProcessed: false,
          createdAt: new Date(),
        }).returning()

        processedChapters++

        // Get all subscribers for this series
        const subscribers = await db.query.subscriptions.findMany({
          where: and(
            eq(subscriptions.seriesId, existingSeries.id),
            eq(subscriptions.isActive, true)
          ),
          with: {
            user: true
          }
        })

        // Send notifications to subscribers
        for (const subscription of subscribers) {
          try {
            if (subscription.user.emailNotifications) {
              const success = await EmailNotificationService.sendChapterNotification({
                user: subscription.user,
                chapter: newChapter[0],
                series: existingSeries,
              })

              // Record notification attempt
              await db.insert(notifications).values({
                userId: subscription.user.id,
                chapterId: newChapter[0].id,
                type: 'email',
                status: success ? 'sent' : 'failed',
                sentAt: success ? new Date() : null,
                errorMessage: success ? null : 'Email delivery failed',
                createdAt: new Date(),
              })

              if (success) {
                notificationsSent++
              }
            }
          } catch (notificationError) {
            console.error(`Failed to send notification to user ${subscription.user.id}:`, notificationError)
          }
        }

        // Mark chapter as processed
        await db.update(chapters)
          .set({ isProcessed: true })
          .where(eq(chapters.id, newChapter[0].id))

        // Update series last chapter
        await db.update(series)
          .set({ 
            lastChapter: chapter.chapterNumber,
            lastUpdated: chapter.releaseDate,
            updatedAt: new Date()
          })
          .where(eq(series.id, existingSeries.id))

      } catch (chapterError) {
        console.error(`Error processing chapter ${chapter.title}:`, chapterError)
      }
    }

    console.log(`Scraping completed: ${processedChapters} chapters processed, ${notificationsSent} notifications sent`)

    return NextResponse.json({
      message: 'Scraping completed successfully',
      timestamp: new Date().toISOString(),
      stats: {
        chaptersFound: newChapters.length,
        chaptersProcessed: processedChapters,
        notificationsSent,
      }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Scraping failed',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 