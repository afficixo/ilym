import test from 'node:test'
import assert from 'node:assert/strict'

import { isUsNormalClick } from './dashboard-metrics'
import { isDesktopDeviceType, parseVisitorProfile } from './visitor-profile'

test('parses Android mobile traffic with chrome and device brand details', () => {
  const profile = parseVisitorProfile(
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
  )

  assert.equal(profile.browser, 'Chrome')
  assert.equal(profile.os, 'Android')
  assert.equal(profile.deviceType, 'Mobile')
  assert.equal(profile.deviceBrand, 'Pixel')
})

test('parses iPhone Safari traffic as iOS mobile with device brand details', () => {
  const profile = parseVisitorProfile(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
  )

  assert.equal(profile.browser, 'Safari')
  assert.equal(profile.os, 'iOS')
  assert.equal(profile.deviceType, 'Mobile')
  assert.equal(profile.deviceBrand, 'iPhone')
})

test('recognizes Facebook app user agents as Facebook browser traffic', () => {
  const profile = parseVisitorProfile(
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A.240205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FBAN/FB4A;FBAV/469.0.0.19.106;FBBV/571903005;FBDM/{density=2.75,width=1080,height=2170};FBLC/en_US;FBRV/572252465;FBCR/;FBMF/Google;FBBD/Google;FBDV/Pixel 8;FBSV/14;FBCA/arm64-v8a:;]'
  )

  assert.equal(profile.browser, 'Facebook')
  assert.equal(profile.os, 'Android')
  assert.equal(profile.deviceType, 'Mobile')
  assert.equal(profile.deviceBrand, 'Pixel')
})

test('recognizes desktop-like device values without treating them as invalid traffic', () => {
  assert.equal(isDesktopDeviceType('Desktop'), true)
  assert.equal(isDesktopDeviceType('Laptop'), true)
  assert.equal(isDesktopDeviceType('Computer'), true)
  assert.equal(isDesktopDeviceType('MacBook'), true)
  assert.equal(isDesktopDeviceType('Mobile'), false)
  assert.equal(isDesktopDeviceType('Tablet'), false)
  assert.equal(isDesktopDeviceType(null), false)
})

test('counts direct and Windows desktop US clicks as valid non-bot traffic', () => {
  const clicks = [
    { country: 'US', isUnique: true, isBot: false, referrer: '', deviceType: 'Desktop', os: 'Windows' },
    { country: 'US', isUnique: true, isBot: false, referrer: null, deviceType: 'Mobile', os: 'iOS' },
    { country: 'US', isUnique: true, isBot: false, referrer: 'https://google.com', deviceType: 'Desktop', os: 'Windows' },
    { country: 'CA', isUnique: true, isBot: false, referrer: '', deviceType: 'Desktop', os: 'Windows' },
    { country: 'US', isUnique: false, isBot: false, referrer: 'https://google.com', deviceType: 'Mobile', os: 'Android' },
    { country: 'US', isUnique: true, isBot: true, referrer: 'https://google.com', deviceType: 'Mobile', os: 'Android' },
  ]

  assert.deepEqual(
    clicks.filter((click) => isUsNormalClick(click as any)),
    [
      clicks[0],
      clicks[1],
      clicks[2],
      clicks[3],
      clicks[4],
    ]
  )
})
