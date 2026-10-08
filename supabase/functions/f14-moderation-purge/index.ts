// F14 A2 - gated draft Edge Function. Deploy only with PO authorization.
// This endpoint requires a verified user JWT AND a server-side moderator grant.
// Service key stays inside the Edge runtime and is never returned to browser.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const respond = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return respond(405, 'Method not allowed')
  const bearer = request.headers.get('authorization') ?? ''
  if (!bearer.startsWith('Bearer ')) return respond(401, 'Authentication required')

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anon || !serviceKey) return respond(503, 'Backend configuration unavailable')

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false },
  })
  const token = bearer.slice(7)
  const { data: identity, error: identityError } = await userClient.auth.getUser(token)
  if (identityError || !identity.user) return respond(401, 'Invalid session')
  const { data: authorized, error: authError } = await userClient.rpc('f14_is_moderator')
  if (authError || authorized !== true) return respond(403, 'Moderator access required')

  let payload: unknown
  try { payload = await request.json() } catch { return respond(400, 'Invalid JSON') }
  if (!payload || typeof payload !== 'object') return respond(400, 'Invalid payload')
  const { targetKind, targetId } = payload as { targetKind?: unknown; targetId?: unknown }
  if (typeof targetKind !== 'string' || !['feed_post', 'pet_profile', 'community_post'].includes(targetKind)
    || typeof targetId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(targetId))
    return respond(400, 'Invalid target')

  const { data: task, error: taskError } = await userClient.rpc('f14_media_task', {
    p_kind: targetKind, p_id: targetId,
  })
  if (taskError || !task || typeof task !== 'object') return respond(404, 'No pending task')

  // Accept only a PAZO-owned Storage path (never fetch or delete external URL).
  const bucket = task.bucket
  if (typeof bucket !== 'string' || !['post-photos','pet-avatars','community-post-photos'].includes(bucket))
    return respond(400, 'Invalid bucket')
  const rawUrl = typeof task.url === 'string' ? task.url : ''
  let path = typeof task.path === 'string' ? task.path : ''
  if (rawUrl) {
    try {
      const mediaUrl = new URL(rawUrl)
      const base = new URL(url)
      const prefix = '/storage/v1/object/public/' + bucket + '/'
      if (mediaUrl.origin !== base.origin || !mediaUrl.pathname.startsWith(prefix))
        return respond(409, 'External media requires manual review')
      path = decodeURIComponent(mediaUrl.pathname.slice(prefix.length))
    } catch {
      return respond(409, 'Unrecognized media URL')
    }
  }
  if (path && (path.startsWith('/') || path.includes('..') || path.includes('\\') || path.length > 700))
    return respond(400, 'Invalid media path')
  if (path) {
    // Reject foreign or unrelated objects even if a row contains an arbitrary public URL.
    const parts = path.split('/')
    const owner = typeof task.owner === 'string' ? task.owner : ''
    const expected = bucket === 'post-photos'
      ? [owner, task.pet]
      : bucket === 'pet-avatars'
        ? [owner]
        : [task.community, owner]
    if (expected.some(x => typeof x !== 'string' || !x) ||
      parts.length !== expected.length + 1 ||
      expected.some((v, i) => parts[i] !== v) ||
      !parts.at(-1) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(parts.at(-1)!))
      return respond(409, 'Media ownership/path mismatch; manual review required')
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  if (path) {
    const { error } = await admin.storage.from(bucket).remove([path])
    if (error) return respond(503, 'Storage removal failed; case remains pending')
  }
  // Confirmation only after Storage API succeeded (or the target has no attached image).
  const { data: marked, error: markError } = await admin.rpc('f14_confirm_media_cleanup', {
    p_kind: targetKind, p_id: targetId,
  })
  if (markError || marked !== true) return respond(503, 'Could not confirm cleanup')
  // A public CDN may cache the object for a propagation period; do not promise immediate purge.
  return respond(200, 'Storage delete accepted. Check public URL and CDN propagation.')
})
