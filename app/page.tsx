import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  BookOpen, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Zap,
  Users,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // Redirect authenticated users to dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-16">
        <div className="space-y-4">
          <Badge variant="outline" className="px-4 py-2">
            <Bell className="w-4 h-4 mr-2" />
            Never Miss a Chapter Again
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Stay Updated with Your
            <span className="text-primary"> Favorite Manga</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get instant notifications when new chapters are released for your subscribed series. 
            Multiple notification methods, smart filtering, and zero spam.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/auth/signup">
              Get Started Free
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8">
            <Link href="/auth/signin">
              Sign In
            </Link>
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Free to use
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            No spam
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Instant notifications
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">
            Everything You Need to Stay Updated
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to keep you connected with your favorite manga series
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Smart Notifications</CardTitle>
              <CardDescription>
                Get notified instantly when new chapters are released, with intelligent filtering to avoid spam
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Beautiful email notifications with chapter details and direct links to read
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Discord Integration</CardTitle>
              <CardDescription>
                Connect your Discord server with webhooks for community notifications
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Series Management</CardTitle>
              <CardDescription>
                Easily subscribe to series, manage your reading list, and track your favorites
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                Our system monitors Comick continuously to catch new releases as they happen
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Privacy First</CardTitle>
              <CardDescription>
                Your data is secure, and you can unsubscribe from any series at any time
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes and never miss a chapter again
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold">1. Create Account</h3>
            <p className="text-muted-foreground">
              Sign up for free and customize your notification preferences
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold">2. Subscribe to Series</h3>
            <p className="text-muted-foreground">
              Browse and subscribe to your favorite manga series from our curated list
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold">3. Get Notified</h3>
            <p className="text-muted-foreground">
              Receive instant notifications when new chapters are released
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/50 rounded-lg p-8 md:p-12">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
            <div className="text-muted-foreground">Manga Series Tracked</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl md:text-4xl font-bold text-primary">24/7</div>
            <div className="text-muted-foreground">Monitoring</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl md:text-4xl font-bold text-primary">< 1min</div>
            <div className="text-muted-foreground">Notification Delay</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-8 py-16">
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Never Miss a Chapter?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of manga readers who stay updated with their favorite series.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/auth/signup">
              Start Free Today
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
} 