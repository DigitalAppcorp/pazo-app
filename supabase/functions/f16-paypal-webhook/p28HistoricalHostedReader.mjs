// F16-P28 historical exact-ID reader. SERVER ONLY. RPC intentionally NOT installed.
// If a dedicated private RPC is unavailable, deny (never fall back to raw-table REST).
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const ID=/^[A-Za-z0-9._-]{3,128}$/
export function createP28HistoricalHostedReader({projectUrl,serviceRoleKey,
 fetchImpl=fetch,scope='DISABLED'}={}){
 if(scope!=='SERVER_ONLY_HISTORICAL_REVIEW'||projectUrl!==BASE||
   typeof serviceRoleKey!=='string'||serviceRoleKey.length<32||
   typeof fetchImpl!=='function')return async()=>null
 return async({eventId,requestId}={})=>{
  if(typeof eventId!=='string'||!ID.test(eventId)||
   typeof requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(requestId))return null
  try{
   const response=await fetchImpl(BASE+'/rest/v1/rpc/f16_p28_read_historical_candidate_exact',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_event_id:eventId,p_request_id:requestId})
   })
   if(!response.ok)return null
   const row=await response.json()
   if(!row||Array.isArray(row)||row.id!==eventId||
      row.processingState!=='pending')return null
   return Object.freeze({id:eventId,processingState:'pending'})
  }catch{return null}
 }
}
