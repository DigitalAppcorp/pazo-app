// F16-P39: private signed-activation association RPC adapter. OFFLINE / NOT WIRED.
// Called only by the webhook core AFTER successful PayPal signature verification.
// Even a successful return is a provenance reference, NEVER payment proof.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
export function createP39ActivationInboxAdapter({enabled=false,projectUrl,serviceRoleKey,fetchImpl=fetch}={}){
 const ready=enabled===true&&projectUrl===BASE&&typeof serviceRoleKey==='string'&&
 serviceRoleKey.length>=24&&!/\s/.test(serviceRoleKey)&&typeof fetchImpl==='function'
 return Object.freeze({
  async bindVerifiedActivation({eventId,subscriptionId,origin}={}){
   if(!ready||!REF.test(eventId||'')||!SUB.test(subscriptionId||'')||
   origin!=='postback_verified_sandbox_activation')return false
   try{
    const response=await fetchImpl(BASE+'/rest/v1/rpc/f16_p39_register_signed_activation',{
     method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
     headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({p_event_id:eventId,p_subscription_id:subscriptionId,
       p_server_origin:origin})
    })
    if(!response?.ok)return false
    return await response.json()===true
   }catch{return false}
  }
 })
}
