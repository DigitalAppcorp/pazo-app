// F14 A2 — PURE classification of exact-version HTTP delete evidence.
// This is not a Storage caller. Never mutates content, never approves deletion,
// never transitions a media claim to "purged" or releases a held path.
// All input must be assembled by a trusted backend from server observations.
const fail = reason => Object.freeze({
  status: 'manual_review', reason,
  originAbsentVerified: false, cdnAbsentVerified: false, mayFinalizePurge: false,
})

export function classifyExactVersionOutcome({ preflight, attempt, origin, cdn } = {}) {
  if (preflight?.status !== 'candidate_only' ||
      preflight?.mayDelete !== false ||
      !preflight?.selector?.bucket || !preflight?.selector?.path ||
      !preflight?.selector?.versionId ||
      !preflight?.claimId || !preflight?.objectId)
    return fail('untrusted_or_incomplete_preflight')

  const expected = preflight.selector
  if (!attempt || attempt.method !== 'version_specific' ||
      attempt.bucket !== expected.bucket || attempt.path !== expected.path ||
      attempt.versionId !== expected.versionId ||
      attempt.objectId !== preflight.objectId ||
      attempt.claimId !== preflight.claimId)
    return fail('missing_or_mismatched_exact_attempt')

  // A timeout, rejected request or empty SDK response never proves which
  // object operation happened. This must be reconciled out of band.
  if (attempt.transport !== 'completed' || attempt.httpSuccess !== true ||
      attempt.storageError != null)
    return fail('attempt_not_confirmed')

  if (!origin || origin.bucket !== expected.bucket ||
      origin.path !== expected.path || origin.checkedAfterAttempt !== true ||
      origin.infoStatus !== 404 || origin.listStatus !== 'absent' ||
      origin.observedObjectId != null)
    return fail('origin_absence_not_confirmed')

  // CDN HTTP 400/404/410 does not establish global cache invalidation.
  // Do not persist "purged" in moderation even when origin is absent.
  return Object.freeze({
    status: 'origin_absent_observed',
    reason: 'requires_independent_claim_and_cdn_reconciliation',
    selector: Object.freeze({
      bucket: expected.bucket, path: expected.path, versionId: expected.versionId,
    }),
    claimId: preflight.claimId,
    originAbsentVerified: true,
    cdnAbsentVerified: false,
    cdnObservedHttpStatus: Number.isInteger(cdn?.httpStatus) ? cdn.httpStatus : null,
    mayFinalizePurge: false,
  })
}
