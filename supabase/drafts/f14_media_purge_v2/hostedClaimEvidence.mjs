// PAZO F14 A2 — PURE adapter for real PostgreSQL claim/snapshot field names.
// Inputs MUST be obtained server-side under a trusted, transaction-consistent
// read (including current reference counts), never from browser or user JSON.
// No network, no credentials, no Storage mutation, NO delete authorization.
import { inspectExactVersionPreflight } from './exactVersionPreflight.mjs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const validRow = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const fail = reason => Object.freeze({ status: 'manual_review', reason })

/**
 * @param {object} evidence
 * @param {object} evidence.reservation - moderation_private.media_claims row
 * @param {object} evidence.restriction - moderation_private.content_restrictions row
 * @param {object} evidence.report - moderation_private.reports row
 * @param {object} evidence.storageObject - storage.objects row + independently
 *                  computed `metadata_fingerprint` from PostgreSQL SQL
 * @param {object} evidence.references - trusted, freshly counted source URLs
 *                  and (for community_post) photo_storage_path references
 * @param {string} evidence.databaseNow - trusted server UTC clock, ISO string
 */
export function inspectHostedClaimEvidence({
  reservation, restriction, report, storageObject, references, databaseNow,
} = {}) {
  if (![reservation, restriction, report, storageObject, references]
    .every(validRow)) return fail('missing_database_evidence')
  const snap = reservation.snapshot
  if (!validRow(snap)) return fail('missing_claim_snapshot')

  const kind = reservation.target_kind
  const bucket = reservation.bucket
  const path = snap.path
  if (!UUID.test(reservation.claim_id || '') ||
      !UUID.test(reservation.target_id || '') ||
      !UUID.test(reservation.report_id || '') ||
      !UUID.test(reservation.storage_object_id || '') ||
      !UUID.test(snap.owner_id || '') ||
      !['feed_post', 'community_post'].includes(kind) ||
      (kind === 'feed_post' && bucket !== 'post-photos') ||
      (kind === 'community_post' && bucket !== 'community-post-photos') ||
      typeof path !== 'string' || !path || path.length > 700 ||
      path.startsWith('/') || path.includes('..') || path.includes('//') ||
      !/^[A-Za-z0-9_./-]+$/.test(path))
    return fail('invalid_claim_identity')

  // Never trust snapshot fields merely because they were stored before;
  // reconcile against the independent reservation, report and restriction.
  if (snap.kind !== kind || snap.target_id !== reservation.target_id ||
      snap.report_id !== reservation.report_id || snap.bucket !== bucket ||
      snap.storage_object_id !== reservation.storage_object_id ||
      restriction.target_kind !== kind ||
      restriction.target_id !== reservation.target_id ||
      restriction.report_id !== reservation.report_id ||
      report.id !== reservation.report_id ||
      report.target_kind !== kind || report.target_id !== reservation.target_id)
    return fail('database_identity_drift')
  if (report.status !== 'removed' ||
      restriction.media_status !== 'pending_review' ||
      reservation.status !== 'held')
    return fail('not_pending_verified_moderation')

  const url = `https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/${bucket}/${path}`
  if (snap.source_url !== url)
    return fail('canonical_source_url_mismatch')
  // This is an independently recomputed count, NOT a boolean supplied by
  // f14_prepare_media_claim or a previous point-in-time snapshot.
  if (references.url_reference_count !== 1 ||
      (kind === 'community_post' && references.community_path_count !== 1))
    return fail('nonexclusive_or_unverified_references')

  if (storageObject.id !== reservation.storage_object_id ||
      storageObject.bucket_id !== bucket || storageObject.name !== path)
    return fail('current_storage_identity_drift')

  return inspectExactVersionPreflight({
    candidate: {
      status: 'candidate_only', bucket, path,
      objectId: reservation.storage_object_id, targetId: reservation.target_id,
      objectUpdatedAt: snap.object_updated_at,
    },
    claim: {
      status: reservation.status, claimId: reservation.claim_id,
      reportId: reservation.report_id, targetId: reservation.target_id,
      reportStatus: report.status, mediaStatus: restriction.media_status,
      exclusiveReferenceProof: true,
      bucket, path, objectId: reservation.storage_object_id, kind,
      version: snap.object_version, updatedAt: snap.object_updated_at,
      metadataFingerprint: snap.metadata_fingerprint,
      expiresAt: reservation.expires_at,
    },
    live: {
      bucket: storageObject.bucket_id, path: storageObject.name,
      objectId: storageObject.id, version: storageObject.version,
      updatedAt: storageObject.updated_at,
      metadataFingerprint: storageObject.metadata_fingerprint,
      isDeleteMarker: storageObject.is_delete_marker,
      archivedAt: storageObject.archived_at,
    },
    now: databaseNow,
  })
}
