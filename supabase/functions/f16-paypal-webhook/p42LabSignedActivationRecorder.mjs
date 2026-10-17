// PAZO F16-P42 — OFFLINE ONLY, NOT imported by receiver or deployed.
// A signing envelope protects against an unrelated service_role caller merely
// spoofing an 'origin' string. Signing only belongs AFTER PayPal postback proof.
// This is not PayPal signature validation or financial settlement proof.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const NONCE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const b2hex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,'0')).join('')
export function createP42LabSignedActivationRecorder({
 enabled=false,projectUrl,serviceRoleKey,privateSigningKey,
 fetchImpl=fetch,subtleImpl=globalThis.crypto?.subtle,
 makeNonce=()=>globalThis.crypto?.randomUUID(),now=()=>new Date()
}={}){
 const ready=enabled===true&&projectUrl===BASE&&
 typeof serviceRoleKey==='string'&&serviceRoleKey.length>=24&&
 typeof privateSigningKey==='string'&&privateSigningKey.length>=32&&
 typeof fetchImpl==='function'&&typeof subtleImpl?.importKey==='function'&&
 typeof subtleImpl?.sign==='function'&&typeof makeNonce==='function'&&
 typeof now==='function'
 return Object.freeze({
  async bindVerifiedActivation({eventId,subscriptionId,origin}={}){
   if(!ready||!EVENT.test(eventId||'')||!SUB.test(subscriptionId||'')||
    origin!=='postback_verified_sandbox_activation')return false
   try{
    const nonce=makeNonce()
    const timestamp=now()
    if(!NONCE.test(nonce||'')||!(timestamp instanceof Date)||
      !Number.isFinite(timestamp.getTime()))return false
    const issuedAt=timestamp.toISOString().replace(/\.\d{3}Z$/,'Z')
    const msg='p42|LAB_V1|'+eventId+'|'+subscriptionId+'|'+issuedAt+'|'+nonce
    const encoder=new TextEncoder()
    const key=await subtleImpl.importKey('raw',encoder.encode(privateSigningKey),
      {name:'HMAC',hash:'SHA-256'},false,['sign'])
    const mac=b2hex(await subtleImpl.sign('HMAC',key,encoder.encode(msg)))
    const response=await fetchImpl(BASE+'/rest/v1/rpc/f16_p42_lab_register_authenticated_activation',{
     method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
     headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
       'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({p_event_id:eventId,p_subscription_id:subscriptionId,
       p_issued_at:issuedAt,p_nonce:nonce,p_key_id:'LAB_V1',p_mac_hex:mac})
    })
    if(!response?.ok)return false
    return await response.json()===true
   }catch{return false}
  }
 })
}
