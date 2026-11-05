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

test('25% secretly redirects one of every four clicks', () => {
  let accumulator = 0
  const results: boolean[] = []

  for (let i = 0; i < 8; i += 1) {
    const next = advanceSecretRedirectAccumulator(accumulator, 25)
    results.push(next.shouldRedirect)
    accumulator = next.nextAccumulator
  }

  assert.deepEqual(results, [false, false, false, true, false, false, false, true])
})

test('50% uses the alternating accumulator pattern', () => {
  let accumulator = 0
  const results: boolean[] = []

  for (let i = 0; i < 6; i += 1) {
    const next = advanceSecretRedirectAccumulator(accumulator, 50)
    results.push(next.shouldRedirect)
    accumulator = next.nextAccumulator
  }

  assert.deepEqual(results, [false, true, false, true, false, true])
})

test('every whole percentage from 1 to 100 has the exact expected rate over 100 clicks', () => {
  for (let percentage = 1; percentage <= 100; percentage += 1) {
    let accumulator = 0
    let secretCount = 0

    for (let click = 0; click < 100; click += 1) {
      const result = advanceSecretRedirectAccumulator(accumulator, percentage)
      if (result.shouldRedirect) secretCount += 1
      accumulator = result.nextAccumulator
      assert.ok(accumulator >= 0 && accumulator < 100, `${percentage}% accumulator stays in range`)
    }

    assert.equal(secretCount, percentage, `${percentage}% rate`)
    assert.equal(accumulator, 0, `${percentage}% cycle returns accumulator to zero`)
  }
})

test('percentage values are rounded and clamped to supported integer bounds', () => {
  assert.equal(advanceSecretRedirectAccumulator(0, 0).shouldRedirect, false)
  assert.deepEqual(advanceSecretRedirectAccumulator(0, 25.4), { nextAccumulator: 25, shouldRedirect: false })
  assert.deepEqual(advanceSecretRedirectAccumulator(0, 25.5), { nextAccumulator: 26, shouldRedirect: false })
  assert.deepEqual(advanceSecretRedirectAccumulator(0, 100.9), { nextAccumulator: 0, shouldRedirect: true })
  assert.deepEqual(advanceSecretRedirectAccumulator(0, Number.NaN), { nextAccumulator: 50, shouldRedirect: false })
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

test('transactional decision persists accumulator state per link account', async () => {
  let accumulator = 0
  const tx = {
    $queryRaw: async () => [{ usaSecretRedirectAccumulator: accumulator }],
    $executeRaw: async (query: TemplateStringsArray, nextAccumulator: number, linkAccountId: string) => {
      assert.match(query.join(' '), /UPDATE "link_accounts"[\s\S]*WHERE "id" =/)
      assert.equal(linkAccountId, 'link-1')
      accumulator = nextAccumulator
    },
  }
  const offer = { id: 'offer-1', usaSecretRedirectEnabled: true, usaSecretRedirectPercentage: 25 }

  const decisions = []
  for (let click = 0; click < 4; click += 1) {
    decisions.push(await decideSecretRedirectInTransaction(tx, 'link-1', offer, 'US'))
  }

  assert.deepEqual(decisions, [false, false, false, true])
  assert.equal(accumulator, 0)
})

test('secret redirect percentages advance independently for each link account', async () => {
  const accumulators = new Map<string, number>([['link-1', 0], ['link-2', 0]])
  const lockedLinkIds: string[] = []
  const tx = {
    $queryRaw: async (query: TemplateStringsArray, linkAccountId: string) => {
      assert.match(query.join(' '), /FROM "link_accounts"[\s\S]*FOR UPDATE/)
      lockedLinkIds.push(linkAccountId)
      return [{ usaSecretRedirectAccumulator: accumulators.get(linkAccountId) ?? 0 }]
    },
    $executeRaw: async (query: TemplateStringsArray, nextAccumulator: number, linkAccountId: string) => {
      assert.match(query.join(' '), /UPDATE "link_accounts"[\s\S]*WHERE "id" =/)
      accumulators.set(linkAccountId, nextAccumulator)
    },
  }
  const offer = { id: 'offer-1', usaSecretRedirectEnabled: true, usaSecretRedirectPercentage: 25 }
  const decisions = new Map<string, boolean[]>()

  for (let click = 0; click < 4; click += 1) {
    for (const linkAccountId of accumulators.keys()) {
      const shouldRedirect = await decideSecretRedirectInTransaction(tx, linkAccountId, offer, 'US')
      decisions.set(linkAccountId, [...(decisions.get(linkAccountId) ?? []), shouldRedirect])
    }
  }

  assert.deepEqual(decisions.get('link-1'), [false, false, false, true])
  assert.deepEqual(decisions.get('link-2'), [false, false, false, true])
  assert.equal(accumulators.get('link-1'), 0)
  assert.equal(accumulators.get('link-2'), 0)
  assert.deepEqual(lockedLinkIds, ['link-1', 'link-2', 'link-1', 'link-2', 'link-1', 'link-2', 'link-1', 'link-2'])
})

test('non-US requests do not advance the persisted accumulator', async () => {
  let queryCount = 0
  const tx = {
    $queryRaw: async () => {
      queryCount += 1
      return [{ usaSecretRedirectAccumulator: 0 }]
    },
    $executeRaw: async () => undefined,
  }

  const shouldRedirect = await decideSecretRedirectInTransaction(
    tx,
    'link-1',
    { id: 'offer-1', usaSecretRedirectEnabled: true, usaSecretRedirectPercentage: 25 },
    'DE',
  )

  assert.equal(shouldRedirect, false)
  assert.equal(queryCount, 0)
})

test('disabled secret redirects do not lock or change link state', async () => {
  let queryCount = 0
  const tx = {
    $queryRaw: async () => {
      queryCount += 1
      return [{ usaSecretRedirectAccumulator: 0 }]
    },
    $executeRaw: async () => undefined,
  }

  const shouldRedirect = await decideSecretRedirectInTransaction(
    tx,
    'link-1',
    { id: 'offer-1', usaSecretRedirectEnabled: false, usaSecretRedirectPercentage: 25 },
    'US',
  )

  assert.equal(shouldRedirect, false)
  assert.equal(queryCount, 0)
})

test('a missing link account fails explicitly without attempting an update', async () => {
  let updateCount = 0
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async () => {
      updateCount += 1
    },
  }

  await assert.rejects(
    decideSecretRedirectInTransaction(
      tx,
      'missing-link',
      { id: 'offer-1', usaSecretRedirectEnabled: true, usaSecretRedirectPercentage: 25 },
      'US',
    ),
    /Link account missing-link was not found/,
  )
  assert.equal(updateCount, 0)
})
