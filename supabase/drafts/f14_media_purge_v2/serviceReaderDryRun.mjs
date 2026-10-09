// PAZO F14 A2 — PURE adapter between the deployed service-only evidence RPC
// and the independently tested hosted claim inspector. No network or secrets.
// Use only in a trusted backend. This module NEVER authorizes Storage delete.
import { inspectHostedClaimEvidence } from './hostedClaimEvidence.mjs'

const blocked = reason => Object.freeze({
  status: 'manual_review', reason, mayDelete: false,
  originAbsentVerified: false, cdnAbsentVerified: false,
})

export function assessServiceReaderDryRun(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
      result.status !== 'candidate_only' || result.mayDelete !== false)
    return blocked('no_authorized_service_evidence')

  // SQL result may be structurally valid while the claim has expired or
  // changed since the SELECT completed. This local check is NOT an HTTP lock.
  let assessment
  try {
    assessment = inspectHostedClaimEvidence(result)
  } catch {
    return blocked('malformed_service_evidence')
  }
  if (assessment?.status !== 'candidate_only' ||
      assessment?.mayDelete !== false || !assessment.selector)
    return blocked(assessment?.reason || 'unverified_service_evidence')

  // Even a fully matching selector is NOT an executable cleanup plan.
  // Service-role operations can bypass RLS, and claim row locks end after SQL.
  return Object.freeze({
    status: 'candidate_only',
    reason: 'requires_privileged_writer_fence_and_attempt_ledger',
    claimId: assessment.claimId,
    objectId: assessment.objectId,
    selector: Object.freeze({ ...assessment.selector }),
    mayDelete: false,
    originAbsentVerified: false,
    cdnAbsentVerified: false,
  })
}
