import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { isDesktopDeviceType } from '@/lib/utils/visitor-profile'
import { getUserFromToken, getTokenFromCookie, isAdmin, isOwner, isManager, getOwnerUserId } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'

const normalizeIds = (value: unknown) => {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
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

    if (!isOwner(user) && !isAdmin(user) && !isManager(user)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    const body = await request.json()
    const action = body.action
    const ids = normalizeIds(body.ids)

    if (!ids.length) {
      return NextResponse.json(
        { error: 'Select at least one link account' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    // Build query based on user role
    let whereClause: any = { id: { in: ids } }

    if (!isOwner(user) && !isAdmin(user)) {
      // Manager: can only access owner's links
      if (isManager(user)) {
        try {
          const ownerUserId = await getOwnerUserId()
          if (!ownerUserId) {
            return NextResponse.json(
              { error: 'You do not have access to any links' },
              { status: 403, headers: getCorsHeaders(origin) }
            )
          }
          whereClause = {
            id: { in: ids },
            userId: ownerUserId,
          }
        } catch {
          return NextResponse.json(
            { error: 'Authorization check failed' },
            { status: 403, headers: getCorsHeaders(origin) }
          )
        }
      } else {
        // Regular user: can only access their own links
        whereClause = {
          id: { in: ids },
          userId: user.id,
        }
      }
    }
    // Admin and owner: can access all links in ids

    const matchingLinks = await prisma.linkAccount.findMany({
      where: whereClause,
      select: { id: true },
    })

    if (matchingLinks.length !== ids.length) {
      return NextResponse.json(
        { error: 'One or more selected links were not found or are not owned by your account' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'reset') {
      const invoiceLinks = await prisma.linkAccount.findMany({
        where: { id: { in: ids } },
        select: { id: true, userId: true, slug: true, payoutMethod: true, payoutAccount: true },
      })
      const invoiceUsers = await prisma.user.findMany({ where: { id: { in: invoiceLinks.map((link) => link.userId) } }, select: { id: true, clickRate: true } })
      const invoiceRateByUser = new Map(invoiceUsers.map((user) => [user.id, Number(user.clickRate ?? 0) || 0]))
      const invoiceCounts = await Promise.all(invoiceLinks.map(async (link) => ({
        ...link,
        qualifiedClicks: (await prisma.click.findMany({ where: { linkAccountId: link.id, country: 'US', isUnique: true, isBot: false }, select: { country: true } })).length,
      })))
      const invoiceCreates = invoiceCounts.flatMap((link) => {
        const clickRate = invoiceRateByUser.get(link.userId) || 0
        const totalEarning = link.qualifiedClicks * clickRate
        if (totalEarning <= 0) return []

        const invoiceTimestamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '').replace('T', '').replace('Z', '').slice(0, 14)
        return [prisma.invoice.create({ data: { invoiceNumber: `INV-${invoiceTimestamp}-${link.id.slice(-6).toUpperCase()}`, linkAccountId: link.id, qualifiedClicks: link.qualifiedClicks, clickRate, totalEarning, payoutMethod: link.payoutMethod, payoutAccount: link.payoutAccount } })]
      })
      await prisma.$transaction([
        ...invoiceCreates,
        prisma.click.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.geoStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.dailyAnalytics.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.hourlyAnalytics.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.browserStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.oSStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.deviceStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.referrerStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.conversionLead.deleteMany({
          where: {
            OR: invoiceLinks.map((link) => ({ userId: link.userId, sub1: link.slug })),
          },
        }),
        prisma.linkAccount.updateMany({
          where: { id: { in: ids } },
          data: {
            totalClicks: 0,
            uniqueClicks: 0,
            botClicks: 0,
          },
        }),
      ])

      return NextResponse.json(
        { success: true, resetCount: ids.length },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'delete') {
      await prisma.$transaction([
        prisma.click.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.geoStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.dailyAnalytics.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.hourlyAnalytics.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.browserStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.oSStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.deviceStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.referrerStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.publicDashboard.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.linkAccount.deleteMany({ where: { id: { in: ids } } }),
      ])

      return NextResponse.json(
        { success: true, deletedCount: ids.length },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'update') {
      const updateData: {
        customDomainId?: string | null
        offerGroupName?: string | null
        isActive?: boolean
      } = {}

      if (typeof body.customDomainId === 'string' && body.customDomainId.trim()) {
        const attachedDomain = await prisma.customDomain.findUnique({
          where: { id: body.customDomainId },
        })

        const ownerUserId = await getOwnerUserId()
        const canUseDomain = isOwner(user)
          ? true
          : isAdmin(user)
            ? attachedDomain?.userId === user.id
            : attachedDomain?.userId === ownerUserId

        if (!attachedDomain || !canUseDomain) {
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

        updateData.customDomainId = attachedDomain.id
      }

      if (typeof body.offerGroupName === 'string') {
        updateData.offerGroupName = body.offerGroupName.trim() || null
      }

      if (typeof body.isActive === 'boolean') {
        updateData.isActive = body.isActive
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'Choose at least one bulk update field' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      await prisma.$transaction(
        ids.map((id) =>
          prisma.linkAccount.update({
            where: { id },
            data: updateData,
          })
        )
      )

      return NextResponse.json(
        { success: true, updatedCount: ids.length },
        { headers: getCorsHeaders(origin) }
      )
    }

    return NextResponse.json(
      { error: 'Unsupported action' },
      { status: 400, headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Error processing bulk link action:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk link action' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return NextResponse.json(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}
