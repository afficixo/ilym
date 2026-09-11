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

  try {
    const linkAccounts = await prisma.linkAccount.findMany({
      where: { userId: id },
      select: { id: true },
    })
    const linkAccountIds = linkAccounts.map((linkAccount) => linkAccount.id)
    const postbacks = await prisma.postbackConfig.findMany({
      where: { userId: id },
      select: { id: true },
    })
    const postbackIds = postbacks.map((postback) => postback.id)
    const conversations = await prisma.supportConversation.findMany({
      where: { managerId: id },
      select: { id: true },
    })
    const conversationIds = conversations.map((conversation) => conversation.id)

    await prisma.$transaction([
      prisma.supportMessage.deleteMany({ where: { senderId: id } }),
      prisma.supportMessage.deleteMany({ where: { conversationId: { in: conversationIds } } }),
      prisma.supportConversation.deleteMany({ where: { managerId: id } }),
      prisma.conversionLead.deleteMany({ where: { userId: id } }),
      prisma.conversionLead.deleteMany({ where: { postbackId: { in: postbackIds } } }),
      prisma.postbackConfig.deleteMany({ where: { userId: id } }),
      prisma.telegramNotification.deleteMany({ where: { userId: id } }),
      prisma.landingPage.deleteMany({ where: { userId: id } }),
      prisma.landingPageTemplate.updateMany({ where: { createdBy: id }, data: { createdBy: owner.id } }),
      prisma.managerPayoutInvoice.deleteMany({ where: { invoice: { linkAccountId: { in: linkAccountIds } } } }),
      prisma.invoice.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.click.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.geoStat.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.dailyAnalytics.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.hourlyAnalytics.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.browserStat.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.oSStat.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.deviceStat.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.referrerStat.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.publicDashboard.deleteMany({ where: { linkAccountId: { in: linkAccountIds } } }),
      prisma.linkAccount.deleteMany({ where: { id: { in: linkAccountIds } } }),
      prisma.customDomain.deleteMany({ where: { userId: id } }),
      prisma.offerVault.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ])
  } catch (error) {
    console.error('Failed to delete admin and owned data:', error)
    return NextResponse.json(
      { error: 'Unable to delete admin. Remove dependent records or contact support.' },
      { status: 500, headers: getCorsHeaders(origin) },
    )
  }

  return NextResponse.json({ success: true, deletedAdminId: id }, { headers: getCorsHeaders(origin) })
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}