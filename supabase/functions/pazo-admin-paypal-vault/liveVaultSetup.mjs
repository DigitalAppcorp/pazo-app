// PAZO F16 — safe, single-entry Live credential preparation from Admin.
// Only after fresh GoTrue admin+TOTP and PayPal plan/webhook GET verification.
// Writes encrypted credentials via the existing authenticated Supabase Vault RPC.
// No charging, no activation, no generation finalization, no secrets in responses.
import {inspectLivePaypalResources} from '../pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
const PATHS=new Set(['/pazo-admin-paypal-vault','/functions/v1/pazo-admin-paypal-vault'])
const ORIGINS=new Set(['http://localhost:5173','http://127.0.0.1:5173',
 'https://pazo-app.vercel.app','https://pazo-app-t83r.vercel.app'])
const PLAN=/^P-[A-Z0-9]{12,40}$/
const HOOK=/^[A-Za-z0-9_-]{8,100}$/
const KEYID=/^[A-Za-z0-9_-]{20,256}$/
const KEYSECRET=/^[A-Za-z0-9_-]{20,512}$/
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const MAX=2048
const cors=req=>{
 const origin=req?.headers?.get?.('origin')||''
 return {'vary':'Origin',...(ORIGINS.has(origin)?{
  'access-control-allow-origin':origin,
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,x-region,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version',
  'access-control-allow-methods':'POST, OPTIONS'}:{})}
}
const reply=(req,status,code,extra={})=>new Response(JSON.stringify({
 ok:status===200,code,credentialsStored:false,liveActivated:false,
 mayCharge:false,merchantIdentityVerified:false,webhookDeliveryVerified:false,...extra
}),{status,headers:{...cors(req),'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}})
async function parse(req){
 const declared=req.headers.get('content-length')
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX))throw Error('size')
 const raw=await req.text()
 if(new TextEncoder().encode(raw).byteLength>MAX)throw Error('size')
 const parsed=JSON.parse(raw)
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('shape')
 return parsed
}
export function createPazoLiveVaultSetup({released=false,authenticateAdmin,
 readSettings,readReservation,reserveGeneration,
 verifyProvider=inspectLivePaypalResources,saveVault,readbackVault}={}){
 return async req=>{
  if(released!==true)return reply(req,503,'live_vault_setup_not_released')
  if(!(req instanceof Request))return reply(req,400,'invalid_setup_request')
  let url
  try{url=new URL(req.url)}catch{return reply(req,400,'invalid_setup_request')}
  if(!PATHS.has(url.pathname)||url.search||url.hash||
   !['http:','https:'].includes(url.protocol))
   return reply(req,400,'invalid_setup_request')
  const origin=req.headers.get('origin')
  if(origin!==null&&!ORIGINS.has(origin))return reply(req,403,'origin_not_allowed')
  if(req.method==='OPTIONS'){
   if(!origin||req.headers.get('access-control-request-method')!=='POST')
    return reply(req,400,'invalid_preflight')
   return new Response(null,{status:204,headers:{...cors(req),'cache-control':'no-store'}})
  }
  if(req.method!=='POST'||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
   req.headers.get('content-type')||''))
   return reply(req,400,'invalid_setup_request')
  if([authenticateAdmin,readSettings,readReservation,reserveGeneration,
   verifyProvider,saveVault,readbackVault].some(fn=>typeof fn!=='function'))
   return reply(req,503,'live_vault_setup_unavailable')
  let actor
  try{actor=await authenticateAdmin(req)}
  catch{return reply(req,403,'fresh_admin_mfa_required')}
  if(!UUID.test(actor?.id||'')||actor.isAdmin!==true||actor.freshSession!==true)
   return reply(req,403,'fresh_admin_mfa_required')
  let body
  try{body=await parse(req)}catch{return reply(req,400,'invalid_setup_request')}
  if(Object.keys(body).sort().join(',')!==
   'action,clientId,clientSecret,confirmation'||
   body.action!=='prepare_live_vault'||
   body.confirmation!=='PREPARAR CREDENCIALES LIVE'||
   !KEYID.test(body.clientId)||!KEYSECRET.test(body.clientSecret))
   return reply(req,400,'invalid_setup_request')
  let settings,reservation
  try{
   settings=await readSettings({request:req,actorId:actor.id})
   const live=settings?.environments?.filter(x=>x?.environment==='live')
   if(settings?.active_environment!=='sandbox'||
    settings.live_checkout_enabled!==false||live?.length!==1||
    !PLAN.test(live[0].plan_id||'')||!HOOK.test(live[0].webhook_id||'')||
    live[0].price_minor!==299||live[0].currency!=='USD'||
    live[0].interval_unit!=='MONTH'||
    live[0].return_origin!=='https://pazo-app.vercel.app')
    return reply(req,409,'live_draft_unavailable')
   reservation=await readReservation({actorId:actor.id,planId:live[0].plan_id})
   if(reservation===null){
    // A single owner-signed credential submission may create the first
    // immutable nonfinancial metadata reservation automatically.
    // Existing SQL makes this one operation idempotent per original plan.
    // On uncertain outcome, NEVER retry the write: read under same actor/plan
    // and proceed only if a real existing reservation is returned.
    try{await reserveGeneration({actorId:actor.id,planId:live[0].plan_id})}
    catch{/* Recover from the same owner-scoped reservation, never guess. */}
    try{reservation=await readReservation({actorId:actor.id,planId:live[0].plan_id})}
    catch{return reply(req,503,'generation_outcome_needs_review')}
    if(reservation===null)return reply(req,503,'generation_outcome_needs_review')
   }
   if(reservation?.environment!=='live'||reservation?.state!=='reserved'||
    reservation.planId!==live[0].plan_id||
    reservation.webhookId!==live[0].webhook_id||
    reservation.mayCharge!==false||
    !Number.isSafeInteger(reservation.generation)||reservation.generation<1)
    return reply(req,409,'original_generation_unavailable')
  }catch{return reply(req,503,'live_setup_metadata_unavailable')}
  const id=body.clientId,secret=body.clientSecret
  body.clientId='';body.clientSecret=''
  let provider
  try{provider=await verifyProvider({environment:'live',clientId:id,
    clientSecret:secret,planId:reservation.planId,webhookId:reservation.webhookId,
    merchantGeneration:reservation.generation})}
  catch{return reply(req,409,'live_provider_verification_unavailable')}
  if(provider?.ok!==true||provider.planReadVerified!==true||
   provider.webhookReadVerified!==true||provider.mayCharge!==false||
   provider.mayActivate!==false)
   return reply(req,409,'live_provider_verification_unavailable')
  // Re-read metadata to avoid saving under a stale/changed plan, webhook or generation.
  let after
  try{
   after=await readReservation({actorId:actor.id,planId:reservation.planId})
   if(!after||after.generation!==reservation.generation||
    after.planId!==reservation.planId||after.webhookId!==reservation.webhookId||
    after.state!=='reserved')return reply(req,409,'generation_changed')
   const updated=await readSettings({request:req,actorId:actor.id})
   const latest=updated?.environments?.filter(x=>x.environment==='live')
   if(updated?.live_checkout_enabled!==false||latest?.length!==1||
    latest[0].plan_id!==reservation.planId||
    latest[0].webhook_id!==reservation.webhookId)
    return reply(req,409,'generation_changed')
  }catch{return reply(req,503,'live_setup_metadata_unavailable')}
  try{
   const saved=await saveVault({request:req,actorId:actor.id,clientId:id,clientSecret:secret,
    merchantGeneration:reservation.generation,planId:reservation.planId,
    webhookId:reservation.webhookId})
   if(saved!==true)return reply(req,503,'credential_save_outcome_needs_review')
   const confirmed=await readbackVault({request:req,actorId:actor.id,
    merchantGeneration:reservation.generation,
    planId:reservation.planId,webhookId:reservation.webhookId})
   if(confirmed!==true)return reply(req,503,'credential_save_outcome_needs_review')
  }catch{return reply(req,503,'credential_save_outcome_needs_review')}
  return reply(req,200,'live_vault_credentials_prepared',{
   generation:reservation.generation,credentialsStored:true,mayCharge:false})
 }
}
