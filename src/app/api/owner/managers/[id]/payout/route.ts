import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import crypto from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { getTokenFromCookie, getUserFromToken, isOwner } from '@/lib/auth'
import { getCorsHeaders } from '@/config/cors'
import { calculatePendingAmount } from '@/lib/utils/payment-pending'
import { calculateReferralCommission, DEFAULT_REFERRAL_COMMISSION_RATE } from '@/lib/referrals'

type PayoutReadClient = Pick<Prisma.TransactionClient, 'user' | 'invoice' | 'referralCommission'>

class PayoutConflictError extends Error {}

function toMoneyCents(amount: number) {
  return Math.round(Number(amount.toFixed(2)) * 100)
}

async function getPayoutSnapshot(client: PayoutReadClient, managerId: string) {
  const manager = await client.user.findUnique({
    where: { id: managerId, role: 'MANAGER' },
    select: {
      id: true,
      username: true,
      fullName: true,
      payoutMethod: true,
      payoutAccount: true,
      bkashNumber: true,
      commissionRate: true,
      referredById: true,
    },
  })
  if (!manager) return null

  const [invoices, pendingReferralCommissions] = await Promise.all([
    client.invoice.findMany({
      where: {
        isPaid: false,
        linkAccount: { userId: managerId },
        managerPayouts: { none: {} },
      },
      select: { id: true, totalEarning: true, payoutMethod: true, payoutAccount: true },
      orderBy: { createdAt: 'asc' },
    }),
    client.referralCommission.findMany({
      where: { referrerId: managerId, paidWithPayoutId: null },
      select: { id: true, amount: true },
    }),
  ])
  const commissionRate = Number(manager.commissionRate ?? 20) || 0
  const ownPending = calculatePendingAmount(invoices, commissionRate)
  const referralPending = pendingReferralCommissions.reduce(
    (total, commission) => total + Number(commission.amount || 0),
    0,
  )
  const totalPending = ownPending + referralPending

  return {
    manager,
    invoices,
    pendingReferralCommissions,
    payoutMethod: manager.payoutMethod || (manager.bkashNumber ? 'BKASH' : null),
    payoutAccount: manager.payoutAccount || manager.bkashNumber || null,
    ownPending,
    referralPending,
    totalPending,
    totalPendingCents: toMoneyCents(totalPending),
    commissionRate,
  }
}

async function authorizeOwner(request: Request) {
  const token = getTokenFromCookie(request.headers.get('cookie') || '')
  if (!token) return null
  const user = await getUserFromToken(token)
  return user && isOwner(user) ? user : null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin') || null
  const headers = getCorsHeaders(origin)
  const user = await authorizeOwner(request)
  if (!user) {
    const token = getTokenFromCookie(request.headers.get('cookie') || '')
    return NextResponse.json(
      { error: token ? 'Owner access required' : 'Unauthorized' },
      { status: token ? 403 : 401, headers },
    )
  }

  try {
    const { id: managerId } = await params
    const snapshot = await getPayoutSnapshot(prisma, managerId)
    if (!snapshot) {
      return NextResponse.json({ error: 'Manager account not found' }, { status: 404, headers })
    }

    return NextResponse.json({
      managerId: snapshot.manager.id,
      username: snapshot.manager.username,
      fullName: snapshot.manager.fullName,
      payoutMethod: snapshot.payoutMethod,
      payoutAccount: snapshot.payoutAccount,
      ownPending: snapshot.ownPending,
      referralPending: snapshot.referralPending,
      totalPending: snapshot.totalPending,
      totalPendingCents: snapshot.totalPendingCents,
      pendingInvoiceCount: snapshot.invoices.length,
    }, { headers })
  } catch (error) {
    console.error('Manager payout preview error:', error)
    return NextResponse.json({ error: 'Unable to load current manager payout details' }, { status: 500, headers })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get('origin') || null
  const headers = getCorsHeaders(origin)
  const user = await authorizeOwner(request)
  if (!user) {
    const token = getTokenFromCookie(request.headers.get('cookie') || '')
    return NextResponse.json(
      { error: token ? 'Owner access required' : 'Unauthorized' },
      { status: token ? 403 : 401, headers },
    )
  }

  try {
    const { id: managerId } = await params
    const body = await request.json().catch(() => ({}))
    const paymentReference = typeof body?.paymentReference === 'string' ? body.paymentReference.trim() : ''
    const expectedTotalCents = body?.expectedTotalCents
    const expectedPayoutMethod = typeof body?.expectedPayoutMethod === 'string' ? body.expectedPayoutMethod : ''
    const expectedPayoutAccount = typeof body?.expectedPayoutAccount === 'string' ? body.expectedPayoutAccount : ''

    if (!paymentReference) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400, headers })
    }
    if (
      !Number.isSafeInteger(expectedTotalCents) ||
      expectedTotalCents < 0 ||
      !expectedPayoutMethod ||
      !expectedPayoutAccount
    ) {
      return NextResponse.json({ error: 'Refresh and confirm the current payout details before recording payment' }, { status: 400, headers })
    }

    const result = await prisma.$transaction(async (transaction) => {
      const snapshot = await getPayoutSnapshot(transaction, managerId)
      if (!snapshot) return { kind: 'missing-manager' as const }
      if (snapshot.invoices.length === 0 && snapshot.pendingReferralCommissions.length === 0) {
        return { kind: 'nothing-due' as const }
      }
      if (!snapshot.payoutMethod || !snapshot.payoutAccount) {
        return { kind: 'missing-payout-details' as const }
      }
      if (
        snapshot.totalPendingCents !== expectedTotalCents ||
        snapshot.payoutMethod !== expectedPayoutMethod ||
        snapshot.payoutAccount !== expectedPayoutAccount
      ) {
        return { kind: 'changed' as const }
      }

      const paidAt = new Date()
      const payoutNumber = `MP-${paidAt.toISOString().replace(/\D/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      const created = await transaction.managerPayout.create({
        data: {
          payoutNumber,
          managerId,
          totalEarning: snapshot.totalPending,
          invoiceCount: snapshot.invoices.length,
          payoutMethod: snapshot.payoutMethod,
          payoutAccount: snapshot.payoutAccount,
          paymentReference,
          isPaid: true,
          paidAt,
          invoices: {
            create: snapshot.invoices.map((invoice) => ({ invoiceId: invoice.id })),
          },
        },
        select: { id: true, payoutNumber: true, totalEarning: true, invoiceCount: true },
      })

      if (snapshot.pendingReferralCommissions.length > 0) {
        const settled = await transaction.referralCommission.updateMany({
          where: {
            id: { in: snapshot.pendingReferralCommissions.map((commission) => commission.id) },
            paidWithPayoutId: null,
          },
          data: { paidWithPayoutId: created.id, paidAt },
        })
        if (settled.count !== snapshot.pendingReferralCommissions.length) {
          throw new PayoutConflictError('Referral commissions changed while recording the payout')
        }
      }

      const referrerId = snapshot.manager.referredById
      if (referrerId) {
        const referrer = await transaction.user.findUnique({
          where: { id: referrerId },
          select: { referralCommissionRate: true },
        })
        const referralCommissionRate = referrer?.referralCommissionRate ?? DEFAULT_REFERRAL_COMMISSION_RATE
        await Promise.all(snapshot.invoices.map((invoice) => {
          const publisherPayoutAmount = calculatePendingAmount([invoice], snapshot.commissionRate)
          return transaction.referralCommission.create({
            data: {
              referrerId,
              referredUserId: managerId,
              invoiceId: invoice.id,
              sourcePayoutId: created.id,
              publisherPayoutAmount,
              commissionRate: referralCommissionRate,
              amount: calculateReferralCommission(publisherPayoutAmount, referralCommissionRate),
            },
          })
        }))
      }

      return { kind: 'created' as const, payout: created }
    }, {
      isolationLevel: 'Serializable' as const,
      maxWait: 5000,
      timeout: 10000,
    })

    if (result.kind === 'missing-manager') {
      return NextResponse.json({ error: 'Manager account not found' }, { status: 404, headers })
    }
    if (result.kind === 'nothing-due') {
      return NextResponse.json({ error: 'No unpaid publisher earnings or referral commissions found' }, { status: 404, headers })
    }
    if (result.kind === 'missing-payout-details') {
      return NextResponse.json(
        { error: 'Manager payment details are not configured. Update the manager account before recording this payout.' },
        { status: 400, headers },
      )
    }
    if (result.kind === 'changed') {
      return NextResponse.json(
        { error: 'The manager balance or payout details changed. Review the refreshed details before recording payment.' },
        { status: 409, headers },
      )
    }

    return NextResponse.json({ success: true, payout: result.payout }, { headers })
  } catch (error) {
    if (error instanceof PayoutConflictError || (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2034'
    )) {
      return NextResponse.json(
        { error: 'Payout data changed during processing. Refresh the balance and confirm again.' },
        { status: 409, headers },
      )
    }
    console.error('Manager payout error:', error)
    return NextResponse.json({ error: 'Unable to record manager payout' }, { status: 500, headers })
  }
}
