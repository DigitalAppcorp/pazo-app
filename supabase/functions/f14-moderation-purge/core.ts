export type PurgeKind = 'feed_post' | 'community_post'
export type MediaRow = { photo_url: string | null; photo_storage_path?: string | null }
export type PurgeObject = { kind: PurgeKind; id: string; bucket: 'post-photos' | 'community-post-photos'; path: string; url: string }
export interface PurgeDeps {
  authorizeModerator(): Promise<boolean>
  fetchRow(kind: PurgeKind, id: string): Promise<MediaRow | null>
  gate(object: PurgeObject, stage: 'preflight' | 'complete'): Promise<boolean>
  objectExists(object: PurgeObject): Promise<boolean>
  removeObject(object: PurgeObject): Promise<void>
  publicUrlInaccessible(object: PurgeObject): Promise<boolean>
}
export class PurgeRejected extends Error {
  readonly code: 'unauthorized' | 'invalid_target' | 'manual_review' | 'not_approved' | 'not_verified' | 'verification_pending'
  constructor(code: PurgeRejected['code']) { super(code); this.code = code }
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const safePath = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._-]+)+$/
export function resolvePurgeObject(projectUrl: string, kind: string, id: string, row: MediaRow | null): PurgeObject {
  if ((kind !== 'feed_post' && kind !== 'community_post') || !uuid.test(id)) throw new PurgeRejected('invalid_target')
  if (!row?.photo_url) throw new PurgeRejected('manual_review')
  const bucket = kind === 'feed_post' ? 'post-photos' : 'community-post-photos'
  let url: URL
  try { url = new URL(row.photo_url) } catch { throw new PurgeRejected('manual_review') }
  const origin = new URL(projectUrl)
  const prefix = '/storage/v1/object/public/' + bucket + '/'
  if (url.protocol !== 'https:' || url.origin !== origin.origin
    || !url.pathname.startsWith(prefix) || url.search || url.hash) throw new PurgeRejected('manual_review')
  let path: string
  try { path = decodeURIComponent(url.pathname.slice(prefix.length)) }
  catch { throw new PurgeRejected('manual_review') }
  if (row.photo_url !== origin.origin + prefix + path || !safePath.test(path)
    || path.includes('..') || path.includes('\\') || path.length > 400
    || (kind === 'community_post' && row.photo_storage_path !== path)) throw new PurgeRejected('manual_review')
  return {kind,id,bucket,path,url:row.photo_url}
}
export async function runMediaPurge(projectUrl: string, kind: string, id: string, deps: PurgeDeps):
  Promise<{status:'origin_removed_cdn_uncertain'}> {
  // Moderator authentication precedes all privileged reads.
  if (!await deps.authorizeModerator()) throw new PurgeRejected('unauthorized')
  if ((kind !== 'feed_post' && kind !== 'community_post') || !uuid.test(id)) throw new PurgeRejected('invalid_target')
  const row = await deps.fetchRow(kind,id)
  const target = resolvePurgeObject(projectUrl,kind,id,row)
  const finalizeVerifiedRemoval = async () => {
    // Public Storage can continue serving a cached copy briefly after origin
    // removal. Keep the moderation row pending so an administrator can retry
    // this exact target once the public URLs stop responding.
    if (!await deps.publicUrlInaccessible(target)) throw new PurgeRejected('verification_pending')
    if (!await deps.gate(target,'complete')) throw new PurgeRejected('not_verified')
    return {status:'origin_removed_cdn_uncertain' as const}
  }

  // A retry after a timeout may find that Storage removal already succeeded.
  // Reconcile only through the completion gate, which requires the existing
  // held, rechecked claim and proves the exact object is absent.
  if (!await deps.objectExists(target)) return finalizeVerifiedRemoval()

  let approved: boolean
  try {
    approved = await deps.gate(target,'preflight')
  } catch (error) {
    // Another identical moderator request may have removed the same object
    // while this request was checking its claim. Errors remain errors while
    // the origin object still exists; only an absent object can enter the
    // independently guarded reconciliation path.
    if (await deps.objectExists(target)) throw error
    return finalizeVerifiedRemoval()
  }
  if (!approved) {
    if (await deps.objectExists(target)) throw new PurgeRejected('not_approved')
    return finalizeVerifiedRemoval()
  }

  try {
    await deps.removeObject(target)
  } catch (error) {
    // Storage may complete the delete even if the response is lost. Confirm
    // absence before attempting reconciliation; otherwise preserve the error.
    if (await deps.objectExists(target)) throw error
  }
  if (await deps.objectExists(target)) throw new PurgeRejected('not_verified')
  return finalizeVerifiedRemoval()
}
