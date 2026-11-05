import { calculatePendingAmount } from '@/lib/utils/payment-pending'

export const DEFAULT_REFERRAL_COMMISSION_RATE = 5

export function calculateReferralCommission(publisherPayoutAmount: number, commissionRate: number): number {
  return Math.round(publisherPayoutAmount * commissionRate) / 100
}

export function estimateReferralCommission(
  invoiceEarning: number | string | null | undefined,
  managerCommissionRate: number,
  referralCommissionRate: number,
) {
  const publisherPayoutAmount = calculatePendingAmount(
    [{ totalEarning: invoiceEarning }],
    managerCommissionRate,
  )

  return {
    publisherPayoutAmount,
    amount: calculateReferralCommission(publisherPayoutAmount, referralCommissionRate),
  }
}
