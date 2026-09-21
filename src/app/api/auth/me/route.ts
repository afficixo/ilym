import { NextResponse } from 'next/server'
import { getUserFromToken, getTokenFromCookie, normalizeEffectiveUserRole } from '@/lib/auth'
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

    if (user.role === 'MANAGER' && user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account pending approval' },
        { status: 403, headers: getCorsHeaders(origin) }
      )
    }

    const effectiveRole = normalizeEffectiveUserRole(user)

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: effectiveRole,
      email: user.email,
      status: user.status,
      clickRate: user.clickRate ?? 0,
      commissionRate: user.commissionRate ?? 20,
      canUseSecretRedirect: user.canUseSecretRedirect !== false,
      botFallbackUrl: user.botFallbackUrl || '',
      payoutMethod: user.payoutMethod || 'BKASH',
      payoutAccount: user.payoutAccount || user.bkashNumber || '',
    }, { headers: getCorsHeaders(origin) })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
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