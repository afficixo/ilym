import { NextResponse } from 'next/server'
import { getCorsHeaders } from '@/config/cors'
import { getTokenFromCookie, getUserFromToken, isOwner } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

const validStatuses = ['ACTIVE', 'DISABLED'] as const

async function requireOwner(request: Request) {
  const token = getTokenFromCookie(request.headers.get('cookie') || '')
  if (!token) return null
  const user = await getUserFromToken(token)
  return user && isOwner(user) ? user : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin') || null
  const owner = await requireOwner(request)
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403, headers: getCorsHeaders(origin) })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const status = typeof body?.status === 'string' ? body.status : ''
  if (!validStatuses.includes(status as (typeof validStatuses)[number])) {
    return NextResponse.json({ error: 'Status must be ACTIVE or DISABLED' }, { status: 400, headers: getCorsHeaders(origin) })
  }

  const admin = await prisma.user.findFirst({ where: { id, role: 'ADMIN' }, select: { id: true } })
  if (!admin) {
    return NextResponse.json({ error: 'Admin user not found' }, { status: 404, headers: getCorsHeaders(origin) })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: status as (typeof validStatuses)[number] },
    select: { id: true, username: true, status: true },
  })

  return NextResponse.json({ admin: updated }, { headers: getCorsHeaders(origin) })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin') || null
  const owner = await requireOwner(request)
  if (!owner) {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403, headers: getCorsHeaders(origin) })
  }

  const { id } = await params
  if (id === owner.id) {
    return NextResponse.json({ error: 'The owner account cannot be deleted here' }, { status: 400, headers: getCorsHeaders(origin) })
  }

  const admin = await prisma.user.findFirst({
    where: { id, role: 'ADMIN' },
    select: { id: true, username: true },
  })
  if (!admin) {
    return NextResponse.json({ error: 'Admin user not found' }, { status: 404, headers: getCorsHeaders(origin) })
  }

  await prisma.$transaction([
    prisma.landingPage.deleteMany({ where: { userId: id } }),
    prisma.landingPageTemplate.updateMany({ where: { createdBy: id }, data: { createdBy: owner.id } }),
    prisma.user.delete({ where: { id } }),
  ])

  return NextResponse.json({ success: true, deletedAdminId: id }, { headers: getCorsHeaders(origin) })
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}