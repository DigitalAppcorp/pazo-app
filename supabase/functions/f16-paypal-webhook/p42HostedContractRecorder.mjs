// F16-P42 hosted-contract adapter, OFF by default. Not imported by the
// deployed PayPal receiver. No secrets provisioned. Never grants paid access.
// Key material must come from a separately approved private Edge secret store.
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const KEY=/^P42_V[1-9][0-9]{0,3}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UTC=/^20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/
const utcSecond=s=>typeof s==='string'&&UTC.test(s)&&
 Number.isFinite(Date.parse(s))&&
 new Date(s).toISOString().replace(/\.000Z$/,'Z')===s
const oneDay=24*60*60*1000
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')
export function createP42HostedContractRecorder({
 enabled=false,projectUrl,serviceRoleKey,keyId,keyBytes,
 keyNotBefore,keyNotAfter,
 fetchImpl=fetch,subtleImpl=globalThis.crypto?.subtle,
 makeNonce=()=>globalThis.crypto?.randomUUID(),
 now=()=>new Date()
}={}){
 const ready=enabled===true&&projectUrl===URL&&
 typeof serviceRoleKey==='string'&&serviceRoleKey.length>=24&&
 !/\s/.test(serviceRoleKey)&&KEY.test(keyId||'')&&
 keyBytes instanceof Uint8Array&&keyBytes.byteLength>=32&&
 utcSecond(keyNotBefore)&&utcSecond(keyNotAfter)&&
 Date.parse(keyNotAfter)-Date.parse(keyNotBefore)===oneDay&&
 typeof fetchImpl==='function'&&typeof subtleImpl?.importKey==='function'&&
 typeof subtleImpl?.sign==='function'&&typeof makeNonce==='function'&&
 typeof now==='function'
 return Object.freeze({
  async bindVerifiedActivation({eventId,subscriptionId,origin}={}){
   if(!ready||!EVENT.test(eventId||'')||!SUB.test(subscriptionId||'')||
   origin!=='postback_verified_sandbox_activation')return false
   try{
    const nonce=makeNonce(),instant=now()
    if(!UUID.test(nonce||'')||!(instant instanceof Date)||
    !Number.isFinite(instant.getTime()))return false
    const issuedMs=instant.getTime()
    if(issuedMs<Date.parse(keyNotBefore)||issuedMs>=Date.parse(keyNotAfter))
      return false
    const issuedAt=instant.toISOString().replace(/\.\d{3}Z$/,'Z')
    const message=['p42','sandbox',keyId,eventId,subscriptionId,issuedAt,nonce].join('|')
    const utf8=new TextEncoder()
    const key=await subtleImpl.importKey('raw',keyBytes,{
      name:'HMAC',hash:'SHA-256'},false,['sign'])
    const mac=hex(await subtleImpl.sign('HMAC',key,utf8.encode(message)))
    // The HMAC may take time. Never POST if the 24h custody window already
    // expired during async signing. DB's absolute cutoff remains mandatory.
    const beforePost=now()
    if(!(beforePost instanceof Date)||!Number.isFinite(beforePost.getTime())||
       beforePost.getTime()<issuedMs||
       beforePost.getTime()>=Date.parse(keyNotAfter))
      return false
    const response=await fetchImpl(
      URL+'/rest/v1/rpc/f16_p42_register_authenticated_activation',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
      headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
        'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({p_event_id:eventId,p_subscription_id:subscriptionId,
        p_issued_at:issuedAt,p_nonce:nonce,p_key_id:keyId,p_mac_hex:mac})
    })
    if(!response?.ok)return false
    return await response.json()===true
   }catch{return false}
  }
 })
}
