import test from 'node:test'
import assert from 'node:assert/strict'
import { getLandingPageSubdomainFromHost } from './landing-page-host'

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
