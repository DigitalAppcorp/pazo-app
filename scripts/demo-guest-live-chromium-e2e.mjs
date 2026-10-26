// Local, anonymous, hermetic browser gate for the PAZO guest journey.
// No hosted writes, no real Supabase credentials and no production mutations.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PAZO_PLAYWRIGHT_MODULE || 'playwright')

const origin = 'http://127.0.0.1:5488'
const server = spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5488', '--strictPort'],
  {
    env: {
      ...process.env,
      VITE_SUPABASE_URL: 'https://mrybvqdebbgcayuvgkkr.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_guest_e2e_only',
      VITE_MAPBOX_ACCESS_TOKEN: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  }
)
let serverOutput = ''
server.stdout.on('data', (v) => { serverOutput += v.toString().slice(0, 1500) })
server.stderr.on('data', (v) => { serverOutput += v.toString().slice(0, 1500) })
let browser

const checkServer = async () => {
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw Error('Vite exited: ' + serverOutput.slice(-1800))
    try {
      const r = await fetch(origin + '/')
      if (r.ok) return
    } catch {}
    await new Promise((done) => setTimeout(done, 250))
  }
  throw Error('Vite did not start: ' + serverOutput.slice(-1800))
}
const testViewport = async (width) => {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    locale: 'es-US',
  })
  const requests = []
  const errors = []
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/*', async (route) => {
    const request = route.request()
    const target = new URL(request.url())
    if (target.origin === origin) return route.continue()
    if (target.hostname === 'mrybvqdebbgcayuvgkkr.supabase.co') {
      if (target.pathname.endsWith('/rpc/pazo_public_maintenance_status')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            enabled: false,
            message_es: 'Synthetic test only',
            message_en: 'Synthetic test only',
            updated_at: '2026-10-26T00:00:00Z',
          }),
        })
      }
      requests.push(request.method() + ' ' + target.pathname)
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: '{"code":"SYNTHETIC_DENIED"}',
      })
    }
    return route.abort()
  })
  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.getByRole('button', { name: 'Demo', exact: true }).waitFor({ timeout: 15000 })
    assert.equal(await page.getByText('PAZO no pudo cargar.', { exact: false }).count(), 0)
    await page.getByRole('button', { name: 'Demo', exact: true }).click()
    await page.getByText('Modo demo.', { exact: true }).waitFor()
    await page.getByText(/Luna encontró su nuevo rincón/).waitFor()
    assert.equal(await page.getByText('Sincronizando feed...').count(), 0)
    const likes = page.getByRole('button', { name: /Me gusta: 42/ }).first()
    await likes.click()
    await page.getByRole('button', { name: /Me gusta: 43/ }).first().waitFor()
    const save = page.getByRole('button', { name: 'Guardar publicación' }).first()
    await save.click()
    // The accessible label changes to "Quitar de guardados"; do not
    // re-resolve the old selector to the next unsaved card.
    await page.getByRole('button', { name: 'Quitar de guardados' }).first().waitFor()
    await page.getByRole('navigation', { name: 'Navegación de PAZO' })
      .getByRole('button', { name: 'Comunidades' }).click()
    await page.getByRole('heading', { name: /Descubre comunidades/ }).waitFor()
    await page.getByText('Gatos de LA').first().click()
    await page.getByRole('button', { name: 'Crear cuenta para unirme' }).waitFor()

    await page.getByRole('button', { name: 'Buscar en PAZO' }).click()
    await page.getByRole('heading', { name: /Explora PAZO/ }).waitFor()
    await page.getByRole('searchbox', { name: 'Buscar ejemplos' }).fill('Luna')
    await page.getByRole('button', { name: /Luna/ }).first().waitFor()
    await page.getByRole('button', { name: 'Volver' }).first().click()

    await page.getByRole('button', { name: 'Salir', exact: true }).click()
    await page.getByRole('button', { name: 'Demo', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Demo', exact: true }).click()
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
    await page.getByText('Paso 1 de 3').waitFor()
    assert.deepEqual(errors, [], 'Uncaught browser errors')
    assert.deepEqual(requests, [], 'Guest accessed an unapproved hosted endpoint')
    console.log('DEMO_GUEST_REAL_CHROMIUM_PASS width=' + width)
  } finally {
    await context.close()
  }
}
try {
  await checkServer()
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    ...(process.env.PAZO_CHROMIUM_PATH
      ? { executablePath: process.env.PAZO_CHROMIUM_PATH }
      : {}),
  })
  await testViewport(390)
  await testViewport(1440)
  console.log('DEMO_GUEST_BROWSER_GATE_PASS - isolated, no hosted writes')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
