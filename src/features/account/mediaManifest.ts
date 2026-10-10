// F14 A3: reviewed reuse of PR #38 pure manifest validation; NO Storage API calls here.
// Inputs must be collected and independently verified by a privileged server.
// Browser claims and this model alone must never authorize physical deletion.
export const PAZO_STORAGE_BUCKETS = [
  'pet-avatars', 'post-photos', 'community-avatars',
  'community-post-photos', 'pet-documents',
] as const
export type PazoBucket = typeof PAZO_STORAGE_BUCKETS[number]
export type MediaIssue =
  | 'unknown_bucket'
  | 'unsafe_path'
  | 'object_unverified'
  | 'unverified_owner'
  | 'references_unknown'
  | 'shared_with_others'
  | 'writes_not_frozen'
  | 'worker_lease_unverified'
  | 'duplicate_object'

export interface MediaInventoryEntry {
  bucket: string
  path: string
  objectVersion: string | null
  objectVerified: boolean
  ownershipVerified: boolean
  totalReferences: number | null
  referencesOwnedByRequester: number | null
  accountWritesFrozen: boolean
  workerLeaseValidated: boolean
}
export interface MediaReviewRow {
  bucket: string
  path: string
  issues: MediaIssue[]
}
export interface MediaReview {
  safeCandidates: MediaReviewRow[]
  blocked: MediaReviewRow[]
  /** Always false until the independently authorized server executor exists. */
  deletionAuthorized: false
}

export function isExactStoragePath(path: string): boolean {
  if (path.length === 0 || path.length > 1024
      || path.startsWith('/') || path.endsWith('/')
      || path.includes('\\') || path.includes('//')
      || path.includes('?') || path.includes('#') || path.includes('%')
      || /[\u0000-\u001f\u007f]/.test(path)) return false
  return path.split('/').every(segment =>
    segment.length > 0 && segment !== '.' && segment !== '..'
  )
}

export function inspectMediaManifest(rows: readonly MediaInventoryEntry[]): MediaReview {
  const safeCandidates: MediaReviewRow[] = []
  const blocked: MediaReviewRow[] = []
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const row of rows) {
    const key = row.bucket + '\u0000' + row.path
    if (seen.has(key)) duplicates.add(key)
    seen.add(key)
  }
  for (const row of rows) {
    const key = row.bucket + '\u0000' + row.path
    const issues: MediaIssue[] = []
    if (!(PAZO_STORAGE_BUCKETS as readonly string[]).includes(row.bucket)) issues.push('unknown_bucket')
    if (!isExactStoragePath(row.path)) issues.push('unsafe_path')
    if (!row.objectVerified || !row.objectVersion) issues.push('object_unverified')
    if (!row.ownershipVerified) issues.push('unverified_owner')
    if (row.totalReferences === null || row.referencesOwnedByRequester === null
      || !Number.isSafeInteger(row.totalReferences) || !Number.isSafeInteger(row.referencesOwnedByRequester)
      || row.totalReferences <= 0 || row.referencesOwnedByRequester <= 0
      || row.referencesOwnedByRequester > row.totalReferences) {
      issues.push('references_unknown')
    } else if (row.totalReferences > row.referencesOwnedByRequester) {
      issues.push('shared_with_others')
    }
    if (!row.accountWritesFrozen) issues.push('writes_not_frozen')
    if (!row.workerLeaseValidated) issues.push('worker_lease_unverified')
    if (duplicates.has(key)) issues.push('duplicate_object')
    const result = { bucket: row.bucket, path: row.path, issues }
    if (issues.length) blocked.push(result)
    else safeCandidates.push(result)
  }
  return { safeCandidates, blocked, deletionAuthorized: false }
}

export interface MediaRemovalVerification {
  originObjectMissing: boolean
  oldPublicUrlUnavailable: boolean
  storageNoLongerReferencesObject: boolean
  cdnResponseVerified: boolean
}
/**
 * Verifying one previously public URL does not prove absence of ALL caches;
 * this only supplies evidence for human/worker review, not an authorization.
 */
export function inspectMediaRemovalVerification(data: MediaRemovalVerification) {
  const missing = (Object.entries(data) as [keyof MediaRemovalVerification,boolean][])
    .filter(([,passed]) => passed !== true).map(([key]) => key)
  return { passed: missing.length === 0, missing, accountDeleteAuthorized: false as const }
}
