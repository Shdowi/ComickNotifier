import { Resend } from 'resend'
import { Chapter, Series, User } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY)

interface ChapterNotificationData {
  user: User
  chapter: Chapter
  series: Series
}

export class EmailNotificationService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'notifications@comicknotifier.com'
  private static readonly APP_NAME = 'Comick Notifier'
  private static readonly APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  /**
   * Send a chapter release notification email
   */
  static async sendChapterNotification(data: ChapterNotificationData): Promise<boolean> {
    try {
      const { user, chapter, series } = data

      if (!user.emailNotifications) {
        console.log(`Email notifications disabled for user ${user.id}`)
        return false
      }

      const emailHtml = this.generateChapterNotificationHtml(data)
      const emailText = this.generateChapterNotificationText(data)

      const result = await resend.emails.send({
        from: `${this.APP_NAME} <${this.FROM_EMAIL}>`,
        to: [user.email],
        subject: `📚 New Chapter: ${series.title} - ${chapter.chapterNumber}`,
        html: emailHtml,
        text: emailText,
      })

      if (result.error) {
        console.error('Failed to send email:', result.error)
        return false
      }

      console.log(`Email sent successfully to ${user.email}:`, result.data?.id)
      return true
    } catch (error) {
      console.error('Error sending chapter notification email:', error)
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
    const batchSize = 10
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      
      const promises = batch.map(async (notification) => {
        try {
          const success = await this.sendChapterNotification(notification)
          return success ? 'success' : 'failed'
        } catch (error) {
          console.error('Batch notification error:', error)
          return 'failed'
        }
      })

      const results = await Promise.all(promises)
      successful += results.filter(r => r === 'success').length
      failed += results.filter(r => r === 'failed').length

      // Add delay between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return { successful, failed }
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(user: User): Promise<boolean> {
    try {
      const emailHtml = this.generateWelcomeEmailHtml(user)
      const emailText = this.generateWelcomeEmailText(user)

      const result = await resend.emails.send({
        from: `${this.APP_NAME} <${this.FROM_EMAIL}>`,
        to: [user.email],
        subject: `Welcome to ${this.APP_NAME}! 🎉`,
        html: emailHtml,
        text: emailText,
      })

      if (result.error) {
        console.error('Failed to send welcome email:', result.error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending welcome email:', error)
      return false
    }
  }

  /**
   * Generate HTML for chapter notification email
   */
  private static generateChapterNotificationHtml(data: ChapterNotificationData): string {
    const { user, chapter, series } = data
    const unsubscribeUrl = `${this.APP_URL}/unsubscribe?token=${this.generateUnsubscribeToken(user.id, series.id)}`
    const seriesUrl = `${this.APP_URL}/series/${series.slug}`
    const chapterUrl = chapter.comickUrl || `${this.APP_URL}/series/${series.slug}`

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>New Chapter Released</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .chapter-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
            .button:hover { background: #5a6fd8; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .unsubscribe { color: #999; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 New Chapter Released!</h1>
          </div>
          
          <div class="content">
            <p>Hi ${user.name || 'there'},</p>
            
            <p>Great news! A new chapter has been released for one of your subscribed series:</p>
            
            <div class="chapter-info">
              <h2 style="margin-top: 0; color: #667eea;">${series.title}</h2>
              <p><strong>Chapter:</strong> ${chapter.chapterNumber}</p>
              <p><strong>Released:</strong> ${chapter.releaseDate.toLocaleDateString()}</p>
              ${chapter.title !== series.title ? `<p><strong>Title:</strong> ${chapter.title}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${chapterUrl}" class="button">Read Chapter</a>
              <a href="${seriesUrl}" class="button" style="background: #28a745;">View Series</a>
            </div>
            
            <p>Happy reading! 📖</p>
            
            <div class="footer">
              <p>You're receiving this because you subscribed to notifications for "${series.title}".</p>
              <p class="unsubscribe">
                <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe from this series</a> | 
                <a href="${this.APP_URL}/dashboard" style="color: #999;">Manage all subscriptions</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate plain text for chapter notification email
   */
  private static generateChapterNotificationText(data: ChapterNotificationData): string {
    const { user, chapter, series } = data
    const chapterUrl = chapter.comickUrl || `${this.APP_URL}/series/${series.slug}`
    const unsubscribeUrl = `${this.APP_URL}/unsubscribe?token=${this.generateUnsubscribeToken(user.id, series.id)}`

    return `
📚 New Chapter Released!

Hi ${user.name || 'there'},

A new chapter has been released for "${series.title}":

Chapter: ${chapter.chapterNumber}
Released: ${chapter.releaseDate.toLocaleDateString()}
${chapter.title !== series.title ? `Title: ${chapter.title}\n` : ''}

Read the chapter: ${chapterUrl}

You can manage your subscriptions at: ${this.APP_URL}/dashboard

To unsubscribe from "${series.title}": ${unsubscribeUrl}

Happy reading! 📖

---
${this.APP_NAME}
    `.trim()
  }

  /**
   * Generate welcome email HTML
   */
  private static generateWelcomeEmailHtml(user: User): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Welcome to ${this.APP_NAME}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .feature { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
            .button:hover { background: #5a6fd8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Welcome to ${this.APP_NAME}!</h1>
            <p>Your manga notification hub</p>
          </div>
          
          <div class="content">
            <p>Hi ${user.name || 'there'},</p>
            
            <p>Welcome to ${this.APP_NAME}! We're excited to help you stay up-to-date with your favorite manga series.</p>
            
            <div class="feature">
              <h3>🔔 Never Miss a Chapter</h3>
              <p>Get instant notifications when new chapters are released for your subscribed series.</p>
            </div>
            
            <div class="feature">
              <h3>📱 Multiple Notification Options</h3>
              <p>Choose from email, Discord webhooks, or Telegram notifications - whatever works best for you.</p>
            </div>
            
            <div class="feature">
              <h3>🎯 Smart Filtering</h3>
              <p>Only get notified about the series you care about. No spam, just the manga you love.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.APP_URL}/dashboard" class="button">Get Started</a>
            </div>
            
            <p>Ready to start? Head to your dashboard to subscribe to your favorite series!</p>
            
            <p>Happy reading! 📚</p>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate welcome email plain text
   */
  private static generateWelcomeEmailText(user: User): string {
    return `
🎉 Welcome to ${this.APP_NAME}!

Hi ${user.name || 'there'},

Welcome to ${this.APP_NAME}! We're excited to help you stay up-to-date with your favorite manga series.

What you can do:
• 🔔 Never miss a chapter - Get instant notifications for new releases
• 📱 Multiple notification options - Email, Discord, Telegram, and more
• 🎯 Smart filtering - Only get notified about series you care about

Get started: ${this.APP_URL}/dashboard

Happy reading! 📚

---
${this.APP_NAME}
    `.trim()
  }

  /**
   * Generate unsubscribe token (simple implementation)
   */
  private static generateUnsubscribeToken(userId: string, seriesId: number): string {
    // In production, use a proper JWT or secure token
    return Buffer.from(`${userId}:${seriesId}`).toString('base64url')
  }

  /**
   * Parse unsubscribe token
   */
  static parseUnsubscribeToken(token: string): { userId: string; seriesId: number } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString()
      const [userId, seriesIdStr] = decoded.split(':')
      const seriesId = parseInt(seriesIdStr, 10)
      
      if (!userId || isNaN(seriesId)) {
        return null
      }
      
      return { userId, seriesId }
    } catch (error) {
      return null
    }
  }
} 