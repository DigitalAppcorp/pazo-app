// PAZO F16 — server-only, two-phase Live merchant generation bootstrap.
// The matching SQL draft is intentionally NOT hosted until separate PO DDL GO.
// Reserve an actual database identity BEFORE configuring ?generation=N at PayPal.
// No credentials, webhook creation, subscriptions, charging or release switches.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const PLAN=/^P-[A-Z0-9]{12,40}$/
const HOOK=/^[A-Za-z0-9_-]{8,100}$/
const HASH=/^[a-f0-9]{64}$/
const BASE='pazo_f16_live_service_bootstrap_'
const fail=()=>{throw Error('live_generation_bootstrap_unavailable')}
export function createPazoLiveBootstrapSqlStore({projectUrl,serviceRoleKey,fetchImpl=fetch}={}){
 if(projectUrl!==PROJECT||typeof serviceRoleKey!=='string'||
    serviceRoleKey.length<24||serviceRoleKey.length>8192||
    /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')fail()
 async function call(name,payload){
  let r
  try{r=await fetchImpl(PROJECT+'/rest/v1/rpc/'+BASE+name,{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(12000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify(payload)
  })}catch{fail()}
  if(r?.status!==200||!r.ok||
     !/^application\/json(?:\s*;|$)/i.test(r.headers?.get?.('content-type')||''))fail()
  let raw
  try{raw=await r.text()}catch{fail()}
  if(typeof raw!=='string'||raw.length>2048)fail()
  try{return JSON.parse(raw)}catch{fail()}
 }
 return Object.freeze({
  async reserveGeneration({actorId,planId}={}){
   if(!UUID.test(actorId||'')||!PLAN.test(planId||''))fail()
   const d=await call('reserve',{p_actor:actorId,p_plan:planId})
   if(d?.reserved!==true||!Number.isSafeInteger(d.generation)||
      d.generation<1||d.generation>9999||d.planId!==planId||
      d.environment!=='live'||d.mayCharge!==false)fail()
   return Object.freeze({generation:d.generation,planId:d.planId,
    environment:'live',mayCharge:false})
  },
  async finalizeGeneration({actorId,merchantGeneration,planId,
   webhookId,merchantFingerprint}={}){
   if(!UUID.test(actorId||'')||!Number.isSafeInteger(merchantGeneration)||
     merchantGeneration<1||merchantGeneration>9999||!PLAN.test(planId||'')||
     !HOOK.test(webhookId||'')||!HASH.test(merchantFingerprint||''))fail()
   const d=await call('finalize',{p_actor:actorId,p_generation:merchantGeneration,
    p_plan:planId,p_webhook:webhookId,p_fingerprint:merchantFingerprint})
   if(d?.finalized!==true||d.generation!==merchantGeneration||
     d.planId!==planId||d.webhookId!==webhookId||
     d.merchantFingerprint!==merchantFingerprint||
     d.environment!=='live'||d.mayCharge!==false)fail()
   return Object.freeze({generation:d.generation,planId:d.planId,
    webhookId:d.webhookId,merchantFingerprint:d.merchantFingerprint,
    environment:'live',mayCharge:false})
  }
 })
}
