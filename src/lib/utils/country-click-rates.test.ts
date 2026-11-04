import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCountryEarnings, getCountryClickRate } from './country-click-rates'

test('country-specific rates override the legacy United States rate', () => {
  const rates = [{ countryCode: 'CA', rate: 0.08 }]

  assert.equal(getCountryClickRate('CA', rates, 0.11), 0.08)
  assert.equal(getCountryClickRate('US', rates, 0.11), 0.11)
  assert.equal(getCountryClickRate('GB', rates, 0.11), 0)
})

test('only countries with a positive rate count as qualified clicks', () => {
  const earnings = calculateCountryEarnings(
    [
      { country: 'US', count: 10 },
      { country: 'CA', count: 5 },
      { country: 'GB', count: 20 },
      { country: 'UNKNOWN', count: 4 },
    ],
    [{ countryCode: 'CA', rate: 0.08 }],
    0.11,
  )

  assert.deepEqual(earnings, {
    qualifiedClicks: 15,
    totalEarning: 1.5,
    clickRate: 1.5 / 15,
  })
  assert.equal(getCountryClickRate('GB', [{ countryCode: 'CA', rate: 0.08 }]), 0)
  assert.equal(getCountryClickRate('UNKNOWN', []), null)
})

test('a configured zero rate does not qualify clicks', () => {
  const earnings = calculateCountryEarnings(
    [{ country: 'CA', count: 3 }],
    [{ countryCode: 'CA', rate: 0 }],
  )

  assert.deepEqual(earnings, { qualifiedClicks: 0, totalEarning: 0, clickRate: 0 })
})
