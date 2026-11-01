// #172 Google is another sign-in method; MFA and email login stay as they are.
// Off unless the build enables it, after Google and Supabase are configured.
export const isGoogleAuthEnabled = (env: Record<string, unknown>): boolean =>
  env.VITE_PAZO_GOOGLE_AUTH_ENABLED === 'true'

export const googleRedirectUrl = (origin: string): string =>
  `${new URL(origin).origin}/?auth=google`

export type GoogleAuthFailure = 'cancelled' | 'failed'
const AUTH_QUERY_KEYS = ['auth', 'error', 'error_code', 'error_description', 'code', 'state']
const AUTH_HASH_KEY = /(?:^|[#&])(?:access_token|refresh_token|provider_token|provider_refresh_token|expires_at|expires_in|token_type|error|error_code|error_description)=/

export const isGoogleReturn = (search: string): boolean =>
  new URLSearchParams(search).get('auth') === 'google'

// Provider text is never shown or kept: only a fixed, translated category.
export const googleReturnFailure = (search: string, hash: string): GoogleAuthFailure | null => {
  if (!isGoogleReturn(search)) return null
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const error = query.get('error') ?? fragment.get('error')
  if (!error) return null
  return error === 'access_denied' ? 'cancelled' : 'failed'
}

// Removes the return marker, Auth codes and tokens. Anything else, such as an
// app route in the fragment, stays. Null means there is nothing to clean.
export const cleanGoogleReturnUrl = (href: string): string | null => {
  const url = new URL(href)
  if (!isGoogleReturn(url.search)) return null
  for (const key of AUTH_QUERY_KEYS) url.searchParams.delete(key)
  if (AUTH_HASH_KEY.test(url.hash)) url.hash = ''
  return url.pathname + url.search + url.hash
}

export interface GoogleAuthUser {
  created_at?: string
  app_metadata?: { provider?: string; providers?: unknown }
  user_metadata?: Record<string, unknown>
}
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000

const isGoogleOnly = (user: GoogleAuthUser): boolean => {
  const providers = user.app_metadata?.providers
  return Array.isArray(providers) && providers.length === 1 && providers[0] === 'google'
}

// An account that also has email already confirmed its age when it registered.
// Google does not tell PAZO the person's age, so it never counts as proof.
export const requiresAdultAttestation = (user: GoogleAuthUser): boolean =>
  isGoogleOnly(user) && typeof user.user_metadata?.pazo_adult_attested_at !== 'string'

// A returning Google user or a linked email account is a login, not a signup.
export const isNewGoogleAccount = (user: GoogleAuthUser, now: number): boolean => {
  if (!isGoogleOnly(user) || typeof user.created_at !== 'string') return false
  const created = Date.parse(user.created_at)
  return Number.isFinite(created) && now - created >= -NEW_ACCOUNT_WINDOW_MS
    && now - created <= NEW_ACCOUNT_WINDOW_MS
}

// Keeps the 18+ checkbox from the signup screen across the redirect in this tab.
const ATTESTATION_INTENT_KEY = 'pazo_google_adult_attestation_v1'
const ATTESTATION_INTENT_TTL_MS = 30 * 60 * 1000
type IntentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const rememberAdultAttestationIntent = (storage: IntentStorage, now: number): void => {
  try { storage.setItem(ATTESTATION_INTENT_KEY, String(now)) } catch { /* the gate asks again */ }
}
export const clearAdultAttestationIntent = (storage: IntentStorage): void => {
  try { storage.removeItem(ATTESTATION_INTENT_KEY) } catch { /* storage denied */ }
}
export const takeAdultAttestationIntent = (storage: IntentStorage, now: number): boolean => {
  try {
    const stored = Number(storage.getItem(ATTESTATION_INTENT_KEY))
    storage.removeItem(ATTESTATION_INTENT_KEY)
    return stored > 0 && now >= stored && now - stored <= ATTESTATION_INTENT_TTL_MS
  } catch { return false }
}
