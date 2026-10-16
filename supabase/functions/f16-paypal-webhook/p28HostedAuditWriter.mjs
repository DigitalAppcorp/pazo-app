// P28 server-only audit persistence bridge. NO deployment; missing RPC => deny.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HEX=/^[0-9a-f]{64}$/
export function createP28HostedAuditWriter({projectUrl,serviceRoleKey,scope='DISABLED',fetchImpl=fetch}={}){
 if(projectUrl!==BASE||scope!=='SERVER_ONLY_HISTORICAL_REVIEW'||typeof serviceRoleKey!=='string'||serviceRoleKey.length<32||typeof fetchImpl!=='function')return async()=>null
 return async({requestId,eventFingerprint,action}={})=>{
  if(typeof requestId!=='string'||!UUID.test(requestId)||typeof eventFingerprint!=='string'||!HEX.test(eventFingerprint)||action!=='historical_candidate_exact_read')return null
  try{
   const res=await fetchImpl(BASE+'/rest/v1/rpc/f16_p28_draft_ack_historical_audit',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
      'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_request_id:requestId,p_event_fingerprint:eventFingerprint})
   })
   if(!res.ok)return null
   const row=await res.json()
   if(row?.persisted!==true||row?.requestId!==requestId)return null
   return Object.freeze({persisted:true,requestId})
  }catch{return null}
 }
}
