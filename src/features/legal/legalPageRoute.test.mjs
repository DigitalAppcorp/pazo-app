import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {legalPageKind, legalPageLanguage} from './legalPageRoute.ts'

test('only the two exact public addresses are legal pages', () => {
  assert.equal(legalPageKind('/privacy'), 'privacy')
  assert.equal(legalPageKind('/terms'), 'terms')
  for (const path of ['/', '/privacy/', '/terms/x', '/PRIVACY', '/paypal/return', ''])
    assert.equal(legalPageKind(path), null, path)
})
test('explicit language wins for the visit, anything else uses the preference', () => {
  assert.equal(legalPageLanguage('?lang=en', 'es'), 'en')
  assert.equal(legalPageLanguage('?lang=es', 'en'), 'es')
  assert.equal(legalPageLanguage('?lang=fr', 'es'), 'es')
  assert.equal(legalPageLanguage('', 'en'), 'en')
})
test('host serves both addresses, and existing rewrites stay', () => {
  const {rewrites} = JSON.parse(readFileSync('vercel.json', 'utf8'))
  for (const source of ['/privacy', '/terms', '/paypal/return', '/paypal/cancel'])
    assert.deepEqual(rewrites.find(r => r.source === source), {source, destination: '/index.html'})
})
test('public page has no path to Auth, database or analytics', () => {
  const page = readFileSync('src/features/legal/LegalPage.tsx', 'utf8')
  assert.doesNotMatch(page, /supabase|AuthContext|observability|marketing\//i)
  const main = readFileSync('src/main.tsx', 'utf8')
  assert.ok(main.indexOf('legalPageKind(') < main.indexOf('getPublicSupabaseConfig(import.meta.env)'),
    'legal pages render before the app or its configuration')
})
