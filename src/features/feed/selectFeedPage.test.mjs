import test from 'node:test'
import assert from 'node:assert/strict'
import { selectFeedPage } from './selectFeedPage.ts'
const rows = (prefix, n) => Array.from({ length: n }, (_, i) => ({ id: prefix + '-' + i }))
const visible = () => true
const seen = new Set()
test('mix never skips unrendered followed or recommended records', () => {
  const social = rows('followed', 20)
  const recommended = rows('recommended', 20)
  let socialOffset = 0
  let recommendationOffset = 0
  const displayed = []
  for (let page = 0; page < 6; page++) {
    const next = selectFeedPage(
      social.slice(socialOffset, socialOffset + 10),
      recommended.slice(recommendationOffset, recommendationOffset + 10),
      10, new Set(displayed), visible)
    if (page === 0) {
      assert.equal(next.entries.length, 10)
      assert.equal(next.consumedSocial, 8)
      assert.equal(next.consumedRecommendations, 2)
    }
    socialOffset += next.consumedSocial
    recommendationOffset += next.consumedRecommendations
    displayed.push(...next.entries.map(x => x.item.id))
    if (socialOffset === social.length && recommendationOffset === recommended.length) break
  }
  assert.equal(displayed.length, 40)
  assert.deepEqual(new Set(displayed), new Set([...social, ...recommended].map(x => x.id)))
})
test('overlapping and seen recommendations are discarded without repeats', () => {
  const next = selectFeedPage(rows('followed', 4),
    [{id:'followed-0'}, {id:'old'}, {id:'new'}], 10, new Set(['old']), visible)
  assert.deepEqual(next.entries.map(x => x.item.id),
    ['followed-0', 'followed-1', 'followed-2', 'followed-3', 'new'])
  assert.equal(next.consumedSocial, 4)
  assert.equal(next.consumedRecommendations, 3)
})
test('filtered rows cannot skip valid rows', () => {
  const next = selectFeedPage([{id:'hidden'}, ...rows('s', 10)],
    [{id:'blocked'}, ...rows('r', 10)], 10, seen,
    x => !['hidden','blocked'].includes(x.id))
  assert.equal(next.consumedSocial, 9)
  assert.equal(next.consumedRecommendations, 3)
  assert.equal(next.entries.length, 10)
})
test('fully filtered batch still advances its cursors', () => {
  const next = selectFeedPage([{id:'hidden'}], [{id:'old'}], 10, new Set(['old']), () => false)
  assert.deepEqual(next.entries, [])
  assert.equal(next.consumedSocial, 1)
  assert.equal(next.consumedRecommendations, 1)
})
test('recommendations alone respect page boundary', () => {
  const next = selectFeedPage([], rows('r', 15), 10, seen, visible)
  assert.equal(next.entries.length, 10)
  assert.equal(next.consumedSocial, 0)
  assert.equal(next.consumedRecommendations, 10)
})
test('invalid page size is rejected', () => {
  assert.throws(() => selectFeedPage([], [], 0, seen, visible))
})
