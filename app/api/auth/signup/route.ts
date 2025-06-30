import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db, users } from '@/lib/db'
import { validateEmail } from '@/lib/utils'
import { eq } from 'drizzle-orm'
import { EmailNotificationService } from '@/lib/notifications/email'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        name: name || null,
        email,
        hashedPassword,
        emailNotifications: true,
        webPushEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Send welcome email
    try {
      await EmailNotificationService.sendWelcomeEmail(newUser[0])
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the signup if email fails
    }

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: {
          id: newUser[0].id,
          name: newUser[0].name,
          email: newUser[0].email,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 