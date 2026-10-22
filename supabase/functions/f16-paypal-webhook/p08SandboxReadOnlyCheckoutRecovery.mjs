// PAZO F16-P08 — authenticated READ-ONLY checkout recovery in PayPal Sandbox.
// Prepared for an independent future Edge entrypoint, NOT deployed.
// Never re-POST a subscription, reset a one-shot claim or credit a paid period.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const response=(phase,extra={})=>Object.freeze({
 phase,environment:'sandbox',entitlement:false,paidThrough:null,
 mayRecordPayment:false,mayGrantBenefits:false,mayEnableLive:false,
 mayCreateSubscription:false,mayResubscribe:false,...extra,
})
const block=reason=>response('BLOCKED',{reason})

export function createPazoSandboxReadOnlyCheckoutRecovery({
 resolveAuthenticatedOwner,admit,consentStore,subscriptionReader,
}={}){
 if(typeof resolveAuthenticatedOwner!=='function'||typeof admit!=='function'||
    typeof consentStore?.readRecoveryForOwner!=='function'||
    typeof subscriptionReader?.readSubscription!=='function')
  throw Error('pazo_checkout_recovery_not_configured')
 return Object.freeze({
  async inspect({request,requestKey}={}){
   if(!(request instanceof Request)||!UUID.test(requestKey||''))
    return block('recovery_request_invalid')
   let owner
   try{owner=await resolveAuthenticatedOwner(request)}
   catch{return block('authentication_unavailable')}
   if(!UUID.test(owner||''))return block('authenticated_owner_required')
   try{
    if(await admit({ownerId:owner,action:'checkout_recovery'})!==true)
     return block('recovery_admission_denied')
   }catch{return block('recovery_admission_unavailable')}
   let saved
   try{saved=await consentStore.readRecoveryForOwner({
    ownerId:owner,requestKey,
   })}catch{return block('private_recovery_lookup_unavailable')}
   // Do not distinguish missing from foreign owner data in external output.
   if(saved===null)return block('recovery_record_not_available')
   if(!saved||saved.ownerId!==owner||saved.requestKey!==requestKey||
      saved.planId!==PLAN||!INTENT.test(saved.intentId||'')||
      typeof saved.providerCreateClaimed!=='boolean')
    return block('private_recovery_record_untrusted')
   if(saved.state==='pending' && saved.subscriptionId===null){
    // A lost PayPal POST response may mean the provider accepted the create.
    // Even an unclaimed intent has NO permission to POST from this pathway.
    return saved.providerCreateClaimed?
     response('MANUAL_MERCHANT_RECONCILIATION_REQUIRED'):
     response('NO_PROVIDER_CREATE_CLAIM')
   }
   if(saved.state!=='bound'||saved.providerCreateClaimed!==true||
      !SUB.test(saved.subscriptionId||''))
    return block('private_recovery_record_untrusted')
   let merchant
   try{merchant=await subscriptionReader.readSubscription(saved.subscriptionId)}
   catch{return block('merchant_recovery_read_unavailable')}
   if(merchant?.id!==saved.subscriptionId||
      merchant.plan_id!==PLAN||merchant.custom_id!==saved.intentId)
    return block('merchant_recovery_binding_mismatch')
   switch(merchant.status){
    case 'APPROVAL_PENDING':
     // The existing server reader intentionally strips PayPal approval URLs.
     return response('BUYER_APPROVAL_PENDING_READ_ONLY')
    case 'APPROVED':
    case 'ACTIVE':
     return response('LINKED_FINANCIAL_RECONCILIATION_REQUIRED',{
      providerStatus:merchant.status})
    case 'CANCELLED':
     return response('RENEWALS_CANCELLED_NO_RESUBSCRIBE')
    case 'SUSPENDED':
    case 'EXPIRED':
     return response('PROVIDER_STATE_REVIEW_REQUIRED',{providerStatus:merchant.status})
    default:return block('merchant_recovery_status_untrusted')
   }
  },
 })
}
