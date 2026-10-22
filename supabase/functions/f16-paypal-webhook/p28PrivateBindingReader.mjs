// P28 trusted private binding under the same active lease.
// Requires P22 RPC installed separately; absent RPC => null, NEVER skip.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
export function createP28PrivateBindingReader({projectUrl,serviceRoleKey,
 fetchImpl=fetch,scope='DISABLED'}={}){
 if(scope!=='SERVER_ONLY_READ_GATE'||projectUrl!==BASE||
  typeof serviceRoleKey!=='string'||serviceRoleKey.length<32||
  typeof fetchImpl!=='function')return async()=>null
 return async({eventId,claimToken,subscriptionId,intentId}={})=>{
  if(typeof eventId!=='string'||typeof claimToken!=='string'||
    typeof subscriptionId!=='string'||typeof intentId!=='string')return null
  try{
   const res=await fetchImpl(BASE+'/rest/v1/rpc/f16_p22_resolve_bound_under_claim',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
      'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_event_id:eventId,p_claim_token:claimToken,
      p_subscription_id:subscriptionId,p_intent_id:intentId})
   })
   if(!res.ok)return null
   const v=await res.json()
   if(v?.intentId!==intentId||v?.subscriptionId!==subscriptionId||
     v?.planId!==PLAN||v?.state!=='bound'||
     typeof v?.ownerId!=='string')return null
   return Object.freeze({intentId:v.intentId,subscriptionId:v.subscriptionId,
    planId:v.planId,state:v.state,ownerId:v.ownerId})
  }catch{return null}
 }
}
