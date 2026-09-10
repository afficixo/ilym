import { NextResponse } from 'next/server'
import { getTokenFromCookie, getUserFromToken, isManager, isOwner } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

async function getAuthenticatedUser(request: Request) {
  const token = getTokenFromCookie(request.headers.get('cookie') || '')
  return token ? getUserFromToken(token) : null
}

const messageInclude = {
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { sender: { select: { id: true, username: true, fullName: true, role: true } } },
  },
  manager: { select: { id: true, username: true, fullName: true, email: true } },
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isManager(user)) {
    const conversation = await prisma.supportConversation.findUnique({ where: { managerId: user.id }, include: messageInclude })
    return NextResponse.json({ conversations: conversation ? [conversation] : [] })
  }

  if (isOwner(user)) {
    const conversations = await prisma.supportConversation.findMany({ orderBy: { updatedAt: 'desc' }, include: messageInclude })
    const users = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      orderBy: { username: 'asc' },
      select: { id: true, username: true, fullName: true, email: true, status: true },
    })
    return NextResponse.json({ conversations, users })
  }

  return NextResponse.json({ error: 'Support access required' }, { status: 403 })
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user || (!isManager(user) && !isOwner(user))) return NextResponse.json({ error: 'Support access required' }, { status: 403 })

  const payload = await request.json().catch(() => null)
  const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
  if (!body || body.length > 5000) return NextResponse.json({ error: 'Message must be between 1 and 5000 characters.' }, { status: 400 })

  if (isOwner(user) && payload?.broadcast === true) {
    const managers = await prisma.user.findMany({ where: { role: 'MANAGER' }, select: { id: true } })
    const conversationIds = await prisma.$transaction(async (transaction) => {
      const ids: string[] = []
      for (const manager of managers) {
        const conversation = await transaction.supportConversation.upsert({
          where: { managerId: manager.id },
          create: { managerId: manager.id },
          update: { status: 'OPEN' },
          select: { id: true },
        })
        await transaction.supportMessage.create({ data: { conversationId: conversation.id, senderId: user.id, body } })
        ids.push(conversation.id)
      }
      return ids
    })
    const conversations = conversationIds.length
      ? await prisma.supportConversation.findMany({ where: { id: { in: conversationIds } }, include: messageInclude, orderBy: { updatedAt: 'desc' } })
      : []
    return NextResponse.json({ conversations }, { status: 201 })
  }

  let conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : null
  if (isManager(user)) {
    const conversation = await prisma.supportConversation.upsert({ where: { managerId: user.id }, create: { managerId: user.id }, update: { status: 'OPEN' }, select: { id: true } })
    conversationId = conversation.id
  } else if (typeof payload?.managerId === 'string') {
    const manager = await prisma.user.findUnique({ where: { id: payload.managerId }, select: { id: true, role: true } })
    if (!manager || manager.role !== 'MANAGER') return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    const conversation = await prisma.supportConversation.upsert({ where: { managerId: manager.id }, create: { managerId: manager.id }, update: { status: 'OPEN' }, select: { id: true } })
    conversationId = conversation.id
  } else if (conversationId) {
    const conversation = await prisma.supportConversation.findUnique({ where: { id: conversationId }, select: { id: true } })
    if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
  }

  if (!conversationId) return NextResponse.json({ error: 'Conversation is required.' }, { status: 400 })
  await prisma.supportMessage.create({ data: { conversationId, senderId: user.id, body } })
  const conversation = await prisma.supportConversation.update({ where: { id: conversationId }, data: { status: 'OPEN' }, include: messageInclude })
  return NextResponse.json({ conversation }, { status: 201 })
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user || !isOwner(user)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
  const payload = await request.json().catch(() => null)
  if (typeof payload?.conversationId !== 'string') return NextResponse.json({ error: 'Conversation is required.' }, { status: 400 })
  const conversation = await prisma.supportConversation.update({ where: { id: payload.conversationId }, data: { status: payload.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN' }, include: messageInclude })
  return NextResponse.json({ conversation })
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user || !isOwner(user)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 })

  const payload = await request.json().catch(() => null)
  if (typeof payload?.conversationId !== 'string') return NextResponse.json({ error: 'Conversation is required.' }, { status: 400 })

  const conversation = await prisma.supportConversation.findUnique({ where: { id: payload.conversationId }, select: { id: true } })
  if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })

  await prisma.supportConversation.delete({ where: { id: conversation.id } })
  return NextResponse.json({ deletedConversationId: conversation.id })
}