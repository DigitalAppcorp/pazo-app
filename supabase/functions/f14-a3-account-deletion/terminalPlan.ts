/**
 * F14 A3 — service-only terminal deletion dependency planner, NO executor.
 * Inputs are a shape for future server-verified proofs, not trusted
 * authorization or evidence fetched here. This module has no I/O.
 *
 * PostgreSQL catalog (2026-10-09): profiles CASCADE of auth.users,
 * pets/posts NO ACTION, pet_documents RESTRICT, A3 job.user_id RESTRICT.
 * The proposed A3 write fence would reject the profiles CASCADE while
 * reviewing. The structural blockers below are deliberately immutable:
 * even an all-true proof cannot authorize account deletion.
 */
export const A3_TERMINAL_EVIDENCE_KEYS = [
  'recent_reauth_verified',
  'current_lease_verified',
  'review_job_and_owner_verified',
  'full_write_freeze_verified',
  'third_party_contributions_preserved',
  'legacy_authorship_reconciled',
  'owned_content_unpublished',
  'storage_object_ownership_verified',
  'storage_origin_absent',
  'public_url_and_cdn_checked',
  'owned_documents_and_rows_resolved',
  'all_restrictive_foreign_keys_cleared',
  'backups_and_retention_reconciled',
  'sessions_invalidated_and_jwt_policy_verified',
  'auth_user_absence_verified',
  'final_audit_persisted',
] as const

export type A3TerminalEvidenceKey = typeof A3_TERMINAL_EVIDENCE_KEYS[number]
export type A3TerminalEvidence = Partial<Record<A3TerminalEvidenceKey, unknown>>

export const A3_TERMINAL_STEPS: readonly Readonly<{
  id: string
  requires: readonly A3TerminalEvidenceKey[]
}>[] = [
  { id: 'verify_job_and_lease', requires: [
    'recent_reauth_verified','current_lease_verified','review_job_and_owner_verified',
  ] },
  { id: 'freeze_writers', requires: ['full_write_freeze_verified'] },
  { id: 'preserve_other_users', requires: [
    'third_party_contributions_preserved','legacy_authorship_reconciled',
  ] },
  { id: 'unpublish_owned_data', requires: ['owned_content_unpublished'] },
  { id: 'reconcile_storage', requires: [
    'storage_object_ownership_verified','storage_origin_absent',
    'public_url_and_cdn_checked',
  ] },
  { id: 'resolve_dependent_rows', requires: [
    'owned_documents_and_rows_resolved','all_restrictive_foreign_keys_cleared',
  ] },
  { id: 'reconcile_retention', requires: ['backups_and_retention_reconciled'] },
  { id: 'revoke_sessions', requires: ['sessions_invalidated_and_jwt_policy_verified'] },
  // This is a planning boundary only, NEVER an executable action.
  { id: 'auth_final', requires: [] },
  { id: 'verify_auth_absence', requires: ['auth_user_absence_verified'] },
  { id: 'complete_audit', requires: ['final_audit_persisted'] },
] as const

/** These conflicts cannot be "resolved" by supplying a boolean in a request. */
export const A3_TERMINAL_SCHEMA_BLOCKERS = [
  'frozen_profile_cascade_rejected',
  'deletion_job_auth_fk_restrict',
] as const

export interface A3TerminalPlan {
  readonly stages: readonly {
    readonly step: string
    readonly missing: readonly A3TerminalEvidenceKey[]
  }[]
  readonly nextUnverifiedStep: string | null
  readonly schemaBlockers: readonly typeof A3_TERMINAL_SCHEMA_BLOCKERS[number][]
  readonly mode: 'planning_only'
  readonly authDeleteAllowed: false
  readonly destructiveExecutionAllowed: false
}

/**
 * Strict closed-key, strict boolean assessment. Even all green inputs only
 * produce a suggested checklist; changing the structural contract needs an
 * independent, reviewed SQL/lease/roles/FK/E2E migration gate.
 */
export function inspectA3TerminalPlan(
  evidence: Readonly<A3TerminalEvidence> | null | undefined,
): A3TerminalPlan {
  const stages = A3_TERMINAL_STEPS.map(({ id, requires }) => ({
    step: id,
    missing: requires.filter(key => evidence?.[key] !== true),
  }))
  return {
    stages,
    nextUnverifiedStep: stages.find(stage => stage.missing.length > 0)?.step ?? null,
    schemaBlockers: [...A3_TERMINAL_SCHEMA_BLOCKERS],
    mode: 'planning_only',
    authDeleteAllowed: false,
    destructiveExecutionAllowed: false,
  }
}
