import test from 'node:test'
import assert from 'node:assert/strict'
import { advanceFeedCursors } from './advanceFeedCursors.ts'

const initial = () => ({
  petId: 'pet-alpha',
  socialPetIds: ['pet-alpha'],
  socialOffset: 7,
  recommendationOffset: 2,
  socialExhausted: false,
  recommendationExhausted: false,
})

test('cursor advancement is immutable and can be discarded on request failure', () => {
  const stored = initial()
  const next = advanceFeedCursors(stored, { consumedSocial: 8, consumedRecommendations: 2 }, 10, 10, 10)
  assert.deepEqual(stored, initial())
  assert.equal(next.socialOffset, 15)
  assert.equal(next.recommendationOffset, 4)
  assert.deepEqual(next.socialPetIds, ['pet-alpha'])
  // If enrichment fails, retaining "stored" causes a replay of the same page.
  assert.equal(stored.socialOffset, 7)
  assert.equal(stored.recommendationOffset, 2)
})

test('partly consumed short responses retain unrendered records for next page', () => {
  const next = advanceFeedCursors(initial(),
    { consumedSocial: 2, consumedRecommendations: 0 }, 4, 3, 10)
  assert.equal(next.socialOffset, 9)
  assert.equal(next.recommendationOffset, 2)
  assert.equal(next.socialExhausted, false)
  assert.equal(next.recommendationExhausted, false)
})

test('fully consumed short responses and empty sources exhaust independently', () => {
  const next = advanceFeedCursors(initial(),
    { consumedSocial: 3, consumedRecommendations: 0 }, 3, 0, 10)
  assert.equal(next.socialExhausted, true)
  assert.equal(next.recommendationExhausted, true)
})

test('already exhausted source cannot become active again', () => {
  const next = advanceFeedCursors({ ...initial(), socialExhausted: true },
    { consumedSocial: 0, consumedRecommendations: 10 }, 0, 10, 10)
  assert.equal(next.socialExhausted, true)
  assert.equal(next.recommendationExhausted, false)
})

test('invalid page sizes are rejected', () => {
  assert.throws(() => advanceFeedCursors(initial(), { consumedSocial: 0, consumedRecommendations: 0 }, 0, 0, 0))
})
