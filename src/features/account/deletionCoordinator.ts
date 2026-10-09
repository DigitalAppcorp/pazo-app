/**
 * A3 safety preflight. Pure, non-destructive planning data only.
 * Evidence flags MUST come from server-verified checks, never browser input.
 * These predicates do NOT grant authorization to delete account/Storage.
 */
export const ACCOUNT_DELETION_REQUIREMENTS = [
  'current_session_reauthenticated',
  'private_job_owned_and_leased',
  'writes_blocked_in_backend',
  'third_party_snapshot_counts_verified',
  'community_archive_private_and_invisible',
  'own_content_unpublished',
  'storage_object_identity_verified',
  'storage_origin_removal_verified',
  'public_url_and_cdn_behavior_verified',
  'foreign_key_and_dependent_rows_verified',
  'session_revocation_verified',
  'backup_and_retention_reconciliation',
] as const

export type DeletionRequirement = typeof ACCOUNT_DELETION_REQUIREMENTS[number]
export type DeletionEvidence = Partial<Record<DeletionRequirement, boolean>>

export interface DeletionInspection {
  missing: DeletionRequirement[]
  verified: DeletionRequirement[]
  readyForHumanReview: boolean
  destructiveExecutionAllowed: false
}

export function inspectDeletionEvidence(
  evidence: Readonly<DeletionEvidence>,
): DeletionInspection {
  // Never trust unrecognized flags or non-boolean values as evidence.
  const verified: DeletionRequirement[] = []
  const missing: DeletionRequirement[] = []
  for (const requirement of ACCOUNT_DELETION_REQUIREMENTS) {
    if (evidence[requirement] === true) verified.push(requirement)
    else missing.push(requirement)
  }
  return {
    verified, missing,
    readyForHumanReview: missing.length === 0,
    // Hard fail: this module provides no delete permission or side effects.
    destructiveExecutionAllowed: false,
  }
}

export interface VersionedLease {
  jobId: string
  token: string
  version: number
  expiresAtMs: number
}

/**
 * Local model of CAS ownership for deterministic tests. Actual exclusivity
 * MUST be enforced by Postgres locks + row-version predicates, not JS memory.
 */
export function matchesActiveLease(
  current: Readonly<VersionedLease> | null,
  claim: Readonly<VersionedLease>,
  nowMs: number,
): boolean {
  return Boolean(
    current
      && Number.isFinite(nowMs)
      && current.jobId === claim.jobId
      && current.token === claim.token
      && current.version === claim.version
      && Number.isSafeInteger(current.version)
      && current.version > 0
      && Number.isFinite(current.expiresAtMs)
      && current.expiresAtMs > nowMs
      && current.expiresAtMs === claim.expiresAtMs
  )
}

export type SimulationPhase =
  | 'review_request'
  | 'freeze_writes'
  | 'archive_others'
  | 'remove_media'
  | 'verify_data'
  | 'revoke_sessions'
  | 'auth_final'
  | 'await_manual_review'

/**
 * Simulated order, never an executor. No Auth admin, SQL DELETE or Storage API.
 */
export const ACCOUNT_DELETION_SEQUENCE: readonly SimulationPhase[] = [
  'review_request', 'freeze_writes', 'archive_others', 'remove_media',
  'verify_data', 'revoke_sessions', 'auth_final',
] as const

export function proposeNextPhase(
  evidence: Readonly<DeletionEvidence>,
): SimulationPhase {
  if (evidence.current_session_reauthenticated !== true
      || evidence.private_job_owned_and_leased !== true) return 'review_request'
  if (evidence.writes_blocked_in_backend !== true) return 'freeze_writes'
  if (evidence.third_party_snapshot_counts_verified !== true
      || evidence.community_archive_private_and_invisible !== true) return 'archive_others'
  if (evidence.own_content_unpublished !== true
      || evidence.storage_object_identity_verified !== true
      || evidence.storage_origin_removal_verified !== true
      || evidence.public_url_and_cdn_behavior_verified !== true) return 'remove_media'
  if (evidence.foreign_key_and_dependent_rows_verified !== true) return 'verify_data'
  if (evidence.session_revocation_verified !== true) return 'revoke_sessions'
  if (evidence.backup_and_retention_reconciliation !== true) return 'await_manual_review'
  return 'auth_final'
}
