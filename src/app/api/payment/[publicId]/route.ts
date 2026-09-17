import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { isDesktopDeviceType } from '@/lib/utils/visitor-profile'

export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await params
    const dashboard = await prisma.publicDashboard.findUnique({
      where: { publicId },
      include: {
        linkAccount: {
          select: {
            accountName: true,
            paymentPasswordHash: true,
          },
        },
      },
    })

    if (!dashboard || dashboard.isPrivate) {
      return NextResponse.json({ error: 'Payment profile is not available.' }, { status: 404 })
    }

    return NextResponse.json({
      accountName: dashboard.linkAccount.accountName,
      setupRequired: !dashboard.linkAccount.paymentPasswordHash,
    })
  } catch (error) {
    console.error('Payment profile status error:', error)
    return NextResponse.json({ error: 'Unable to check payment profile.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await params
    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password : ''
    const hasPayoutUpdate = typeof body?.payoutMethod === 'string' || typeof body?.payoutAccount === 'string'
    const payoutMethod = typeof body?.payoutMethod === 'string' ? body.payoutMethod.trim().toUpperCase() : ''
    const payoutAccount = typeof body?.payoutAccount === 'string' ? body.payoutAccount.trim() : ''

    const dashboard = await prisma.publicDashboard.findUnique({
      where: { publicId },
      include: { linkAccount: true },
    })

    if (!dashboard || dashboard.isPrivate) {
      return NextResponse.json({ error: 'Payment profile is not available.' }, { status: 404 })
    }
    const user = await prisma.user.findUnique({
      where: { id: dashboard.linkAccount.userId },
      select: { clickRate: true },
    })
    if (!user) return NextResponse.json({ error: 'Payment account owner is not available.' }, { status: 404 })
    let savedLinkAccount = dashboard.linkAccount
    if (!dashboard.linkAccount.paymentPasswordHash) {
      if (password.length < 8 || !['BKASH', 'BINANCE'].includes(payoutMethod) || !payoutAccount) {
        return NextResponse.json({ error: 'Set an access password of at least 8 characters and provide a bKash or Binance account.' }, { status: 409 })
      }
      const paymentPasswordHash = await bcrypt.hash(password, 12)
      savedLinkAccount = await prisma.linkAccount.update({
        where: { id: dashboard.linkAccountId },
        data: { paymentPasswordHash, payoutMethod, payoutAccount, updatedAt: new Date() },
      })
    } else if (!password || !(await bcrypt.compare(password, dashboard.linkAccount.paymentPasswordHash))) {
      return NextResponse.json({ error: 'Invalid payment access password.' }, { status: 401 })
    }

    if (hasPayoutUpdate && dashboard.linkAccount.paymentPasswordHash) {
      if (!['BKASH', 'BINANCE'].includes(payoutMethod) || !payoutAccount) {
        return NextResponse.json({ error: 'Choose bKash or Binance and provide a payment account.' }, { status: 400 })
      }
      savedLinkAccount = await prisma.linkAccount.update({
        where: { id: dashboard.linkAccountId },
        data: { payoutMethod, payoutAccount, updatedAt: new Date() },
      })
    }

    const qualifiedClicks = await prisma.click.count({
      where: { linkAccountId: dashboard.linkAccountId, country: 'US', isUnique: true, isBot: false },
    })
    const clickRate = Number(user.clickRate ?? 0) || 0
    const invoices = await prisma.invoice.findMany({
      where: { linkAccountId: dashboard.linkAccountId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        invoiceNumber: true,
        totalEarning: true,
        payoutMethod: true,
        payoutAccount: true,
        paymentReference: true,
        isPaid: true,
        createdAt: true,
        paidAt: true,
      },
    })

    return NextResponse.json({
      accountName: dashboard.linkAccount.accountName,
      payoutMethod: savedLinkAccount.payoutMethod || 'BKASH',
      payoutAccount: savedLinkAccount.payoutAccount || '',
      qualifiedClicks,
      clickRate,
      totalEarning: qualifiedClicks * clickRate,
      invoices,
    })
  } catch (error) {
    console.error('Payment profile error:', error)
    return NextResponse.json({ error: 'Unable to load payment profile.' }, { status: 500 })
  }
}
