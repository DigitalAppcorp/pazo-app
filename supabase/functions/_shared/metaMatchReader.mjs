// PAZO #169 — server-only matching field reader; NOT DEPLOYED OR WIRED.
// The lab-only RPC verifies a current event lease, independently granted
// purpose, original UA snapshot and fresh Auth email inside PostgreSQL.
// No raw email is serialized to a worker and no browser may call this RPC.
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HASH=/^[a-f0-9]{64}$/
const UA=/^[\x20-\x7e]{20,512}$/

export function createMetaMatchReader({
  enabled=false,privacyReviewed=false,sourceApproved=false,
  url=null,serviceKey=null,fetchImpl=fetch,
}={}) {
  if(enabled!==true||privacyReviewed!==true||sourceApproved!==true
    ||url!==URL||typeof serviceKey!=='string'||serviceKey.length<24
    ||typeof fetchImpl!=='function')return null
  return async function readApprovedMatchField(ownerId,eventId,leaseId){
    if(typeof ownerId!=='string'||!UUID.test(ownerId)
       ||typeof eventId!=='string'||!UUID4.test(eventId)
       ||typeof leaseId!=='string'||!UUID4.test(leaseId))return null
    let response
    try{
      response=await fetchImpl(URL+'/rest/v1/rpc/pazo_meta_read_match_candidate',{
        method:'POST',redirect:'error',cache:'no-store',
        signal:AbortSignal.timeout(6000),
        headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,
          'content-type':'application/json',accept:'application/json'},
        body:JSON.stringify({p_event:eventId,p_lease:leaseId}),
      })
    }catch{return null}
    if(response?.status!==200)return null
    let rows
    try{rows=await response.json()}catch{return null}
    if(!Array.isArray(rows)||rows.length!==1)return null
    const item=rows[0]
    if(!item||typeof item.em!=='string'||!HASH.test(item.em)
      ||typeof item.client_user_agent!=='string'
      ||!UA.test(item.client_user_agent))return null
    return Object.freeze({em:item.em,clientUserAgent:item.client_user_agent})
  }
}
