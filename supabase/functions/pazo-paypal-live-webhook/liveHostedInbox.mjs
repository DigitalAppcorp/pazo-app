// PAZO F16 — durable Live webhook event inbox, server-only.
// The caller must have already cryptographically validated PayPal's signed
// webhook and independently resolved its PAZO owner/merchant generation.
import {createPazoLiveVerifiedInboxAdapter} from './liveOwnerScope.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const fail=()=>{throw Error('live_verified_inbox_unavailable')}
export function createPazoLiveHostedInbox({
 supabaseUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(supabaseUrl!==PROJECT||typeof serviceRoleKey!=='string'||
   serviceRoleKey.length<24||serviceRoleKey.length>8192||
   /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')
  fail()
 const queueVerifiedEvent=async({
  ownerId,intentId,subscriptionId,merchantGeneration,eventId,eventType,signatureEvidence
 })=>{
  if(signatureEvidence?.proofSource!=='paypal_live_postback_success'||
   !/^[a-f0-9]{64}$/.test(signatureEvidence.signedBodySha256||'')||
   signatureEvidence.subscriptionId!==subscriptionId)fail()
  let r
  try{
   r=await fetchImpl(PROJECT+'/rest/v1/rpc/pazo_f16_live_service_signed_event_queue',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
     p_owner:ownerId,p_intent:intentId,p_subscription:subscriptionId,
     p_generation:merchantGeneration,p_event_id:eventId,p_event_type:eventType,
     p_evidence:signatureEvidence
    })
   })
  }catch{fail()}
  if(!r?.ok||r.status!==200)fail()
  let result
  try{result=await r.json()}catch{fail()}
  if(result!=='queued'&&result!=='duplicate_verified_event')fail()
  return result
 }
 return createPazoLiveVerifiedInboxAdapter({queueVerifiedEvent})
}
