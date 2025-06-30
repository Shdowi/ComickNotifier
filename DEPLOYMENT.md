# 🚀 Deployment Guide - Comick Notifier

This guide will help you deploy the Comick Notifier web application to Vercel.

## 📋 Prerequisites

- Vercel account
- Supabase account for PostgreSQL database
- Discord webhook URL for notifications
- Google Drive file with manga series list (optional)

## 🔧 Environment Variables

Set up these environment variables in your Vercel dashboard:

### Required Variables
```env
# Database (Supabase)
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="your-random-secret-key-here"

# Cron Job Security
CRON_SECRET="your-cron-secret-key"
```

### Optional Variables
```env
# Series List
GOOGLE_DRIVE_SERIES_LIST_URL="https://drive.google.com/uc?export=download&id=YOUR_FILE_ID"

# Cron Job Security
CRON_SECRET="your-cron-secret-key"

# Monitoring
NODE_ENV="production"
```

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for the database to be provisioned
4. Go to Settings → Database → Connection string
5. Copy the connection string and set as `DATABASE_URL`

### 2. Initialize Database Schema
```bash
# Install dependencies
npm install

# Push schema to database
npx drizzle-kit push:pg
```

## 🔔 Discord Notification Setup

### 1. Create Discord Webhook
1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Create New Webhook
4. Choose the channel for notifications
5. Copy the webhook URL
6. Users will add this webhook URL in their dashboard settings

### 2. Test Webhook (Optional)
You can test webhooks using the built-in test feature in the application dashboard.

## 📂 Series List Setup (Optional)

### 1. Create Google Drive File
1. Create a text file with one manga title per line
2. Upload to Google Drive
3. Share with "Anyone with the link can view"
4. Get the file ID from the share URL
5. Set `GOOGLE_DRIVE_SERIES_LIST_URL`

Example series list format:
```
One Piece
Naruto
Attack on Titan
My Hero Academia
Demon Slayer
```

## 🚀 Deployment Steps

### 1. Deploy to Vercel
```bash
# Using Vercel CLI
vercel --prod

# Or connect GitHub repository in Vercel dashboard
```

### 2. Configure Domain (Optional)
1. Go to Vercel dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match your domain

### 3. Set up Cron Jobs
The `vercel.json` file already configures automatic scraping every 5 minutes.

Add `CRON_SECRET` environment variable for security:
```env
CRON_SECRET="your-secure-random-string"
```

## 🔍 Verification

### 1. Test Health Endpoint
```bash
curl https://your-domain.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "healthy",
  "scraper": "healthy",
  "environment": "production"
}
```

### 2. Test User Registration
1. Visit `/auth/signup`
2. Create a test account
3. Check email for welcome message

### 3. Monitor Cron Jobs
- Check Vercel Functions tab for cron execution logs
- Monitor `/api/cron/scrape` endpoint

## 📊 Monitoring & Maintenance

### Health Checks
- **Application**: `GET /api/health`
- **Database**: Automatic connection testing
- **Scraper**: Comick.io connectivity check

### Logs
- View logs in Vercel dashboard → Functions
- Monitor cron job execution
- Track notification delivery rates

### Database Maintenance
```bash
# View database in browser
npm run db:studio

# Reset database (destructive)
npm run db:reset
```

## 🔒 Security Considerations

### Environment Variables
- Use strong, random secrets for `NEXTAUTH_SECRET`
- Secure `CRON_SECRET` for cron job protection
- Keep database credentials private

### Database Security
- Use connection pooling for better performance
- Enable SSL connections
- Regular backups (automatic with Vercel Postgres)

### Email Security
- Use verified domains for sending
- Monitor delivery rates
- Implement rate limiting for notifications

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check connection string format
# Ensure database exists and is accessible
# Verify credentials
```

#### Cron Jobs Not Running
```bash
# Check vercel.json configuration
# Verify CRON_SECRET environment variable
# Monitor function logs
```

#### Email Not Sending
```bash
# Verify RESEND_API_KEY
# Check domain verification
# Monitor Resend dashboard
```

#### Scraper Issues
```bash
# Test Comick.io connectivity
# Check if site structure changed
# Monitor scraper error logs
```

### Debug Commands
```bash
# Test API endpoints locally
npm run dev
curl http://localhost:3000/api/health

# Check database schema
npm run db:studio

# Test email functionality
curl -X POST http://localhost:3000/api/test/email
```

## 📈 Performance Optimization

### Database
- Use connection pooling
- Optimize queries with indexes
- Regular maintenance and updates

### Caching
- Enable Vercel Edge caching
- Cache series lists and static data
- Implement Redis for session storage (optional)

### Monitoring
- Set up Vercel Analytics
- Monitor function execution times
- Track error rates and performance metrics

## 🔄 Updates & Maintenance

### Regular Tasks
- Monitor cron job execution
- Check notification delivery rates
- Update manga series list
- Review and update dependencies

### Scaling Considerations
- Monitor database usage
- Consider read replicas for high traffic
- Implement CDN for static assets
- Optimize cron job frequency based on usage

---

## 🆘 Support

For issues or questions:
- Check the [README.md](README.md) for setup instructions
- Review logs in Vercel dashboard
- Test individual API endpoints
- Monitor database performance

Happy deploying! 🎉 