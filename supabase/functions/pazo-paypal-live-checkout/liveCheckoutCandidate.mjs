// PAZO F16 LIVE recurring checkout orchestration — OFF by default / NOT WIRED.
import {validLiveApprovalUrl} from './liveSubscriptionProvider.mjs'
// No payment or entitlement is granted at subscription creation or PayPal
// approval return. All adapters MUST be authenticated, backend-owned, durable.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const HASH=/^[a-f0-9]{64}$/
const VERSION=/^pazo-supporter-live\.[a-z0-9.-]{3,40}$/
const MAX_CONSENT_AGE_MS=48*3600_000
const pending=(phase,reason)=>Object.freeze({phase,reason,environment:'live',
 paymentVerified:false,entitlement:false,mayGrantBenefits:false,
 mayRecordPayment:false,paidThrough:null})
const fail=reason=>pending('BLOCKED',reason)
function validConsent(c){
 return c&&typeof c==='object'&&!Array.isArray(c)&&
 Object.keys(c).sort().join('|')===
 ['requestKey','locale','termsVersion','termsDigest','affirmativeConsent'].sort().join('|')&&
 UUID.test(c.requestKey||'')&&['es','en'].includes(c.locale)&&
 VERSION.test(c.termsVersion||'')&&HASH.test(c.termsDigest||'')&&
 c.affirmativeConsent===true
}
/**
 * releaseReady MUST come from a fresh, authenticated server-only LIVE
 * activation guard. No raw browser parameter, environment variable or
 * client-side flag is sufficient.
 */
export function createPazoLiveVerifiedCheckout({
 releaseReady=false,planId,merchantGeneration,resolveAuthenticatedOwner,
 admit,consentStore,subscriptionProvider,intentStore,now=Date.now
}={}){
 return Object.freeze({
  async begin({request,consent}={}){
   if(releaseReady!==true)return fail('live_checkout_not_released')
   if(!PLAN.test(planId||'')||!Number.isSafeInteger(merchantGeneration)||
    merchantGeneration<1||
    typeof resolveAuthenticatedOwner!=='function'||typeof admit!=='function'||
    typeof consentStore?.beginForOwner!=='function'||
    typeof consentStore?.claimProviderCreate!=='function'||
    typeof subscriptionProvider?.createSubscription!=='function'||
    typeof subscriptionProvider?.readSubscription!=='function'||
    typeof intentStore?.bindVerified!=='function')
    return fail('live_backend_not_configured')
   if(!(request instanceof Request)||!validConsent(consent)||
    typeof now!=='function'||!Number.isFinite(now()))
    return fail('affirmative_versioned_consent_required')
   let owner
   try{owner=await resolveAuthenticatedOwner(request)}
   catch{return fail('authentication_unavailable')}
   if(!UUID.test(owner||''))return fail('authenticated_owner_required')
   try{
    if(await admit({ownerId:owner,action:'live_checkout',
     requestKey:consent.requestKey,merchantGeneration})!==true)
     return fail('checkout_admission_denied')
   }catch{return fail('checkout_admission_unavailable')}
   // Only the private SQL store may create an immutable buyer/consent record.
   let record
   try{record=await consentStore.beginForOwner({
    ownerId:owner,requestKey:consent.requestKey,locale:consent.locale,
    termsVersion:consent.termsVersion,termsDigest:consent.termsDigest,
    affirmativeConsent:true,merchantGeneration,expectedPlanId:planId
   })}catch{return fail('private_consent_unavailable')}
   if(record?.ownerId!==owner||record.requestKey!==consent.requestKey||
     !INTENT.test(record.intentId||'')||record.planId!==planId||
     record.sourceEnvironment!=='live'||
     record.merchantGeneration!==merchantGeneration||
     record.termsVersion!==consent.termsVersion||
     record.termsDigest!==consent.termsDigest||
     record.locale!==consent.locale||
     !Number.isFinite(Date.parse(record.createdAt)))
     return fail('private_intent_untrusted')
   // Expired/future consents must be reconciled, not reused for a purchase.
   const age=now()-Date.parse(record.createdAt)
   if(age<0||age>MAX_CONSENT_AGE_MS)
    return fail('expired_checkout_requires_new_consent')
   if(record.state==='bound')return fail('existing_subscription_requires_owner_recovery')
   if(record.state!=='pending')return fail('checkout_requires_manual_recovery')
   // Claim exactly ONCE in SQL BEFORE creating a PayPal subscription. Even
   // on timeout, never automatically create another subscription for this
   // consent: merchant/provider GET and operator reconciliation are required.
   let claimed
   try{claimed=await consentStore.claimProviderCreate({
    ownerId:owner,intentId:record.intentId,requestKey:consent.requestKey,
    merchantGeneration,sourceEnvironment:'live'
   })}catch{return fail('provider_claim_unavailable')}
   if(claimed!==true)return fail('checkout_requires_manual_recovery')
   let created
   try{created=await subscriptionProvider.createSubscription({
    intentId:record.intentId,requestKey:consent.requestKey
   })}catch{return fail('paypal_create_must_be_reconciled')}
   if(!SUB.test(created?.subscriptionId||'')||
     created.status!=='APPROVAL_PENDING'||created.entitlement!==false||
     !validLiveApprovalUrl(created.approvalUrl))
    return fail('provider_create_response_unverified')
   let remote
   try{remote=await subscriptionProvider.readSubscription(created.subscriptionId)}
   catch{return fail('independent_subscription_read_unavailable')}
   if(remote?.id!==created.subscriptionId||remote?.plan_id!==planId||
    remote?.custom_id!==record.intentId||
    remote?.status!=='APPROVAL_PENDING')
    return fail('independent_subscription_owner_binding_failed')
   let bound
   try{bound=await intentStore.bindVerified({
    ownerId:owner,intentId:record.intentId,requestKey:consent.requestKey,
    subscriptionId:created.subscriptionId,provider:'paypal',
    sourceEnvironment:'live',planId,merchantGeneration
   })}catch{return fail('durable_subscription_binding_unavailable')}
   if(bound?.state!=='bound'||!['new_binding','already_bound'].includes(bound.result)||
      bound.entitlement!==false)return fail('durable_subscription_binding_unavailable')
   return Object.freeze({...pending('APPROVAL_PENDING',
    'payment_requires_verified_live_webhook_and_period'),
    approvalUrl:created.approvalUrl})
  }
 })
}
