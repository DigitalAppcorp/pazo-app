// PAZO F16 — unlaunched service-only original merchant Vault reader.
// This RPC is NOT deployed, so calls fail closed on hosted PAZO.
// NEVER send returned secrets to browser, API responses, logs or analytics.
const URL=/^https:\/\/[a-z0-9]{20}\.supabase\.co$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const WH=/^[A-Za-z0-9_-]{8,100}$/
const HASH=/^[a-f0-9]{64}$/
const ascii=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&/^[\x21-\x7e]+$/.test(s)
const fail=()=>{throw Error('live_generation_vault_read_unavailable')}
export function createPazoLiveHostedGenerationReader({
 supabaseUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(!URL.test(supabaseUrl||'')||
  typeof serviceRoleKey!=='string'||serviceRoleKey.length<24||
  serviceRoleKey.length>4096||!(/^[\x21-\x7e]+$/).test(serviceRoleKey)||
  typeof fetchImpl!=='function')
  throw Error('live_generation_reader_not_configured')
 return async function fetchPrivateGeneration({merchantGeneration,sourceEnvironment}={}){
  if(sourceEnvironment!=='live'||!Number.isSafeInteger(merchantGeneration)||
   merchantGeneration<1)fail()
  let response
  try{response=await fetchImpl(supabaseUrl+
   '/rest/v1/rpc/pazo_f16_live_historical_merchant_secrets',{
    method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({p_generation:merchantGeneration})
   })}catch{fail()}
  if(!response?.ok||response.status!==200||
   !/^application\/json(?:\s*;|$)/i.test(response.headers?.get?.('content-type')||''))fail()
  let body
  try{body=await response.text()}catch{fail()}
  if(typeof body!=='string'||body.length>4096)fail()
  let d
  try{d=JSON.parse(body)}catch{fail()}
  if(d?.provider!=='paypal'||d?.environment!=='live'||
   d?.generation!==merchantGeneration||!PLAN.test(d.planId||'')||
   !WH.test(d.webhookId||'')||!HASH.test(d.merchantFingerprint||'')||
   !ascii(d.clientId)||d.clientId.includes(':')||!ascii(d.clientSecret))fail()
  // Strict allowlist: dispose of any unexpected DB/Vault fields.
  // This object must remain in server memory, never sent to clients.
  return Object.freeze({provider:'paypal',environment:'live',
   generation:merchantGeneration,planId:d.planId,webhookId:d.webhookId,
   merchantFingerprint:d.merchantFingerprint,
   clientId:d.clientId,clientSecret:d.clientSecret})
 }
}
