import { Chapter, Series, User } from '@/lib/db'

interface ChapterNotificationData {
  user: User
  chapter: Chapter
  series: Series
}

interface DiscordEmbed {
  title: string
  description: string
  color: number
  thumbnail?: {
    url: string
  }
  fields: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer: {
    text: string
  }
  timestamp: string
}

interface DiscordWebhookPayload {
  content?: string
  embeds: DiscordEmbed[]
}

export class DiscordNotificationService {
  private static readonly APP_NAME = 'Comick Notifier'
  private static readonly APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  private static readonly DISCORD_COLOR = 0x667eea // Purple color

  /**
   * Send a chapter release notification to Discord webhook
   */
  static async sendChapterNotification(data: ChapterNotificationData): Promise<boolean> {
    try {
      const { user, chapter, series } = data

      if (!user.discordNotifications || !user.discordWebhook) {
        console.log(`Discord notifications disabled or no webhook for user ${user.id}`)
        return false
      }

      const embed = this.generateChapterNotificationEmbed(data)
      const payload: DiscordWebhookPayload = {
        content: `📚 **New Chapter Released!**`,
        embeds: [embed]
      }

      const response = await fetch(user.discordWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.error('Failed to send Discord notification:', response.status, response.statusText)
        return false
      }

      console.log(`Discord notification sent successfully for user ${user.id}`)
      return true
    } catch (error) {
      console.error('Error sending Discord chapter notification:', error)
      return false
    }
  }

  /**
   * Send multiple chapter notifications in batch
   */
  static async sendBatchChapterNotifications(notifications: ChapterNotificationData[]): Promise<{
    successful: number
    failed: number
  }> {
    let successful = 0
    let failed = 0

    // Process notifications in batches to avoid rate limiting
    const batchSize = 5 // Discord has stricter rate limits
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      
      const promises = batch.map(async (notification) => {
        try {
          const success = await this.sendChapterNotification(notification)
          return success ? 'success' : 'failed'
        } catch (error) {
          console.error('Batch Discord notification error:', error)
          return 'failed'
        }
      })

      const results = await Promise.all(promises)
      successful += results.filter(r => r === 'success').length
      failed += results.filter(r => r === 'failed').length

      // Add delay between batches to respect Discord rate limits
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return { successful, failed }
  }

  /**
   * Send welcome message to Discord webhook
   */
  static async sendWelcomeMessage(user: User): Promise<boolean> {
    try {
      if (!user.discordWebhook) {
        console.log(`No Discord webhook configured for user ${user.id}`)
        return false
      }

      const embed: DiscordEmbed = {
        title: `Welcome to ${this.APP_NAME}! 🎉`,
        description: `Hi ${user.name || 'there'}! Welcome to Comick Notifier. You'll receive notifications here when new chapters are released for your subscribed manga series.`,
        color: this.DISCORD_COLOR,
        fields: [
          {
            name: '📚 Getting Started',
            value: `Visit your [dashboard](${this.APP_URL}/dashboard) to subscribe to manga series`,
            inline: false
          },
          {
            name: '⚙️ Settings',
            value: `You can manage your subscriptions and webhook settings anytime`,
            inline: false
          }
        ],
        footer: {
          text: this.APP_NAME
        },
        timestamp: new Date().toISOString()
      }

      const payload: DiscordWebhookPayload = {
        embeds: [embed]
      }

      const response = await fetch(user.discordWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.error('Failed to send Discord welcome message:', response.status, response.statusText)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending Discord welcome message:', error)
      return false
    }
  }

  /**
   * Test Discord webhook connection
   */
  static async testWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const embed: DiscordEmbed = {
        title: '🔔 Test Notification',
        description: 'This is a test message to verify your Discord webhook is working correctly.',
        color: this.DISCORD_COLOR,
        footer: {
          text: `${this.APP_NAME} - Test`
        },
        timestamp: new Date().toISOString(),
        fields: []
      }

      const payload: DiscordWebhookPayload = {
        embeds: [embed]
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      return response.ok
    } catch (error) {
      console.error('Error testing Discord webhook:', error)
      return false
    }
  }

  /**
   * Generate Discord embed for chapter notification
   */
  private static generateChapterNotificationEmbed(data: ChapterNotificationData): DiscordEmbed {
    const { chapter, series } = data
    const chapterUrl = chapter.comickUrl || `${this.APP_URL}/series/${series.slug}`
    const seriesUrl = `${this.APP_URL}/series/${series.slug}`

    const embed: DiscordEmbed = {
      title: `📖 ${series.title}`,
      description: `**Chapter ${chapter.chapterNumber}** has been released!`,
      color: this.DISCORD_COLOR,
      fields: [
        {
          name: '📅 Release Date',
          value: chapter.releaseDate.toLocaleDateString(),
          inline: true
        },
        {
          name: '🔗 Read Chapter',
          value: `[Click here to read](${chapterUrl})`,
          inline: true
        }
      ],
      footer: {
        text: this.APP_NAME
      },
      timestamp: chapter.releaseDate.toISOString()
    }

    // Add chapter title if different from series title
    if (chapter.title && chapter.title !== series.title) {
      embed.fields.unshift({
        name: '📝 Chapter Title',
        value: chapter.title,
        inline: false
      })
    }

    // Add cover image if available
    if (series.coverImage) {
      embed.thumbnail = {
        url: series.coverImage
      }
    }

    return embed
  }
} 