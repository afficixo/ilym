import test from 'node:test'
import assert from 'node:assert/strict'

import { BotDetectionService } from './index'
import { parseVisitorProfile } from '@/lib/utils/visitor-profile'

const service = new BotDetectionService()

test('detects social media preview bots', async () => {
  const result = await service.detect(
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    '10.0.0.2'
  )

  assert.equal(result.isBot, true)
  assert.equal(result.score, 100)
  assert.equal(result.confidence, 'high')
  assert.ok(result.reasons.some((reason) => reason.includes('Social media')))
})

test('detects Telegram preview bots', async () => {
  const result = await service.detect(
    'TelegramBot (like TwitterBot)',
    '10.0.0.3'
  )

  assert.equal(result.isBot, true)
})

test('keeps normal browser user agents as real users', async () => {
  const result = await service.detect(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    '10.0.0.6'
  )

  assert.equal(result.isBot, false)
  assert.equal(result.score, 0)
})

test('preserves real browser parsing for normal browsers', async () => {
  const profile = parseVisitorProfile(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  )

  assert.equal(profile.browser, 'Chrome')
  assert.equal(profile.os, 'Windows')
  assert.equal(profile.deviceType, 'Desktop')
})
