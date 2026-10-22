// PAZO F16 — Live original-owner binding lookup via hosted Supabase RPC.
// Standalone, UNDEPLOYED. Call only from trusted Edge service_role context
// AFTER PayPal signature verification. Never include the secret in logs,
// output, browser bundles, webhook response, or custom IDs.
const URL_RE=/^https:\/\/[a-z0-9]{20}\.supabase\.co$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PLAN=/^P-[A-Z0-9]{12,40}$/
const fail=()=>{throw Error('live_private_binding_unavailable')}
const keyOK=s=>typeof s==='string'&&s.length>=24&&s.length<4096&&
 /^[\x21-\x7e]+$/.test(s)

export function createPazoLiveHostedBindingReader({
 supabaseUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(!URL_RE.test(supabaseUrl||'')||!keyOK(serviceRoleKey)||
  typeof fetchImpl!=='function')
  throw Error('live_binding_service_configuration_unavailable')
 const url=supabaseUrl+'/rest/v1/rpc/pazo_f16_live_service_binding_read'
 return async function findBoundSubscription({subscriptionId}={}){
  if(!SUB.test(subscriptionId||''))fail()
  let response
  try{
   response=await fetchImpl(url,{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{
     apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     Accept:'application/json','Content-Type':'application/json'
    },
    body:JSON.stringify({p_subscription_id:subscriptionId})
   })
  }catch{fail()}
  if(!response?.ok||response.status!==200||
    !/^application\/json(?:\s*;|$)/i.test(response.headers?.get?.('content-type')||''))
   fail()
  let raw
  try{raw=await response.text()}catch{fail()}
  if(typeof raw!=='string'||raw.length>4096)fail()
  let d
  try{d=JSON.parse(raw)}catch{fail()}
  if(!d)return null // Unknown subscription, no owner leak.
  if(Array.isArray(d)||typeof d!=='object'||d.provider!=='paypal'||
   d.sourceEnvironment!=='live'||d.subscriptionId!==subscriptionId||
   !UUID.test(d.ownerId||'')||!INTENT.test(d.intentId||'')||
   !PLAN.test(d.planId||'')||!Number.isSafeInteger(d.merchantGeneration)||
   d.merchantGeneration<1||d.state!=='bound'||d.consentVerified!==true)
   fail()
  // Output the exact minimal fields consumed by liveOwnerScope.mjs.
  return Object.freeze({
   provider:'paypal',sourceEnvironment:'live',subscriptionId,
   ownerId:d.ownerId,intentId:d.intentId,planId:d.planId,
   merchantGeneration:d.merchantGeneration,state:'bound',consentVerified:true
  })
 }
}
