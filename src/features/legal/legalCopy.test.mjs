import test from 'node:test'
import assert from 'node:assert/strict'
import { LEGAL_RELEASE_READY, legalPreview } from './legalCopy.ts'

test('no draft is treated as the final published privacy policy or terms', () => {
  assert.equal(LEGAL_RELEASE_READY, false)
  for (const kind of ['privacy','terms']) for (const lang of ['es','en']) {
    const copy=legalPreview[kind][lang]
    assert.ok(copy.heading.length>8)
    assert.ok(copy.alert.length>60)
    assert.ok(copy.sections.length>=5)
    assert.ok(copy.sections.every(s=>s.heading && s.text))
  }
  assert.match(legalPreview.privacy.es.alert,/Borrador/)
  assert.match(legalPreview.terms.en.alert,/not final contractual terms/)
})
test('truthful disclosure: no false claims of deletion or public purchases', () => {
  const privacy=legalPreview.privacy.es.sections.map(x=>x.text).join(' ')
  const terms=legalPreview.terms.es.sections.map(x=>x.text).join(' ')
  assert.match(privacy,/Supabase/)
  assert.match(privacy,/Mapbox/)
  assert.match(privacy,/eliminación de cuenta/)
  assert.match(terms,/18 años/)
  assert.match(terms,/en desarrollo/)
  assert.doesNotMatch(privacy,/eliminación instantánea|eliminados al instante/)
})
