import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserFromToken, getTokenFromCookie, isAdmin, isOwner, getOwnerUserId, getOfferSelectionUserIds, resolveUserIdForRecord } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'

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

    // Owner: owner and manager offers. Admin: own offers only. Manager: shared offers.
    // If no owner account exists, return an empty list for managers instead of erroring.
    if (!isOwner(user) && !isAdmin(user) && !ownerUserId) {
      return NextResponse.json([], { headers: getCorsHeaders(origin) })
    }

    let queryWhere: Record<string, unknown>
    if (isOwner(user)) {
      queryWhere = {
        OR: [
          { userId: ownerUserId || user.id },
          { user: { role: 'MANAGER' } },
        ],
      }
    } else if (isAdmin(user)) {
      queryWhere = { userId: user.id } // admins see only their own offers
    } else {
      const offerUserIds = await getOfferSelectionUserIds(user.id)
      queryWhere = { userId: { in: offerUserIds } }
    }

    const offers = await prisma.offerVault.findMany({
      where: queryWhere,
      orderBy: [
        { isGlobal: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json(offers, { headers: getCorsHeaders(origin) })
  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
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

    if (!isOwner(user) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    const body = await request.json()
    if (isAdmin(user) && user.canUseSecretRedirect === false && body?.usaSecretRedirectEnabled === true) {
      return NextResponse.json(
        { error: 'Block Proxy is disabled for this administrator.' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }
    const country = typeof body?.country === 'string' ? body.country.trim().toUpperCase() : ''
    const groupName = typeof body?.groupName === 'string' ? body.groupName.trim() : ''
    const offerUrl = typeof body?.offerUrl === 'string' ? body.offerUrl.trim() : ''
    const isGlobal = Boolean(body?.isGlobal)
    const isContentLocker = Boolean(body?.isContentLocker)
    const priorityValue = Number(body?.priority)
    const priority = Number.isFinite(priorityValue)
      ? Math.max(1, Math.min(999, priorityValue))
      : 100
    const usaSecretRedirectPercentageValue = Number(body?.usaSecretRedirectPercentage)
    const usaSecretRedirectPercentage = Number.isFinite(usaSecretRedirectPercentageValue)
      ? Math.max(1, Math.min(100, usaSecretRedirectPercentageValue))
      : 50
    const rotationMode = body?.rotationMode === 'RANDOM' ? 'RANDOM' : 'PRIORITY'
    const resolvedCountry = isGlobal || isContentLocker ? 'GLOBAL' : country
    const usaSecretRedirectEnabled = typeof body?.usaSecretRedirectEnabled === 'boolean'
      ? body.usaSecretRedirectEnabled
      : undefined

    if ((!resolvedCountry && !isGlobal && !isContentLocker) || !offerUrl) {
      return NextResponse.json(
        { error: 'Country and offer URL required' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    // Validate offer URL format and domain
    try {
      const url = new URL(offerUrl)
      let hostname = url.hostname.toLowerCase()

      // Handle IPv6-mapped IPv4 addresses like ::ffff:192.168.1.1
      if (hostname.startsWith('::ffff:')) {
        hostname = hostname.substring(7) // Remove ::ffff: prefix
      }

      // Reject dangerous domains (localhost, IPs, etc.)
      const BLOCKED_DOMAINS = new Set([
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '::',
        'example.com',
        'example.org',
      ])

      const BLOCKED_PATTERNS = [
        /^192\.168\./, // Private network (192.168.0.0/16)
        /^10\./, // Private network (10.0.0.0/8)
        /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private network (172.16.0.0/12)
        /^169\.254\./, // Link-local (169.254.0.0/16)
        /^127\./, // Loopback (127.0.0.0/8)
        /^255\./, // Broadcast (255.255.255.255)
        /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // Shared Address Space (100.64.0.0/10)
        /^::ffff:/, // IPv6-mapped IPv4 (already stripped, but catch if not)
        /^fe80:/, // IPv6 link-local
        /^fc/, // IPv6 unique local (starts with fc)
        /^fd/, // IPv6 unique local (starts with fd)
      ]

      if (BLOCKED_DOMAINS.has(hostname)) {
        return NextResponse.json(
          { error: 'Offer URL domain is not allowed' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      if (BLOCKED_PATTERNS.some(pattern => pattern.test(hostname))) {
        return NextResponse.json(
          { error: 'Offer URL uses an invalid or private domain' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid offer URL format' },
        { status: 400, headers: getCorsHeaders(origin) }
      )
    }

    // Resolve a database-backed userId for the offer.
    // Local/dev tokens may contain `local-<name>` ids that do not exist in the
    // database, and managers should resolve to the owner-backed account when
    // shared data is required. The shared logic lives in the auth helpers so
    // all write paths stay in sync.
    const ownerUserId = await getOwnerUserId()
    const finalUserId = await resolveUserIdForRecord(user, ownerUserId)

    const offerData: Record<string, unknown> = {
      country: resolvedCountry,
      groupName: groupName || null,
      offerUrl,
      isGlobal,
      isContentLocker,
      isActive: true,
      usaSecretRedirectPercentage,
      priority,
      rotationMode,
      userId: finalUserId,
    }

    if (typeof usaSecretRedirectEnabled === 'boolean') {
      offerData.usaSecretRedirectEnabled = usaSecretRedirectEnabled
    }

    try {
      let offer
      try {
        offer = await prisma.offerVault.create({ data: offerData as any })
      } catch (innerError) {
        const innerMessage = innerError instanceof Error ? innerError.message : String(innerError)
        if (innerMessage.includes('Unknown argument `usaSecretRedirectEnabled`')) {
          delete offerData.usaSecretRedirectEnabled
          offer = await prisma.offerVault.create({ data: offerData as any })
        } else {
          throw innerError
        }
      }

      return NextResponse.json(offer, {
        status: 201,
        headers: getCorsHeaders(origin)
      })
    } catch (dbError) {
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      console.error('Error creating offer in database:', dbErrorMessage, dbError)

      if (!process.env.DATABASE_URL) {
        return NextResponse.json(
          {
            success: true,
            message: 'Offer payload accepted in local mode; database is not configured, so the record was not persisted.',
            offer: {
              id: `local-${Date.now()}`,
              country: resolvedCountry,
              groupName: groupName || null,
              offerUrl,
              isActive: true,
              isGlobal,
              isContentLocker,
              priority,
              rotationMode,
              userId: user.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
          { status: 201, headers: getCorsHeaders(origin) }
        )
      }

      const responseBody: Record<string, unknown> = { error: 'Failed to create offer' }
      if (process.env.NODE_ENV !== 'production') {
        responseBody.detail = dbErrorMessage
      }

      return NextResponse.json(
        responseBody,
        { status: 500, headers: getCorsHeaders(origin) }
      )
    }
  } catch (error) {
    console.error('Error creating offer:', error)
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500, headers: getCorsHeaders(origin) }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const origin = request.headers.get('origin') || null
    const cookieHeader = request.headers.get('cookie') || ''
    const token = getTokenFromCookie(cookieHeader)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
    }

    if (!isOwner(user)) {
      return NextResponse.json({ error: 'Only an owner can remove an offer pool.' }, { status: 403, headers: getCorsHeaders(origin) })
    }

    const groupName = new URL(request.url).searchParams.get('groupName')?.trim() || ''
    if (!groupName) {
      return NextResponse.json({ error: 'Group name is required.' }, { status: 400, headers: getCorsHeaders(origin) })
    }

    const ownerUserId = await getOwnerUserId()
    const result = await prisma.offerVault.deleteMany({
      where: {
        groupName,
        OR: [
          { userId: ownerUserId || user.id },
          { user: { role: 'MANAGER' } },
        ],
      },
    })

    return NextResponse.json(
      { success: true, deletedCount: result.count },
      { headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Error removing offer pool:', error)
    return NextResponse.json({ error: 'Failed to remove offer pool' }, { status: 500 })
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}