// F14 A2 media candidate inspection: pure, side-effect-free, NOT deletion approval.
// Inputs MUST come from privileged server-side lookups, never from a client payload.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp)$/i
const LEGACY_FILE = /^[A-Za-z0-9_-]{1,100}\.(?:jpg|jpeg|png|webp)$/i
const BUCKET = Object.freeze({
  feed_post: 'post-photos',
  community_post: 'community-post-photos',
  pet_profile: 'pet-avatars',
})
const refuse = reason => Object.freeze({ status: 'manual_review', reason })
export function assessMediaCandidate(input) {
  if (!input || typeof input !== 'object') return refuse('missing_server_proof')
  const { task, proof, projectUrl } = input
  if (!task || !proof || typeof task !== 'object' || typeof proof !== 'object')
    return refuse('missing_server_proof')
  const { kind, targetId, bucket, owner, pet, community, url, path } = task
  if (!Object.hasOwn(BUCKET, kind) || BUCKET[kind] !== bucket || !UUID.test(targetId))
    return refuse('invalid_target_or_bucket')
  if (!UUID.test(owner) || (kind === 'feed_post' && !UUID.test(pet)) ||
    (kind === 'community_post' && !UUID.test(community)))
    return refuse('invalid_ownership_metadata')
  if (proof.reportStatus !== 'removed' || proof.mediaStatus !== 'pending_review' ||
    proof.restrictionTargetId !== targetId || proof.restrictionTargetKind !== kind)
    return refuse('not_a_current_moderated_media_case')
  if (proof.petOwnedByAuthor !== true && kind === 'feed_post')
    return refuse('unverified_pet_ownership')
  if (proof.authorizedCommunityAuthor !== true && kind === 'community_post')
    return refuse('unverified_community_author')
  if (proof.profileRelatedMediaCount !== 0 && kind === 'pet_profile')
    return refuse('profile_has_related_or_unverified_media')
  if (proof.exactSourceReferences !== 1 || proof.otherObjectReferences !== 0 ||
    proof.verifiedStorageObject !== true || typeof proof.objectId !== 'string' ||
    !UUID.test(proof.objectId) || typeof proof.objectUpdatedAt !== 'string' ||
    !Number.isFinite(Date.parse(proof.objectUpdatedAt)))
    return refuse('unverified_object_or_shared_reference')

  // Canonical public URL is required even when a Community post has a storage path.
  // External, signed, query-bearing or differently encoded URLs remain manual.
  if (typeof url !== 'string' || !url || typeof projectUrl !== 'string') return refuse('missing_canonical_url')
  let parsed, origin
  try { parsed = new URL(url); origin = new URL(projectUrl) } catch { return refuse('malformed_url') }
  if (parsed.origin !== origin.origin || parsed.protocol !== 'https:' ||
      origin.protocol !== 'https:' || parsed.username || parsed.password ||
      parsed.search || parsed.hash || url.includes('\\'))
    return refuse('external_or_noncanonical_url')
  const prefix = '/storage/v1/object/public/' + bucket + '/'
  if (!parsed.pathname.startsWith(prefix)) return refuse('unexpected_public_bucket')
  const encoded = parsed.pathname.slice(prefix.length)
  if (!encoded || /%(?:2f|5c|25|00)/i.test(encoded)) return refuse('ambiguous_encoding')
  let fromUrl
  try { fromUrl = decodeURIComponent(encoded) } catch { return refuse('ambiguous_encoding') }
  if (!fromUrl || /[^\x20-\x7e]/.test(fromUrl) || fromUrl.includes('%') ||
      fromUrl.includes('\\') || fromUrl.includes('//') || fromUrl.startsWith('/'))
    return refuse('unsafe_object_path')
  const parts = fromUrl.split('/')
  if (parts.some(segment => !segment || segment === '.' || segment === '..')) return refuse('unsafe_object_path')
  if (typeof path === 'string' && path && path !== fromUrl) return refuse('url_path_metadata_mismatch')
  if (kind === 'community_post' && (!path || path !== fromUrl)) return refuse('missing_community_path')
  if (proof.storageBucket !== bucket || proof.storagePath !== fromUrl)
    return refuse('object_identity_mismatch')
  const filename = parts.at(-1)
  let layout
  if (kind === 'feed_post' && parts.length === 3 &&
      parts[0] === owner && parts[1] === pet && UUID_FILE.test(filename)) layout = 'feed_current'
  else if (kind === 'feed_post' && parts.length === 2 &&
      parts[0] === pet && LEGACY_FILE.test(filename)) layout = 'feed_legacy_pet'
  else if (kind === 'community_post' && parts.length === 3 &&
      parts[0] === community && parts[1] === owner && UUID_FILE.test(filename)) layout = 'community_current'
  else if (kind === 'pet_profile' && parts.length === 2 &&
      parts[0] === owner && UUID_FILE.test(filename)) layout = 'pet_avatar_current'
  else return refuse('unknown_or_ambiguous_path_layout')
  return Object.freeze({
    status: 'candidate_only',
    reason: 'requires_atomic_recheck_and_separate_deletion_gate',
    bucket, path: fromUrl, objectId: proof.objectId,
    objectUpdatedAt: proof.objectUpdatedAt, layout, targetId,
  })
}

// Safety model: no user-supplied state can establish successful deletion.
// Storage API response, object re-check, server-side CAS confirmation and CDN
// checks are distinct future gates; this helper deliberately performs none.
