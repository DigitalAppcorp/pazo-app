// F16: server-only, read-only candidate reference lookup.
// SQL uses owner-bound V2 consent plus signed PayPal inbox, time-window ONLY
// to nominate one event; only a PayPal event GET may correlate its resource ID.
// Prepared migration required, do not expose event ID to browsers.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
export function createPazoSandboxV2CreatedEventCandidateStore({
 projectUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||
  typeof fetchImpl!=='function')throw Error('created_inbox_store_not_configured')
 return Object.freeze({
  async readForOwner({ownerId,intentId}={}){
   if(!UUID.test(ownerId||'')||!INTENT.test(intentId||''))
    throw Error('created_inbox_owner_unverified')
   let response
   try{
    response=await fetchImpl(BASE+'/rest/v1/rpc/f16_qa_v2_read_created_webhook_candidate',{
     method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
     headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
      'content-type':'application/json',Accept:'application/json'},
     body:JSON.stringify({p_owner_id:ownerId,p_intent_id:intentId})
    })
   }catch{throw Error('created_inbox_candidate_unavailable')}
   if(!response?.ok)throw Error('created_inbox_candidate_unavailable')
   let item
   try{item=await response.json()}catch{throw Error('created_inbox_candidate_unavailable')}
   if(item===null)return null
   if(!item||typeof item!=='object'||Array.isArray(item)||
    Object.keys(item).sort().join('|')!=='eventId|eventType|verifiedAt'||
    !EVENT.test(item.eventId||'')||
    item.eventType!=='BILLING.SUBSCRIPTION.CREATED'||
    typeof item.verifiedAt!=='string'||!Number.isFinite(Date.parse(item.verifiedAt)))
    throw Error('created_inbox_candidate_untrusted')
   return Object.freeze({
    eventId:item.eventId,eventType:item.eventType,verifiedAt:item.verifiedAt
   })
  }
 })
}
