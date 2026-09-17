import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserFromToken, getTokenFromCookie, isAdmin, isOwner, isManager, getOwnerUserId } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'
import { isDesktopDeviceType } from '@/lib/utils/visitor-profile'

const normalizeSlug = (value: unknown) => {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, '-')
    : ''
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const origin = request.headers.get('origin') || null
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookie(cookieHeader)
    const { id } = await params

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

    const link = await prisma.linkAccount.findUnique({
      where: { id },
      include: {
        customDomain: true,
        publicDashboard: true,
        user: true,
      },
    })

    if (!link || (!isAdmin(user) && !isOwner(user) && link.userId !== user.id)) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404, headers: getCorsHeaders(origin) }
      )
    }

    return NextResponse.json(link, { headers: getCorsHeaders(origin) })
  } catch (error) {
    console.error('Error fetching link:', error)
    return NextResponse.json(
      { error: 'Failed to fetch link' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const origin = request.headers.get('origin') || null
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookie(cookieHeader)
    const { id } = await params

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

    const body = await request.json()
    const accountName = typeof body.accountName === 'string' ? body.accountName.trim() : ''
    const slug = normalizeSlug(body.slug)
    const customDomainId = typeof body.customDomainId === 'string' && body.customDomainId.trim() ? body.customDomainId.trim() : null
    const offerGroupName = typeof body.offerGroupName === 'string' ? body.offerGroupName.trim() || null : null
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true

    if (!accountName || !slug) {
      return NextResponse.json(
        { error: 'Account name and slug are required' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    const existingLink = await prisma.linkAccount.findUnique({
      where: { id },
    })

    if (!existingLink) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404, headers: getCorsHeaders(origin) }
      )
    }

    if (!isOwner(user) && existingLink.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    if (customDomainId) {
      const attachedDomain = await prisma.customDomain.findUnique({
        where: { id: customDomainId },
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
    }

    const slugOwner = await prisma.linkAccount.findUnique({
      where: { slug },
    })

    if (slugOwner && slugOwner.id !== id) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    // Use transaction to prevent race condition on slug uniqueness
    const updatedLink = await prisma.$transaction(async (tx) => {
      // Re-check slug under transaction lock
      const slugCheck = await tx.linkAccount.findUnique({
        where: { slug },
      })

      if (slugCheck && slugCheck.id !== id) {
        throw new Error('Slug already taken')
      }

      return tx.linkAccount.update({
        where: { id },
        data: {
          accountName,
          slug,
          customDomainId,
          offerGroupName,
          isActive,
        },
        include: {
          customDomain: true,
          publicDashboard: true,
        },
      })
    }, {
      // SERIALIZABLE isolation prevents phantom reads and race conditions
      isolationLevel: 'Serializable' as const,
      maxWait: 5000,
      timeout: 10000,
    })

    return NextResponse.json(updatedLink, { headers: getCorsHeaders(origin) })
  } catch (error) {
    console.error('Error updating link:', error)
    const message = error instanceof Error ? error.message : 'Failed to update link'
    const status = message === 'Slug already taken' ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status, headers: getCorsHeaders(origin) }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const origin = request.headers.get('origin') || null
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookie(cookieHeader)
    const { id } = await params

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

    const link = await prisma.linkAccount.findUnique({
      where: { id },
    })

    if (!link || (!isAdmin(user) && !isOwner(user) && !isManager(user) && link.userId !== user.id)) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404, headers: getCorsHeaders(origin) }
      )
    }


    const body = await request.json()
    if (body.action === 'mark-paid') {
      const paymentReference = typeof body.paymentReference === 'string' ? body.paymentReference.trim() : ''
      const invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : ''
      const invoice = await prisma.invoice.findFirst({
        where: { linkAccountId: id, isPaid: false, ...(invoiceNumber ? { invoiceNumber } : {}) },
        orderBy: { createdAt: 'desc' },
      })
      if (!invoice) return NextResponse.json({ error: 'No unpaid invoice found' }, { status: 404, headers: getCorsHeaders(origin) })
      if (!paymentReference) {
        const payoutMethod = invoice.payoutMethod || link.payoutMethod
        return NextResponse.json({ error: payoutMethod === 'BKASH' ? 'bKash transaction ID is required' : payoutMethod === 'BINANCE' ? 'Binance order ID is required' : 'Payment reference is required' }, { status: 400, headers: getCorsHeaders(origin) })
      }
      await prisma.invoice.update({ where: { id: invoice.id }, data: { isPaid: true, paidAt: new Date(), paymentReference } })
      return NextResponse.json({ success: true, invoiceNumber: invoice.invoiceNumber }, { headers: getCorsHeaders(origin) })
    }

    if (body.action !== 'reset') {
      return NextResponse.json(
        { error: 'Unsupported action' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    const invoiceClicks = await prisma.click.count({
      where: { linkAccountId: id, country: 'US', isUnique: true, isBot: false },
    })
    const invoiceClickRate = Number((await prisma.user.findUnique({ where: { id: link.userId }, select: { clickRate: true } }))?.clickRate ?? 0) || 0
    const invoiceTimestamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replaceAll('.', '').replace('T', '').replace('Z', '').slice(0, 14)
    const invoiceNumber = `INV-${invoiceTimestamp}-${id.slice(-6).toUpperCase()}`
    const invoiceTotalEarning = invoiceClicks * invoiceClickRate

    await prisma.$transaction(
      [
        ...(invoiceTotalEarning > 0
          ? [prisma.invoice.create({ data: { invoiceNumber, linkAccountId: id, qualifiedClicks: invoiceClicks, clickRate: invoiceClickRate, totalEarning: invoiceTotalEarning, payoutMethod: link.payoutMethod, payoutAccount: link.payoutAccount } })]
          : []),
        prisma.click.deleteMany({ where: { linkAccountId: id } }),
        prisma.geoStat.deleteMany({ where: { linkAccountId: id } }),
        prisma.dailyAnalytics.deleteMany({ where: { linkAccountId: id } }),
        prisma.hourlyAnalytics.deleteMany({ where: { linkAccountId: id } }),
        prisma.browserStat.deleteMany({ where: { linkAccountId: id } }),
        prisma.oSStat.deleteMany({ where: { linkAccountId: id } }),
        prisma.deviceStat.deleteMany({ where: { linkAccountId: id } }),
        prisma.referrerStat.deleteMany({ where: { linkAccountId: id } }),
        prisma.conversionLead.deleteMany({ where: { userId: link.userId, sub1: link.slug } }),
        prisma.linkAccount.update({
          where: { id },
          data: {
            totalClicks: 0,
            uniqueClicks: 0,
            botClicks: 0,
          },
        }),
      ],
      {
        // SERIALIZABLE isolation prevents phantom reads and race conditions
        isolationLevel: 'Serializable' as const,
      }
    )

    return NextResponse.json(
      { success: true, message: 'Link statistics reset successfully' },
      { headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Error resetting link:', error)
    return NextResponse.json(
      { error: 'Failed to reset link' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const origin = request.headers.get('origin') || null
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookie(cookieHeader)
    const { id } = await params

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

    const link = await prisma.linkAccount.findUnique({
      where: { id },
    })

    if (!link || (!isAdmin(user) && !isOwner(user) && link.userId !== user.id)) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404, headers: getCorsHeaders(origin) }
      )
    }

    await prisma.$transaction([
      prisma.click.deleteMany({ where: { linkAccountId: id } }),
      prisma.geoStat.deleteMany({ where: { linkAccountId: id } }),
      prisma.dailyAnalytics.deleteMany({ where: { linkAccountId: id } }),
      prisma.hourlyAnalytics.deleteMany({ where: { linkAccountId: id } }),
      prisma.browserStat.deleteMany({ where: { linkAccountId: id } }),
      prisma.oSStat.deleteMany({ where: { linkAccountId: id } }),
      prisma.deviceStat.deleteMany({ where: { linkAccountId: id } }),
      prisma.referrerStat.deleteMany({ where: { linkAccountId: id } }),
      prisma.publicDashboard.deleteMany({ where: { linkAccountId: id } }),
      prisma.linkAccount.delete({ where: { id } }),
    ])

    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Error deleting link:', error)
    return NextResponse.json(
      { error: 'Failed to delete link' },
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