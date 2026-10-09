// PAZO F14 A2 — PURE inspection of exact-version Storage deletion prerequisites.
// NEVER a deletion authorization. No network, no credentials, no Storage API.
// Supabase SDK documents remove([{path,versionId}]) for an exact *current or archived*
// version; PAZO has NOT validated hosted HTTP races or CDN for moderation media.
// All objects passed here must be obtained via privileged backend lookups.
// This helper does not establish an atomic lock across DB and Storage.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VERSION = /^[a-zA-Z0-9_-]{8,128}$/
const fail = reason => Object.freeze({ status: 'manual_review', reason })
const normTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? new Date(value).toISOString() : null

export function inspectExactVersionPreflight({ candidate, claim, live, now } = {}) {
  if (!candidate || !claim || !live) return fail('missing_server_evidence')
  if (candidate.status !== 'candidate_only' ||
    !['post-photos','community-post-photos'].includes(candidate.bucket) ||
    typeof candidate.path !== 'string' || !candidate.path || candidate.path.startsWith('/') ||
    !UUID.test(candidate.objectId || '') || !UUID.test(candidate.targetId || ''))
    return fail('unverified_candidate')

  if (claim.status !== 'held' || !UUID.test(claim.claimId || '') ||
    !UUID.test(claim.reportId || '') || claim.reportStatus !== 'removed' ||
    claim.mediaStatus !== 'pending_review' ||
    claim.bucket !== candidate.bucket || claim.path !== candidate.path ||
    claim.objectId !== candidate.objectId ||
    claim.targetId !== candidate.targetId ||
    !['feed_post','community_post'].includes(claim.kind) ||
    !claim.exclusiveReferenceProof)
    return fail('claim_not_exact_or_unconfirmed')

  const checkTime = normTime(now)
  const expires = normTime(claim.expiresAt)
  if (!checkTime || !expires || Date.parse(expires) <= Date.parse(checkTime))
    return fail('claim_expired_or_clock_untrusted')

  if (live.bucket !== candidate.bucket || live.path !== candidate.path ||
    live.objectId !== candidate.objectId || !VERSION.test(live.version || '') ||
    !VERSION.test(claim.version || '') || live.version !== claim.version)
    return fail('storage_version_or_identity_drift')

  const stamped = normTime(live.updatedAt)
  if (!stamped || stamped !== normTime(candidate.objectUpdatedAt) ||
    stamped !== normTime(claim.updatedAt) ||
    typeof live.metadataFingerprint !== 'string' ||
    live.metadataFingerprint.length !== 32 ||
    live.metadataFingerprint !== claim.metadataFingerprint ||
    live.isDeleteMarker !== false || live.archivedAt != null)
    return fail('object_metadata_or_state_drift')

  // Documentation-backed selector only, NOT an executable plan: the version
  // must never be silently downgraded to a path-only remove call.
  return Object.freeze({
    status: 'candidate_only',
    reason: 'requires_live_atomicity_and_http_validation',
    selector: Object.freeze({
      bucket: candidate.bucket,
      path: candidate.path,
      versionId: live.version,
    }),
    claimId: claim.claimId,
    objectId: live.objectId,
    reportId: claim.reportId,
    targetId: candidate.targetId,
    mayDelete: false,
    originAbsentVerified: false,
    cdnAbsentVerified: false,
  })
}
