import { NextResponse } from 'next/server'
import { getTokenFromCookie, getUserFromToken, isManager } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'
import { prisma } from '@/lib/db/prisma'
import {
  DEFAULT_REFERRAL_COMMISSION_RATE,
  estimateReferralCommission,
} from '@/lib/referrals'
import { calculatePaidManagerPayoutAmount } from '@/lib/utils/payment-pending'

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || null
  const token = getTokenFromCookie(request.headers.get('cookie') || '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(origin) })
  }

  const user = await getUserFromToken(token)
  if (!user || !isManager(user)) {
    return NextResponse.json({ error: 'Publisher access required' }, { status: 403, headers: getCorsHeaders(origin) })
  }

  try {
    const publisher = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        referralCode: true,
        referralCommissionRate: true,
        referrals: {
          select: { id: true, username: true, createdAt: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
        referralCommissionsEarned: {
          select: {
            id: true,
            amount: true,
            publisherPayoutAmount: true,
            createdAt: true,
            paidAt: true,
            referredUser: { select: { username: true } },
            invoice: { select: { invoiceNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        managerPayouts: {
          select: { totalEarning: true, isPaid: true },
        },
      },
    })
    if (!publisher) {
      return NextResponse.json({ error: 'Publisher account not found' }, { status: 404, headers: getCorsHeaders(origin) })
    }

    const referredManagers = await prisma.user.findMany({
      where: { referredById: user.id, role: 'MANAGER' },
      select: { id: true, username: true, commissionRate: true },
    })
    const pendingInvoices = referredManagers.length > 0
      ? await prisma.invoice.findMany({
        where: {
          isPaid: false,
          managerPayouts: { none: {} },
          linkAccount: { userId: { in: referredManagers.map((manager) => manager.id) } },
        },
        select: {
          invoiceNumber: true,
          totalEarning: true,
          createdAt: true,
          linkAccount: { select: { userId: true } },
        },
      })
      : []
    const managerById = new Map(referredManagers.map((manager) => [manager.id, manager]))
    const pendingEstimates = pendingInvoices.flatMap((invoice) => {
      const manager = managerById.get(invoice.linkAccount.userId)
      if (!manager) return []

      const estimate = estimateReferralCommission(
        invoice.totalEarning,
        Number(manager.commissionRate ?? 20) || 0,
        publisher.referralCommissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE,
      )
      if (estimate.amount <= 0) return []

      return [{
        id: `estimate-${invoice.invoiceNumber}`,
        ...estimate,
        createdAt: invoice.createdAt,
        referredUser: { username: manager.username },
        invoice: { invoiceNumber: invoice.invoiceNumber },
      }]
    })
    const commissions = publisher.referralCommissionsEarned.map((commission) => ({
      ...commission,
      status: commission.paidAt ? 'paid' : 'pending',
    }))
    const pendingRecordedAmount = commissions
      .filter((commission) => !commission.paidAt)
      .reduce((total, commission) => total + commission.amount, 0)
    const pendingEstimateAmount = pendingEstimates
      .reduce((total, estimate) => total + estimate.amount, 0)
    const paidAmount = commissions
      .filter((commission) => commission.paidAt)
      .reduce((total, commission) => total + commission.amount, 0)
    const pendingAmount = pendingRecordedAmount + pendingEstimateAmount
    const managerPaidOutAmount = calculatePaidManagerPayoutAmount(publisher.managerPayouts)

    return NextResponse.json({
      referralCode: publisher.referralCode,
      commissionRate: publisher.referralCommissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE,
      referredPublishers: publisher.referrals,
      commissions,
      pendingEstimates,
      summary: {
        referrals: publisher.referrals.length,
        pendingAmount,
        pendingRecordedAmount,
        pendingEstimateAmount,
        paidAmount,
        managerPaidOutAmount,
        totalAmount: pendingRecordedAmount + paidAmount,
      },
    }, { headers: getCorsHeaders(origin) })
  } catch (error) {
    console.error('Publisher referrals GET error:', error)
    return NextResponse.json({ error: 'Unable to load referral details' }, { status: 500, headers: getCorsHeaders(origin) })
  }
}
