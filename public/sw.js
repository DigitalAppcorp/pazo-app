/* PAZO beta: network-only service worker. Never cache authenticated API or private files. */
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })

// Only navigation requests are handled. Data, authentication, Supabase and
// third-party requests remain on their normal browser network paths.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate' || event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request).catch(() => new Response(
      '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#204E4A"><title>PAZO sin conexión</title><main style="font:16px system-ui;background:#FAF8F5;color:#204E4A;min-height:100vh;display:grid;place-content:center;text-align:center;padding:24px"><h1>PAZO</h1><p>Necesitas conexión a internet para continuar.</p><p>Conéctate y vuelve a abrir la aplicación.</p></main></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
    )),
  )
})
