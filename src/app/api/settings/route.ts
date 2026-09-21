import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCorsHeaders } from '@/config/cors'
import { getTokenFromCookie, getUserFromToken, getOwnerUserId, isAdmin, isOwner, verifyGooglePasswordResetToken } from '@/lib/auth'
import { getLinkAccountVisibilityWhereClause } from '@/lib/utils/link-account-access'
import { prisma } from '@/lib/db/prisma'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'admin'
const ADMIN_PASSWORD: string = (() => {
  const password = process.env.ADMIN_PASSWORD?.trim()
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required for security')
  }
  return password
})()

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || null
  const cookieHeader = request.headers.get('cookie') || ''
  const token = getTokenFromCookie(cookieHeader)

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: getCorsHeaders(origin) }
    )
  }

  try {
    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: getCorsHeaders(origin) }
      )
    }

    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action : ''

    if (action === 'update-bot-fallback-url') {
      if (!isOwner(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Only an owner or admin can update the bot fallback URL.' },
          { status: 403, headers: getCorsHeaders(origin) }
        )
      }

      const rawUrl = typeof body?.botFallbackUrl === 'string' ? body.botFallbackUrl.trim() : ''
      const normalizedUrl = rawUrl || ''

      if (normalizedUrl) {
        try {
          const parsed = new URL(normalizedUrl)
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol')
          }
        } catch {
          return NextResponse.json(
            { error: 'Fallback URL must be a valid http or https URL.' },
            { status: 400, headers: getCorsHeaders(origin) }
          )
        }
      }

      let updatedUser: { botFallbackUrl: string | null } | null = null

      try {
        updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { botFallbackUrl: normalizedUrl || null, updatedAt: new Date() },
          select: { botFallbackUrl: true },
        })
      } catch (error: any) {
        const missingColumn = String(error?.meta?.column || '') + ' ' + String(error?.message || '')
        if (error?.code === 'P2022' && missingColumn.includes('botFallbackUrl')) {
          return NextResponse.json(
            {
              success: false,
              botFallbackUrl: '',
              message: 'The database is missing the users.botFallbackUrl column. Run the migration to enable the bot fallback URL feature.',
            },
            { status: 500, headers: getCorsHeaders(origin) }
          )
        }
        throw error
      }

      return NextResponse.json(
        {
          success: true,
          botFallbackUrl: updatedUser?.botFallbackUrl || '',
          message: 'Bot fallback URL updated successfully.',
        },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'update-click-rate') {
      if (!isOwner(user) && !isAdmin(user)) {
        return NextResponse.json(
          { error: 'Only an owner or admin can update the USA click rate.' },
          { status: 403, headers: getCorsHeaders(origin) }
        )
      }

      const clickRate = Number(body?.clickRate)
      if (!Number.isFinite(clickRate) || clickRate < 0) {
        return NextResponse.json(
          { error: 'USA click rate must be a valid non-negative number.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { clickRate, updatedAt: new Date() },
      })

      return NextResponse.json(
        {
          success: true,
          clickRate: updatedUser.clickRate ?? 0,
          message: 'USA click rate updated successfully.',
        },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'update-manager-click-rate') {
      if (!isOwner(user)) {
        return NextResponse.json(
          { error: 'Only an owner can update a manager click rate.' },
          { status: 403, headers: getCorsHeaders(origin) }
        )
      }

      const managerId = typeof body?.managerId === 'string' ? body.managerId.trim() : ''
      const clickRate = Number(body?.clickRate)
      if (!managerId || !Number.isFinite(clickRate) || clickRate < 0) {
        return NextResponse.json(
          { error: 'Manager and a non-negative click rate are required.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, role: true },
      })
      if (!manager || manager.role !== 'MANAGER') {
        return NextResponse.json(
          { error: 'Manager account not found.' },
          { status: 404, headers: getCorsHeaders(origin) }
        )
      }

      const updatedManager = await prisma.user.update({
        where: { id: managerId },
        data: { clickRate, updatedAt: new Date() },
      })

      return NextResponse.json(
        { success: true, managerId, clickRate: updatedManager.clickRate ?? 0, message: 'Manager click rate updated successfully.' },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'update-manager-commission-rate') {
      if (!isOwner(user)) {
        return NextResponse.json(
          { error: 'Only an owner can update an individual manager click rate.' },
          { status: 403, headers: getCorsHeaders(origin) }
        )
      }

      const managerId = typeof body?.managerId === 'string' ? body.managerId.trim() : ''
      const commissionRate = Number(body?.commissionRate)
      if (!managerId || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        return NextResponse.json(
          { error: 'Manager and a commission rate between 0 and 100 are required.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, role: true },
      })
      if (!manager || manager.role !== 'MANAGER') {
        return NextResponse.json(
          { error: 'Manager account not found.' },
          { status: 404, headers: getCorsHeaders(origin) }
        )
      }

      await prisma.user.update({
        where: { id: managerId },
        data: { commissionRate, updatedAt: new Date() },
      })

      return NextResponse.json(
        { success: true, managerId, commissionRate, message: 'Manager commission rate updated successfully.' },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'save-payment-binding') {
      const payoutMethod = typeof body?.payoutMethod === 'string' ? body.payoutMethod.trim().toUpperCase() : ''
      const payoutAccount = typeof body?.payoutAccount === 'string' ? body.payoutAccount.trim() : ''
      const paymentPassword = typeof body?.paymentPassword === 'string' ? body.paymentPassword : ''
      if (!['BKASH', 'BINANCE'].includes(payoutMethod) || !payoutAccount || paymentPassword.length < 8) {
        return NextResponse.json({ error: 'Choose bKash or Binance, provide an account, and use an access password of at least 8 characters.' }, { status: 400, headers: getCorsHeaders(origin) })
      }
      const paymentPasswordHash = await bcrypt.hash(paymentPassword, 12)
      await prisma.user.update({ where: { id: user.id }, data: { payoutMethod, payoutAccount, paymentPasswordHash, updatedAt: new Date() } })
      return NextResponse.json({ success: true, message: 'Payment binding saved for your link account.' }, { headers: getCorsHeaders(origin) })
    }

    if (action === 'change-password' || action === 'reset-password-google') {
      const isGoogleReset = action === 'reset-password-google'
      const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
      const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
      const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''

      if ((!isGoogleReset && !currentPassword) || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { error: 'All password fields are required.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: 'New password and confirmation do not match.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      if (user.id.startsWith('local-')) {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Demo accounts are not supported in production' },
            { status: 403, headers: getCorsHeaders(origin) }
          )
        }
        
        return NextResponse.json(
          {
            success: true,
            message: 'Password update simulated for the local demo account. Restart the app if you want to persist a new password.',
          },
          { headers: getCorsHeaders(origin) }
        )
      }

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      if (!dbUser) {
        return NextResponse.json(
          { error: 'Account not found.' },
          { status: 404, headers: getCorsHeaders(origin) }
        )
      }

      if (isGoogleReset) {
        const resetToken = cookieHeader.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('google-password-reset='))?.slice('google-password-reset='.length)
        const resetUser = resetToken ? verifyGooglePasswordResetToken(decodeURIComponent(resetToken)) : null
        if (!resetUser || resetUser.userId !== dbUser.id) {
          return NextResponse.json(
            { error: 'Google verification has expired. Start the reset again.' },
            { status: 403, headers: getCorsHeaders(origin) }
          )
        }
      } else {
        const isValid = await bcrypt.compare(currentPassword, dbUser.password)
        if (!isValid) {
          return NextResponse.json(
            { error: 'Current password is incorrect.' },
            { status: 400, headers: getCorsHeaders(origin) }
          )
        }
      }

      const hashed = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { password: hashed, updatedAt: new Date() },
      })

      const response = NextResponse.json(
        { success: true, message: 'Password updated successfully.' },
        { headers: getCorsHeaders(origin) }
      )
      if (isGoogleReset) response.cookies.delete('google-password-reset')
      return response
    }

    if (action === 'update-email') {
      const email = typeof body?.email === 'string' ? body.email.trim() : ''
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      if (user.id.startsWith('local-')) {
        return NextResponse.json(
          {
            success: true,
            message: 'Email update simulated for the local demo account.',
          },
          { headers: getCorsHeaders(origin) }
        )
      }

      const existing = await prisma.user.findFirst({ where: { email } })
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { error: 'That email address is already in use.' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { email, updatedAt: new Date() },
      })

      return NextResponse.json(
        { success: true, message: 'Email updated successfully.' },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'toggle-2fa') {
      const enabled = body?.enabled === true
      return NextResponse.json(
        {
          success: true,
          message: enabled
            ? 'Two-factor authentication is now enabled for this browser.'
            : 'Two-factor authentication is now disabled for this browser.',
          enabled,
        },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'reset-analytics') {
      const ownerUserId = await getOwnerUserId()
      const whereClause = getLinkAccountVisibilityWhereClause(user, ownerUserId)

      const linkAccounts = await prisma.linkAccount.findMany({ where: whereClause, select: { id: true } })
      const ids = linkAccounts.map((item) => item.id)

      await prisma.$transaction([
        prisma.click.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.geoStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.dailyAnalytics.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.hourlyAnalytics.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.browserStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.oSStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.deviceStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.referrerStat.deleteMany({ where: { linkAccountId: { in: ids } } }),
        prisma.linkAccount.updateMany({
          where: { id: { in: ids } },
          data: { totalClicks: 0, uniqueClicks: 0, botClicks: 0 },
        }),
      ])

      return NextResponse.json(
        { success: true, message: 'All analytics for your workspace have been reset.' },
        { headers: getCorsHeaders(origin) }
      )
    }

    if (action === 'delete-data') {
      const ownerUserId = await getOwnerUserId()
      const whereClause = getLinkAccountVisibilityWhereClause(user, ownerUserId)

      const linkAccounts = await prisma.linkAccount.findMany({ where: whereClause, select: { id: true } })
      const ids = linkAccounts.map((item) => item.id)

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
        prisma.linkAccount.deleteMany({ where: whereClause }),
        prisma.customDomain.deleteMany({ where: isOwner(user) ? {} : isAdmin(user) ? { userId: user.id } : { userId: user.id } }),
        prisma.offerVault.deleteMany({ where: isOwner(user) ? {} : isAdmin(user) ? { userId: user.id } : { userId: user.id } }),
      ])

      return NextResponse.json(
        { success: true, message: 'All workspace data for this account has been cleared.' },
        { headers: getCorsHeaders(origin) }
      )
    }

    return NextResponse.json(
      { error: 'Unknown action.' },
      { status: 400, headers: getCorsHeaders(origin) }
    )
  } catch (error) {
    console.error('Settings action error:', error)
    return NextResponse.json(
      { error: 'Unable to complete that request.' },
      { status: 500, headers: getCorsHeaders(origin) }
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
