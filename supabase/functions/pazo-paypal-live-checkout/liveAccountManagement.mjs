// PAZO F16 — account management for verified existing LIVE subscriptions.
// This module is NOT wired or deployed. New checkout kill switch is separate:
// a real paid member must retain read/cancellation even if purchases stop.
// Owner/merchant generation/consent are proven by PRIVATE server-side lookup;
// a client-supplied subscription ID or PayPal redirect cannot be trusted.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const STATES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED',
 'CANCELLED','EXPIRED'])
const output=(state,code)=>Object.freeze({state,code,
 paymentVerified:false,mayGrantBenefits:false,mayRecordPayment:false,
 paidThrough:null,environment:'live'})
const block=code=>output('BLOCKED',code)
function validBinding(binding,ownerId){
 return binding?.sourceEnvironment==='live'&&binding.provider==='paypal'&&
  binding.ownerVerified===true&&binding.merchantGenerationVerified===true&&
  binding.ownerId===ownerId&&SUB.test(binding.subscriptionId||'')&&
  INTENT.test(binding.intentId||'')&&PLAN.test(binding.planId||'')&&
  Number.isSafeInteger(binding.merchantGeneration)&&
  binding.merchantGeneration>0
}
export function createPazoLiveAccountManager({
 managementReleased=false,resolveAuthenticatedOwner,readBinding,
 readMerchantSubscription,claimOwnerCancellation,cancelMerchantSubscription
}={}){
 async function inspect(request){
  if(managementReleased!==true)return {error:'account_management_not_released'}
  if(!(request instanceof Request)||request.method!=='POST'||
    typeof resolveAuthenticatedOwner!=='function'||
    typeof readBinding!=='function'||typeof readMerchantSubscription!=='function')
   return {error:'live_account_not_configured'}
  let owner
  try{owner=await resolveAuthenticatedOwner(request)}
  catch{return {error:'authentication_unavailable'}}
  if(!UUID.test(owner||''))return {error:'authenticated_owner_required'}
  let binding
  try{binding=await readBinding({ownerId:owner})}
  catch{return {error:'private_binding_unavailable'}}
  if(!validBinding(binding,owner))return {error:'immutable_live_binding_not_verified'}
  let merchant
  try{merchant=await readMerchantSubscription({
   subscriptionId:binding.subscriptionId,merchantGeneration:binding.merchantGeneration
  })}
  catch{return {error:'merchant_account_read_unavailable'}}
  if(merchant?.id!==binding.subscriptionId||
     merchant?.custom_id!==binding.intentId||
     merchant?.plan_id!==binding.planId||
     !STATES.has(merchant.status))
   return {error:'merchant_binding_mismatch'}
  return {owner,binding,merchant}
 }
 return Object.freeze({
  async status({request}={}){
   const r=await inspect(request)
   if(r.error)return block(r.error)
   // No merchant ids, secrets or buyer PII are returned. This is NOT a
   // payment/entitlement status; those come from verified ledger separately.
   return output('ACCOUNT_VERIFIED',r.merchant.status)
  },
  async cancel({request,confirmCancellation}={}){
   if(confirmCancellation!==true)return block('explicit_cancellation_required')
   const r=await inspect(request)
   if(r.error)return block(r.error)
   if(r.merchant.status==='CANCELLED'||r.merchant.status==='EXPIRED')
    return output('ALREADY_TERMINATED',r.merchant.status)
   if(!['ACTIVE','SUSPENDED','APPROVED'].includes(r.merchant.status))
    return block('noncancellable_provider_state')
   if(typeof claimOwnerCancellation!=='function'||
     typeof cancelMerchantSubscription!=='function')
    return block('live_cancel_adapter_not_configured')
   // Claim durable and unique first; no automatic retries after HTTP failure.
   let claimed
   try{claimed=await claimOwnerCancellation({
    ownerId:r.owner,intentId:r.binding.intentId,
    merchantGeneration:r.binding.merchantGeneration
   })}catch{return block('private_cancellation_claim_unavailable')}
   if(claimed!==true)return block('cancellation_requires_recovery')
   let accepted=false
   try{accepted=(await cancelMerchantSubscription({
    subscriptionId:r.binding.subscriptionId,
    merchantGeneration:r.binding.merchantGeneration
   }))===true}catch{return block('provider_cancellation_requires_recovery')}
   if(!accepted)return block('provider_cancellation_requires_recovery')
   let updated
   try{updated=await readMerchantSubscription({
    subscriptionId:r.binding.subscriptionId,
    merchantGeneration:r.binding.merchantGeneration
   })}catch{return output('CANCELLATION_PENDING','provider_refresh_unavailable')}
   if(updated?.id!==r.binding.subscriptionId||
     updated?.custom_id!==r.binding.intentId||
     updated?.plan_id!==r.binding.planId)
    return output('CANCELLATION_PENDING','merchant_confirmation_unavailable')
   if(updated.status==='CANCELLED')return output('CANCELLATION_CONFIRMED',
    'future_renewals_disabled')
   return output('CANCELLATION_PENDING','awaiting_provider_confirmation')
  }
 })
}
