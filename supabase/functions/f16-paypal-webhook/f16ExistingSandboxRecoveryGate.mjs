// F16: PURE authorization/data-correlation guard for the one already-created
// Sandbox test. Does NOT perform any writes or authorize a new payment.
// Never return Auth IDs, email addresses, tokens, merchant references or URLs.
import {assessF16PendingSandboxReadOnly} from './f16PendingSandboxReadOnlyAssessment.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const TEST_EMAIL=/^pazo-f16-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}@example\.com$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
function deny(reason){return Object.freeze({
 environment:'sandbox',step:'existing_recovery_scope',
 safeToReauthenticate:false,safeToBind:false,reason,
 mayCreateUser:false,mayCreateIntent:false,mayCreateSubscription:false,
 mayApproveBuyer:false,mayCancelSubscription:false,
 mayGrantBenefits:false,paidThrough:null,networkWrites:0,
})}
export function assessF16ExistingSandboxRecoveryGate({
 savedState,authUser,privateIntent,subscription,plan,
}={}){
 if(savedState?.environment!=='sandbox'||savedState?.project!==PROJECT||
  savedState?.plan!==PLAN||savedState?.phase!=='paypal_created'||
  savedState?.recoveryPhase!==undefined)
  return deny('local_state_not_initial_one_shot')
 if(!UUID.test(savedState?.authOwnerId||'')||
  !INTENT.test(savedState?.intentId||'')||
  !SUB.test(savedState?.subscriptionId||'')||
  typeof savedState?.createdAt!=='string'||
  !Number.isFinite(Date.parse(savedState.createdAt)))
  return deny('local_one_shot_reference_invalid')
 if(authUser?.id!==savedState.authOwnerId||
  authUser?.is_anonymous===true||
  typeof authUser?.email!=='string'||!TEST_EMAIL.test(authUser.email)||
  typeof authUser?.created_at!=='string'||
  !Number.isFinite(Date.parse(authUser.created_at))||
  Math.abs(Date.parse(authUser.created_at)-Date.parse(savedState.createdAt))>300000)
  return deny('original_disposable_auth_not_proven')
 const match=assessF16PendingSandboxReadOnly({
  savedState,subscription,plan,privateIntent,authOwnerExists:true,
 })
 if(match.couldCompletePreapprovalChecks!==true||
  match.privateIntentOwnerMatches!==true||
  match.planTermIssueCodes?.length!==0||
  match.approvalLinkSignal!=='sandbox_get')
  return deny('pending_auth_merchant_terms_not_proven')
 return Object.freeze({
  ...deny('ready_only_with_explicit_po_go'),
  safeToReauthenticate:true,safeToBind:true,
 })
}
