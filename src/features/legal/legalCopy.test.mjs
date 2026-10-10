import test from 'node:test'
import assert from 'node:assert/strict'
import { LEGAL_RELEASE_READY, legalPreview } from './legalCopy.ts'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from './supportContact.ts'
import { readFileSync } from 'node:fs'

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

test('public privacy inbox is real, bilingual, and never promises automated deletion', () => {
  assert.equal(PAZO_PRIVACY_SUPPORT_EMAIL, 'appdigital.corp@gmail.com')
  assert.equal(PAZO_PRIVACY_SUPPORT_MAILTO, 'mailto:appdigital.corp@gmail.com')
  assert.equal(LEGAL_RELEASE_READY, false)
  const es = legalPreview.privacy.es.sections.map(s => s.text).join(' ')
  const en = legalPreview.privacy.en.sections.map(s => s.text).join(' ')
  assert.match(es,/solicitud no borra datos automáticamente/i)
  assert.match(en,/does not automatically erase data/i)
  const previews = readFileSync(new URL('./LegalPreviewDialog.tsx', import.meta.url), 'utf8')
  const request = readFileSync(new URL('../account/DeletionRequestDialog.tsx', import.meta.url), 'utf8')
  for (const ui of [previews, request]) {
    assert.match(ui,/PAZO_PRIVACY_SUPPORT_MAILTO/)
    assert.match(ui,/PAZO_PRIVACY_SUPPORT_EMAIL/)
    assert.match(ui,/focus-visible:bg/)
    assert.doesNotMatch(ui,/target="_blank"/)
  }
})
