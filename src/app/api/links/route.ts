import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserFromToken, getTokenFromCookie, getOwnerUserId, isAdmin, isOwner } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'
import { getLinkAccountVisibilityWhereClause } from '@/lib/utils/link-account-access'
import { isDesktopDeviceType } from '@/lib/utils/visitor-profile'
import { ensureUserSlugPrefix, generateNextPublisherSlug } from '@/lib/utils/slug'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const origin = request.headers.get('origin') || null
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookie(cookieHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      )
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      )
    }

    const ownerUserId = await getOwnerUserId()
    const defaultOwnerClickRate = ownerUserId
      ? Number((await prisma.user.findUnique({ where: { id: ownerUserId }, select: { clickRate: true } }))?.clickRate ?? 0) || 0
      : 0
    const whereClause = getLinkAccountVisibilityWhereClause(user, ownerUserId)

    const linkInclude = {
      customDomain: true,
      publicDashboard: true,
      invoices: { orderBy: { createdAt: 'desc' as const }, take: 100 },
      user: {
        select: {
          username: true,
          clickRate: true,
          commissionRate: true,
          payoutMethod: true,
        },
      },
    }
    let links: any[]
    try {
      links = await prisma.linkAccount.findMany({
        where: whereClause,
        include: linkInclude,
        orderBy: { createdAt: 'desc' },
      })
    } catch (error: any) {
      if (error?.code !== 'P2022' || !String(error?.meta?.column || '').includes('commissionRate')) {
        throw error
      }

      links = await prisma.linkAccount.findMany({
        where: whereClause,
        include: {
          ...linkInclude,
          user: { select: { username: true, clickRate: true, payoutMethod: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    const qualifiedClicks = await prisma.click.findMany({
      where: {
        linkAccountId: { in: links.map((link) => link.id) },
        country: 'US',
        isUnique: true,
        isBot: false,
        referrer: { not: null },
      },
      select: { linkAccountId: true, referrer: true, deviceType: true },
    })
    const qualifiedClickMap = new Map<string, number>()
    for (const click of qualifiedClicks) {
      if (!click.referrer?.trim()) continue
      if (isDesktopDeviceType(click.deviceType)) continue
      qualifiedClickMap.set(click.linkAccountId, (qualifiedClickMap.get(click.linkAccountId) || 0) + 1)
    }

    const canViewSubIdPayout = isAdmin(user) || isOwner(user)
    const subIdStatsMap = new Map<string, number>()
    if (canViewSubIdPayout && links.length) {
      const conversionLeads = await prisma.conversionLead.findMany({
        where: { sub1: { not: null } },
        select: { sub1: true, payout: true },
      })

      for (const lead of conversionLeads) {
        const key = lead.sub1?.trim().toLowerCase()
        if (!key) continue
        subIdStatsMap.set(key, (subIdStatsMap.get(key) || 0) + Number(lead.payout || 0))
      }
    }

    return NextResponse.json(
      links.map((link) => {
        const managerClickRate = Number(link.user?.clickRate ?? 0) || 0
        const effectiveClickRate = managerClickRate > 0 ? managerClickRate : defaultOwnerClickRate
        return {
          ...link,
          qualifiedClicks: qualifiedClickMap.get(link.id) || 0,
          totalEarning: (qualifiedClickMap.get(link.id) || 0) * effectiveClickRate,
          ...(canViewSubIdPayout
            ? { subIdPayout: subIdStatsMap.get(link.slug.trim().toLowerCase()) || 0 }
            : {}),
          commissionRate: Number(link.user?.commissionRate ?? 20) || 20,
          payoutMethod: link.payoutMethod || null,
          payoutAccount: link.payoutAccount || null,
          invoiceHistory: link.invoices,
          invoices: link.invoices.filter((invoice: { isPaid: boolean }) => !invoice.isPaid),
        }
      }),
      { headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Error fetching links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin') || null
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookie(cookieHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      )
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      )
    }

    const ownerUserId = await getOwnerUserId()
    
    let body: any = {}
    try {
      const text = await request.text()
      body = text ? JSON.parse(text) : {}
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }
    
    const { accountName, customSlug, customDomainId, offerGroupName } = body

    let finalUserId: string = user.id
    if (typeof finalUserId === 'string' && finalUserId.startsWith('local-')) {
      const username = finalUserId.replace(/^local-/, '')
      const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } })
      if (existing?.id) {
        finalUserId = existing.id
      } else if (isOwner(user) && ownerUserId) {
        finalUserId = ownerUserId
      }
    }

    if (customDomainId) {
      const attachedDomain = await prisma.customDomain.findUnique({
        where: { id: customDomainId },
      })

      const canUseCustomDomain = isOwner(user)
        ? true
        : isAdmin(user)
          ? attachedDomain?.userId === user.id
          : attachedDomain?.userId === ownerUserId

      if (!attachedDomain || !canUseCustomDomain) {
        return NextResponse.json(
          { error: 'Selected custom domain does not exist or is not owned by your account or the shared owner account' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      if (!attachedDomain.isActive) {
        return NextResponse.json(
          { error: 'Only active custom domains can be attached to a link' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }
    }

    if (!accountName) {
      return NextResponse.json(
        { error: 'Account name required' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    const normalizedCustomSlug = typeof customSlug === 'string' ? customSlug.trim() : ''
    if (normalizedCustomSlug && !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(normalizedCustomSlug)) {
      return NextResponse.json(
        { error: 'Custom slug may only contain letters, numbers, and single hyphens' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    if (normalizedCustomSlug.length > 64) {
      return NextResponse.json(
        { error: 'Custom slug must be 64 characters or fewer' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    let finalSlug = normalizedCustomSlug
    if (!finalSlug) {
      const prefix = await ensureUserSlugPrefix(prisma, finalUserId)
      finalSlug = await generateNextPublisherSlug(prisma, prefix, 1)
    } else {
      const existingSlug = await prisma.linkAccount.findUnique({
        where: { slug: finalSlug },
        select: { slug: true },
      })

      if (existingSlug) {
        return NextResponse.json(
          { error: 'That custom slug is already in use' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }
    }

    // Use 32 bytes (256 bits) for public ID to prevent brute-force guessing
    // 16 bytes = 128 bits = 32 hex chars, but 32 bytes = 256 bits = 64 hex chars
    const publicId = crypto.randomBytes(32).toString('hex')

    const link = await prisma.linkAccount.create({
      data: {
        accountName,
        slug: finalSlug,
        customDomainId: customDomainId || null,
        offerGroupName: typeof offerGroupName === 'string' ? offerGroupName.trim() || null : null,
        userId: finalUserId,
        publicDashboard: {
          create: { publicId },
        },
      },
      include: {
        customDomain: true,
        publicDashboard: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    })

    return NextResponse.json(link, { 
      status: 201, 
      headers: getCorsHeaders(origin) 
    })
  } catch (error) {
    console.error('Error creating link:', error)
    return NextResponse.json(
      { error: 'Failed to create link' },
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