import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAZO_LANGUAGE_KEY,
  applyDocumentLanguage,
  rememberLanguage,
  resolveInitialLanguage,
} from './languagePreference.ts'

test('device/browser language selects English from en-US and en-GB', () => {
  assert.equal(resolveInitialLanguage(null, ['en-US', 'es-MX']), 'en')
  assert.equal(resolveInitialLanguage(null, ['en-GB']), 'en')
})
test('device/browser language selects Spanish from es-MX, es-GT and es-419', () => {
  for (const preferred of ['es-MX', 'es-GT', 'es-419', 'ES_es']) {
    assert.equal(resolveInitialLanguage(null, [preferred]), 'es')
  }
})
test('browser preference order and supported-language fallback', () => {
  assert.equal(resolveInitialLanguage(null, ['fr-FR', 'es-US', 'en-US']), 'es')
  assert.equal(resolveInitialLanguage(null, ['fr-FR', 'de-DE']), 'en')
  assert.equal(resolveInitialLanguage(null, [], 'es-ES'), 'es')
  assert.equal(resolveInitialLanguage(null, undefined, undefined), 'en')
})
test('manual choice overrides device language and rejects invalid saved data', () => {
  assert.equal(resolveInitialLanguage('en', ['es-MX']), 'en')
  assert.equal(resolveInitialLanguage('es', ['en-US']), 'es')
  assert.equal(resolveInitialLanguage('fr', ['es-GT']), 'es')
  assert.equal(resolveInitialLanguage('EN', ['es-GT']), 'es')
})
test('manual language persists when storage works and survives storage blocking', () => {
  const stored = new Map()
  const storage = { setItem(key, value) { stored.set(key, value) } }
  assert.equal(rememberLanguage('es', storage), true)
  assert.equal(stored.get(PAZO_LANGUAGE_KEY), 'es')
  assert.equal(resolveInitialLanguage(stored.get(PAZO_LANGUAGE_KEY), ['en-US']), 'es')
  assert.equal(rememberLanguage('en', { setItem() { throw new Error('blocked') } }), false)
})
test('document language and title follow selection for screen readers and tabs', () => {
  const doc = { documentElement: { lang: 'en' }, title: '' }
  applyDocumentLanguage('es', doc)
  assert.equal(doc.documentElement.lang, 'es')
  assert.equal(doc.title, 'Pazo • Su mundo, más cerca')
  applyDocumentLanguage('en', doc)
  assert.equal(doc.documentElement.lang, 'en')
  assert.equal(doc.title, 'Pazo • Their world, closer')
})
