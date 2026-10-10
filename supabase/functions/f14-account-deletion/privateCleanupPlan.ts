/**
 * F14 A3: database-cleanup contract. This is NOT a deletion command.
 * There are no live SQL/Storage/Auth adapters, and no browser entry point.
 *
 * A job can safely remove its owned data only AFTER its social threads
 * have been redacted and all third-party contributions re-verified.
 * The cleanup executor must enforce these checks TRANSACTIONALLY in SQL.
 */
export const A3_CLEANUP_ORDER = [
  'redact_preserved_threads',
  'remove_owned_replies_and_reactions',
  'delete_unretained_owned_posts',
  'archive_owned_communities',
  'remove_private_documents_and_care',
  'remove_pet_dependencies',
  'remove_owned_pets',
  'remove_account_profile_and_links',
  'verify_others_and_zero_personal_data',
] as const

export type A3CleanupStage = typeof A3_CLEANUP_ORDER[number]

/** Aggregates must be read from server and refreshed after each stage. */
export interface A3CleanupEvidence {
  requestProcessing: boolean
  exactReviewerLeaseValid: boolean
  writesFrozen: boolean
  mediaRemovedAtOrigin: boolean
  mediaUrlsNoLongerAvailable: boolean
  heldModerationClaims: number
  pendingCommunityTransfers: number
  unresolvedThirdPartyReports: number
  legacyEmbeddedComments: number
  outsideProviderMedia: number
  thirdPartySnapshotVerified: boolean
  feedThreadsRedacted: boolean
  communityThreadsRedacted: boolean
  rescueSightingsReconciled: boolean
  ownedCommunitiesArchived: boolean
  thirdPartyIntegrityVerified: boolean
}

export interface A3CleanupReview {
  nextStage: A3CleanupStage | null
  missing: string[]
  readyForReview: boolean
  // No client-side evidence authorizes running a destructive step.
  destructiveExecutionAllowed: false
}

const BOOLEAN_REQUIREMENTS = [
  'requestProcessing','exactReviewerLeaseValid','writesFrozen',
  'mediaRemovedAtOrigin','mediaUrlsNoLongerAvailable',
  'thirdPartySnapshotVerified','thirdPartyIntegrityVerified',
] as const

const ZERO_REQUIREMENTS = [
  'heldModerationClaims','pendingCommunityTransfers',
  'unresolvedThirdPartyReports','legacyEmbeddedComments',
  'outsideProviderMedia',
] as const

/**
 * Always fails closed on absent/forged or incomplete aggregate data.
 * The order of the result is deterministic for operator review.
 */
export function reviewA3Cleanup(
  data: Partial<A3CleanupEvidence> | null | undefined,
  completedStages: readonly A3CleanupStage[] = [],
): A3CleanupReview {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      !Array.isArray(completedStages)) {
    return {nextStage:null,missing:['evidence_missing'],
      readyForReview:false,destructiveExecutionAllowed:false}
  }
  const missing: string[] = []
  for (const key of BOOLEAN_REQUIREMENTS) {
    if (data[key] !== true) missing.push(key)
  }
  for (const key of ZERO_REQUIREMENTS) {
    const n = data[key]
    if (typeof n !== 'number' || !Number.isSafeInteger(n) || n !== 0) {
      missing.push(key)
    }
  }
  const done = new Set(completedStages)
  for (const stage of done) {
    if (!A3_CLEANUP_ORDER.includes(stage)) missing.push('unknown_stage')
  }
  // All prior stages must be complete before a later stage can be claimed
  // complete. A forged "all stages finished" skips no earlier checks.
  let encounteredGap = false
  for (const stage of A3_CLEANUP_ORDER) {
    if (!done.has(stage)) encounteredGap = true
    else if (encounteredGap) missing.push('noncontiguous_checkpoint')
  }
  // Readiness is stage-relative: don't demand completion of the action
  // we're about to perform. Subsequent stages require refreshed evidence.
  if (done.has('redact_preserved_threads')) {
    if (data.feedThreadsRedacted !== true) missing.push('feedThreadsRedacted')
    if (data.communityThreadsRedacted !== true) missing.push('communityThreadsRedacted')
  }
  if (done.has('archive_owned_communities')
      && data.ownedCommunitiesArchived !== true) {
    missing.push('ownedCommunitiesArchived')
  }
  if (done.has('remove_private_documents_and_care')
      && data.rescueSightingsReconciled !== true) {
    missing.push('rescueSightingsReconciled')
  }
  const nextStage = missing.length === 0
    ? A3_CLEANUP_ORDER.find(stage => !done.has(stage)) ?? null
    : null
  return {nextStage,missing,
    readyForReview:missing.length===0 && nextStage!==null,
    destructiveExecutionAllowed:false}
}
