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
const { autoExcludeInternalBrowser, isTestAccount, AUTO_EXCLUSION_KEY } = await import(pathToFileURL(modulePath).href)
const { analyticsPreference, excludeBrowserAnalytics, ANALYTICS_EXCLUSION_KEY } = await import(preferenceUrl)

const reset = () => values.clear()
const never = async () => { throw new Error('admin check must not run') }

test('test accounts exclude the browser without asking the server', async () => {
  reset()
  assert.equal(await autoExcludeInternalBrowser({ id: 'u1', app_metadata: { pazo_marketing_qa: true } }, never), true)
  assert.equal(analyticsPreference(), 'excluded')
  assert.equal(values.get(AUTO_EXCLUSION_KEY), '1')
})

test('administrators exclude the browser once', async () => {
  reset()
  let calls = 0
  const admin = async () => { calls++; return true }
  assert.equal(await autoExcludeInternalBrowser({ id: 'a1', app_metadata: {} }, admin), true)
  assert.equal(values.get(ANALYTICS_EXCLUSION_KEY), '1')
  assert.equal(await autoExcludeInternalBrowser({ id: 'a1', app_metadata: {} }, admin), false)
  assert.equal(calls, 1)
})

test('a later manual re-inclusion is respected', async () => {
  reset()
  await autoExcludeInternalBrowser({ id: 'a1' }, async () => true)
  excludeBrowserAnalytics(false)
  assert.equal(analyticsPreference(), 'included')
  assert.equal(await autoExcludeInternalBrowser({ id: 'a1' }, async () => true), false)
  assert.equal(analyticsPreference(), 'included')
})

test('real accounts keep sending signals', async () => {
  reset()
  assert.equal(await autoExcludeInternalBrowser({ id: 'r1', app_metadata: { provider: 'email' } }, async () => false), false)
  assert.equal(analyticsPreference(), 'included')
  assert.equal(values.has(AUTO_EXCLUSION_KEY), false)
})

test('a session refresh does not repeat the admin check for a real account', async () => {
  reset()
  let calls = 0
  const notAdmin = async () => { calls++; return false }
  await autoExcludeInternalBrowser({ id: 'r3' }, notAdmin)
  await autoExcludeInternalBrowser({ id: 'r3' }, notAdmin)
  assert.equal(calls, 1)
})

test('a failed admin check never excludes', async () => {
  reset()
  assert.equal(await autoExcludeInternalBrowser({ id: 'r2' }, async () => { throw new Error('offline') }), false)
  assert.equal(analyticsPreference(), 'included')
})

test('no session does nothing', async () => {
  reset()
  assert.equal(await autoExcludeInternalBrowser(null, never), false)
  assert.equal(await autoExcludeInternalBrowser({ app_metadata: { pazo_marketing_qa: true } }, never), false)
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
