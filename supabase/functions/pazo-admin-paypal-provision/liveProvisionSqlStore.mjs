// F16 provider secret staging: ONLY metadata and sanitized audit across PostgREST.
// Server-only; database draft must be separately approved/installed before release.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const NAMES=Object.freeze({
 read:'pazo_f16_live_service_provision_generation_read',
 reserve:'pazo_f16_live_service_provision_reserve',
 finish:'pazo_f16_live_service_provision_finish'
})
const fail=()=>{throw Error('live_provision_audit_unavailable')}
export function createPazoLiveProvisionSqlStore({
 projectUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(projectUrl!==PROJECT||typeof serviceRoleKey!=='string'||
    serviceRoleKey.length<24||serviceRoleKey.length>8192||
    /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')fail()
 async function post(kind,payload){
  if(!Object.hasOwn(NAMES,kind))fail()
  let response
  try{response=await fetchImpl(PROJECT+'/rest/v1/rpc/'+NAMES[kind],{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify(payload)
  })}catch{fail()}
  if(!response?.ok||response.status!==200)fail()
  let data
  try{data=await response.json()}catch{fail()}
  return data
 }
 return Object.freeze({
  async readGeneration({merchantGeneration,actorId}={}){
   if(!UUID.test(actorId||'')||!Number.isSafeInteger(merchantGeneration)||
      merchantGeneration<1||merchantGeneration>9999)fail()
   const d=await post('read',{p_actor:actorId,p_generation:merchantGeneration})
   if(d===null)return null
   if(!d||typeof d!=='object'||Array.isArray(d)||d.generation!==merchantGeneration||
      d.verifiedAdminId!==actorId||d.environment!=='live'||
      d.credentialSource!=='edge_secrets'||d.killSwitch!==true||
      d.liveCheckoutEnabled!==false||!Number.isSafeInteger(d.revision))
    fail()
   return Object.freeze({...d})
  },
  async reserveAttempt({actorId,merchantGeneration,expectedRevision,
   planId,webhookId,merchantFingerprint}={}){
   if(!UUID.test(actorId||'')||!Number.isSafeInteger(merchantGeneration)||
      merchantGeneration<1||merchantGeneration>9999||
      !Number.isSafeInteger(expectedRevision)||expectedRevision<0||
      typeof planId!=='string'||typeof webhookId!=='string'||
      typeof merchantFingerprint!=='string')fail()
   const d=await post('reserve',{
    p_actor:actorId,p_generation:merchantGeneration,p_expected_revision:expectedRevision,
    p_plan:planId,p_webhook:webhookId,p_fingerprint:merchantFingerprint
   })
   if(d?.reserved!==true)return Object.freeze({reserved:false})
   if(!UUID.test(d.attemptId||''))fail()
   return Object.freeze({reserved:true,attemptId:d.attemptId})
  },
  async recordAttemptOutcome({actorId,merchantGeneration,attemptId,resultCode}={}){
   if(!UUID.test(actorId||'')||!UUID.test(attemptId||'')||
     !Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
     !['generation_secret_names_confirmed','secret_preflight_unavailable',
       'generation_secrets_already_present',
       'secret_write_outcome_unknown_manual_review',
       'provisioning_audit_unavailable_manual_review'].includes(resultCode))
    fail()
   const d=await post('finish',{p_actor:actorId,p_generation:merchantGeneration,
    p_attempt:attemptId,p_result:resultCode})
   if(typeof d!=='boolean')fail()
   return d
  }
 })
}
