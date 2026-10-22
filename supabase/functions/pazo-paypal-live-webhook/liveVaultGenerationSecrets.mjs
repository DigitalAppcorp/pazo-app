// PAZO F16: immutable per-generation Vault credential reader.
// Only Supabase service_role Edge may call the narrowly granted SQL RPC.
// No credentials exposed to browsers, logs, or active-generation fallback.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const CLIENT=/^[A-Za-z0-9_-]{20,256}$/
const SECRET=/^[A-Za-z0-9_-]{20,512}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const WEBHOOK=/^[A-Za-z0-9_-]{8,100}$/
const HASH=/^[a-f0-9]{64}$/
const fail=()=>{throw Error('live_generation_vault_unavailable')}
export function createPazoLiveVaultGenerationSecretReader({
 supabaseUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(supabaseUrl!==PROJECT||typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24||serviceRoleKey.length>8192||
  /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')fail()
 return async function fetchPrivateGeneration({merchantGeneration,sourceEnvironment}={}){
  if(sourceEnvironment!=='live'||!Number.isSafeInteger(merchantGeneration)||
   merchantGeneration<1||merchantGeneration>9999)fail()
  let r
  try{r=await fetchImpl(PROJECT+'/rest/v1/rpc/pazo_f16_live_service_vault_read',{
   method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify({p_generation:merchantGeneration})
  })}catch{fail()}
  if(!r?.ok||r.status!==200||!/^application\/json(?:\s*;|$)/i.test(
   r.headers?.get?.('content-type')||''))fail()
  let raw
  try{raw=await r.text()}catch{fail()}
  if(raw.length>4096)fail()
  let d
  try{d=JSON.parse(raw)}catch{fail()}
  if(d?.generation!==merchantGeneration||d.environment!=='live'||
   d.provider!=='paypal'||d.sourceEnvironment!=='live'||
   d.credentialSource!=='vault'||!HASH.test(d.merchantFingerprint||'')||
   !PLAN.test(d.planId||'')||!WEBHOOK.test(d.webhookId||'')||
   !CLIENT.test(d.clientId||'')||!SECRET.test(d.clientSecret||'')||
   typeof d.isRetired!=='boolean')fail()
  return Object.freeze({generation:d.generation,environment:'live',
   provider:'paypal',credentialSource:'vault',planId:d.planId,
   webhookId:d.webhookId,merchantFingerprint:d.merchantFingerprint,
   clientId:d.clientId,clientSecret:d.clientSecret,isRetired:d.isRetired})
 }
}
