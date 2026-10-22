// F16 PayPal Sandbox credential diagnostics. Pure functions. NEVER log, store,
// fingerprint, compare externally or return any client ID/secret material.
const OAUTH_ERRORS = new Set([
  'invalid_client','invalid_request','unauthorized_client','invalid_grant',
  'unsupported_grant_type','temporarily_unavailable',
])
export function inspectCredentialFormat(clientId, clientSecret) {
  if (typeof clientId !== 'string' || typeof clientSecret !== 'string' ||
      !clientId || !clientSecret) return { ok:false, reason:'credentials_missing' }
  if (/[\u0000-\u001f\u007f]/.test(clientId) || /[\u0000-\u001f\u007f]/.test(clientSecret))
    return { ok:false, reason:'credentials_contain_control_characters' }
  if (clientId !== clientId.trim() || clientSecret !== clientSecret.trim())
    return { ok:false, reason:'credentials_contain_outer_whitespace' }
  if (clientId.includes(':')) return { ok:false, reason:'client_id_contains_colon' }
  return { ok:true, reason:null }
}
// Only parse fixed, documented OAuth error codes. Never echo the full PayPal
// response or error_description: it may contain arbitrary material.
export function safeOauthErrorCode(payload) {
  const error = payload && typeof payload === 'object' ? payload.error : null
  return typeof error === 'string' && OAUTH_ERRORS.has(error) ? error : null
}
