import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveLegalCopy, legalPreview, pazoPrivacyEffectiveDate, PAZO_MARKETING_PRIVACY_EFFECTIVE_DATE} from './legalCopy.ts'

const all = copy => JSON.stringify(copy)
const on = (extra = {}) => ({VITE_PAZO_GOOGLE_AUTH_ENABLED: 'true', VITE_PAZO_META_ENABLED: 'true', ...extra})

for (const lang of ['es', 'en']) {
  test(lang + ': with everything off the published text is unchanged', () => {
    assert.deepEqual(resolveLegalCopy('privacy', lang, null, {}), legalPreview.privacy[lang])
    assert.deepEqual(resolveLegalCopy('terms', lang, null, {}), legalPreview.terms[lang])
  })
  test(lang + ': Meta on removes every denial and describes what is shared', () => {
    const text = all(resolveLegalCopy('privacy', lang, null, on()))
    assert.doesNotMatch(text, lang === 'es' ? /[Nn]o (env[ií]a|enviamos|se env[ií]an)[^.]*Meta/ : /(not send|do not send)[^.]*Meta/)
    for (const term of ['CompleteRegistration', 'SHA-256', 'Global Privacy Control', '14'])
      assert.ok(text.includes(term), term)
    assert.doesNotMatch(text, /_fbp/, 'no Pixel text while Pixel is off')
  })
  test(lang + ': Pixel text appears only with Pixel on', () => {
    const text = all(resolveLegalCopy('privacy', lang, null, on({VITE_PAZO_META_PIXEL_ENABLED: 'true'})))
    assert.match(text, /_fbp/)
    assert.match(text, /IP/)
  })
  test(lang + ': Google text and age note follow their own switch', () => {
    const env = {VITE_PAZO_GOOGLE_AUTH_ENABLED: 'true'}
    assert.match(all(resolveLegalCopy('privacy', lang, null, env)), /Google[^"]*(18)/)
    assert.match(all(resolveLegalCopy('terms', lang, null, env)), lang === 'es' ? /también si usas Google/ : /including when you use Google/)
    assert.match(all(resolveLegalCopy('privacy', lang, null, env)), lang === 'es' ? /no envía conversiones individuales a Meta/ : /does not send individual conversions to Meta/)
  })
}
test('effective date comes from the release, or stays as published', () => {
  assert.equal(pazoPrivacyEffectiveDate({VITE_PAZO_PRIVACY_EFFECTIVE_DATE: '2026-11-05'}), '2026-11-05')
  assert.equal(pazoPrivacyEffectiveDate({VITE_PAZO_PRIVACY_EFFECTIVE_DATE: 'soon'}), PAZO_MARKETING_PRIVACY_EFFECTIVE_DATE)
  assert.equal(pazoPrivacyEffectiveDate({}), PAZO_MARKETING_PRIVACY_EFFECTIVE_DATE)
})
