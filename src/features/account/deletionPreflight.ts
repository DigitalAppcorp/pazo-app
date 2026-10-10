// Service-side readiness model only. This module never deletes user data.
export type AccountDeletionReadiness = 'blocked_third_party' | 'cleanup_required' | 'awaiting_executor'
export type AccountDeletionCounts = {
  owned_pets: number
  owned_feed_posts: number
  owned_communities: number
  owned_community_posts: number
  external_community_posts: number
  external_community_comments: number
  external_comments_on_own_community_posts: number
  external_community_memberships: number
  external_feed_comments: number
  external_explicit_feed_interactions: number
  external_feed_impressions: number
  external_community_reactions: number
  cross_owner_feed_posts_via_pet: number
  cross_owner_community_posts_via_pet: number
  held_moderation_claims: number
  unresolved_owned_photo_references: number
  pet_documents: number
  storage_objects: number
  moderation_records: number
}
export type ReadinessResult = {
  status: AccountDeletionReadiness
  blockers: Array<keyof AccountDeletionCounts | 'execution_disabled'>
}
export const ACCOUNT_DELETION_EXECUTION_ENABLED = false as const
const countKeys: Array<keyof AccountDeletionCounts> = [
  'owned_pets','owned_feed_posts','owned_communities','owned_community_posts',
  'external_community_posts','external_community_comments','external_comments_on_own_community_posts','external_community_memberships',
  'external_feed_comments',
  'external_explicit_feed_interactions',
  'external_feed_impressions',
  'external_community_reactions',
  'cross_owner_feed_posts_via_pet',
  'cross_owner_community_posts_via_pet',
  'held_moderation_claims',
  'unresolved_owned_photo_references',
  'pet_documents','storage_objects','moderation_records'
]
const thirdParty: ReadonlyArray<keyof AccountDeletionCounts> = [
  'external_community_posts','external_community_comments',
  'external_comments_on_own_community_posts','external_community_memberships','external_feed_comments',
  'external_explicit_feed_interactions',
  'external_community_reactions',
  'cross_owner_feed_posts_via_pet',
  'cross_owner_community_posts_via_pet'
]
export function evaluateAccountDeletionReadiness(
  counts: AccountDeletionCounts,
): ReadinessResult {
  for (const key of countKeys) {
    const value=counts[key]
    if (!Number.isSafeInteger(value) || value<0) {
      throw new Error('Invalid deletion dependency count')
    }
  }
  const blockers: ReadinessResult['blockers'] = countKeys.filter(key=>counts[key]>0)
  if (blockers.some(key=>thirdParty.includes(key as keyof AccountDeletionCounts))) {
    return {status:'blocked_third_party',blockers:[...blockers,'execution_disabled']}
  }
  if (blockers.length>0) {
    return {status:'cleanup_required',blockers:[...blockers,'execution_disabled']}
  }
  // Even a truly empty account requires proof that Auth sessions, every FK,
  // account journal and remote Storage state are fully reconciled first.
  return {status:'awaiting_executor',blockers:['execution_disabled']}
}
