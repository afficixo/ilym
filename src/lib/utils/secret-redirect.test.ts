import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceSecretRedirectAccumulator, decideSecretRedirectInTransaction, getSecretRedirectFallbackUrl, shouldApplySecretRedirect } from './secret-redirect'

test('secret redirect is disabled for non-US traffic', () => {
  const result = shouldApplySecretRedirect({
    country: 'DE',
    enabled: true,
    percentage: 100,
    accumulator: 0,
  })

  assert.equal(result, false)
})

test('25% uses the accumulator pattern: secret, count, count, count', () => {
  let accumulator = 0
  const results: boolean[] = []

  for (let i = 0; i < 8; i += 1) {
    const next = advanceSecretRedirectAccumulator(accumulator, 25)
    results.push(next.shouldRedirect)
    accumulator = next.nextAccumulator
  }

  assert.deepEqual(results, [true, false, false, false, true, false, false, false])
})

test('50% uses the alternating accumulator pattern', () => {
  let accumulator = 0
  const results: boolean[] = []

  for (let i = 0; i < 6; i += 1) {
    const next = advanceSecretRedirectAccumulator(accumulator, 50)
    results.push(next.shouldRedirect)
    accumulator = next.nextAccumulator
  }

  assert.deepEqual(results, [true, false, true, false, true, false])
})

test('configured percentages produce the expected secret count per cycle', () => {
  const cases = [
    { percentage: 10, period: 10, expectedSecrets: 1 },
    { percentage: 20, period: 5, expectedSecrets: 1 },
    { percentage: 25, period: 4, expectedSecrets: 1 },
    { percentage: 33, period: 100, expectedSecrets: 33 },
    { percentage: 40, period: 5, expectedSecrets: 2 },
    { percentage: 50, period: 2, expectedSecrets: 1 },
    { percentage: 60, period: 5, expectedSecrets: 3 },
    { percentage: 75, period: 4, expectedSecrets: 3 },
  ]

  for (const { percentage, period, expectedSecrets } of cases) {
    let accumulator = 0
    let secretCount = 0

    for (let click = 0; click < period; click += 1) {
      const result = advanceSecretRedirectAccumulator(accumulator, percentage)
      if (result.shouldRedirect) secretCount += 1
      accumulator = result.nextAccumulator
    }

    assert.equal(secretCount, expectedSecrets, `${percentage}% cycle`)
    assert.equal(accumulator, 0, `${percentage}% cycle returns accumulator to zero`)
  }
})

test('secret redirect is skipped when disabled', () => {
  const result = shouldApplySecretRedirect({
    country: 'US',
    enabled: false,
    percentage: 100,
    accumulator: 0,
  })

  assert.equal(result, false)
})

test('fallback secret redirect URL is defined', () => {
  const url = getSecretRedirectFallbackUrl()

  assert.match(url, /^https?:\/\//)
})

test('transactional decision persists accumulator state between eligible clicks', async () => {
  let accumulator = 0
  const tx = {
    $queryRaw: async () => [{ usaSecretRedirectAccumulator: accumulator }],
    offerVault: {
      update: async ({ data }: { data: { usaSecretRedirectAccumulator: number } }) => {
        accumulator = data.usaSecretRedirectAccumulator
      },
    },
  }
  const offer = { id: 'offer-1', usaSecretRedirectEnabled: true, usaSecretRedirectPercentage: 25 }

  const decisions = []
  for (let click = 0; click < 4; click += 1) {
    decisions.push(await decideSecretRedirectInTransaction(tx, offer, 'US'))
  }

  assert.deepEqual(decisions, [true, false, false, false])
  assert.equal(accumulator, 0)
})

test('non-US requests do not advance the persisted accumulator', async () => {
  let queryCount = 0
  const tx = {
    $queryRaw: async () => {
      queryCount += 1
      return [{ usaSecretRedirectAccumulator: 0 }]
    },
    offerVault: { update: async () => undefined },
  }

  const shouldRedirect = await decideSecretRedirectInTransaction(
    tx,
    { id: 'offer-1', usaSecretRedirectEnabled: true, usaSecretRedirectPercentage: 25 },
    'DE',
  )

  assert.equal(shouldRedirect, false)
  assert.equal(queryCount, 0)
})
