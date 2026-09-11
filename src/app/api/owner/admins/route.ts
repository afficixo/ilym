import { NextResponse } from 'next/server'
import { getCorsHeaders } from '@/config/cors'
import { getTokenFromCookie, getUserFromToken, isOwner } from '@/lib/auth'
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
    select: { id: true, username: true, email: true, fullName: true, status: true, createdAt: true, lastLogin: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ admins }, { headers: getCorsHeaders(origin) })
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}