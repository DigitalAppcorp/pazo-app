import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const read = (file) => readFileSync(file, 'utf8')
const manifest = JSON.parse(read('public/manifest.webmanifest'))

// Verify that every install icon exists as valid PNG bytes of its promised size.
execFileSync(process.execPath, ['scripts/generate-pwa-icons.mjs'], { stdio: 'pipe' })
test('installable PAZO manifest has real icons, scope and standalone display', () => {
  assert.equal(manifest.name.startsWith('PAZO'), true)
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.start_url, '/')
  for (const [file, size] of [
    ['pwa-icon-192.png', 192], ['pwa-icon-512.png', 512],
    ['pwa-icon-maskable-512.png', 512], ['apple-touch-icon.png', 180],
  ]) {
    const bytes = readFileSync('public/' + file)
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', file)
    assert.equal(bytes.readUInt32BE(16), size, file)
    assert.equal(bytes.readUInt32BE(20), size, file)
  }
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'))
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'))
})

test('PWA wiring does not prevent accessibility zoom', () => {
  const html = read('index.html')
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/)
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon.png"/)
  assert.match(html, /name="theme-color"/)
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/)
  assert.match(read('src/main.tsx'), /registerPazoPwa\(\)/)
  assert.match(read('package.json'), /generate-pwa-icons.mjs/)
})

test('service worker never caches user data or intercepts API calls', () => {
  const sw = read('public/sw.js')
  assert.match(sw, /event.request.mode !== 'navigate'/)
  assert.match(sw, /event.request.method !== 'GET'/)
  assert.match(sw, /url.origin !== self.location.origin/)
  assert.doesNotMatch(sw, /caches\.|cache\.put|indexedDB|localStorage/)
  const reg = read('src/features/pwa/registerPwa.ts')
  assert.match(reg, /import.meta.env.PROD/)
  assert.match(reg, /serviceWorker.register\('\/sw.js'/)
})
