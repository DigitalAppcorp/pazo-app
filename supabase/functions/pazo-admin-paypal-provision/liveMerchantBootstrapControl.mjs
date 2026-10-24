// PAZO F16 — Privileged, nonfinancial merchant generation reservation.
// CODE/CI ONLY; this handler is NOT wired into the deployed Edge index.
// Release requires explicit operator GO and an idempotent SQL recovery path.
// No PayPal credentials in body, provider writes, checkout, or benefits.
import {liveWebhookUrlForGeneration} from '../pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
// Supabase may present a routed/internal URL to Deno. Never trust its host
// as a way to identify the endpoint; the gateway owns routing, and this
// function only accepts two explicit paths for the SAME assigned slug.
const ENDPOINT_PATHS=new Set(['/functions/v1/pazo-admin-paypal-bootstrap',
 '/pazo-admin-paypal-bootstrap'])
function validEndpoint(request){
 if(!(request instanceof Request))return false
 try{
  const uri=new URL(request.url)
  return ['http:','https:'].includes(uri.protocol)&&
   ENDPOINT_PATHS.has(uri.pathname)&&!uri.search&&!uri.hash
 }catch{return false}
}
const PLAN=/^P-[A-Z0-9]{12,40}$/
const ORIGIN='https://pazo-app.vercel.app'
const REQUEST_KEYS=['action','confirmation']
const BROWSER_ORIGINS=new Set(['http://localhost:5173',
 'http://127.0.0.1:5173','https://pazo-app.vercel.app',
 'https://pazo-app-t83r.vercel.app'])
function cors(request){
 const origin=request?.headers?.get?.('origin')||''
 if(!BROWSER_ORIGINS.has(origin))return {'vary':'Origin'}
 return {'vary':'Origin','access-control-allow-origin':origin,
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,x-region,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version',
  'access-control-allow-methods':'POST, OPTIONS'}
}
// Only bounded stage labels are logged, never credentials, JWTs, payloads
// or exception messages. Diagnoses a rare failure without retrying payments.
const TRACE_CODES=new Set([
 'bootstrap_backend_unavailable',
 'live_configuration_unavailable','generation_outcome_needs_review'
])
const deny=(status,code,request)=>{
 if(status===503&&TRACE_CODES.has(code))
  console.warn('PAZO_F16_BOOTSTRAP_STAGE:'+code)
 return new Response(JSON.stringify({
  ok:false,code,environment:'live',mayCharge:false,liveActivated:false
 }),{status,headers:{'content-type':'application/json','cache-control':'no-store',
  ...cors(request)}})
}
export function createPazoLiveMerchantBootstrapControl({
 released=false,authenticateAdmin,readAdminSettings,reserveGeneration
}={}){
 return async request=>{
  if(released!==true)return deny(503,'merchant_bootstrap_not_released',request)
  if(request instanceof Request&&request.method==='OPTIONS'){
   if(!validEndpoint(request))return deny(400,'invalid_bootstrap_route',request)
   const origin=request.headers.get('origin')||''
   if(!BROWSER_ORIGINS.has(origin))return deny(403,'origin_not_allowed',request)
   if(request.headers.get('access-control-request-method')!=='POST')
    return deny(405,'invalid_preflight_method',request)
   return new Response(null,{status:204,headers:{'cache-control':'no-store',
    ...cors(request)}})
  }
  if(!validEndpoint(request)||request.method!=='POST'||
   (request.headers.has('origin')&&
    !BROWSER_ORIGINS.has(request.headers.get('origin')||''))||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
    request.headers.get('content-type')||'')||
   Number(request.headers.get('content-length'))>512)
   return deny(400,'invalid_bootstrap_request',request)
  if(typeof authenticateAdmin!=='function'||typeof readAdminSettings!=='function'||
   typeof reserveGeneration!=='function')return deny(503,'bootstrap_backend_unavailable',request)
  let body
  try{
   const raw=await request.text()
   if(raw.length>512)return deny(413,'bootstrap_request_too_large',request)
   body=JSON.parse(raw)
  }catch{return deny(400,'invalid_bootstrap_request',request)}
  if(!body||Array.isArray(body)||typeof body!=='object'||
   Object.keys(body).length!==2||
   Object.keys(body).some(k=>!REQUEST_KEYS.includes(k))||
   !((body.action==='reserve_generation'&&
      body.confirmation==='RESERVAR GENERACION LIVE')||
     (body.action==='check_readiness'&&
      body.confirmation==='VERIFICAR CONFIGURACION LIVE')))
   return deny(400,'invalid_bootstrap_request',request)
  let admin
  try{admin=await authenticateAdmin(request)}
  catch{return deny(403,'verified_admin_required',request)}
  if(admin?.isAdmin!==true||admin?.freshSession!==true||
   !/^[a-f0-9-]{36}$/i.test(admin?.id||''))
   return deny(403,'verified_admin_required',request)
  let settings
  try{settings=await readAdminSettings({request,actorId:admin.id})}
  catch{return deny(503,'live_configuration_unavailable',request)}
  if(settings?.active_environment!=='sandbox'||
   settings?.live_checkout_enabled!==false||!Array.isArray(settings.environments))
   return deny(409,'live_checkout_not_locked',request)
  const live=settings.environments.filter(x=>x?.environment==='live')
  if(live.length!==1||!PLAN.test(live[0].plan_id||'')||
   live[0].return_origin!==ORIGIN||live[0].price_minor!==299||
   live[0].currency!=='USD'||live[0].interval_unit!=='MONTH'||
   live[0].webhook_id!=='')
   return deny(409,'live_draft_not_ready',request)
  if(body.action==='check_readiness'){
   // Signed-in admin+recent MFA, exact stored plan and Live OFF verified.
   // No service-role RPC and absolutely no generation or provider writes.
   return new Response(JSON.stringify({
    ok:true,code:'live_configuration_readonly_verified',
    environment:'live',mayCharge:false,liveActivated:false,
    generationReserved:false,webhookConfigured:false
   }),{status:200,headers:{
    'content-type':'application/json','cache-control':'no-store',
    ...cors(request)
   }})
  }
  let reserved
  try{reserved=await reserveGeneration({
   actorId:admin.id,planId:live[0].plan_id
  })}catch{return deny(503,'generation_outcome_needs_review',request)}
  if(!Number.isSafeInteger(reserved?.generation)||
   reserved.generation<1||reserved.generation>9999||
   reserved.environment!=='live'||reserved.mayCharge!==false||
   reserved.planId!==live[0].plan_id)
   return deny(503,'generation_outcome_needs_review',request)
  const webhookUrl=liveWebhookUrlForGeneration(reserved.generation)
  if(!webhookUrl)return deny(503,'generation_outcome_needs_review',request)
  return new Response(JSON.stringify({
   ok:true,code:'live_generation_reserved',environment:'live',
   generation:reserved.generation,webhookUrl,
   webhookConfigured:false,credentialsProvisioned:false,
   mayCharge:false,liveActivated:false
  }),{status:202,headers:{
   'content-type':'application/json','cache-control':'no-store',...cors(request)
  }})
 }
}
