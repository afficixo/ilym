import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateReferralCommission } from './referrals'

test('estimates referral commission from the referred manager payout amount', () => {
  assert.deepEqual(estimateReferralCommission(100, 20, 5), {
    publisherPayoutAmount: 120,
    amount: 6,
  })
})

test('estimates each invoice separately to match recorded commission rounding', () => {
  const firstInvoice = estimateReferralCommission(0.05, 0, 50)
  const secondInvoice = estimateReferralCommission(0.05, 0, 50)

  assert.equal(firstInvoice.amount, 0.03)
  assert.equal(secondInvoice.amount, 0.03)
  assert.equal(firstInvoice.amount + secondInvoice.amount, 0.06)
})

test('returns no estimated referral commission when the referral rate is zero', () => {
  assert.deepEqual(estimateReferralCommission(100, 20, 0), {
    publisherPayoutAmount: 120,
    amount: 0,
  })
})
