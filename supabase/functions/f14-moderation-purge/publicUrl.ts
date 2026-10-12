import { isVerifiedNoSuchKey } from './storageInfo.ts'

// HEAD has no body. A HEAD 400 is therefore NEVER proof on its own: its
// matching ranged GET must return the precise NoSuchKey/internal-404 envelope.
// Ordinary HTTP 404/410 remains acceptable. Access-denied, 2xx, redirects,
// generic 400, server failures and network errors do not establish absence.
async function rangedGetConfirmsMissing(response: Response): Promise<boolean> {
  if (response.status === 404 || response.status === 410) {
    await response.body?.cancel()
    return true
  }
  if (response.status !== 400
      || !/^application\/json(?:\s*;|\s*$)/i.test(response.headers.get('content-type') ?? '')) {
    await response.body?.cancel()
    return false
  }
  let body: unknown
  try { body = await response.json() } catch { return false }
  return isVerifiedNoSuchKey(body)
    && (body as {error?: unknown}).error === 'not_found'
}

export async function publicUrlInaccessible(url: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  const fresh = new URL(url)
  fresh.searchParams.set('pazo_verify', crypto.randomUUID())
  for (const candidate of [url, fresh.toString()]) {
    const head = await fetcher(candidate, {method:'HEAD', cache:'no-store', redirect:'error',
      headers:{'Cache-Control':'no-cache'}})
    const headStatus = head.status
    await head.body?.cancel()
    if (![400, 404, 410].includes(headStatus)) return false
    // Ranged GET is mandatory on BOTH the original and the cache-busted URL.
    const get = await fetcher(candidate, {method:'GET', cache:'no-store', redirect:'error',
      headers:{'Cache-Control':'no-cache', 'Range':'bytes=0-0'}})
    const getStatus = get.status
    const absent = await rangedGetConfirmsMissing(get)
    if (!absent || (headStatus === 400 && getStatus !== 400)) return false
  }
  return true
}
