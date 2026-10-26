import test from 'node:test'
import assert from 'node:assert/strict'
import { createDemoPets, createDemoPosts, toggleDemoLike, toggleDemoSave, appendDemoComment } from './demoExperience.ts'
import { INITIAL_POSTS } from '../../data/mockData.ts'
import { canUseAccountFeatures } from '../auth/accountAccess.ts'

test('demo creates independent local copies and already-loaded comments', () => {
  const a = createDemoPosts()
  const b = createDemoPosts()
  assert.equal(a.length, INITIAL_POSTS.length)
  assert.ok(a.every((post) => post.commentsLoaded && !post.isLiked && !post.isSaved))
  a[0].comments[0].text = 'edited locally'
  assert.notEqual(a[0].comments[0].text, b[0].comments[0].text)
  assert.notEqual(a[0].comments[0].text, INITIAL_POSTS[0].comments[0].text)
  assert.notStrictEqual(createDemoPets()[0], createDemoPets()[0])
})

test('demo likes and saves stay local and reversible', () => {
  const initial = createDemoPosts()
  const liked = toggleDemoLike(initial, initial[0].id)
  assert.equal(liked[0].isLiked, true)
  assert.equal(liked[0].likes, initial[0].likes + 1)
  assert.deepEqual(toggleDemoLike(liked, initial[0].id), initial)
  const saved = toggleDemoSave(initial, initial[1].id)
  assert.equal(saved[1].isSaved, true)
  assert.deepEqual(toggleDemoSave(saved, initial[1].id), initial)
  assert.equal(initial[0].isLiked, false)
})

test('demo comments never mutate the fixtures or other posts', () => {
  const initial = createDemoPosts()
  const comment = { id: 'demo-c', authorName: 'Luna', authorPet: 'gato', authorAvatar: '', text: 'Local', timeAgo: 'Ahora' }
  const next = appendDemoComment(initial, initial[0].id, comment)
  assert.equal(next[0].comments.length, initial[0].comments.length + 1)
  assert.equal(next[0].commentsCount, initial[0].commentsCount + 1)
  assert.strictEqual(next[1], initial[1])
  assert.equal(INITIAL_POSTS[0].comments.length, initial[0].comments.length)
})

test('demo never grants authenticated account privileges', () => {
  assert.equal(canUseAccountFeatures(null, true), false)
  assert.equal(canUseAccountFeatures('user-even-when-signed-in', true), false)
  assert.equal(canUseAccountFeatures('signed-in', false), true)
})
