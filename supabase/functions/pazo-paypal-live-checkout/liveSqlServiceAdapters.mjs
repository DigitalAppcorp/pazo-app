// PAZO F16 — service-role PostgREST adapter for already installed private Live ledger.
// This module has no browser imports, no rollout switch and cannot create a payment.
// The SQL service-only bridges must be individually PO-approved and installed first.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const ROLE_RPC=Object.freeze({
 publicSupporterTick:'pazo_f18_supporter_tick',
 publicSupporterAdmin:'pazo_f18_supporter_admin_action',
 qaOriginalRetry:'pazo_f16_live_service_qa_original_retry',
 terminalClose:'pazo_f16_live_service_terminal_checkout_close',
 qaOriginalScope:'pazo_f16_live_service_qa_original_scope',
 gradualAdmin:'pazo_f16_gradual_admin_action',
 releaseRuntime:'pazo_f16_live_service_release_runtime',
 releaseAdmit:'pazo_f16_live_service_release_admit',
 route:'pazo_f16_live_service_active_route',
 begin:'pazo_f16_live_service_checkout_begin',
 claim:'pazo_f16_live_service_provider_claim_with_origin',
 bind:'pazo_f16_live_service_subscription_bind',
 cancelClaim:'pazo_f16_live_service_cancel_claim',
 queueEvent:'pazo_f16_live_service_verified_event_queue',
 recordSale:'pazo_f16_live_service_verified_sale_record',
 recordRefund:'pazo_f16_live_service_verified_refund_record',
 leasedSale:'pazo_f16_live_service_leased_sale_record',
 leasedRefund:'pazo_f16_live_service_leased_refund_record',
 financialContext:'pazo_f16_live_service_financial_context_read',
 originalRefundSale:'pazo_f16_live_service_refund_sale_binding_read',
 leasedLifecycle:'pazo_f16_live_service_leased_lifecycle_record',
 workerAdmit:'pazo_f16_live_service_worker_admit',
 workerComplete:'pazo_f16_live_service_worker_complete',
 workerHealth:'pazo_f16_live_service_worker_health_read',
 disputeClaim:'pazo_f16_live_service_dispute_claim',
 disputeFinish:'pazo_f16_live_service_dispute_finish',
 acceptance:'pazo_f16_live_service_acceptance_read',
 projection:'pazo_f16_live_service_paid_period_projection'
})
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const fail=()=>{throw Error('live_private_service_unavailable')}
export function createPazoLiveServiceRpc({
 projectUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(projectUrl!==PROJECT||typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24||serviceRoleKey.length>8192||
  /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')
  throw Error('live_private_service_configuration_unavailable')
 return async function rpc(name,payload){
  if(!Object.prototype.hasOwnProperty.call(ROLE_RPC,name)||
   !payload||typeof payload!=='object'||Array.isArray(payload))fail()
  let response
  try{response=await fetchImpl(PROJECT+'/rest/v1/rpc/'+ROLE_RPC[name],{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(12000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify(payload)
  })}catch{fail()}
  if(!response?.ok||response.status!==200)fail()
  try{return await response.json()}catch{fail()}
 }
}
export function createPazoLiveCheckoutSqlStores({rpc}={}){
 if(typeof rpc!=='function')throw Error('live_checkout_sql_not_ready')
 return Object.freeze({
  consentStore:Object.freeze({
   async beginForOwner({ownerId,requestKey,locale,termsVersion,termsDigest,
     merchantGeneration,expectedPlanId,affirmativeConsent}={}){
    if(!UUID.test(ownerId||'')||!UUID.test(requestKey||'')||
       affirmativeConsent!==true||!Number.isSafeInteger(merchantGeneration)||
       merchantGeneration<1)fail()
    const r=await rpc('begin',{p_owner:ownerId,p_request_key:requestKey,
      p_generation:merchantGeneration,p_locale:locale,
      p_terms_version:termsVersion,p_terms_digest:termsDigest})
    if(r?.ok!==true||r.ownerId!==ownerId||r.requestKey!==requestKey||
       r.planId!==expectedPlanId||r.merchantGeneration!==merchantGeneration||
       !INTENT.test(r.intentId||''))fail()
    return r
   },
   async claimProviderCreate({ownerId,intentId,requestKey,
     merchantGeneration,sourceEnvironment,originalOrigin}={}){
    if(sourceEnvironment!=='live'||!INTENT.test(intentId||'')||
      typeof originalOrigin!=='string'||!/^https:\/\/[a-z0-9][a-z0-9.-]{1,240}$/.test(originalOrigin))fail()
    const r=await rpc('claim',{p_owner:ownerId,p_intent:intentId,
     p_request_key:requestKey,p_generation:merchantGeneration,
     p_origin:originalOrigin})
    return r===true
   }
  }),
  intentStore:Object.freeze({
   async bindVerified({ownerId,intentId,requestKey,subscriptionId,
    sourceEnvironment,planId,merchantGeneration,provider}={}){
    if(sourceEnvironment!=='live'||provider!=='paypal'||
       !INTENT.test(intentId||''))fail()
    const result=await rpc('bind',{p_owner:ownerId,p_intent:intentId,
     p_request_key:requestKey,p_generation:merchantGeneration,
     p_plan:planId,p_subscription:subscriptionId})
    if(result!=='bound'&&result!=='already_bound')fail()
    return Object.freeze({state:'bound',result:result==='bound'?
     'new_binding':'already_bound',entitlement:false})
   }
  })
 })
}
