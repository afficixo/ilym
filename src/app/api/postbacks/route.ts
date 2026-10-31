import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { getCorsHeaders } from '@/config/cors'
import { getTokenFromCookie, getUserFromToken, isAdminOrOwner } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { decryptTelegramToken, encryptTelegramToken, sendTelegramMessage } from '@/lib/services/telegram'

async function getAuthenticatedUser(request: Request) {
  const token = getTokenFromCookie(request.headers.get('cookie') || '')
  return token ? getUserFromToken(token) : null
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || null
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
  if (!isAdminOrOwner(user)) return NextResponse.json({ error: 'Only owners and admins can access postbacks.' }, { status: 403, headers: getCorsHeaders(origin) })
  if (new URL(request.url).searchParams.get('summary') === '1') {
    const totalPayout = await prisma.conversionLead.aggregate({
      where: { userId: user.id },
      _sum: { payout: true },
    })
    return NextResponse.json(
      { totalPayout: totalPayout._sum.payout || 0 },
      { headers: getCorsHeaders(origin) },
    )
  }

  const [configs, leads, totalConversions, totalPayout] = await Promise.all([
    prisma.postbackConfig.findMany({ where: { userId: user.id }, orderBy: { provider: 'asc' } }),
    prisma.conversionLead.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { postback: { select: { provider: true } } } }),
    prisma.conversionLead.count({ where: { userId: user.id } }),
    prisma.conversionLead.aggregate({ where: { userId: user.id }, _sum: { payout: true } }),
  ])
  const telegram = await prisma.telegramNotification.findUnique({ where: { userId: user.id }, select: { channelId: true, isActive: true } })
  return NextResponse.json({ configs, leads, totalConversions, totalPayout: totalPayout._sum.payout || 0, telegram }, { headers: getCorsHeaders(origin) })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || null
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
  if (!isAdminOrOwner(user)) return NextResponse.json({ error: 'Only owners and admins can manage postbacks.' }, { status: 403, headers: getCorsHeaders(origin) })
  const body = await request.json().catch(() => ({}))
  const provider = body?.provider === 'ADBLUMEDIA' ? 'ADBLUMEDIA' : body?.provider === 'AFFMINE' ? 'AFFMINE' : ''
  if (!provider) return NextResponse.json({ error: 'Choose a supported marketplace.' }, { status: 400, headers: getCorsHeaders(origin) })
  const label = provider === 'AFFMINE' ? 'Affmine' : 'AdBluMedia'
  const config = await prisma.postbackConfig.upsert({
    where: { userId_provider: { userId: user.id, provider } },
    update: { isActive: body?.isActive !== false, label },
    create: { userId: user.id, provider, label, token: randomBytes(24).toString('hex') },
  })
  return NextResponse.json({ config, receiverUrl: `${new URL(request.url).origin}/api/postback/${config.token}` }, { headers: getCorsHeaders(origin) })
}

export async function DELETE(request: Request) {
  const origin = request.headers.get('origin') || null
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
  if (!isAdminOrOwner(user)) return NextResponse.json({ error: 'Only owners and admins can manage Telegram notifications.' }, { status: 403, headers: getCorsHeaders(origin) })

  const body = await request.json().catch(() => ({}))
  const leadId = typeof body?.id === 'string' ? body.id.trim() : ''

  if (leadId) {
    const result = await prisma.conversionLead.deleteMany({ where: { id: leadId, userId: user.id } })
    return NextResponse.json({ success: true, deleted: result.count }, { headers: getCorsHeaders(origin) })
  }

  const result = await prisma.conversionLead.deleteMany({ where: { userId: user.id } })
  return NextResponse.json({ success: true, deleted: result.count }, { headers: getCorsHeaders(origin) })
}

export async function PUT(request: Request) {
  const origin = request.headers.get('origin') || null
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
  if (!isAdminOrOwner(user)) return NextResponse.json({ error: 'Only owners and admins can manage Telegram notifications.' }, { status: 403, headers: getCorsHeaders(origin) })
  const body = await request.json().catch(() => ({}))
  const channelId = typeof body?.channelId === 'string' ? body.channelId.trim() : ''
  const botToken = typeof body?.botToken === 'string' ? body.botToken.trim() : ''
  if (!channelId || !botToken) return NextResponse.json({ error: 'Telegram channel ID and bot token are required.' }, { status: 400, headers: getCorsHeaders(origin) })
  const telegram = await prisma.telegramNotification.upsert({
    where: { userId: user.id },
    update: { channelId, botTokenEncrypted: encryptTelegramToken(botToken), isActive: true },
    create: { userId: user.id, channelId, botTokenEncrypted: encryptTelegramToken(botToken) },
    select: { channelId: true, isActive: true },
  })
  return NextResponse.json({ success: true, telegram }, { headers: getCorsHeaders(origin) })
}

export async function PATCH(request: Request) {
  const origin = request.headers.get('origin') || null
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
  if (!isAdminOrOwner(user)) return NextResponse.json({ error: 'Only owners and admins can reset conversion data.' }, { status: 403, headers: getCorsHeaders(origin) })
  const config = await prisma.telegramNotification.findUnique({ where: { userId: user.id } })
  if (!config) return NextResponse.json({ error: 'Save Telegram settings first.' }, { status: 400, headers: getCorsHeaders(origin) })
  try {
    await sendTelegramMessage(decryptTelegramToken(config.botTokenEncrypted), config.channelId, 'Postback notifications are connected.')
    return NextResponse.json({ success: true, message: 'Test message sent to Telegram.' }, { headers: getCorsHeaders(origin) })
  } catch {
    return NextResponse.json({ error: 'Telegram could not deliver the test message. Check the bot token, channel ID, and bot permissions.' }, { status: 400, headers: getCorsHeaders(origin) })
  }
}