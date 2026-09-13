import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifyCredentials, generateToken, JWT_EXPIRY } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'
import { prisma } from '@/lib/db/prisma'
import { createUserSafe } from '@/lib/db/user'
import { ADMIN_USERNAME, ADMIN_PASSWORD, OWNER_USERNAME, OWNER_PASSWORD } from '@/lib/constants'
import { checkRateLimit, getRemainingAttempts, getResetTime } from '@/lib/utils/rate-limiter'

const ADMIN_ENV_USERNAME = ADMIN_USERNAME?.trim() || ''
const ADMIN_ENV_PASSWORD = ADMIN_PASSWORD?.trim() || ''
const OWNER_ENV_USERNAME = OWNER_USERNAME?.trim() || ''
const OWNER_ENV_PASSWORD = OWNER_PASSWORD?.trim() || ''

/**
 * Get client IP from request headers
 */
const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin') || null
    const clientIp = getClientIp(request)

    // Rate limit: 5 attempts per 15 minutes per IP address
    if (!checkRateLimit(clientIp, 5, 15 * 60 * 1000)) {
      const resetTime = getResetTime(clientIp)
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfterSeconds: Math.ceil(resetTime / 1000),
        },
        {
          status: 429,
          headers: {
            ...getCorsHeaders(origin),
            'Retry-After': Math.ceil(resetTime / 1000).toString(),
          },
        }
      )
    }

    let body: Record<string, unknown> = {}
    try {
      const rawBody = await request.text()
      if (rawBody) {
        body = JSON.parse(rawBody) as Record<string, unknown>
      }
    } catch {
      body = {}
    }

    // Normalize inputs to avoid whitespace/case issues
    const rawUsername = body?.username
    const rawPassword = body?.password
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : ''
    const password = typeof rawPassword === 'string' ? rawPassword : ''

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username or email and password required' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    // Try normal credential verification but handle DB errors gracefully.
    // In local development we still want a usable bootstrap session even when the
    // database-backed user record is missing or Prisma cannot upsert it yet.
    let user = null
    let dbError = false
    try {
      user = await verifyCredentials(username, password)
    } catch (err) {
      console.error('verifyCredentials error for user=', username, err)
      dbError = true
    }

    if (user && user.status !== 'ACTIVE') {
      const message = user.role === 'MANAGER'
        ? user.status === 'PENDING'
          ? 'Your manager account is pending owner approval.'
          : user.status === 'REJECTED'
            ? 'Your manager account was rejected by the owner.'
            : 'Your manager account is disabled.'
        : 'Your account is disabled.'

      return NextResponse.json(
        {
          error: message,
          ...(user.role === 'MANAGER' && user.status === 'DISABLED'
            ? { supportTelegram: 'Rayanveyron' }
            : {}),
        },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    if (!user) {
      if (ADMIN_ENV_USERNAME && ADMIN_ENV_PASSWORD && username === ADMIN_ENV_USERNAME && password === ADMIN_ENV_PASSWORD) {
        if (dbError) {
          console.warn('DB unavailable; issuing in-memory token for', username)
          user = { id: `local-${ADMIN_ENV_USERNAME}`, username: ADMIN_ENV_USERNAME, role: 'ADMIN' } as any
        } else {
          const existingAdmin = await prisma.user.findUnique({
            where: { username: ADMIN_ENV_USERNAME },
          })

          if (!existingAdmin) {
            try {
              const hashed = await bcrypt.hash(ADMIN_ENV_PASSWORD, 10)
              user = await createUserSafe({
                username: ADMIN_ENV_USERNAME,
                email: `${ADMIN_ENV_USERNAME}@example.com`,
                password: hashed,
                role: 'ADMIN',
                status: 'ACTIVE',
              } as any)
            } catch (err) {
              console.error('Error creating admin user for login:', username, err)
              console.warn('Falling back to local bootstrap token for', username)
              user = { id: `local-${ADMIN_ENV_USERNAME}`, username: ADMIN_ENV_USERNAME, role: 'ADMIN' } as any
            }
          } else {
            return NextResponse.json(
              { error: 'Invalid credentials' },
              { status: 401, headers: getCorsHeaders(origin) }
            )
          }
        }
      } else if (
        OWNER_ENV_USERNAME && OWNER_ENV_PASSWORD &&
        username === OWNER_ENV_USERNAME && password === OWNER_ENV_PASSWORD
      ) {
        if (dbError) {
          console.warn('DB unavailable; issuing in-memory token for owner', username)
          user = { id: `local-${OWNER_ENV_USERNAME}`, username: OWNER_ENV_USERNAME, role: 'OWNER' } as any
        } else {
          const existingOwner = await prisma.user.findUnique({
            where: { username: OWNER_ENV_USERNAME },
          })

          if (!existingOwner) {
            try {
              const hashed = await bcrypt.hash(OWNER_ENV_PASSWORD, 10)
              user = await createUserSafe({
                username: OWNER_ENV_USERNAME,
                email: `${OWNER_ENV_USERNAME}@example.com`,
                password: hashed,
                role: 'OWNER',
                status: 'ACTIVE',
              } as any)
            } catch (err) {
              console.error('Error creating owner user for login:', username, err)
              console.warn('Falling back to local bootstrap token for owner', username)
              user = { id: `local-${OWNER_ENV_USERNAME}`, username: OWNER_ENV_USERNAME, role: 'OWNER' } as any
            }
          } else {
            return NextResponse.json(
              { error: 'Invalid credentials' },
              { status: 401, headers: getCorsHeaders(origin) }
            )
          }
        }
      } else {
        console.error('Invalid credentials attempt for user=', username)
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401, headers: getCorsHeaders(origin) }
        )
      }
    }

    const token = generateToken(user.id)

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    }, { headers: getCorsHeaders(origin) })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: JWT_EXPIRY,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}