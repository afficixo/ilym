import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCorsHeaders } from '@/config/cors'
import { getTokenFromCookie, getUserFromToken, isOwner } from '@/lib/auth'
import { createUserSafe } from '@/lib/db/user'
import { prisma } from '@/lib/db/prisma'

async function requireOwner(request: Request) {
  const token = getTokenFromCookie(request.headers.get('cookie') || '')
  if (!token) return null
  const user = await getUserFromToken(token)
  return user && isOwner(user) ? user : null
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || null
  const owner = await requireOwner(request)
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403, headers: getCorsHeaders(origin) })
  }

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, username: true, email: true, fullName: true, status: true, createdAt: true, lastLogin: true, canUseSecretRedirect: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ admins }, { headers: getCorsHeaders(origin) })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || null
  const owner = await requireOwner(request)
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403, headers: getCorsHeaders(origin) })
  }

  const body = await request.json().catch(() => ({}))
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Username, email, and password are required.' }, { status: 400, headers: getCorsHeaders(origin) })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400, headers: getCorsHeaders(origin) })
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'Username or email already exists.' }, { status: 409, headers: getCorsHeaders(origin) })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const admin = await createUserSafe({
    username,
    email,
    password: hashedPassword,
    role: 'ADMIN',
    status: 'ACTIVE',
    ...(fullName ? { fullName } : {}),
  } as any)

  return NextResponse.json({
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      fullName: admin.fullName || null,
      status: admin.status,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin,
      canUseSecretRedirect: admin.canUseSecretRedirect,
    },
  }, { status: 201, headers: getCorsHeaders(origin) })
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}