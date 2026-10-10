/**
 * F14 A3 — server-side REVIEW orchestrator ONLY. Intentionally no delete API.
 *
 * An adapter must obtain evidence from the backend, not from a browser/request.
 * Checkpoints record attempts for recovery; previous PASS records are never
 * trusted as fresh authorization, even on retry or worker restart.
 */
export const A3_REVIEW_GATES = [
  'recent_reauthentication',
  'worker_lease_valid',
  'writes_frozen',
  'third_party_contributions_preserved',
  'legacy_authorship_reconciled',
  'media_identity_and_references_verified',
  'media_origin_and_public_urls_verified',
  'dependent_rows_and_foreign_keys_verified',
  'old_sessions_invalidated',
  'retention_and_backup_policy_verified',
] as const

export type A3ReviewGate = typeof A3_REVIEW_GATES[number]
export type A3ReviewIssue = 'missing_evidence' | 'unsafe_dependency' | 'unverified_media'
  | 'stale_session' | 'requires_human_review'

export type A3CheckpointOutcome = 'passed' | 'blocked' | 'error'
export interface A3LeaseClaim { token: string; version: number }
export interface A3ReviewJob { status: string }
export interface A3ReviewProof {
  passed: boolean
  issue?: A3ReviewIssue
}
export interface A3Checkpoint {
  jobId: string
  claim: A3LeaseClaim
  expectedRevision: number
  gate: A3ReviewGate
  outcome: A3CheckpointOutcome
  issue: A3ReviewIssue | 'inspection_failed' | null
}
export interface A3ReviewPort {
  readJob(jobId: string): Promise<A3ReviewJob | null>
  leaseIsCurrent(jobId: string, claim: A3LeaseClaim): Promise<boolean>
  readRevision(jobId: string): Promise<number>
  inspectGate(jobId: string, gate: A3ReviewGate, claim: A3LeaseClaim): Promise<A3ReviewProof>
  /** Durable DB CAS; throws or returns null on conflict/failure. */
  saveCheckpoint(checkpoint: A3Checkpoint): Promise<number | null>
}
export interface A3ReviewResult {
  status: 'blocked' | 'retryable' | 'review_required'
  gatesChecked: number
  lastGate: A3ReviewGate | null
  issue: A3ReviewIssue | 'inspection_failed' | 'lease_invalid'
    | 'job_not_reviewing' | 'checkpoint_conflict' | 'invalid_request' | null
  irreversibleAllowed: false
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const issues = new Set<A3ReviewIssue>([
  'missing_evidence','unsafe_dependency','unverified_media',
  'stale_session','requires_human_review',
])

function result(
  status: A3ReviewResult['status'],
  gatesChecked: number,
  lastGate: A3ReviewGate | null,
  issue: A3ReviewResult['issue'],
): A3ReviewResult {
  return {status,gatesChecked,lastGate,issue,irreversibleAllowed:false}
}

export async function runA3DeletionReview(
  jobId: string, claim: A3LeaseClaim, port: A3ReviewPort,
): Promise<A3ReviewResult> {
  if (!uuidPattern.test(jobId) || !claim || typeof claim.token !== 'string'
    || !uuidPattern.test(claim.token) || !Number.isSafeInteger(claim.version)
    || claim.version < 1) return result('blocked',0,null,'invalid_request')

  try {
    const job = await port.readJob(jobId)
    if (job?.status !== 'reviewing') return result('blocked',0,null,'job_not_reviewing')
    if (!(await port.leaseIsCurrent(jobId,claim))) return result('blocked',0,null,'lease_invalid')
    let revision = await port.readRevision(jobId)
    if (!Number.isSafeInteger(revision) || revision < 0) {
      return result('retryable',0,null,'checkpoint_conflict')
    }

    let checked = 0
    for (const gate of A3_REVIEW_GATES) {
      // Never trust a previously persisted "passed" checkpoint as permission:
      // revalidate a live lease and fresh evidence on every invocation.
      if (!(await port.leaseIsCurrent(jobId,claim))) {
        return result('blocked',checked,gate,'lease_invalid')
      }
      let proof: A3ReviewProof
      try {
        proof = await port.inspectGate(jobId,gate,claim)
      } catch {
        // No exception messages, UGC, emails, object paths or tokens in logs.
        try {
          if (!(await port.leaseIsCurrent(jobId,claim))) return result('blocked',checked,gate,'lease_invalid')
          const saved = await port.saveCheckpoint({
            jobId,claim,expectedRevision:revision,gate,outcome:'error',issue:'inspection_failed',
          })
          if (saved !== revision + 1) return result('retryable',checked,gate,'checkpoint_conflict')
        } catch { return result('retryable',checked,gate,'checkpoint_conflict') }
        return result('retryable',checked,gate,'inspection_failed')
      }
      const passed = proof?.passed === true
      const issue: A3ReviewIssue | null = passed
        ? null
        : (proof && issues.has(proof.issue as A3ReviewIssue)
          ? proof.issue as A3ReviewIssue : 'missing_evidence')
      if (!(await port.leaseIsCurrent(jobId,claim))) {
        return result('blocked',checked,gate,'lease_invalid')
      }
      const next = await port.saveCheckpoint({
        jobId,claim,expectedRevision:revision,gate,
        outcome:passed?'passed':'blocked',issue,
      })
      if (next !== revision + 1) return result('retryable',checked,gate,'checkpoint_conflict')
      revision=next
      checked++
      if (!passed) return result('blocked',checked,gate,issue)
    }
    // Even all-green evidence only qualifies for separate human review.
    // No Storage.remove, SQL DELETE, auth.admin.deleteUser, status=completed.
    return result('review_required',checked,A3_REVIEW_GATES.at(-1)??null,null)
  } catch {
    // Repository/DB outage must not result in assumed success or a retry loop
    // inside the same invocation.
    return result('retryable',0,null,'inspection_failed')
  }
}
