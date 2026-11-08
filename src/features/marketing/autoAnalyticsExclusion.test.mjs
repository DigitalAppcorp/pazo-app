import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

const values = new Map()
globalThis.window = {
  localStorage: {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => { values.set(key, String(value)) },
    removeItem: key => { values.delete(key) },
  },
  addEventListener() {},
  removeEventListener() {},
}
const preferenceUrl = new URL('./analyticsPreference.ts', import.meta.url).href
const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'pazo-auto-exclusion-'))
const modulePath = path.join(cache, 'autoAnalyticsExclusion.ts')
fs.writeFileSync(modulePath, fs.readFileSync(new URL('./autoAnalyticsExclusion.ts', import.meta.url), 'utf8')
  .replace("from './analyticsPreference'", `from '${preferenceUrl}'`))
const { autoExcludeTestAccountBrowser, isTestAccount, AUTO_EXCLUSION_KEY } = await import(pathToFileURL(modulePath).href)
const { analyticsPreference, excludeBrowserAnalytics, ANALYTICS_EXCLUSION_KEY } = await import(preferenceUrl)

const reset = () => values.clear()

test('a test account excludes the browser once, without any request', () => {
  reset()
  assert.equal(autoExcludeTestAccountBrowser({ id: 'u1', app_metadata: { pazo_marketing_qa: true } }), true)
  assert.equal(analyticsPreference(), 'excluded')
  assert.equal(values.get(AUTO_EXCLUSION_KEY), '1')
  assert.equal(autoExcludeTestAccountBrowser({ id: 'u1', app_metadata: { pazo_marketing_qa: true } }), false)
})

test('a later manual re-inclusion is respected', () => {
  reset()
  autoExcludeTestAccountBrowser({ id: 'u1', app_metadata: { pazo_marketing_qa: true } })
  excludeBrowserAnalytics(false)
  assert.equal(analyticsPreference(), 'included')
  assert.equal(autoExcludeTestAccountBrowser({ id: 'u1', app_metadata: { pazo_marketing_qa: true } }), false)
  assert.equal(analyticsPreference(), 'included')
})

test('real and administrator accounts keep the current behaviour', () => {
  reset()
  assert.equal(autoExcludeTestAccountBrowser({ id: 'r1', app_metadata: { provider: 'email' } }), false)
  assert.equal(autoExcludeTestAccountBrowser({ id: 'a1', app_metadata: {} }), false)
  assert.equal(analyticsPreference(), 'included')
  assert.equal(values.has(AUTO_EXCLUSION_KEY), false)
  assert.doesNotMatch(fs.readFileSync(new URL('./autoAnalyticsExclusion.ts', import.meta.url), 'utf8'), /rpc|fetch|supabase/, 'No request on sign-in')
})

test('no session does nothing', () => {
  reset()
  assert.equal(autoExcludeTestAccountBrowser(null), false)
  assert.equal(autoExcludeTestAccountBrowser({ app_metadata: { pazo_marketing_qa: true } }), false)
  assert.equal(values.size, 0)
})

test('only the QA metadata flag marks a test account', () => {
  assert.equal(isTestAccount({ app_metadata: { pazo_marketing_qa: 'true' } }), true)
  assert.equal(isTestAccount({ app_metadata: { pazo_marketing_qa: false } }), false)
  assert.equal(isTestAccount({ user_metadata: { pazo_marketing_qa: true } }), false)
})

test('the admin toggle stays hidden until the server sends the flag', () => {
  const service = fs.readFileSync(new URL('../admin/testAccountService.ts', import.meta.url), 'utf8')
  const toggle = fs.readFileSync(new URL('../admin/components/AdminTestAccountToggle.tsx', import.meta.url), 'utf8')
  const board = fs.readFileSync(new URL('../admin/components/AdminDashboard.tsx', import.meta.url), 'utf8')
  assert.match(service, /rpc\('pazo_admin_set_test_account', \{ p_user_id: userId, p_test: test \}\)/)
  assert.match(toggle, /if \(initial === null\) return null/)
  assert.match(toggle, /role="switch" aria-checked=\{test\}/)
  assert.doesNotMatch(toggle, /\b(border|outline|ring)(-|\b)/, 'Rule 21: no outlines')
  assert.match(board, /<AdminTestAccountToggle lang=\{lang\} userId=\{u\.user_id\} row=\{u\}\/>/)
})
