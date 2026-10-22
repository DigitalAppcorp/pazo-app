/** Strict Supabase Storage.info() evidence parser.
 * Missing means either a genuine HTTP 404 or Supabase Storage's documented
 * HTTP 400 compatibility envelope with a precise NoSuchKey / internal 404.
 * Generic 400s, authorization failures, empty data and 5xx fail closed.
 */
export function isVerifiedNoSuchKey(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || Array.isArray(error)) return false
  const detail = error as {code?: unknown; statusCode?: unknown; message?: unknown}
  return detail.code === 'NoSuchKey'
    && (detail.statusCode === '404' || detail.statusCode === 404)
    && detail.message === 'Object not found'
}

export function storageObjectExists(result: unknown): boolean {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('storage_info_unverified')
  }
  const info = result as {data?: unknown; error?: unknown}
  if (info.error != null) {
    const error = info.error
    if (info.data === null && typeof error === 'object' && !Array.isArray(error)
      && error !== null) {
      const status = (error as {status?: unknown}).status
      if (status === 404 || (status === 400 && isVerifiedNoSuchKey(error))) return false
    }
    throw new Error('storage_info_unverified')
  }
  if (info.data !== null && typeof info.data === 'object'
      && !Array.isArray(info.data)) {
    return true
  }
  throw new Error('storage_info_unverified')
}
