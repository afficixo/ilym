import test from 'node:test'
import assert from 'node:assert/strict'

import { buildClickDedupeConditions, buildClickDedupeLockKeys, buildClickDedupeWhere, buildClickFingerprint } from './index'

test('buildClickFingerprint stays stable for the same visitor signature', () => {
  const first = buildClickFingerprint({
    linkId: 'link_123',
    ipAddress: '1.2.3.4',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    browser: 'Chrome',
    os: 'Windows',
    deviceType: 'Desktop',
  })

  const second = buildClickFingerprint({
    linkId: 'link_123',
    ipAddress: '1.2.3.4',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    browser: 'Chrome',
    os: 'Windows',
    deviceType: 'Desktop',
  })

  assert.equal(first, second)
  assert.ok(first.length > 20)
})

test('builds permanent duplicate conditions for matching IP or user-agent', () => {
  assert.deepEqual(
    buildClickDedupeConditions('1.2.3.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    [
      { ipAddress: '1.2.3.4' },
      { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    ],
  )
})

test('omits missing and unknown visitor identifiers from duplicate conditions', () => {
  assert.deepEqual(buildClickDedupeConditions('unknown', '  '), [])
  assert.deepEqual(buildClickDedupeConditions('1.2.3.4', ''), [{ ipAddress: '1.2.3.4' }])
})

test('matches any prior click with the same IP or user-agent on the same link, without a time cutoff', () => {
  assert.deepEqual(
    buildClickDedupeWhere('link_123', '1.2.3.4', 'Mozilla/5.0'),
    {
      linkAccountId: 'link_123',
      OR: [{ ipAddress: '1.2.3.4' }, { userAgent: 'Mozilla/5.0' }],
    },
  )
})

test('does not search click history when both visitor identifiers are missing', () => {
  assert.equal(buildClickDedupeWhere('link_123', 'unknown', ''), null)
})

test('scopes duplicate locks to the same link and identifier', () => {
  const first = buildClickDedupeLockKeys('link_123', 'signature', '1.2.3.4', 'Mozilla/5.0')
  const second = buildClickDedupeLockKeys('link_123', 'signature', '1.2.3.4', 'Mozilla/5.0')
  const differentLink = buildClickDedupeLockKeys('link_456', 'signature', '1.2.3.4', 'Mozilla/5.0')

  assert.deepEqual(first, second)
  assert.notDeepEqual(first, differentLink)
})
