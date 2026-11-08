const supabaseHost = 'mrybvqdebbgcayuvgkkr.supabase.co'
const petIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => entities[character])
const clean = (value, limit) => typeof value === 'string'
  ? Array.from(value.replace(/\s+/g, ' ').trim()).slice(0, limit).join('') : ''

function siteOrigin(env) {
  const host = env.VERCEL_ENV === 'preview' ? env.VERCEL_URL : env.VERCEL_PROJECT_PRODUCTION_URL
  return `https://${host && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? host : 'pazo-app.vercel.app'}`
}

function petImage(photo, origin) {
  try {
    const url = new URL(photo)
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && (
      (url.hostname === supabaseHost && url.pathname.startsWith('/storage/v1/object/public/pet-avatars/')) ||
      (url.hostname === 'images.unsplash.com' && url.pathname.startsWith('/photo-'))
    )) return url.href
  } catch { /* Missing or invalid public photo. */ }
  return `${origin}/pwa-icon-512.png`
}

function publicKey(value) {
  if (typeof value !== 'string') return false
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true
  try {
    const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'))
    return claims.role === 'anon' && claims.ref === supabaseHost.split('.')[0]
  } catch { return false }
}

async function loadPublicPet(id, env) {
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!publicKey(key)) throw new Error('Missing public configuration')
  const url = new URL(`https://${supabaseHost}/rest/v1/pets`)
  url.search = new URLSearchParams({ id: `eq.${id}`, select: 'name,bio,photo_url', limit: '1' }).toString()
  const response = await fetch(url, { headers: { apikey: key }, redirect: 'error', signal: AbortSignal.timeout(3500) })
  if (!response.ok) throw new Error('Public profile lookup failed')
  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error('Unexpected public profile response')
  return rows[0] ?? null
}

export function createPetPreviewHandler({ loadPet = loadPublicPet, env = process.env } = {}) {
  return async function petPreview(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD')
      res.statusCode = 405
      return res.end()
    }
    const id = req.query?.id ?? new URL(req.url ?? '/', 'http://localhost').searchParams.get('id')
    if (typeof id !== 'string' || !petIdPattern.test(id)) {
      res.statusCode = 404
      return res.end(req.method === 'HEAD' ? undefined : '<!doctype html><html lang="es"><title>Perfil no disponible · PAZO</title><p>Perfil no disponible.</p><a href="/">Ir a PAZO</a>')
    }
    const petId = id.toLowerCase()
    let pet
    try { pet = await loadPet(petId, env) } catch {
      res.statusCode = 503
      res.setHeader('Retry-After', '60')
      return res.end(req.method === 'HEAD' ? undefined : `<!doctype html><html lang="es"><title>PAZO</title><a href="/#/pet/${petId}">Abrir el perfil en PAZO</a>`)
    }
    const name = clean(pet?.name, 70)
    if (!name) {
      res.statusCode = 404
      return res.end(req.method === 'HEAD' ? undefined : '<!doctype html><html lang="es"><title>Perfil no disponible · PAZO</title><p>Perfil no disponible.</p><a href="/">Ir a PAZO</a>')
    }
    const origin = siteOrigin(env)
    const canonical = `${origin}/mascota/${petId}`
    const title = `${name} · PAZO`
    const description = clean(pet.bio, 160) || `Conoce a ${name} y descubre su perfil social en PAZO.`
    const image = petImage(pet.photo_url, origin)
    const target = `/#/pet/${petId}`
    const meta = Object.entries({ 'og:type': 'website', 'og:site_name': 'PAZO', 'og:title': title, 'og:description': description,
      'og:url': canonical, 'og:image': image, 'og:image:alt': `Foto de perfil de ${name}` }).map(([key, value]) =>
      `<meta property="${key}" content="${escapeHtml(value)}">`).join('\n')
    res.statusCode = 200
    return res.end(req.method === 'HEAD' ? undefined : `<!doctype html><html lang="es" prefix="og: https://ogp.me/ns#"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="description" content="${escapeHtml(description)}">
${meta}
<meta name="twitter:card" content="summary_large_image">
</head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><a href="${target}">Abrir el perfil en PAZO</a></main>
<script>location.replace(${JSON.stringify(target)})</script></body></html>`)
  }
}

export default createPetPreviewHandler()
