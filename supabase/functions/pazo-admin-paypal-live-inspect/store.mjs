// Server-only metadata RPCs. Credentials are never accepted by this adapter.
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const PLAN=/^P-[A-Z0-9]{12,40}$/
const HOOK=/^[A-Za-z0-9_-]{8,100}$/
const fail=()=>{throw Error('resource_metadata_unavailable')}
export function createLiveResourceStore({projectUrl,serviceRoleKey,fetchImpl=fetch}={}){
 if(projectUrl!==PROJECT||typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24||serviceRoleKey.length>8192||/\s/.test(serviceRoleKey)||
  typeof fetchImpl!=='function')fail()
 const call=async(name,payload)=>{
  const response=await fetchImpl(PROJECT+'/rest/v1/rpc/pazo_f16_live_service_bootstrap_'+name,{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)
  })
  if(!response?.ok||response.status!==200||
   !/^application\/json(?:\s*;|$)/i.test(response.headers?.get?.('content-type')||''))fail()
  const text=await response.text()
  if(text.length>2048)fail()
  return JSON.parse(text)
 }
 return Object.freeze({
  async readReservation({actorId,planId}={}){
   if(!UUID.test(actorId||'')||!PLAN.test(planId||''))fail()
   const d=await call('read',{p_actor:actorId,p_plan:planId})
   if(d===null)return null
   if(d?.planId!==planId||!Number.isSafeInteger(d.generation)||
    d.generation<1||d.generation>9999||d.state!=='reserved'||
    d.environment!=='live'||d.mayCharge!==false||
    (d.webhookId!==''&&!HOOK.test(d.webhookId||'')))fail()
   return Object.freeze({generation:d.generation,planId:d.planId,
    webhookId:d.webhookId,state:d.state,environment:'live',mayCharge:false})
  },
  async recordResources({actorId,merchantGeneration,planId,webhookId}={}){
   if(!UUID.test(actorId||'')||!PLAN.test(planId||'')||!HOOK.test(webhookId||'')||
    !Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||merchantGeneration>9999)fail()
   return await call('record_resources',{p_actor:actorId,p_generation:merchantGeneration,
    p_plan:planId,p_webhook:webhookId})===true
  }
 })
}
