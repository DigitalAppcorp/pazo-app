// PAZO F16-P05 — inactive server-only private BOUND intent read adapter.
// Reuses EXISTING deployed service_role-only RPC; NO database writes.
// Not imported by Edge/webhook/worker/checkout. Restricted to server secrets.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const ENDPOINT=PROJECT+'/rest/v1/rpc/f16_paypal_read_private_intent'
const PLAN='P-14V25407JP6850922NLHMDKI'
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fail=x=>{throw Error(x)}
export function createP05ServerOnlyBoundIntentReader({
 projectUrl,serviceRoleKey,fetchImpl=fetch,
}={}){
 if(projectUrl!==PROJECT||typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||
  typeof fetchImpl!=='function')
  fail('private_intent_reader_not_configured')
 return async function readTrustedBoundIntent({intentId}={}){
  if(typeof intentId!=='string'||!INTENT.test(intentId))
   fail('invalid_private_intent_id')
  let response,data
  try{
   response=await fetchImpl(ENDPOINT,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({p_intent_id:intentId}),
   })
  }catch{fail('private_intent_rpc_unavailable')}
  if(!response?.ok)fail('private_intent_rpc_unavailable')
  try{data=await response.json()}
  catch{fail('private_intent_rpc_invalid_response')}
  // Hosted RPC explicitly returns snake_case:
  // id, owner_id, plan_id, state, external_subscription_id.
  // It never asserts payment, acceptance, settlement or a paid cycle.
  if(!data||typeof data!=='object'||Array.isArray(data)||
   data.id!==intentId||!UUID.test(data.owner_id||'')||
   data.plan_id!==PLAN||data.state!=='bound'||
   !SUB.test(data.external_subscription_id||''))
   fail('private_intent_binding_invalid')
  return Object.freeze({
   id:data.id,ownerId:data.owner_id,provider:'paypal',
   state:data.state,planId:data.plan_id,
   subscriptionId:data.external_subscription_id,
  })
 }
}
