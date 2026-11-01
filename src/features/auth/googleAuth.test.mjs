import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isGoogleAuthEnabled, googleRedirectUrl, isGoogleReturn, googleReturnFailure,
  cleanGoogleReturnUrl, requiresAdultAttestation, isNewGoogleAccount,
  rememberAdultAttestationIntent, takeAdultAttestationIntent, clearAdultAttestationIntent,
  hasAdultAttestationIntent,
} from './googleAuth.ts'

const NOW = Date.parse('2026-11-01T12:00:00Z')
const google = patch => ({created_at: '2026-11-01T11:59:00Z',
  app_metadata: {provider: 'google', providers: ['google']}, user_metadata: {}, ...patch})
const memory = () => {
  const map = new Map()
  return {getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)}
}

test('Google stays off unless the build explicitly enables it', () => {
  assert.equal(isGoogleAuthEnabled({}), false)
  for (const value of ['false', '1', 'TRUE', true, undefined])
    assert.equal(isGoogleAuthEnabled({VITE_PAZO_GOOGLE_AUTH_ENABLED: value}), false)
  assert.equal(isGoogleAuthEnabled({VITE_PAZO_GOOGLE_AUTH_ENABLED: 'true'}), true)
})
test('redirect returns to this origin only, without paths or campaign data', () => {
  assert.equal(googleRedirectUrl('https://pazo-app.vercel.app/some/path?utm_source=x'),
    'https://pazo-app.vercel.app/?auth=google')
})
test('return failures become fixed categories, and only for a Google return', () => {
  assert.equal(googleReturnFailure('?auth=google&error=access_denied&error_description=secret', ''), 'cancelled')
  assert.equal(googleReturnFailure('?auth=google', '#error=server_error&error_code=x'), 'failed')
  assert.equal(googleReturnFailure('?auth=google', '#access_token=a'), null)
  assert.equal(googleReturnFailure('?error=access_denied', ''), null)
  assert.equal(googleReturnFailure('?auth=recovery&error=access_denied', ''), null)
  assert.equal(isGoogleReturn('?auth=recovery'), false)
})
test('clean URL removes every token, code and error, and keeps the rest', () => {
  const base = 'https://pazo-app.vercel.app/'
  for (const dirty of ['?auth=google', '?auth=google#', '?auth=google#access_token=a.b.c&refresh_token=r&expires_in=3600',
    '?auth=google&code=abc&state=xyz', '?auth=google&error=access_denied&error_description=d', '?auth=google#error=x&error_code=y'])
    assert.equal(cleanGoogleReturnUrl(base + dirty), '/', dirty)
  assert.equal(cleanGoogleReturnUrl(base + '?auth=google&lang=en#/account/supporter'), '/?lang=en#/account/supporter')
})
test('recovery and ordinary URLs are never touched', () => {
  const base = 'https://pazo-app.vercel.app/'
  assert.equal(cleanGoogleReturnUrl(base + '?auth=recovery#access_token=a&type=recovery'), null)
  assert.equal(cleanGoogleReturnUrl(base + '?utm_source=meta'), null)
  assert.equal(cleanGoogleReturnUrl(base), null)
})
test('a Google account never counts as 18+ until the person confirms it', () => {
  assert.equal(requiresAdultAttestation(google()), true)
  assert.equal(requiresAdultAttestation(google({user_metadata: {email_verified: true, name: 'x'}})), true)
  assert.equal(requiresAdultAttestation(google({user_metadata: {pazo_adult_attested_at: true}})), true)
  assert.equal(requiresAdultAttestation(google({user_metadata: {pazo_adult_attested_at: '2026-11-01T12:00:00Z'}})), false)
})
test('email accounts, with or without a linked Google identity, keep their journey', () => {
  for (const providers of [['email'], ['email', 'google'], [], undefined])
    assert.equal(requiresAdultAttestation(google({app_metadata: {providers}})), false, String(providers))
})
test('only a just-created Google-only account is a new signup', () => {
  assert.equal(isNewGoogleAccount(google(), NOW), true)
  assert.equal(isNewGoogleAccount(google({created_at: '2026-10-01T00:00:00Z'}), NOW), false)
  assert.equal(isNewGoogleAccount(google({app_metadata: {providers: ['email', 'google']}}), NOW), false)
  assert.equal(isNewGoogleAccount(google({created_at: undefined}), NOW), false)
  assert.equal(isNewGoogleAccount(google({created_at: 'bad'}), NOW), false)
})
test('18+ intent is single use and expires; failures just ask again', () => {
  const storage = memory()
  assert.equal(takeAdultAttestationIntent(storage, NOW), false)
  assert.equal(hasAdultAttestationIntent(storage), false)
  rememberAdultAttestationIntent(storage, NOW)
  assert.equal(hasAdultAttestationIntent(storage), true)
  assert.equal(takeAdultAttestationIntent(storage, NOW + 1000), true)
  assert.equal(takeAdultAttestationIntent(storage, NOW + 2000), false)
  rememberAdultAttestationIntent(storage, NOW)
  assert.equal(takeAdultAttestationIntent(storage, NOW + 31 * 60 * 1000), false)
  rememberAdultAttestationIntent(storage, NOW)
  clearAdultAttestationIntent(storage)
  assert.equal(takeAdultAttestationIntent(storage, NOW), false)
  const denied = {getItem() { throw Error('x') }, setItem() { throw Error('x') }, removeItem() { throw Error('x') }}
  rememberAdultAttestationIntent(denied, NOW)
  clearAdultAttestationIntent(denied)
  assert.equal(takeAdultAttestationIntent(denied, NOW), false)
})
