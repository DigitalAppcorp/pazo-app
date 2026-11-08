// Chrome against the real app with isolated Auth and Data API fixtures.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PAZO_PLAYWRIGHT_MODULE || 'playwright')
const host = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
const sessionKey = `sb-${new URL(host).hostname.split('.')[0]}-auth-token`
process.env.VITE_SUPABASE_URL = host
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic'
const origin = 'http://127.0.0.1:5357'
const owner = '11000000-0000-4000-8000-000000000001'
const other = '11000000-0000-4000-8000-000000000002'
const pet = '22000000-0000-4000-8000-000000000001'
const hidden = '22000000-0000-4000-8000-000000000002'
const sharedUrl = `${origin}/#/pet/${pet}`
const now = new Date().toISOString()
const luna = { id: pet, owner_id: owner, name: 'Luna', species: 'gato', age: '3 años', bio: 'Le gusta dormir al sol', is_lost: false, photo_url: `${origin}/pwa-icon-192.png`, created_at: now }
const post = { id: hidden, text: 'Una tarde al sol', photo_url: null, likes: 2 }
const petColumns = 'id,name,species,age,photo_url,bio,breed,gender,is_lost'
const postColumns = 'id,text,photo_url,likes'
const server = await createServer({ server: { host: '127.0.0.1', port: 5357, strictPort: true } })
const sessionFor = (id) => {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'qa@invalid.example', created_at: now, email_confirmed_at: now, app_metadata: { provider: 'email' }, user_metadata: {} }
  const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: id, exp, role: user.role }, 'synthetic'].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
  return { access_token: token, refresh_token: 'synthetic', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }
}

let browser
const errors = []
const requests = []
async function pageFor({ id, lang = 'es', width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, locale: lang === 'es' ? 'es-GT' : 'en-US', isMobile: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await context.route('**/*', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.origin === origin) return route.continue()
    if (url.origin !== host) return route.abort()
    const reply = (data) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/0' }, body: JSON.stringify(data) })
    const table = url.pathname.replace('/rest/v1/', '')
    const columns = url.searchParams.get('select')
    const signedIn = Boolean(req.headers().authorization && req.headers().authorization !== 'Bearer sb_publishable_synthetic')
    const authId = signedIn ? id || other : null
    if (url.pathname.endsWith('/rpc/pazo_public_maintenance_status')) return reply({ enabled: false })
    if (url.pathname.endsWith('/rpc/pazo_push_config')) return reply({ enabled: false })
    if (url.pathname.startsWith('/rest/v1/rpc/')) return reply(false)
    if (url.pathname === '/auth/v1/user' && authId) return reply(sessionFor(authId).user)
    if (table === 'pets') {
      if (url.searchParams.has('id') && columns === petColumns) {
        requests.push({ table, signedIn, columns })
        const data = Object.fromEntries(petColumns.split(',').map((key) => [key, luna[key] ?? null]))
        return reply(url.searchParams.get('id') === `eq.${pet}` ? [data] : [])
      }
      if (authId === owner) return reply([luna])
      if (authId === other) return reply([{ ...luna, name: 'Bruno', id: hidden, owner_id: other }])
    }
    if (table === 'posts' && columns === postColumns && url.searchParams.get('pet_id') === `eq.${pet}`) {
      requests.push({ table, signedIn, columns })
      return reply([post])
    }
    if (!authId && ['pets', 'posts'].includes(table)) errors.push(`Unexpected guest read: ${table} (${columns})`)
    return reply([])
  })
  await context.routeWebSocket('**/*', (socket) => socket.close())
  await context.addInitScript(({ session, lang, sessionKey }) => {
    localStorage.setItem('pazo_language_preference_v1', lang)
    if (session) localStorage.setItem(sessionKey, JSON.stringify(session))
    window.qaShareMode = 'cancel'
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data) => {
      window.qaShare = { ...data, gesture: navigator.userActivation.isActive }
      if (window.qaShareMode === 'cancel') throw new DOMException('Cancelled', 'AbortError')
      if (window.qaShareMode === 'unsupported') throw new DOMException('Unavailable', 'NotAllowedError')
    } })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (url) => {
      if (window.qaNoClipboard) throw new DOMException('Denied', 'NotAllowedError')
      window.qaCopied = url
    } } })
  }, { session: id ? sessionFor(id) : null, lang, sessionKey })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  return page
}

try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome', ...(process.env.PAZO_CHROMIUM_PATH ? { executablePath: process.env.PAZO_CHROMIUM_PATH } : {}) })
  const author = await pageFor({ id: owner, width: 320 })
  await author.goto(origin)
  await author.getByRole('navigation', { name: 'Navegación de PAZO' }).getByRole('button', { name: 'Mi mascota', exact: true }).click()
  const share = author.getByRole('button', { name: 'Compartir perfil', exact: true })
  await share.click()
  assert.deepEqual(await author.evaluate(() => window.qaShare), { title: 'Luna · PAZO', url: sharedUrl, gesture: true })
  assert.equal(await author.getByText('Enlace copiado.', { exact: true }).count(), 0)
  await author.evaluate(() => { window.qaShareMode = 'unsupported' })
  await share.click()
  await author.getByText('Enlace copiado.', { exact: true }).waitFor()
  assert.equal(await author.evaluate(() => window.qaCopied), sharedUrl)
  await author.evaluate(() => { window.qaNoClipboard = true })
  await share.click()
  assert.equal(await author.getByRole('textbox', { name: 'Enlace al perfil social' }).inputValue(), sharedUrl)
  const name = await author.getByRole('heading', { name: 'Luna', exact: true, level: 3 }).boundingBox()
  assert.ok(name)
  await author.mouse.click(name.x + name.width / 2, name.y + name.height / 2)
  await author.getByText(post.text, { exact: true }).waitFor()
  assert.equal(await author.getByRole('button', { name: 'Conocer PAZO' }).count(), 0)
  await author.getByRole('button', { name: 'Regresar', exact: true }).click()
  await author.getByRole('button', { name: 'Ver perfil social de Luna' }).press('Enter')
  await author.getByText(post.text, { exact: true }).waitFor()
  await author.getByRole('button', { name: 'Regresar', exact: true }).click()
  await author.getByRole('button', { name: 'Editar', exact: true }).click()
  await author.getByRole('button', { name: 'Guardar Cambios' }).waitFor()
  console.log('PASS owner: share with gesture, cancellation, copy fallback, manual link, card, keyboard, separate edit')

  const guest = await pageFor()
  await guest.goto(sharedUrl)
  await guest.getByText(post.text, { exact: true }).waitFor()
  await guest.getByRole('button', { name: 'Conocer PAZO' }).waitFor()
  assert.equal(await guest.getByRole('button', { name: 'Opciones del perfil' }).count(), 0)
  await guest.reload()
  await guest.getByRole('heading', { name: 'Luna', exact: true, level: 2 }).waitFor()
  if (process.env.PAZO_SHARED_PET_SCREENSHOT) await guest.screenshot({ path: process.env.PAZO_SHARED_PET_SCREENSHOT })
  await guest.getByRole('button', { name: 'Conocer PAZO' }).click()
  await guest.getByRole('button', { name: 'Comenzar', exact: true }).waitFor()
  assert.equal(await guest.evaluate(() => sessionStorage.getItem('pazo_shared_pet_return')), `#/pet/${pet}`)
  await guest.evaluate(({ session, sessionKey }) => localStorage.setItem(sessionKey, JSON.stringify(session)), { session: sessionFor(other), sessionKey })
  await guest.reload()
  await guest.getByText(post.text, { exact: true }).waitFor()
  assert.equal(await guest.evaluate(() => sessionStorage.getItem('pazo_shared_pet_return')), null)
  assert.equal(await guest.getByRole('button', { name: 'Conocer PAZO' }).count(), 0)
  // A separate logged-in context exercises the same URL without the invitation.
  const member = await pageFor({ id: other, lang: 'en' })
  await member.goto(sharedUrl)
  await member.getByText(post.text, { exact: true }).waitFor()
  assert.equal(await member.getByRole('button', { name: 'Explore PAZO' }).count(), 0)
  console.log('PASS guest and member: cold URL, refresh, invite only without session, minimum social fields')

  const unavailable = await pageFor({ lang: 'en' })
  await unavailable.goto(`${origin}/#/pet/${hidden}`)
  await unavailable.getByText('Pet profile not found.', { exact: true }).waitFor()
  assert.equal(await unavailable.getByRole('button', { name: 'Explore PAZO' }).count(), 0)
  assert.ok(requests.some((request) => request.table === 'posts' && !request.signedIn))
  assert.deepEqual(errors, [])
  console.log('PASS unavailable profile and no unexpected anonymous reads')
} finally {
  await browser?.close()
  await server.close()
}
