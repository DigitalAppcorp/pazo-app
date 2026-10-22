// PAZO F16: server-side Supabase Auth verification; not an Edge entrypoint.
// Call ONLY on a server configured with the genuine Supabase Auth client.
// auth.getUser(accessToken) contacts Auth; NEVER use getSession(), decode JWT,
// user_metadata, posted ownerId, or a service key as evidence of user identity.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BEARER=/^Bearer ([A-Za-z0-9._~+\/-]{20,4096})$/
export function createVerifiedAuthOwnerResolver({authClient}={}) {
  if(typeof authClient?.auth?.getUser!=='function')
    throw Error('verified_auth_client_required')
  return async function resolveOwnerFromVerifiedSession(requestContext) {
    const headers=requestContext?.headers
    if(typeof headers?.get!=='function') return null
    const authorization=headers.get('authorization')
    if(typeof authorization!=='string' || authorization.length>4120) return null
    const match=BEARER.exec(authorization)
    if(!match) return null
    // getUser(token) verifies with the Auth server, not untrusted local claims.
    let result
    try { result=await authClient.auth.getUser(match[1]) }
    catch { return null }
    if(result?.error || !result?.data?.user ||
      result.data.user.is_anonymous===true ||
      typeof result.data.user.id!=='string' ||
      !UUID.test(result.data.user.id)) return null
    return result.data.user.id
  }
}
