// PAZO F16-P14: UNDEPLOYED browser-compatible Sandbox account endpoint.
// Compose existing P06 authenticated PayPal status/cancel with owner-only
// retrieval of an exact immutable acceptance document (read only).
import {createPazoSandboxCancellationHandler} from './p06SandboxCancellationHandler.mjs'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HASH=/^[a-f0-9]{64}$/
const VERSION=/^pazo-supporter-[a-z0-9.-]{3,40}$/
const plain=(status,code)=>new Response(JSON.stringify({
 ok:false,code,environment:'sandbox',paidThrough:null,
 mayRecordPayment:false,mayGrantBenefits:false,
}),{status,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}})
const keys=(obj,allowed)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join('|')===allowed.slice().sort().join('|')
const lang={es:{
 title:'Constancia de aceptación de términos de Amigo de PAZO',
 accepted:'Aceptación registrada (UTC)',version:'Versión aceptada',
 digest:'Huella SHA-256 de los términos',
 note:'Este documento confirma un consentimiento registrado; no demuestra pago, cobertura activa ni entrega automática de una confirmación. Consulta el estado de tu suscripción por separado.',
},en:{
 title:'Friend of PAZO terms acceptance record',
 accepted:'Consent recorded (UTC)',version:'Accepted version',
 digest:'Terms SHA-256 digest',
 note:'This document confirms recorded consent. It does not prove payment, active coverage or automatic delivery of an acknowledgement. Check subscription status separately.',
}}
const present=x=>[
 lang[x.locale].title,
 '',
 lang[x.locale].version+': '+x.termsVersion,
 lang[x.locale].accepted+': '+x.consentedAt,
 lang[x.locale].digest+': '+x.termsDigest,
 '',
 x.exactCopy,
 '',
 lang[x.locale].note,
 ''].join('\n')

export function createPazoSandboxSupporterAccountHandler({
 resolveAuthenticatedOwner,privateIntentStore,admit,provider,
 consentStore,trustedOrigins=[],
}={}){
 if(typeof resolveAuthenticatedOwner!=='function'||
    typeof consentStore?.readAcknowledgementForOwner!=='function'||
    !Array.isArray(trustedOrigins)||trustedOrigins.some(o=>
     typeof o!=='string'||!/^https:\/\/[^/]+$/.test(o)))
  throw Error('pazo_p14_account_endpoint_not_configured')
 const cancel=createPazoSandboxCancellationHandler({
  resolveAuthenticatedOwner,privateIntentStore,admit,provider,trustedOrigins,
 })
 const allow=new Set(trustedOrigins)
 return async request=>{
  if(!(request instanceof Request))return plain(400,'invalid_request')
  const origin=request.headers.get('origin')
  if(origin!==null&&!allow.has(origin))return plain(403,'origin_not_allowed')
  const cors={
   ...(origin?{'access-control-allow-origin':origin,
    'vary':'Origin'}:{}),
   'cache-control':'no-store','x-content-type-options':'nosniff',
  }
  const outgoing=(res)=>new Response(res.body,{
   status:res.status,statusText:res.statusText,
   headers:{...Object.fromEntries(res.headers),...cors},
  })
  if(request.method==='OPTIONS'){
   const requested=(request.headers.get('access-control-request-headers')||'')
    .split(',').map(h=>h.trim().toLowerCase()).filter(Boolean)
   if(origin===null||request.headers.get('access-control-request-method')!=='POST'||
      requested.some(h=>!['authorization','content-type'].includes(h)))
    return plain(403,'preflight_not_allowed')
   return new Response(null,{status:204,headers:{...cors,
    'access-control-allow-methods':'POST',
    'access-control-allow-headers':'authorization, content-type',
    'access-control-max-age':'600'}})
  }
  if(request.method!=='POST')return outgoing(plain(405,'method_not_allowed'))
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   return outgoing(plain(415,'json_required'))
  const declared=Number(request.headers.get('content-length')||0)
  if(!Number.isFinite(declared)||declared>2048)
   return outgoing(plain(413,'request_too_large'))
  let raw,payload
  try{
   raw=await request.clone().text()
   if(raw.length>2048)return outgoing(plain(413,'request_too_large'))
   payload=JSON.parse(raw)
  }catch{return outgoing(plain(400,'invalid_request'))}
  // Existing cancellation route enforces Auth, ownership and merchant GET.
  if(payload?.action!=='acknowledgement')
   return outgoing(await cancel(request))
  if(!keys(payload,['action','intentId'])||!INTENT.test(payload.intentId||''))
   return outgoing(plain(400,'invalid_request'))
  let owner
  try{owner=await resolveAuthenticatedOwner(request)}
  catch{return outgoing(plain(401,'authentication_required'))}
  if(!UUID.test(owner||''))return outgoing(plain(401,'authentication_required'))
  try{
   if(await admit({ownerId:owner,action:'acknowledgement'})!==true)
    return outgoing(plain(429,'rate_limited'))
  }catch{return outgoing(plain(503,'admission_unavailable'))}
  let x
  try{x=await consentStore.readAcknowledgementForOwner({
   ownerId:owner,intentId:payload.intentId,
  })}catch{return outgoing(plain(503,'private_acknowledgement_unavailable'))}
  if(x===null)return outgoing(plain(404,'acknowledgement_not_found'))
  if(!x||x.ownerId!==owner||x.intentId!==payload.intentId||
     !(x.locale in lang)||!VERSION.test(x.termsVersion||'')||
     !HASH.test(x.termsDigest||'')||typeof x.exactCopy!=='string'||
     x.exactCopy.length<100||x.exactCopy.length>12000||
     typeof x.consentedAt!=='string'||!Number.isFinite(Date.parse(x.consentedAt))||
     x.priceMinor!==299||x.currency!=='USD'||x.cadence!=='MONTH_1')
   return outgoing(plain(503,'private_acknowledgement_untrusted'))
  const body=present({...x,consentedAt:new Date(x.consentedAt).toISOString()})
  return new Response(body,{status:200,headers:{...cors,
   'content-type':'text/plain; charset=utf-8',
   'content-disposition':'attachment; filename="pazo-consent-acknowledgement.txt"',
   'content-security-policy':"default-src 'none'",
  }})
 }
}
