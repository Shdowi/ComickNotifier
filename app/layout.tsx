import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ToastProvider } from '@/components/ui/toast'
import { Toaster } from '@/components/ui/toaster'
import { Navigation } from '@/components/navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Comick Notifier - Never Miss a Chapter',
  description: 'Get instant notifications when your favorite manga series release new chapters. Stay up-to-date with the latest releases from Comick.',
  keywords: ['manga', 'notifications', 'comick', 'chapter', 'releases', 'alerts'],
  authors: [{ name: 'Comick Notifier Team' }],
  creator: 'Comick Notifier',
  publisher: 'Comick Notifier',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Comick Notifier - Never Miss a Chapter',
    description: 'Get instant notifications when your favorite manga series release new chapters.',
    url: '/',
    siteName: 'Comick Notifier',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Comick Notifier - Manga Chapter Notifications',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comick Notifier - Never Miss a Chapter',
    description: 'Get instant notifications when your favorite manga series release new chapters.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider session={session}>
          <ToastProvider>
            <div className="min-h-screen bg-background">
              <Navigation />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
            <Toaster />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 