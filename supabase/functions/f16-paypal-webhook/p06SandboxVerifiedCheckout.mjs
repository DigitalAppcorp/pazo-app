// PAZO F16 — real composition contract for Sandbox recurring checkout.
// Server-only and UNRELEASED. Durable consent+idempotency MUST come from a
// transactional private RPC before a PayPal create subscription POST.
// Does not infer benefit or paid period from APPROVAL_PENDING / PayPal redirect.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const HASH=/^[0-9a-f]{64}$/
const LANG=new Set(['es','en'])
const VERSION=/^pazo-supporter-[a-z0-9.-]{3,40}$/
const MAX_RETRY_AGE=48*3600_000
const response=(phase,extra={})=>Object.freeze({
  phase,environment:'sandbox',entitlement:false,mayRecordPayment:false,
  mayGrantBenefits:false,mayEnableLive:false,paidThrough:null,...extra})
const fail=reason=>response('BLOCKED',{reason})
function validConsent(c){
 return c&&typeof c==='object'&&!Array.isArray(c)&&
 Object.keys(c).sort().join('|')===
 ['requestKey','locale','termsVersion','termsDigest','affirmativeConsent'].sort().join('|')&&
 UUID.test(c.requestKey||'')&&LANG.has(c.locale)&&
 VERSION.test(c.termsVersion||'')&&HASH.test(c.termsDigest||'')&&
 c.affirmativeConsent===true
}
export function createPazoSandboxVerifiedCheckout({
 resolveAuthenticatedOwner,admit,consentStore,subscriptionCreator,
 subscriptionReader,intentStore,now=Date.now,
}={}){
 if(typeof resolveAuthenticatedOwner!=='function'||typeof admit!=='function'||
  typeof consentStore?.beginForOwner!=='function'||
  typeof subscriptionCreator?.create!=='function'||
  typeof subscriptionReader?.readSubscription!=='function'||
  typeof intentStore?.bindVerified!=='function'||
  typeof now!=='function')
   throw Error('pazo_sandbox_checkout_not_configured')
 return Object.freeze({
  async begin({request,consent}={}){
   if(!(request instanceof Request)||!validConsent(consent))
    return fail('explicit_versioned_consent_required')
   let owner
   try{owner=await resolveAuthenticatedOwner(request)}
   catch{return fail('authentication_unavailable')}
   if(!UUID.test(owner||''))return fail('authenticated_owner_required')
   try{if(await admit({ownerId:owner,action:'checkout'})!==true)
     return fail('checkout_admission_denied')}
   catch{return fail('checkout_admission_unavailable')}
   let record
   try{
    // The DB MUST enforce the exact immutable published offer and one
    // subscription attempt per owner, with a unique (owner, requestKey).
    // No browser-supplied owner, subscription ID or amount goes to PayPal.
    record=await consentStore.beginForOwner({
     ownerId:owner,requestKey:consent.requestKey,
     locale:consent.locale,termsVersion:consent.termsVersion,
     termsDigest:consent.termsDigest,affirmativeConsent:true})
   }catch{return fail('durable_consent_or_idempotency_unavailable')}
   if(!record||record.ownerId!==owner||
      !INTENT.test(record.intentId||'')||
      record.planId!==PLAN||record.termsVersion!==consent.termsVersion||
      record.termsDigest!==consent.termsDigest||
      record.requestKey!==consent.requestKey||
      record.locale!==consent.locale||
      typeof record.createdAt!=='string')
    return fail('private_checkout_record_untrusted')
   if(record.state==='bound')
    return response('ALREADY_LINKED_NOT_PAYMENT_VERIFIED',{
     reason:'approval_or_payment_must_be_checked_server_side'})
   if(record.state!=='pending'||!Number.isFinite(Date.parse(record.createdAt))||
      !Number.isFinite(now())||
      now()-Date.parse(record.createdAt)<0||
      now()-Date.parse(record.createdAt)>MAX_RETRY_AGE)
    return fail('checkout_requires_manual_recovery')
   const intent={id:record.intentId,ownerId:owner,provider:'paypal',
     state:'pending',planId:PLAN,verifiedOwnerBinding:true}
   let created
   try{created=await subscriptionCreator.create({intent})}
   catch{return fail('paypal_checkout_pending_recovery')}
   if(!SUB.test(created?.subscriptionId||'')||
      created.entitlement!==false||
      typeof created.approvalUrl!=='string'||
      !['APPROVAL_PENDING','CREATED','APPROVED'].includes(created.status))
    return fail('paypal_checkout_response_untrusted')
   // Independent GET enforces merchant plan and immutable custom_id.
   let remote
   try{remote=await subscriptionReader.readSubscription(created.subscriptionId)}
   catch{return fail('paypal_subscription_refetch_unavailable')}
   if(remote?.id!==created.subscriptionId||remote.plan_id!==PLAN||
      remote.custom_id!==record.intentId||
      remote.status!=='APPROVAL_PENDING')
    return fail('paypal_subscription_owner_proof_missing')
   let bound
   try{bound=await intentStore.bindVerified({
      intentId:record.intentId,ownerId:owner,
      externalSubscriptionId:created.subscriptionId,
      provider:'paypal',planId:PLAN})
   }catch{return fail('subscription_binding_unconfirmed')}
   if(bound?.state!=='bound'||bound.entitlement!==false||
      !['new_binding','already_bound'].includes(bound.result))
    return fail('subscription_binding_unconfirmed')
   // Sandbox approval URL is validated by the creator, never from browser.
   return response('APPROVAL_PENDING',{approvalUrl:created.approvalUrl,
     reason:'buyer_must_approve_at_paypal_then_wait_for_verified_payment'})
  },
 })
}
