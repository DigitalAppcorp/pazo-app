/** Strict Supabase Storage.info() evidence parser.
 * Only an explicit 404 proves a missing object. An empty/malformed response,
 * expired credentials, 401/403 or 5xx must never be treated as successful
 * deletion. No remote operations or confidential data here.
 */
export function storageObjectExists(result: unknown): boolean {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('storage_info_unverified')
  }
  const info = result as { data?: unknown; error?: unknown }
  if (info.error != null) {
    const error = info.error
    if (info.data === null && typeof error === 'object' && !Array.isArray(error)
        && error !== null && 'status' in error && error.status === 404) {
      return false
    }
    throw new Error('storage_info_unverified')
  }
  if (info.data !== null && typeof info.data === 'object'
      && !Array.isArray(info.data)) {
    return true
  }
  throw new Error('storage_info_unverified')
}
