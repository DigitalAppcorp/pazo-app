// Private, recent-MFA resource check. PayPal credentials live only for this request.
import {inspectLivePaypalResources,liveWebhookUrlForGeneration}
 from '../pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
import {readLivePaypalMerchantIdentity} from '../pazo-admin-paypal-validate/liveMerchantIdentityReadOnly.mjs'
const PATHS=new Set(['/functions/v1/pazo-admin-paypal-live-inspect','/pazo-admin-paypal-live-inspect'])
const ORIGINS=new Set(['http://localhost:5173','http://127.0.0.1:5173','https://pazo-app.vercel.app','https://pazo-app-t83r.vercel.app'])
const PLAN=/^P-[A-Z0-9]{12,40}$/
const HOOK=/^[A-Za-z0-9_-]{8,100}$/
const KEY=/^[A-Za-z0-9_-]{20,512}$/
const MERCHANT=/^[2-9A-HJ-NP-Z]{13}$/
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const CODES=new Set(['live_config_incomplete','live_oauth_unverified',
 'live_plan_unverified','live_plan_terms_unverified','live_webhook_unverified',
 'live_webhook_events_missing','live_webhook_events_unexpected','live_provider_unavailable',
 'live_merchant_oauth_unverified','live_merchant_read_permission_required',
 'live_merchant_identity_unverified','live_merchant_identity_unavailable'])
function cors(req){
 const origin=req?.headers?.get('origin')||''
 return {'vary':'Origin',...(ORIGINS.has(origin)?{
  'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,x-region,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version'
 }:{})}
}
function reply(req,status,code,extra={}){
 return new Response(JSON.stringify({ok:status===200,code,
  mayCharge:false,liveActivated:false,credentialsStored:false,
  merchantIdentityVerified:false,webhookDeliveryVerified:false,...extra}),
 {status,headers:{'content-type':'application/json','cache-control':'no-store',...cors(req)}})
}
async function boundedJson(req){
 if(!req.body)throw Error('invalid')
 const reader=req.body.getReader(),chunks=[]
 let size=0
 try{
  while(true){
   const part=await reader.read()
   if(part.done)break
   size+=part.value.byteLength
   if(size>2048){await reader.cancel();throw Error('invalid')}
   chunks.push(part.value)
  }
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size)
 let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
}
export function createLiveResourceInspection({released=false,authenticateAdmin,
 readAdminSettings,readReservation,recordResources,fetchImpl=fetch}={}){
 return async req=>{
  if(released!==true)return reply(req,503,'resource_inspection_not_released')
  let uri
  try{uri=new URL(req.url)}catch{return reply(req,400,'invalid_resource_request')}
  if(!PATHS.has(uri.pathname)||uri.search||uri.hash||
   !['http:','https:'].includes(uri.protocol))return reply(req,400,'invalid_resource_request')
  const origin=req.headers.get('origin')
  if(origin!==null&&!ORIGINS.has(origin))return reply(req,403,'origin_not_allowed')
  if(req.method==='OPTIONS')return origin&&req.headers.get('access-control-request-method')==='POST'
   ?new Response(null,{status:204,headers:{'cache-control':'no-store',...cors(req)}})
   :reply(req,400,'invalid_resource_request')
  if(req.method!=='POST'||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
   req.headers.get('content-type')||'')||Number(req.headers.get('content-length'))>2048)
   return reply(req,400,'invalid_resource_request')
  if([authenticateAdmin,readAdminSettings,readReservation,recordResources,fetchImpl]
    .some(fn=>typeof fn!=='function'))return reply(req,503,'resource_inspection_unavailable')
  let actor
  try{actor=await authenticateAdmin(req)}catch{return reply(req,403,'verified_admin_required')}
  if(!UUID.test(actor?.id||'')||actor?.isAdmin!==true||actor?.freshSession!==true)
   return reply(req,403,'verified_admin_required')
  let body
  try{body=await boundedJson(req)}catch{return reply(req,400,'invalid_resource_request')}
  if(!body||Array.isArray(body)||typeof body!=='object')return reply(req,400,'invalid_resource_request')
  const read=body.action==='read_reservation'&&Object.keys(body).length===1
  const inspect=body.action==='inspect_resources'&&
   body.confirmation==='COMPROBAR RECURSOS LIVE'&&Object.keys(body).length===5&&
   Object.keys(body).every(k=>['action','confirmation','webhookId','clientId','clientSecret'].includes(k))&&
   HOOK.test(body.webhookId||'')&&KEY.test(body.clientId||'')&&KEY.test(body.clientSecret||'')
  const checkMerchant=body.action==='verify_merchant_id'&&
   body.confirmation==='COMPROBAR COMERCIO LIVE'&&Object.keys(body).length===5&&
   Object.keys(body).every(k=>['action','confirmation','merchantId','clientId','clientSecret'].includes(k))&&
   MERCHANT.test(body.merchantId||'')&&KEY.test(body.clientId||'')&&KEY.test(body.clientSecret||'')
  if(!read&&!inspect&&!checkMerchant)return reply(req,400,'invalid_resource_request')
  const context=async()=>{
   const settings=await readAdminSettings({request:req,actorId:actor.id})
   const live=settings?.environments?.filter(x=>x?.environment==='live')
   if(settings?.active_environment!=='sandbox'||settings.live_checkout_enabled!==false||
    live?.length!==1||!PLAN.test(live[0].plan_id||'')||live[0].price_minor!==299||
    live[0].currency!=='USD'||live[0].interval_unit!=='MONTH'||
    live[0].return_origin!=='https://pazo-app.vercel.app')return null
   const reservation=await readReservation({actorId:actor.id,planId:live[0].plan_id})
   if(reservation?.planId!==live[0].plan_id||reservation.state!=='reserved'||
    reservation.environment!=='live'||reservation.mayCharge!==false||
    !liveWebhookUrlForGeneration(reservation.generation)||
    reservation.webhookId!==live[0].webhook_id)return null
   return reservation
  }
  let before
  try{before=await context()}catch{return reply(req,503,'resource_metadata_unavailable')}
  if(!before)return reply(req,409,'reserved_generation_required')
  if(read)return reply(req,200,'reserved_generation_read',{
   generation:before.generation,webhookId:before.webhookId,
   webhookUrl:liveWebhookUrlForGeneration(before.generation)})
  if(checkMerchant){
   if(!HOOK.test(before.webhookId||''))return reply(req,409,'stored_webhook_conflict')
   // The merchant ID is supplied inside PAZO under fresh admin MFA. It is NOT
   // treated as an immutable merchant binding and is NEVER stored here.
   const proposed=body.merchantId
   let evidence
   try{
    evidence=await readLivePaypalMerchantIdentity({environment:'live',
     clientId:body.clientId,clientSecret:body.clientSecret,planId:before.planId,
     webhookId:before.webhookId,merchantGeneration:before.generation,fetchImpl})
   }catch{evidence=null}
   body.merchantId='';body.clientId='';body.clientSecret=''
   if(evidence?.code!=='live_merchant_candidate_read'||
    evidence?.merchantIdentityVerified!==false||
    evidence?.planReadVerified!==true||evidence?.webhookReadVerified!==true||
    evidence?.webhookDeliveryVerified!==false||evidence?.mayCharge!==false||
    evidence?.mayActivate!==false)
    return reply(req,409,CODES.has(evidence?.code)?evidence.code:
     'live_merchant_identity_unavailable')
   // Compare against independently queried Live merchant account, without
   // returning raw ID, balance, expected hash or provider credentials.
   let expected
   try{
    const digest=await crypto.subtle.digest('SHA-256',
     new TextEncoder().encode('paypal:live:'+proposed))
    expected=Array.from(new Uint8Array(digest),
     b=>b.toString(16).padStart(2,'0')).join('')
   }catch{return reply(req,503,'live_merchant_identity_unavailable')}
   if(expected!==evidence.merchantFingerprint)
    return reply(req,409,'live_merchant_id_mismatch')
   let after
   try{after=await context()}catch{return reply(req,503,'resource_metadata_unavailable')}
   if(!after||after.generation!==before.generation||after.planId!==before.planId||
    after.webhookId!==before.webhookId)
    return reply(req,409,'generation_changed_during_inspection')
   return reply(req,200,'live_merchant_id_read_match',{
    generation:before.generation,merchantIdMatched:true,merchantBindingStored:false,
    planReadVerified:true,webhookReadVerified:true
   })
  }
  if(before.webhookId!==''&&before.webhookId!==body.webhookId)
   return reply(req,409,'stored_webhook_conflict')
  const result=await inspectLivePaypalResources({environment:'live',
   clientId:body.clientId,clientSecret:body.clientSecret,planId:before.planId,
   webhookId:body.webhookId,merchantGeneration:before.generation,fetchImpl})
  // Never persist, echo or log credentials or provider responses, including failures.
  body.clientId='';body.clientSecret=''
  if(result?.ok!==true||result.code!=='live_resources_read_verified'||
   result.planReadVerified!==true||result.webhookReadVerified!==true||
   result.mayCharge!==false||result.mayActivate!==false)
   return reply(req,409,CODES.has(result?.code)?result.code:'live_provider_unavailable',
    result?.code==='live_webhook_events_unexpected'&&result?.eventMismatch
     ?{eventMismatch:result.eventMismatch}:{})
  let after
  try{after=await context()}catch{return reply(req,503,'resource_metadata_unavailable')}
  if(!after||after.generation!==before.generation||after.planId!==before.planId||
   after.webhookId!==before.webhookId)return reply(req,409,'generation_changed_during_inspection')
  try{
   if(await recordResources({actorId:actor.id,merchantGeneration:before.generation,
    planId:before.planId,webhookId:body.webhookId})!==true)
    return reply(req,409,'resource_record_unconfirmed')
  }catch{return reply(req,503,'resource_record_unconfirmed')}
  return reply(req,200,'live_resource_configuration_recorded',{
   generation:before.generation,planReadVerified:true,webhookReadVerified:true})
 }
}
