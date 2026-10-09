import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canCancelDeletion, canRequestDeletion, parseDeletionSnapshot,
  parseDeletionPreflight, getDeletionStatusMessage, deletionStatuses,
} from './deletionFlow.ts'

test('valid request status, never reports immediate deletion', () => {
  const s = parseDeletionSnapshot({
    status: 'requested', requested_at: '2026-10-09T12:00:00Z',
    updated_at: '2026-10-09T12:00:00Z',
  })
  assert.equal(s?.status, 'requested')
  assert.match(getDeletionStatusMessage('requested', true), /no se ha eliminado/)
})
test('reject unknown statuses and malformed dates', () => {
  assert.throws(() => parseDeletionSnapshot({ status: 'purged', requested_at: 'a', updated_at: 'b' }))
  assert.throws(() => parseDeletionSnapshot({ status: 'requested', requested_at: 4, updated_at: 'b' }))
})
test('only requested jobs can be cancelled, failed jobs cannot be requested twice', () => {
  for (const status of deletionStatuses) {
    assert.equal(canCancelDeletion(status), status === 'requested')
    assert.equal(canRequestDeletion(status), status === 'cancelled')
  }
  assert.equal(canRequestDeletion(null), true)
  assert.equal(canRequestDeletion(undefined), true)
})
test('preflight fails closed for invalid counts or missing review flag', () => {
  const valid = {
    pets: 2, posts: 3, communities_owned: 1,
    foreign_community_posts: 5, foreign_feed_comments: 2,
    documents: 1, care_items: 4, requires_manual_review: true,
  }
  assert.equal(parseDeletionPreflight(valid).foreignCommunityPosts, 5)
  assert.throws(() => parseDeletionPreflight({ ...valid, pets: -1 }))
  assert.throws(() => parseDeletionPreflight({ ...valid, documents: '2' }))
  assert.throws(() => parseDeletionPreflight({ ...valid, requires_manual_review: undefined }))
})
test('all lifecycle steps have honest status labels in both languages', () => {
  for (const status of deletionStatuses) {
    assert.ok(getDeletionStatusMessage(status, true).length > 14)
    assert.ok(getDeletionStatusMessage(status, false).length > 14)
  }
})
