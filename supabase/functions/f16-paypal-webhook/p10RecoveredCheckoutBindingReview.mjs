// PAZO F16-P10: UNDEPLOYED recovered checkout binding review.
// Requires Auth, original durable claim, unique merchant list result,
// independent GET, and an independently verified operator release.
// NEVER imports this into a public Edge route before a separate PO deployment GO.
const PLAN='P-14V25407JP6850922NLHMDKI'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const out=(phase,reason)=>Object.freeze({
 phase,reason,environment:'sandbox',entitlement:false,paidThrough:null,
 mayRecordPayment:false,mayGrantBenefits:false,mayCreateSubscription:false,
 mayResubscribe:false,mayEnableLive:false,
})
const deny=reason=>out('BLOCKED',reason)
const validDate=s=>typeof s==='string'&&Number.isFinite(Date.parse(s)) &&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)
export function createPazoRecoveredCheckoutBindingReview({
 resolveAuthenticatedOwner,admit,consentStore,merchantReader,
 subscriptionReader,verifyIndependentRelease,now=Date.now,
}={}){
 if(typeof resolveAuthenticatedOwner!=='function'||typeof admit!=='function'||
    typeof consentStore?.readRecoveryForOwner!=='function'||
    typeof consentStore?.bindRecoveredForOwner!=='function'||
    typeof merchantReader?.examinePrivate!=='function'||
    typeof subscriptionReader?.readSubscription!=='function'||
    typeof verifyIndependentRelease!=='function'||typeof now!=='function')
  throw Error('pazo_recovery_binding_review_not_configured')
 return Object.freeze({
  async inspect({request,requestKey}={}){
   // Public request supplies ONLY its original request key.
   if(!(request instanceof Request)||!UUID.test(requestKey||''))
    return deny('recovery_request_invalid')
   let owner
   try{owner=await resolveAuthenticatedOwner(request)}
   catch{return deny('authentication_unavailable')}
   if(!UUID.test(owner||''))return deny('authenticated_owner_required')
   try{if(await admit({ownerId:owner,action:'recovery_binding_review'})!==true)
    return deny('admission_denied')}
   catch{return deny('admission_unavailable')}
   let privateRecord
   try{privateRecord=await consentStore.readRecoveryForOwner({
    ownerId:owner,requestKey,
   })}catch{return deny('private_recovery_unavailable')}
   if(privateRecord===null)return deny('recovery_not_found')
   const r=privateRecord
   if(!r||r.ownerId!==owner||r.requestKey!==requestKey||
      r.planId!==PLAN||!INTENT.test(r.intentId||'')||
      r.state!=='pending'||r.subscriptionId!==null||
      r.providerCreateClaimed!==true||!validDate(r.providerCreateClaimedAt))
    return deny('recovery_record_untrusted')
   const elapsed=now()-Date.parse(r.providerCreateClaimedAt)
   if(!Number.isFinite(elapsed)||elapsed< -60_000||elapsed>48*3600_000)
    return deny('recovery_window_expired')
   let match
   try{match=await merchantReader.examinePrivate({
    intentId:r.intentId,claimedAt:r.providerCreateClaimedAt,
   })}catch{return deny('merchant_scan_unavailable')}
   if(match?.outcome!=='ONE_UNBOUND_CANDIDATE_REVIEW_ONLY'||
      !SUB.test(match.subscriptionId||''))
    return deny('unique_pending_merchant_candidate_missing')
   // Independent fresh GET is REQUIRED; do not trust a prior cached list.
   let sub
   try{sub=await subscriptionReader.readSubscription(match.subscriptionId)}
   catch{return deny('merchant_refetch_unavailable')}
   if(sub?.id!==match.subscriptionId||sub.plan_id!==PLAN||
      sub.custom_id!==r.intentId||sub.status!=='APPROVAL_PENDING')
    return deny('merchant_refetch_mismatch')
   // This callback has no production implementation. A mock true in
   // synthetic tests is NEVER a real operator/legal approval.
   let released=false
   try{released=await verifyIndependentRelease({
    environment:'sandbox',ownerId:owner,requestKey,intentId:r.intentId,
    subscriptionId:match.subscriptionId,
   })===true}catch{return deny('independent_release_unavailable')}
   if(!released)return deny('independent_release_not_approved')
   let outcome
   try{outcome=await consentStore.bindRecoveredForOwner({
    ownerId:owner,requestKey,intentId:r.intentId,
    subscriptionId:match.subscriptionId,
   })}catch{return deny('atomic_recovery_bind_unconfirmed')}
   if(outcome!=='new_binding'&&outcome!=='already_bound')
    return deny('atomic_recovery_bind_unconfirmed')
   return out('BOUND_IDENTITY_ONLY','financial_reconciliation_required')
  },
 })
}
