// PAZO Marketing: isolated HTTP contract. NOT DEPLOYED / NOT RELEASED.
// No user ID, email, JWT, GPS, click ID, raw URL, IP or form data is logged.
// All dependencies are injected to keep provider calls off in synthetic tests.
import {readMarketingBody} from './requestBody.mjs'
const CAMPAIGN = 'pazo_beta_local_202610'
const CREATIVE = new Set([
  'perfil_es', 'perfil_en', 'qr_es', 'qr_en', 'comunidad_es', 'comunidad_en',
])
const KEYS = new Set(['utm_source','utm_medium','utm_campaign','utm_content','first_touch_at'])
const MAX_BYTES = 768
const MAX_AGE_MS = 72 * 60 * 60 * 1000
const CLOCK_SKEW = 5 * 60 * 1000
const OFF = { status: 'collection_disabled' }
const FAILURE = { status: 'not_accepted' }
const response = (body, status, headers={}) => new Response(
  JSON.stringify(body), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...headers } },
)
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(value)
  && Number.isFinite(Date.parse(value))
const validUuid = (value) => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/**
 * Future-only intake adapter. 'released' must stay false until Privacy + PO
 * authorize privacy notice, retention, a protected RPC bridge and hosted deployment.
 * Authentication MUST query Supabase Auth via trusted server authentication.
 * submit MUST bind payload to ctx.ownerId on server, never to a userId field
 * from the client. This contract is NOT yet a working production service.
 */
export function createMarketingIntakeHandler({
  released = false,
  authenticate = null,
  submit = null,
  clock = () => Date.now(),
  origin = 'https://pazo-app.vercel.app',
} = {}) {
  return async (request) => {
    // Fail before parsing credentials or request data.
    if (!released || typeof authenticate !== 'function' || typeof submit !== 'function') {
      return response(OFF, 503)
    }
    const cors = { 'access-control-allow-origin':origin, 'vary':'Origin' }
    if (request.headers.get('origin') !== origin) return response(FAILURE, 403)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status:204, headers:{...cors,'access-control-allow-methods':'POST, OPTIONS',
          'access-control-allow-headers':'authorization, content-type, apikey, x-client-info','access-control-max-age':'300'},
      })
    }
    if (request.method !== 'POST') return response(FAILURE, 405, cors)
    const contentType = request.headers.get('content-type') || ''
    if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(contentType)) return response(FAILURE, 415, cors)
    const sizeHeader = Number(request.headers.get('content-length'))
    if ((request.headers.has('content-length') && (!Number.isSafeInteger(sizeHeader) || sizeHeader > MAX_BYTES || sizeHeader < 0)))
      return response(FAILURE, 413, cors)
    const authorization = request.headers.get('authorization') || ''
    if (!/^Bearer [A-Za-z0-9._~+/=-]{12,4096}$/.test(authorization)) return response(FAILURE, 401, cors)
    let raw = ''
    try {
      raw=await readMarketingBody(request,MAX_BYTES)
    } catch(error) { return response(FAILURE,[408,413].includes(error?.status)?error.status:400,cors) }
    let body
    try { body = JSON.parse(raw) } catch { return response(FAILURE, 400, cors) }
    if (!body || Array.isArray(body) || typeof body !== 'object') return response(FAILURE, 400, cors)
    if (Object.keys(body).length !== KEYS.size || Object.keys(body).some((key)=>!KEYS.has(key)))
      return response(FAILURE, 400, cors)
    if (body.utm_source !== 'meta' || body.utm_medium !== 'paid_social' ||
      body.utm_campaign !== CAMPAIGN || !CREATIVE.has(body.utm_content))
      return response(FAILURE, 400, cors)
    if (!validDate(body.first_touch_at)) return response(FAILURE, 400, cors)
    const timestamp = Date.parse(body.first_touch_at)
    const now = clock()
    if (!Number.isSafeInteger(now) || now - timestamp > MAX_AGE_MS ||
      timestamp > now + CLOCK_SKEW) return response(FAILURE, 400, cors)
    let user
    try { user = await authenticate(authorization.slice(7)) }
    catch { return response(FAILURE, 401, cors) }
    if (!user) return response(FAILURE, 401, cors)
    if (!validUuid(user.id) || !validDate(user.created_at) ||
      !validDate(user.email_confirmed_at) || user.is_anonymous === true)
      return response(FAILURE, 403, cors)
    const created = Date.parse(user.created_at), confirmed = Date.parse(user.email_confirmed_at)
    if (created < timestamp - CLOCK_SKEW || created > timestamp + MAX_AGE_MS ||
      confirmed < created || confirmed > now + CLOCK_SKEW ||
      confirmed > timestamp + MAX_AGE_MS)
      return response(FAILURE, 403, cors)

    // All data below is allowlisted. Owner is from trusted verified Auth only.
    // Automatic first-party UTM attribution, not a browser consent assertion.
    // Privacy notice must be published before the independent release gate.
    try {
      const inserted = await submit({
        ownerId:user.id, creative:body.utm_content,
        firstTouchAt:new Date(timestamp).toISOString(),
      })
      return response({status:inserted===true?'accepted':'not_accepted'}, inserted===true?202:409, cors)
    } catch { return response(FAILURE, 503, cors) }
  }
}
