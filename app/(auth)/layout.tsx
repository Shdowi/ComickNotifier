import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <BookOpen className="h-8 w-8" />
            <span className="text-2xl font-bold">Comick Notifier</span>
          </Link>
          
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Never Miss a Chapter Again
            </h1>
            <p className="text-xl opacity-90">
              Get instant notifications when your favorite manga series release new chapters.
              Stay connected with the stories you love.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
            <span>Free to use</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
            <span>Multiple notification methods</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
            <span>Smart filtering, no spam</span>
          </div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden">
            <Link href="/" className="inline-flex items-center space-x-2 mb-6">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Comick Notifier</span>
            </Link>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
} 