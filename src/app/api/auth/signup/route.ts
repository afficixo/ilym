import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { createUserSafe } from '@/lib/db/user'
import { getOwnerUserId } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'
import { checkRateLimit, getResetTime } from '@/lib/utils/rate-limiter'

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
  const origin = request.headers.get('origin') || null
  const clientIp = getClientIp(request)

  try {
    // Rate limit: 3 signup attempts per 1 hour per IP address (more restrictive than login)
    if (!checkRateLimit(clientIp, 3, 60 * 60 * 1000)) {
      const resetTime = getResetTime(clientIp)
      return NextResponse.json(
        {
          error: 'Too many signup attempts. Please try again later.',
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

    const body = await request.json()
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
    const address = typeof body?.address === 'string' ? body.address.trim() : ''
    const contractNumber = typeof body?.contractNumber === 'string' ? body.contractNumber.trim() : ''
    const telegramUsername = typeof body?.telegramUsername === 'string' ? body.telegramUsername.trim() : ''
    const username = typeof body?.username === 'string' ? body.username.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password.trim() : ''
    const captchaPrompt = typeof body?.captchaPrompt === 'string' ? body.captchaPrompt.trim() : ''
    const captchaAnswer = typeof body?.captchaAnswer === 'number' ? body.captchaAnswer : Number(body?.captchaAnswer)

    if (!fullName || !address || !contractNumber || !telegramUsername || !username || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required for manager signup' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    if (!captchaPrompt) {
      return NextResponse.json(
        { error: 'Please solve the captcha correctly before signing up' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    const expectedValue = captchaPrompt
      .split('+')
      .map((part: string) => Number(part.trim()))
      .reduce((sum: number, value: number) => sum + value, 0)

    // Use Math.round to handle floating-point precision errors
    const roundedExpected = Math.round(expectedValue)

    if (!Number.isInteger(captchaAnswer) || captchaAnswer !== roundedExpected) {
      return NextResponse.json(
        { error: 'Please solve the captcha correctly before signing up' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username },
          { email }
        ]
      },
      select: { id: true },
      take: 1
    })

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const ownerUserId = await getOwnerUserId()
    const defaultClickRate = ownerUserId
      ? Number((await prisma.user.findUnique({ where: { id: ownerUserId }, select: { clickRate: true } }))?.clickRate ?? 0) || 0
      : 0

    let createData = {
      username,
      email,
      password: hashedPassword,
      role: 'MANAGER',
      status: 'PENDING',
      clickRate: defaultClickRate,
      ...(fullName ? { fullName } : {}),
      ...(address ? { address } : {}),
      ...(contractNumber ? { contractNumber } : {}),
      ...(telegramUsername ? { telegramUsername } : {}),
    } as Prisma.UserCreateInput

    const user = await createUserSafe(createData)

    return NextResponse.json(
      {
        success: true,
        requiresApproval: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
        },
      },
      { headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500, headers: getCorsHeaders(origin) }
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
