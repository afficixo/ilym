import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deserializeLandingPageDomain,
  formatLandingPageUrl,
  getLandingPageSubdomainFromHost,
  serializeLandingPageDomain,
} from './landing-page-host'

test('formats landing page links with each domain protocol preference', () => {
  assert.equal(formatLandingPageUrl('summer-sale', { domain: 'weobly.com', includeProtocol: false }), 'summer-sale.weobly.com')
  assert.equal(formatLandingPageUrl('summer-sale', { domain: 'weebly.pro', includeProtocol: true }), 'https://summer-sale.weebly.pro')
})

test('persists explicit protocol choices while keeping default domain preferences', () => {
  assert.deepEqual(deserializeLandingPageDomain('weebly.pro'), { domain: 'weebly.pro', includeProtocol: true })
  assert.deepEqual(deserializeLandingPageDomain('http://weebly.pro'), { domain: 'weebly.pro', includeProtocol: false })
  assert.equal(serializeLandingPageDomain({ domain: 'weebly.pro', includeProtocol: false }), 'http://weebly.pro')
})

test('detects localhost subdomains and strips the .localhost suffix', () => {
  assert.equal(getLandingPageSubdomainFromHost('demo-offer.localhost:3000'), 'demo-offer')
})

test('ignores the main app host so it does not redirect to a landing page', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  assert.equal(getLandingPageSubdomainFromHost('localhost:3000'), null)
})

test('detects custom production subdomains for the app domain', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://afficixo.com'
  assert.equal(getLandingPageSubdomainFromHost('summer-sale.afficixo.com'), 'summer-sale')
})

test('detects weobly.com landing page subdomains when the app URL is not configured', () => {
  delete process.env.NEXT_PUBLIC_LANDING_PAGE_DOMAIN
  delete process.env.NEXT_PUBLIC_APP_URL
  assert.equal(getLandingPageSubdomainFromHost('summer-sale.weobly.com'), 'summer-sale')
  assert.equal(getLandingPageSubdomainFromHost('weobly.com'), null)
})

test('detects weebly.pro landing page subdomains even when app URL is not configured', () => {
  delete process.env.NEXT_PUBLIC_APP_URL
  assert.equal(getLandingPageSubdomainFromHost('tests.weebly.pro'), 'tests')
  assert.equal(getLandingPageSubdomainFromHost('weebly.pro'), null)
})

test('detects landing page subdomains on owner-configured root domains', () => {
  assert.equal(getLandingPageSubdomainFromHost('summer-sale.newbrand.com', ['newbrand.com']), 'summer-sale')
  assert.equal(getLandingPageSubdomainFromHost('summer-sale.newbrand.com', ['https://newbrand.com']), 'summer-sale')
  assert.equal(getLandingPageSubdomainFromHost('newbrand.com', ['newbrand.com']), null)
  assert.equal(getLandingPageSubdomainFromHost('summer-sale.weobly.com', ['newbrand.com']), null)
})
