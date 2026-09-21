import test from 'node:test'
import assert from 'node:assert/strict'

import { buildClickFingerprint, isDuplicateClickEvent, isDuplicateVisit, isUniqueVisit } from './index'

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

test('marks a repeated click as duplicate when it falls inside the dedupe window', () => {
  const now = new Date('2026-07-13T10:00:00Z')
  const lastSeenAt = new Date('2026-07-13T09:55:00Z')

  assert.equal(isDuplicateVisit(lastSeenAt, now, 10 * 60 * 1000), true)
})

test('does not mark a visit as duplicate once the dedupe window has expired', () => {
  const now = new Date('2026-07-13T10:00:00Z')
  const lastSeenAt = new Date('2026-07-13T09:30:00Z')

  assert.equal(isDuplicateVisit(lastSeenAt, now, 10 * 60 * 1000), false)
})

test('marks a repeat visitor as not unique when the same fingerprint is seen inside the dedupe window', () => {
  const now = new Date('2026-07-13T10:00:00Z')
  const lastSeenAt = new Date('2026-07-13T09:55:00Z')

  assert.equal(isUniqueVisit(lastSeenAt, now, 10 * 60 * 1000), false)
})

test('marks a click as duplicate when the same IP is seen again inside the dedupe window', () => {
  const now = new Date('2026-07-13T10:00:00Z')
  const lastSeenAt = new Date('2026-07-13T09:55:00Z')

  assert.equal(
    isDuplicateClickEvent(
      lastSeenAt,
      now,
      {
        clickSignature: 'link:link_123|ip:1.2.3.4|ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        lastClickSignature: 'link:link_123|ip:1.2.3.4|ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        lastIpAddress: '1.2.3.4',
        lastUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      10 * 60 * 1000,
    ),
    true,
  )
})

test('marks a click as duplicate when the same user-agent is seen again inside the dedupe window', () => {
  const now = new Date('2026-07-13T10:00:00Z')
  const lastSeenAt = new Date('2026-07-13T09:55:00Z')

  assert.equal(
    isDuplicateClickEvent(
      lastSeenAt,
      now,
      {
        clickSignature: 'link:link_123|ip:5.6.7.8|ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '5.6.7.8',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        lastClickSignature: 'link:link_123|ip:1.2.3.4|ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        lastIpAddress: '1.2.3.4',
        lastUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      10 * 60 * 1000,
    ),
    true,
  )
})

test('does not treat the same IP as duplicate after the dedupe window has expired', () => {
  const now = new Date('2026-07-20T10:00:00Z')
  const lastSeenAt = new Date('2026-07-13T09:55:00Z')

  assert.equal(
    isDuplicateClickEvent(
      lastSeenAt,
      now,
      {
        clickSignature: 'link:link_123|ip:1.2.3.4|ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 2',
        lastClickSignature: 'link:link_123|ip:1.2.3.4|ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        lastIpAddress: '1.2.3.4',
        lastUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      10 * 60 * 1000,
    ),
    false,
  )
})
