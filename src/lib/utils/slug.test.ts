import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPublisherSlug } from './slug'

test('generated publisher slugs are lower-case to prevent FC01/fc01 collisions', () => {
  assert.equal(buildPublisherSlug('FC', 1), 'fc01')
  assert.equal(buildPublisherSlug('fc', 1), 'fc01')
})
