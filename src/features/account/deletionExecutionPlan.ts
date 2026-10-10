/**
 * F14 A3: pure review contract for a supervised deletion executor.
 * NO destructive operations or user-controlled approvals are implemented here.
 * Only an authorized SERVER must collect and sign the evidence in this model.
 * This module cannot be used as permission for auth.admin.deleteUser.
 */
export const A3_EXECUTION_RELEASE_APPROVED = false as const

export const A3_GATES = [
  'valid_request',
  'fresh_reauthentication',
  'exclusive_job_lease',
  'write_fence_active',
  'third_party_contributions_preserved',
  'community_ownership_resolved',
  'legacy_authorship_reconciled',
  'exact_storage_manifest',
  'storage_objects_removed_at_origin',
  'old_public_urls_checked',
  'private_data_and_fk_clean',
  'old_sessions_revoked',
  'backup_and_retention_reviewed',
] as const

export type A3Gate = typeof A3_GATES[number]
export type A3Evidence = Partial<Record<A3Gate, boolean>>

export type A3Phase =
  | 'review_request'
  | 'freeze_writes'
  | 'preserve_others'
  | 'remove_media'
  | 'clean_private_data'
  | 'revoke_sessions'
  | 'await_auth_final'

export interface A3Decision {
  phase: A3Phase
  missing: A3Gate[]
  readyForReview: boolean
  // Deliberately NEVER authorizes mutations; the private backend must independently
  // enforce operator identity, durable lease, data ownership and approval.
  destructiveExecutionAllowed: false
}

export function inspectA3DeletionEvidence(evidence: Readonly<A3Evidence>): A3Decision {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    throw new Error('Deletion evidence must be an object')
  }
  const missing = A3_GATES.filter(key => evidence[key] !== true)
  const has = (key: A3Gate) => evidence[key] === true

  let phase: A3Phase = 'await_auth_final'
  if (!has('valid_request') || !has('fresh_reauthentication')
      || !has('exclusive_job_lease')) {
    phase = 'review_request'
  } else if (!has('write_fence_active')) {
    phase = 'freeze_writes'
  } else if (!has('third_party_contributions_preserved')
      || !has('community_ownership_resolved')
      || !has('legacy_authorship_reconciled')) {
    phase = 'preserve_others'
  } else if (!has('exact_storage_manifest')
      || !has('storage_objects_removed_at_origin')
      || !has('old_public_urls_checked')) {
    phase = 'remove_media'
  } else if (!has('private_data_and_fk_clean')) {
    phase = 'clean_private_data'
  } else if (!has('old_sessions_revoked')
      || !has('backup_and_retention_reviewed')) {
    phase = 'revoke_sessions'
  }

  return {
    phase,
    missing,
    readyForReview: missing.length === 0,
    destructiveExecutionAllowed: false,
  }
}

export type A3ObservedStatus = 'requested' | 'cancelled' | 'processing' | 'completed'

export interface A3ServerJobSnapshot {
  requestStatus: A3ObservedStatus
  operatorApproved: boolean
  leaseTokenPresent: boolean
  leaseExpiresAtMs: number
  revision: number
}

export function inspectA3ServerJob(
  job: Readonly<A3ServerJobSnapshot>,
  nowMs: number,
): { reviewable: boolean; blockers: string[] } {
  if (!Number.isFinite(nowMs)) throw new Error('Invalid inspection clock')
  const blockers: string[] = []
  if (job.requestStatus !== 'processing') blockers.push('not_processing')
  if (job.operatorApproved !== true) blockers.push('operator_not_approved')
  if (job.leaseTokenPresent !== true) blockers.push('lease_missing')
  if (!Number.isFinite(job.leaseExpiresAtMs)
      || job.leaseExpiresAtMs <= nowMs) blockers.push('lease_expired')
  if (!Number.isSafeInteger(job.revision) || job.revision < 1) blockers.push('revision_invalid')
  return { reviewable: blockers.length === 0, blockers }
}
