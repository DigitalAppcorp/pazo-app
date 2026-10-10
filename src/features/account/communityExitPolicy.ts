export type OwnershipState = 'none'|'wait_for_acceptance'|'transfer_accepted'|'archive_preserve_content'|'blocked'
export type CommunityExitFacts = {
  hasDeletionRequest: boolean
  isProcessing: boolean
  ownerHasCommunity: boolean
  candidateIsAdmin: boolean
  candidateAccepted: boolean
  offerPending: boolean
  offerExpired: boolean
  hasExternalContent: boolean
}
export const ACCOUNT_DELETION_ENABLED = false as const
export function decideCommunityExit(f:CommunityExitFacts):OwnershipState {
 if(!f.ownerHasCommunity) return 'none'
 if(!f.hasDeletionRequest) return 'blocked'
 if(f.candidateAccepted && f.candidateIsAdmin) return 'transfer_accepted'
 if(f.offerPending && !f.offerExpired) return 'wait_for_acceptance'
 // The owner cannot be detached before an authorized service worker puts
 // the deletion request into 'processing'. External content MUST be kept.
 return f.isProcessing ? 'archive_preserve_content' : 'blocked'
}
