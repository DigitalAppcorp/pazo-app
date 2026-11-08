// Chrome against the real app with isolated Auth and Data API fixtures.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'vite'
import { createPetPreviewHandler } from '../api/pet-preview.js'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PAZO_PLAYWRIGHT_MODULE || 'playwright')
const host = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
const sessionKey = `sb-${new URL(host).hostname.split('.')[0]}-auth-token`
process.env.VITE_SUPABASE_URL = host
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic'
process.env.VITE_PAZO_PENDING_CAMPAIGN_ENABLED = 'true'
const origin = 'http://127.0.0.1:5357'
const owner = '11000000-0000-4000-8000-000000000001'
const other = '11000000-0000-4000-8000-000000000002'
const noPetOwner = '11000000-0000-4000-8000-000000000003'
const pet = '22000000-0000-4000-8000-000000000001'
const hidden = '22000000-0000-4000-8000-000000000002'
const sharedUrl = `${origin}/mascota/${pet}`
const now = new Date().toISOString()
const luna = { id: pet, owner_id: owner, name: 'Luna', species: 'gato', age: '3 años', bio: 'Le gusta dormir al sol', is_lost: false, photo_url: `${origin}/pwa-icon-192.png`, created_at: now }
const adminOverview = {
  as_of: now, period_days: 30,
  people: { registered: 1, new_7d: 1, new_30d: 1, with_pet: 1, without_pet: 0, pets: 1, posts: 1, comments: 0, communities: 0 },
  activity: { today: 1, last_7d: 1, last_30d: 1, active_period: 1, total_user_days: 1, module_counts: {} },
}
const post = { id: hidden, text: 'Una tarde al sol', photo_url: null, likes: 2 }
const petColumns = 'id,name,species,age,photo_url,bio,breed,gender,is_lost'
const postColumns = 'id,text,photo_url,likes'
const previewPhoto = `${host}/storage/v1/object/public/pet-avatars/test/luna.jpg`
const previewHandler = createPetPreviewHandler({ loadPet: async id => id === pet ? { ...luna, photo_url: previewPhoto, bio: 'Le gusta dormir al sol <y jugar>' } : null })
const server = await createServer({
  server: { host: '127.0.0.1', port: 5357, strictPort: true },
  plugins: [{ name: 'fixture-pet-preview', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      const match = new URL(req.url, origin).pathname.match(/^\/mascota\/([^/]+)$/)
      if (!match) return next()
      req.query = { id: match[1] }
      void previewHandler(req, res)
    })
  } }],
})
const sessionFor = (id) => {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const user = { id, aud: 'authenticated', role: 'authenticated', email: 'qa@invalid.example', created_at: now, email_confirmed_at: now, app_metadata: { provider: 'email' }, user_metadata: {} }
  const token = [{ alg: 'HS256', typ: 'JWT' }, { sub: id, exp, role: user.role }, 'synthetic'].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.')
  return { access_token: token, refresh_token: 'synthetic', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }
}

let browser
const errors = []
const requests = []
const signupRequests = []
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
    if (table === 'rpc/pazo_admin_overview') return reply(adminOverview)
    if (table === 'rpc/pazo_admin_users') return reply([{
      user_id: owner, email: 'private-owner@invalid.example', created_at: now, active_days_30: 1,
      pets: [{ id: pet, name: luna.name, species: luna.species }],
    }])
    if (table === 'rpc/pazo_admin_signup_summary_v1') return reply({ methods: [], attempts: [], attempts_active: false,
      accounts: { [owner]: { method: 'email', confirmed: true, signed_in: true, email_sent: true, ad_campaign: 'pazo_beta_local_202610' } } })
    if (table === 'rpc/pazo_admin_experiments') return reply([])
    if (table === 'rpc/pazo_admin_pwa_installation_counts') return reply({ enabled: false })
    if (url.pathname.startsWith('/rest/v1/rpc/')) return reply(false)
    if (url.pathname === '/auth/v1/user' && authId) return reply(sessionFor(authId).user)
    if (url.pathname === '/auth/v1/signup') {
      signupRequests.push(req.postDataJSON().data)
      return reply({ ...sessionFor(owner).user, email_confirmed_at: null, identities: [{ id: owner }] })
    }
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
    if (table === 'notifications' && authId === owner && url.searchParams.get('type') === 'eq.return_share') {
      return reply([{ id: hidden, type: 'return_share', title: 'Consejos de PAZO', body: '', read_at: now, created_at: now, pet_id: pet }])
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
  const crawler = await guest.request.get(sharedUrl, { headers: { 'user-agent': 'facebookexternalhit/1.1' } })
  assert.equal(crawler.status(), 200)
  const html = await crawler.text()
  assert.ok(html.includes('property="og:title" content="Luna · PAZO"'))
  assert.ok(html.includes(`property="og:image" content="${previewPhoto}"`))
  assert.ok(html.includes('property="og:description" content="Le gusta dormir al sol &lt;y jugar&gt;"'))
  assert.ok(html.includes('property="og:site_name" content="PAZO"'))
  assert.ok(!html.includes(owner))
  assert.equal((await guest.request.get(`${origin}/mascota/${hidden}`)).status(), 404)
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

  const admin = await pageFor({ id: other, width: 320 })
  await admin.goto(`${origin}/supabase/tests/marketing/behavior-harness.html?lang=es`)
  await admin.locator('#pazo-admin-section').selectOption('users')
  await admin.getByText('Anuncio · Meta · pazo_beta_local_202610', { exact: true }).waitFor()
  await admin.locator('#pazo-admin-section').selectOption('pets')
  const adminLink = admin.getByRole('link', { name: 'Ver perfil público de Luna en otra pestaña' })
  assert.equal(await adminLink.getAttribute('href'), sharedUrl)
  const profilePage = admin.context().waitForEvent('page')
  await adminLink.press('Enter')
  const publicPage = await profilePage
  await publicPage.getByText(post.text, { exact: true }).waitFor()
  assert.equal(await publicPage.getByText('private-owner@invalid.example').count(), 0)
  assert.ok(admin.url().includes('behavior-harness.html'))
  console.log('PASS Admin: retained campaign label and keyboard link to the public projection')

  await author.goto(`${origin}/?open=notifications&tip=return_share`)
  const shareDialog = author.getByRole('dialog', { name: 'Compartir perfil', exact: true })
  await shareDialog.waitFor()
  assert.equal(await shareDialog.getByRole('textbox', { name: 'Enlace al perfil social' }).inputValue(), sharedUrl)
  assert.equal(await author.getByText(post.text, { exact: true }).count(), 0)
  await shareDialog.getByRole('button', { name: 'Compartir vínculo', exact: true }).click()
  assert.deepEqual(await author.evaluate(() => window.qaShare), { title: 'Luna · PAZO', url: sharedUrl, gesture: true })
  await shareDialog.getByRole('button', { name: 'Copiar enlace', exact: true }).click()
  await shareDialog.getByText('Enlace copiado.', { exact: true }).waitFor()
  assert.ok(!author.url().includes('tip='))
  await shareDialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await author.goto(`${origin}/#/pet/${pet}`)
  await author.getByText(post.text, { exact: true }).waitFor()
  assert.equal(await author.getByLabel('Identidad de la mascota').getByRole('button', { name: 'Compartir perfil', exact: true }).count(), 0)
  await author.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'pazo-open-notifications', tip: 'return_share' } })))
  await shareDialog.waitFor()
  assert.ok(!author.url().includes('#/pet/'))
  if (process.env.PAZO_SHARE_DIALOG_SCREENSHOT) await author.screenshot({ path: process.env.PAZO_SHARE_DIALOG_SCREENSHOT })
  console.log('PASS sharing tip opens share and copy in PAZO; public profile keeps its original actions')

  const firstPet = await pageFor({ id: noPetOwner })
  await firstPet.goto(`${origin}/?open=notifications&tip=return_no_pet`)
  await firstPet.getByRole('heading', { name: '¿Quién te acompaña?', exact: true }).waitFor()
  await firstPet.waitForFunction(() => !location.search.includes('tip='))
  await firstPet.getByPlaceholder('Ej: Luna, Bruno, Nube...').fill('Luna')
  await firstPet.getByRole('button', { name: 'Continuar', exact: true }).click()
  await firstPet.getByRole('button', { name: 'Crear perfil y entrar', exact: true }).waitFor()
  await firstPet.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'pazo-open-notifications', tip: 'return_no_pet' } })))
  await firstPet.getByRole('heading', { name: '¿Quién te acompaña?', exact: true }).waitFor()
  assert.equal(await firstPet.getByPlaceholder('Ej: Luna, Bruno, Nube...').inputValue(), 'Luna')
  console.log('PASS first-pet tip opens its form from a cold URL and from an already open PAZO tab')

  const campaign = await pageFor()
  await campaign.goto(origin)
  const firstTouchAt = Date.now() - 1000
  await campaign.evaluate(firstTouchAt => localStorage.setItem('pazo_marketing_firstparty_v1', JSON.stringify({
    version: 1, steps: ['landing'], attribution: { source: 'meta', medium: 'paid_social', campaign: 'pazo_beta_local_202610', creative: 'qr_es', firstTouchAt },
  })), firstTouchAt)
  await campaign.getByRole('button', { name: 'Comenzar', exact: true }).click()
  await campaign.locator('#pazo-signup-email').fill('qa@invalid.example')
  await campaign.locator('#pazo-signup-password').fill('SyntheticPass123')
  await campaign.locator('#pazo-signup-password-confirm').fill('SyntheticPass123')
  await campaign.getByRole('checkbox').check()
  await campaign.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await campaign.getByText('Revisa tu correo', { exact: true }).waitFor()
  assert.deepEqual(signupRequests, [{ pazo_pending_campaign: { creative: 'qr_es', first_touch_ms: firstTouchAt } }])
  console.log('PASS campaign signup sends only the closed code and first-touch timestamp to Auth')

  assert.ok(requests.some((request) => request.table === 'posts' && !request.signedIn))
  assert.deepEqual(errors, [])
  console.log('PASS unavailable profile and no unexpected anonymous reads')
} finally {
  await browser?.close()
  await server.close()
}
