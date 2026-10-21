// PayPal LIVE signed postback verification. Server-only; never use in browser.
// Does not ingest, persist, charge, cancel, or grant a membership.
const HOST='https://api-m.paypal.com'
const CERT_HOSTS=new Set(['api.paypal.com','api-m.paypal.com'])
const CERT_PATH=/^\/v1\/notifications\/certs\/CERT-[A-Za-z0-9-]{3,180}$/
const HEADER_MAP={
 'paypal-transmission-id':'transmission_id',
 'paypal-transmission-time':'transmission_time',
 'paypal-transmission-sig':'transmission_sig',
 'paypal-auth-algo':'auth_algo',
 'paypal-cert-url':'cert_url',
}
const ascii=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&
 /^[\x21-\x7e]+$/.test(s)
export function requireLiveCertUrl(value){
 try{
  const u=new URL(value)
  return u.protocol==='https:'&&CERT_HOSTS.has(u.hostname)&&
   !u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&
   CERT_PATH.test(u.pathname)&&u.href===value
 }catch{return false}
}
function signedPayload(headers,bytes,webhookId){
 if(!(bytes instanceof Uint8Array)||bytes.length<2||bytes.length>65536||
  typeof webhookId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(webhookId))
  throw Error('invalid_payload_or_webhook')
 const fields={}
 for(const [header,key] of Object.entries(HEADER_MAP)){
  const value=headers?.get?.(header)
  if(typeof value!=='string'||!value||value.length>2048)
   throw Error('invalid_paypal_header')
  fields[key]=value
 }
 if(fields.auth_algo!=='SHA256withRSA'||!requireLiveCertUrl(fields.cert_url))
  throw Error('invalid_certificate')
 // Preserve the EXACT incoming JSON bytes, not a re-serialized event. This is
 // necessary to avoid accepting a different signed object than the received one.
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes)
 const event=JSON.parse(raw)
 if(!event||typeof event!=='object'||Array.isArray(event))
  throw Error('invalid_event')
 const head=JSON.stringify({...fields,webhook_id:webhookId})
 return head.slice(0,-1)+',"webhook_event":'+raw+'}'
}
async function providerJson(fetchImpl,url,options){
 const response=await fetchImpl(url,{
  ...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
 })
 if(!response?.ok||response.status!==200)return null
 const type=response.headers?.get?.('content-type')||'application/json'
 if(!/^application\/json(?:\s*;|$)/i.test(type))return null
 const raw=await response.text()
 if(typeof raw!=='string'||raw.length>32768)return null
 const data=JSON.parse(raw)
 return data&&typeof data==='object'&&!Array.isArray(data)?data:null
}
export function createPaypalLivePostbackVerifier({clientId,clientSecret,fetchImpl=fetch}={}){
 if(!ascii(clientId)||clientId.includes(':')||!ascii(clientSecret)||
  typeof fetchImpl!=='function')throw Error('live_postback_not_configured')
 return async({environment,webhookId,headers,rawBody}={})=>{
  if(environment!=='live')throw Error('live_only')
  const payload=signedPayload(headers,rawBody,webhookId)
  const token=await providerJson(fetchImpl,HOST+'/v1/oauth2/token',{
   method:'POST',headers:{
    Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    Accept:'application/json','Content-Type':'application/x-www-form-urlencoded',
   },body:'grant_type=client_credentials'
  })
  if(token?.token_type?.toLowerCase()!=='bearer'||!ascii(token.access_token))
   throw Error('live_token_unavailable')
  const result=await providerJson(fetchImpl,HOST+'/v1/notifications/verify-webhook-signature',{
   method:'POST',headers:{
    Authorization:'Bearer '+token.access_token,
    Accept:'application/json','Content-Type':'application/json',
   },body:payload
  })
  return result?.verification_status==='SUCCESS'
 }
}
