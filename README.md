# 🎌 Comick Notifier Web App

A modern web application that provides manga chapter release notifications for your favorite series from Comick. Built with Next.js 14, featuring real-time notifications, user authentication, and a beautiful responsive interface.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-black)

## ✨ Features

### 🔔 Smart Notifications
- **Email Notifications**: Beautiful HTML emails with chapter details
- **Discord Webhooks**: Server notifications for communities
- **Telegram Integration**: Personal messages via Telegram bot
- **Real-time Monitoring**: Continuous scanning of Comick for new releases

### 📚 Series Management
- **Easy Subscription**: Browse and subscribe to manga series
- **Personal Dashboard**: Manage all your subscriptions in one place
- **Series Search**: Find new series to follow
- **Reading History**: Track your notification history

### 🛡️ User Experience
- **Secure Authentication**: NextAuth.js with credential and OAuth support
- **Modern UI**: Clean, responsive design with dark/light mode
- **Privacy First**: Granular notification preferences
- **Mobile Friendly**: Optimized for all devices

### ⚡ Technical Features
- **Cloudflare Bypass**: Uses cloudscraper to handle Cloudflare protection
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Optimized with Next.js caching strategies
- **Email Service**: Resend for reliable email delivery
- **Monitoring**: Built-in health checks and error handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use Vercel Postgres)
- Resend API key for emails
- Google Drive file with series list (optional)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd ComickNotifier
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env.local` and configure:

```env
# Database
POSTGRES_URL="postgresql://user:password@localhost:5432/comick_notifier"
POSTGRES_PRISMA_URL="postgresql://user:password@localhost:5432/comick_notifier?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgresql://user:password@localhost:5432/comick_notifier"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email notifications (Resend)
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="notifications@yourdomain.com"

# Comick scraping
GOOGLE_DRIVE_SERIES_LIST_URL="https://drive.google.com/uc?export=download&id=YOUR_FILE_ID"
COMICK_BASE_URL="https://comick.io"
```

### 3. Database Setup
```bash
# Push database schema
npm run db:push

# Optional: Open database studio
npm run db:studio
```

### 4. Development
```bash
npm run dev
```

Visit `http://localhost:3000` to see your application!

## 📁 Project Structure

```
ComickNotifier/
├── app/                      # Next.js 14 App Router
│   ├── (auth)/              # Authentication pages
│   ├── api/                 # API routes
│   ├── dashboard/           # User dashboard
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   ├── forms/               # Form components
│   └── providers/           # Context providers
├── lib/                     # Utility libraries
│   ├── auth/                # Authentication config
│   ├── db/                  # Database schema & connection
│   ├── notifications/       # Notification services
│   ├── scraper/            # Comick scraping logic
│   └── utils.ts            # Common utilities
├── Discord Bot/             # Original Discord bot (reference)
└── public/                  # Static assets
```

## 🔧 Configuration

### Database Schema
The app uses a relational database with the following main tables:
- `users` - User accounts and preferences
- `series` - Manga series information
- `subscriptions` - User-series relationships
- `chapters` - Chapter releases
- `notifications` - Sent notification tracking

### Notification Types
Configure multiple notification channels:
- **Email**: HTML emails via Resend
- **Discord**: Webhook integration
- **Telegram**: Bot messaging
- **Web Push**: Browser notifications (planned)

### Scraping Configuration
- **Cooldown**: 10-minute window for new chapters
- **Rate Limiting**: 2-second delays between requests
- **Error Handling**: Retry logic with exponential backoff
- **Cloudflare**: Automatic bypass with cloudscraper

## 📊 API Routes

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/session` - Current session

### Series Management
- `GET /api/series` - List available series
- `POST /api/series/subscribe` - Subscribe to series
- `DELETE /api/series/unsubscribe` - Unsubscribe
- `GET /api/series/search` - Search series

### Notifications
- `GET /api/notifications` - User notification history
- `POST /api/notifications/test` - Test notification
- `GET /api/health` - System health check

### Admin
- `POST /api/admin/scrape` - Manual scrape trigger
- `GET /api/admin/stats` - System statistics

## 🌐 Deployment on Vercel

### 1. Database Setup
Create a PostgreSQL database:
- **Vercel Postgres** (recommended)
- **PlanetScale**
- **Supabase**
- **Railway**

### 2. Environment Variables
Add to Vercel dashboard:
```env
POSTGRES_URL=<your-database-url>
NEXTAUTH_URL=<your-domain>
NEXTAUTH_SECRET=<random-secret>
RESEND_API_KEY=<your-resend-key>
FROM_EMAIL=<verified-sender-email>
```

### 3. Deploy
```bash
# Deploy to Vercel
vercel --prod

# Or use GitHub integration
git push origin main
```

### 4. Cron Jobs
Set up Vercel Cron for automatic scraping:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## 🔍 Monitoring & Observability

### Health Checks
- `/api/health` - Application health
- `/api/health/database` - Database connectivity
- `/api/health/scraper` - Scraping service status

### Logging
- Structured logging with timestamps
- Error tracking and alerting
- Performance monitoring
- User activity tracking

### Metrics
- Active users and subscriptions
- Notification delivery rates
- Scraping success rates
- Response times

## 🛠️ Development

### Code Style
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Husky**: Git hooks (optional)

### Testing
```bash
# Run tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

### Database Operations
```bash
# Generate migration
npm run db:generate

# Push changes
npm run db:push

# Reset database
npm run db:reset

# Seed data
npm run db:seed
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Comick.io** for providing the manga source
- **Next.js** team for the amazing framework
- **Vercel** for seamless deployment
- **shadcn/ui** for beautiful components
- **Discord.py** community for the original bot inspiration

## 📞 Support

- 🐛 **Bug Reports**: Create an issue
- 💡 **Feature Requests**: Start a discussion
- 📧 **Email**: support@comicknotifier.com
- 💬 **Discord**: [Join our server](https://discord.gg/your-invite)

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Core notification system
- [x] User authentication
- [x] Email notifications
- [x] Series management

### Phase 2 (Next)
- [ ] Web push notifications
- [ ] Mobile app
- [ ] Advanced filtering
- [ ] Social features

### Phase 3 (Future)
- [ ] Machine learning recommendations
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] API for third-party integrations

---

Built with ❤️ for the manga community
