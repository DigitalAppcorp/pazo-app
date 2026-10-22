// PAZO F16-P22: privileged Sandbox lease RPC client, NOT DEPLOYED.
// Every row comes from a service_role-only PostgREST function. No table reads,
// browser session, subscription creation, payment write or benefit gate.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PLAN='P-14V25407JP6850922NLHMDKI'
const TIMESTAMP=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/
const utc=x=>typeof x==='string'&&TIMESTAMP.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,19)===x.slice(0,19)
const exact=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join('|')===keys.slice().sort().join('|')
const fail=(code)=>{throw Error(code)}
export function createP22PrivateLeaseRpcAdapter({
 projectUrl,serviceRoleKey,fetchImpl=fetch,
}={}){
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
   serviceRoleKey.length<24||serviceRoleKey.length>4096||
   /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')
  fail('p22_service_rpc_not_configured')
 const call=async (rpc,args)=>{
  let response
  try{
   response=await fetchImpl(BASE+'/rest/v1/rpc/'+rpc,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(args),
   })
  }catch{fail('p22_private_rpc_unavailable')}
  if(!response?.ok)fail('p22_private_rpc_unavailable')
  try{return await response.json()}
  catch{fail('p22_private_rpc_unavailable')}
 }
 return Object.freeze({
  async claimNextVerifiedEvent(){
   const a=await call('f16_p05_draft_claim_next_verified_event',{})
   if(a===null)return null
   if(!exact(a,['eventId','eventType','verifiedAt','processingState',
     'attemptCount','leaseToken','leaseExpiresAt'])||!REF.test(a.eventId||'')||
     typeof a.eventType!=='string'||!utc(a.verifiedAt)||
     a.processingState!=='processing'||!Number.isInteger(a.attemptCount)||
     a.attemptCount<1||a.attemptCount>5||
     !UUID.test(a.leaseToken||'')||!utc(a.leaseExpiresAt))
    fail('p22_claim_contract_mismatch')
   return Object.freeze({...a})
  },
  async readClaimedEvent({eventId,claimToken}={}){
   if(!REF.test(eventId||'')||!UUID.test(claimToken||''))
    fail('p22_invalid_claim_reference')
   const a=await call('f16_p05_draft_read_claimed_event',{
    p_event_id:eventId,p_claim_token:claimToken})
   if(a===null)return null
   if(!exact(a,['id','type','verifiedAt','processingState'])||
      a.id!==eventId||typeof a.type!=='string'||!utc(a.verifiedAt)||
      a.processingState!=='processing')
    fail('p22_read_contract_mismatch')
   return Object.freeze({...a})
  },
  async resolveClaimedSubscription({eventId,claimToken,
    merchantSubscriptionId,merchantCustomIntentId}={}){
   if(!REF.test(eventId||'')||!UUID.test(claimToken||'')||
      !SUB.test(merchantSubscriptionId||'')||
      !INTENT.test(merchantCustomIntentId||''))
    fail('p22_invalid_bound_reference')
   // RPC below is ONLY a lab draft for now; on hosted it will fail closed.
   const a=await call('f16_p22_resolve_bound_under_claim',{
    p_event_id:eventId,p_claim_token:claimToken,
    p_subscription_id:merchantSubscriptionId,p_intent_id:merchantCustomIntentId})
   if(a===null)return null
   if(!exact(a,['intentId','subscriptionId','planId','state','ownerId'])||
      a.intentId!==merchantCustomIntentId||
      a.subscriptionId!==merchantSubscriptionId||
      a.planId!==PLAN||a.state!=='bound'||
      !UUID.test(a.ownerId||''))
    fail('p22_bound_contract_mismatch')
   return Object.freeze({...a})
  },
  async finishClaimedEvent({eventId,claimToken,outcome,reasonCode}={}){
   if(!REF.test(eventId||'')||!UUID.test(claimToken||'')||
      !['retry','review'].includes(outcome)||
      !['merchant_unavailable','read_unavailable','temporarily_incomplete',
       'foreign_reference','missing_evidence','reversal_possible',
       'cycle_unproven','manual_review'].includes(reasonCode))
    fail('p22_invalid_finish_reference')
   const a=await call('f16_p05_draft_finish_claimed_event',{
    p_event_id:eventId,p_claim_token:claimToken,
    p_outcome:outcome,p_reason_code:reasonCode})
   if(typeof a!=='boolean')fail('p22_finish_contract_mismatch')
   return a
  },
 })
}
