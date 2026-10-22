// P28 HMAC of historical event identifiers. Server-only; never use plain SHA256.
const HEX=/^[0-9a-f]{64}$/
export function createP28EventFingerprint({secret,cryptoImpl=globalThis.crypto}={}){
 if(typeof secret!=='string'||secret.length<32||!cryptoImpl?.subtle)return async()=>null
 return async(eventId)=>{
  if(typeof eventId!=='string'||!/^[A-Za-z0-9._-]{3,128}$/.test(eventId))return null
  try{
   const encoder=new TextEncoder()
   const key=await cryptoImpl.subtle.importKey('raw',encoder.encode(secret),
     {name:'HMAC',hash:'SHA-256'},false,['sign'])
   const sig=await cryptoImpl.subtle.sign('HMAC',key,encoder.encode(eventId))
   const fingerprint=Array.from(new Uint8Array(sig),b=>b.toString(16).padStart(2,'0')).join('')
   return HEX.test(fingerprint)?fingerprint:null
  }catch{return null}
 }
}
