/**
 * F14 A3 - read-only social preservation gate.
 * Public account-deletion endpoint remains disabled and does NOT import this.
 *
 * Source counts must come from the private service-only PostgreSQL RPC; the
 * review evidence must come from separately verified persisted server state.
 * Passing a mocked object or booleans from the browser is NEVER permission to
 * remove a pet, post, community, or Auth identity.
 */
export const A3_SOCIAL_COUNTS = [
  'owned_pets',
  'owned_feed_posts',
  'owned_community_posts',
  'owned_communities',
  'third_party_feed_replies_to_preserve',
  'third_party_community_replies_to_preserve',
  'third_party_community_posts_to_preserve',
  'own_feed_replies_elsewhere',
  'owned_documents',
  'owned_care_items',
  'owned_care_completions',
  'owned_storage_objects',
  'held_moderation_claims',
] as const

export type A3SocialCount = typeof A3_SOCIAL_COUNTS[number]
export type A3SocialCounts = Readonly<Record<A3SocialCount, number>> & Readonly<{
  social_cleanup_verified: false
  destructive_execution_allowed: false
}>

export type A3SocialEvidence = Readonly<{
  writesFrozen: boolean
  physicalMediaRemovedAndVerified: boolean
  feedRepliesPreserved: boolean
  communityRepliesPreserved: boolean
  otherCommunityPostsPreserved: boolean
  communitiesArchived: boolean
  legacyEmbeddedCommentsReconciled: boolean
  moderationHoldsReconciled: boolean
  thirdPartyCountsVerifiedAfter: boolean
}>

export type A3SocialBlocker =
  | 'invalid_inventory'
  | 'writers_not_frozen'
  | 'media_not_verified'
  | 'media_still_owned'
  | 'feed_replies_at_risk'
  | 'community_replies_at_risk'
  | 'other_community_posts_at_risk'
  | 'communities_not_archived'
  | 'legacy_comments_not_reconciled'
  | 'moderation_hold'
  | 'third_party_counts_not_verified'

export function parseA3SocialCounts(value: unknown): A3SocialCounts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string,unknown>
  for (const field of A3_SOCIAL_COUNTS) {
    const count = raw[field]
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      return null
    }
  }
  if (raw.social_cleanup_verified !== false ||
      raw.destructive_execution_allowed !== false) return null
  return value as A3SocialCounts
}

/** Ready for a supervised, separately authorized redaction REVIEW only. */
export function assessA3SocialPreservation(
  raw: unknown,
  evidence: Partial<A3SocialEvidence> | null,
): {reviewable: boolean; blockers: A3SocialBlocker[]; destructiveExecutionAllowed: false} {
  const counts = parseA3SocialCounts(raw)
  if (!counts || !evidence || typeof evidence !== 'object') {
    return {reviewable:false,blockers:['invalid_inventory'],destructiveExecutionAllowed:false}
  }
  const blockers: A3SocialBlocker[] = []
  if (evidence.writesFrozen !== true) blockers.push('writers_not_frozen')
  if (evidence.physicalMediaRemovedAndVerified !== true) blockers.push('media_not_verified')
  if (counts.owned_storage_objects !== 0) blockers.push('media_still_owned')
  if (counts.third_party_feed_replies_to_preserve > 0 &&
      evidence.feedRepliesPreserved !== true) blockers.push('feed_replies_at_risk')
  if (counts.third_party_community_replies_to_preserve > 0 &&
      evidence.communityRepliesPreserved !== true) blockers.push('community_replies_at_risk')
  if (counts.third_party_community_posts_to_preserve > 0 &&
      evidence.otherCommunityPostsPreserved !== true) blockers.push('other_community_posts_at_risk')
  if (counts.owned_communities > 0 && evidence.communitiesArchived !== true) {
    blockers.push('communities_not_archived')
  }
  if (evidence.legacyEmbeddedCommentsReconciled !== true) {
    blockers.push('legacy_comments_not_reconciled')
  }
  if (counts.held_moderation_claims !== 0 ||
      evidence.moderationHoldsReconciled !== true) blockers.push('moderation_hold')
  if (evidence.thirdPartyCountsVerifiedAfter !== true) {
    blockers.push('third_party_counts_not_verified')
  }
  return {
    reviewable:blockers.length === 0,
    blockers,
    destructiveExecutionAllowed:false,
  }
}
