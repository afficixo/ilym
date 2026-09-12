import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getUserFromToken, getTokenFromCookie, isAdmin, isOwner, getOwnerUserId } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'

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
    const { country, groupName, offerUrl, isActive, isGlobal, isContentLocker, priority, rotationMode } = body

    if (!isOwner(user) && !isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    if (isAdmin(user) && user.canUseSecretRedirect === false && body?.usaSecretRedirectEnabled === true) {
      return NextResponse.json(
        { error: 'Block Proxy is disabled for this administrator.' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    const offer = await prisma.offerVault.findUnique({ where: { id } })

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404, headers: getCorsHeaders(origin) }
      )
    }

    const ownerUserId = await getOwnerUserId()
    const canManageOffer = isOwner(user)
      ? offer.userId === (ownerUserId || user.id) || (await prisma.user.findUnique({
          where: { id: offer.userId },
          select: { role: true },
        }))?.role === 'MANAGER'
      : isAdmin(user) && offer.userId === user.id

    if (!canManageOffer) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    const nextCountry = Boolean(isGlobal) || Boolean(isContentLocker)
      ? 'GLOBAL'
      : typeof country === 'string'
        ? country.trim().toUpperCase()
        : offer.country

    const nextGroupName = typeof groupName === 'string' ? groupName.trim() || null : offer.groupName
    const nextOfferUrl = typeof offerUrl === 'string' ? offerUrl.trim() : offer.offerUrl
    const nextPriority = Number.isFinite(Number(priority))
      ? Math.max(1, Math.min(999, Number(priority)))
      : offer.priority
    const nextUsaSecretRedirectPercentage = Number.isFinite(Number(body?.usaSecretRedirectPercentage))
      ? Math.max(1, Math.min(100, Number(body?.usaSecretRedirectPercentage)))
      : offer.usaSecretRedirectPercentage
    const nextRotationMode = rotationMode === 'RANDOM' ? 'RANDOM' : 'PRIORITY'
    const nextUsaSecretRedirectEnabled = typeof body?.usaSecretRedirectEnabled === 'boolean'
      ? body.usaSecretRedirectEnabled
      : offer.usaSecretRedirectEnabled
    const nextIsContentLocker = typeof body?.isContentLocker === 'boolean'
      ? body.isContentLocker
      : offer.isContentLocker

    const updateData: Record<string, unknown> = {
      country: nextCountry,
      groupName: nextGroupName,
      offerUrl: nextOfferUrl,
      isActive,
      isGlobal,
      isContentLocker: nextIsContentLocker,
      usaSecretRedirectPercentage: nextUsaSecretRedirectPercentage,
      priority: nextPriority,
      rotationMode: nextRotationMode,
    }

    if (typeof body?.usaSecretRedirectEnabled === 'boolean') {
      updateData.usaSecretRedirectEnabled = nextUsaSecretRedirectEnabled
    }

    let updated
    try {
      try {
        updated = await prisma.offerVault.update({
          where: { id },
          data: updateData as any,
        })
      } catch (innerError) {
        const innerMessage = innerError instanceof Error ? innerError.message : String(innerError)
        if (innerMessage.includes('Unknown argument `usaSecretRedirectEnabled`')) {
          delete updateData.usaSecretRedirectEnabled
          updated = await prisma.offerVault.update({
            where: { id },
            data: updateData as any,
          })
        } else {
          throw innerError
        }
      }
    } catch (error) {
      console.error('Error updating offer:', error)
      return NextResponse.json(
        { error: 'Failed to update offer' },
        { status: 500 }
      )
    }

    return NextResponse.json(updated, { headers: getCorsHeaders(origin) })
  } catch (error) {
    console.error('Error updating offer:', error)
    return NextResponse.json(
      { error: 'Failed to update offer' },
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

    const offer = await prisma.offerVault.findUnique({
      where: { id },
    })

    if (!offer || (!isOwner(user) && !isAdmin(user))) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    const ownerUserId = await getOwnerUserId()
    const canDeleteOffer = isOwner(user)
      ? offer.userId === (ownerUserId || user.id) || (await prisma.user.findUnique({
          where: { id: offer.userId },
          select: { role: true },
        }))?.role === 'MANAGER'
      : offer.userId === user.id

    if (!canDeleteOffer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404, headers: getCorsHeaders(origin) }
      )
    }

    await prisma.offerVault.delete({
      where: { id },
    })

    return NextResponse.json(
      { success: true },
      { headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Error deleting offer:', error)
    return NextResponse.json(
      { error: 'Failed to delete offer' },
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