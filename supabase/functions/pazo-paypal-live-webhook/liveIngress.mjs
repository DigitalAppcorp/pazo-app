// PAZO F16 Live webhook intake contract. INERT by default, not deployed.
// A signed merchant event is NOT proof it belongs to PAZO or represents a
// paid service period. Never store payload, payer PII, or grant entitlements.
import {requireLiveCertUrl} from './livePostback.mjs'
const LIMIT=65536
const TYPES=new Set([
 'BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.ACTIVATED',
 'BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.CANCELLED',
 'BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.EXPIRED',
 'BILLING.SUBSCRIPTION.PAYMENT.FAILED','PAYMENT.SALE.COMPLETED',
 'PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED',
])
const HEADER_NAMES=['paypal-transmission-id','paypal-transmission-time',
 'paypal-transmission-sig','paypal-auth-algo','paypal-cert-url']
const deny=(status,code)=>new Response(JSON.stringify({code}),{status,
 headers:{'content-type':'application/json','cache-control':'no-store'}})
async function boundedBytes(request){
 const declared=request.headers.get('content-length')
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>LIMIT))
  return null
 if(!request.body?.getReader)return null
 const reader=request.body.getReader(),pieces=[]
 let length=0
 try{
  while(true){
   const {done,value}=await reader.read()
   if(done)break
   if(!(value instanceof Uint8Array))return null
   length+=value.length
   if(length>LIMIT){await reader.cancel().catch(()=>{});return null}
   pieces.push(value)
  }
  if(length<2)return null
  const output=new Uint8Array(length)
  let at=0
  for(const part of pieces){output.set(part,at);at+=part.length}
  return output
 }catch{return null}
}
/**
 * All dependencies must come from the trusted server, never request JSON.
 * provePazoScope checks IMMUTABLE stored merchant generation, owner/intent and
 * plan. The durable inbox adapter must reject cross-environment duplicates.
 * In this branch there is no released composition providing either adapter.
 */
export function createPazoLiveWebhookIntake({released=false,environment,webhookId,
 verifySignature,provePazoScope,inbox}={}){
 return async function intake(request){
  if(released!==true)return deny(503,'live_ingress_not_released')
  if(environment!=='live'||typeof webhookId!=='string'||
     !/^[A-Za-z0-9_-]{8,100}$/.test(webhookId)||
     typeof verifySignature!=='function'||
     typeof provePazoScope!=='function'||
     typeof inbox?.recordIfAbsent!=='function')
   return deny(503,'live_ingress_not_configured')
  if(request?.method!=='POST')return deny(405,'method_not_allowed')
  if(request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
   return deny(415,'unsupported_content_type')
  for(const name of HEADER_NAMES){
   const value=request.headers.get(name)
   if(typeof value!=='string'||value.length<1||value.length>2048)
    return deny(400,'invalid_paypal_headers')
  }
  if(request.headers.get('paypal-auth-algo')!=='SHA256withRSA'||
     !requireLiveCertUrl(request.headers.get('paypal-cert-url')))
   return deny(401,'signature_envelope_invalid')
  const bytes=await boundedBytes(request)
  if(!bytes)return deny(413,'invalid_body_size')
  let event
  try{event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}
  catch{return deny(400,'invalid_json')}
  if(!event||typeof event!=='object'||Array.isArray(event)||
   typeof event.id!=='string'||!/^[A-Za-z0-9._-]{3,128}$/.test(event.id)||
   typeof event.event_type!=='string'||event.event_type.length>128)
   return deny(400,'invalid_event')
  let verified=false
  try{
   verified=(await verifySignature({
    environment:'live',webhookId,headers:request.headers,rawBody:bytes
   }))===true
  }catch{return deny(503,'signature_verification_unavailable')}
  if(!verified)return deny(401,'signature_invalid')
  if(!TYPES.has(event.event_type))
   return deny(200,'verified_event_not_in_contract')
  // Fail closed, especially for any signed events of other businesses using
  // the same PayPal merchant. An event's custom_id is NOT owner attestation.
  let scope
  try{
   scope=await provePazoScope({eventId:event.id,eventType:event.event_type,
    resource:event.resource,sourceEnvironment:'live'})
  }catch{return deny(503,'ownership_proof_unavailable')}
  if(scope?.confirmed!==true||scope?.sourceEnvironment!=='live'||
     scope?.ownerIntentVerified!==true||scope?.planVerified!==true||
     !Number.isSafeInteger(scope?.merchantGeneration)||scope.merchantGeneration<1)
   return deny(503,'ownership_proof_unavailable')
  let inserted
  try{
   inserted=await inbox.recordIfAbsent({provider:'paypal',sourceEnvironment:'live',
    merchantGeneration:scope.merchantGeneration,eventId:event.id,
    eventType:event.event_type})
  }catch{return deny(503,'durable_inbox_unavailable')}
  if(inserted===true)return deny(202,'verified_live_event_queued')
  if(inserted===false)return deny(200,'duplicate_verified_live_event')
  return deny(503,'durable_inbox_unavailable')
 }
}
