// PAZO F16 — Controlled hosted checkout. Default closed; SQL admits each owner.
// All identity, merchant selection, consent and admission come from the server.
// No browser-supplied environment, plan, price, secret, or owner is trusted.
import {createPazoLiveCheckoutHttpHandler} from './liveCheckoutHttpHandler.mjs'
import {createPazoLiveGoTrueOwnerResolver} from './liveGoTrueOwner.mjs'
import {createPazoLiveServiceRpc} from './liveSqlServiceAdapters.mjs'
import {publicBetaOrigin} from './liveSubscriptionProvider.mjs'
import {createPazoLiveVaultGenerationSecretReader} from '../pazo-paypal-live-webhook/liveVaultGenerationSecrets.mjs'
import {getPazoLiveOffer,verifyPazoLiveOfferConsent} from './liveOfferRegistry.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const forbidden=(status,code)=>new Response(JSON.stringify({code}),{
 status,headers:{'content-type':'application/json','cache-control':'no-store'}
})
export function createPazoLiveHostedCheckout({
 released=false,getEnv=()=>undefined,fetchImpl=fetch
}={}){
 if(released!==true)return createPazoLiveCheckoutHttpHandler({released:false})
 let api,anon,service
 try{
  api=getEnv('SUPABASE_URL');anon=getEnv('SUPABASE_ANON_KEY')
  service=getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if(api!==PROJECT)throw Error('config')
 }catch{return createPazoLiveCheckoutHttpHandler({released:false})}
 let rpc,resolveAuthenticatedOwner,readGenerationCredentials
 try{
  rpc=createPazoLiveServiceRpc({projectUrl:api,serviceRoleKey:service,fetchImpl})
  resolveAuthenticatedOwner=createPazoLiveGoTrueOwnerResolver({
   supabaseUrl:api,anonKey:anon,fetchImpl,allowReadinessGet:true
  })
  readGenerationCredentials=createPazoLiveVaultGenerationSecretReader({
   supabaseUrl:api,serviceRoleKey:service,fetchImpl
  })
 }catch{return createPazoLiveCheckoutHttpHandler({released:false})}
 const readActiveRoute=async()=>rpc('route',{})
 const getSecret=name=>getEnv(name)
 const verifyConsent=async({consent})=>verifyPazoLiveOfferConsent(consent)
 const admit=async({ownerId,action,merchantGeneration})=>{
  if(action!=='live_checkout'||!UUID.test(ownerId||''))return false
  if(await rpc('releaseAdmit',{p_owner:ownerId,p_generation:merchantGeneration})!==true)return false
  // Fail-closed profile lookup after GoTrue JWT verification.
  // Account is allowed only after explicit onboarding completion.
  let response
  try{
   response=await fetchImpl(PROJECT+'/rest/v1/profiles?select=id,onboarding_completed&id=eq.'+
    encodeURIComponent(ownerId),{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
    headers:{apikey:service,Authorization:'Bearer '+service,
     Accept:'application/json'}
   })
  }catch{return false}
  if(!response?.ok||response.status!==200)return false
  let rows
  try{rows=await response.json()}catch{return false}
  return Array.isArray(rows)&&rows.length===1&&
   rows[0]?.id===ownerId&&rows[0]?.onboarding_completed===true
 }
 return async req=>{
  if(!(req instanceof Request))return forbidden(400,'invalid_request')
  try{
   if(await rpc('releaseRuntime',{p_component:'checkout',p_build:'pazo_live_checkout_controlled_v1'})!==true)
    return forbidden(503,'live_release_unverified')
  }catch{return forbidden(503,'live_release_unverified')}
  let pinned
  try{pinned=await readActiveRoute()}
  catch{return forbidden(503,'live_route_unavailable')}
  if(!pinned||!publicBetaOrigin(pinned.returnOrigin))
   return forbidden(503,'live_route_inactive')
  const origin=pinned.returnOrigin
  const caller=req.headers.get('origin')||''
  // Trust only the two real PAZO origins; never an arbitrary .vercel.app
  // preview. A CORS preflight merely allows the browser to READ our reason:
  // it never admits a checkout when the certified merchant origin differs.
  const canonical='https://pazo-app.vercel.app'
  const known=caller===origin||caller===canonical
  const cors=known?{
   'access-control-allow-origin':caller,'access-control-allow-methods':'GET, POST, OPTIONS',
   'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
   vary:'Origin'}:{}
  if(req.method==='OPTIONS')return known?
   new Response(null,{status:204,headers:cors}):
   forbidden(403,'untrusted_origin')
  if(!known)return forbidden(403,'untrusted_origin')
  if(caller!==origin)return new Response(JSON.stringify({
   code:'live_origin_migration_required',ready:false,mayCharge:false
  }),{status:409,headers:{...cors,'content-type':'application/json',
   'cache-control':'no-store','x-content-type-options':'nosniff'}})
  // A valid merchant is not sufficient if the signed-event reconciler is
  // stopped. A new subscription must not begin without fresh worker health.
  // This is also the only public read-only readiness signal for the UI:
  // no token, merchant, internal build, or paid status is disclosed.
  let worker
  try{worker=await rpc('workerHealth',{})}
  catch{return forbidden(503,'live_processing_unavailable')}
  if(worker?.source!=='private_live_worker_health'||
     worker.enabled!==true||worker.processingAllowed!==true||
     worker.healthy!==true)
   return forbidden(503,'live_processing_unavailable')
  // Do not create a subscription when the DEPLOYED intake is still OFF or
  // unreachable. This read-only probe does not replace a genuine signature.
  try{
   const probe=await fetchImpl(PROJECT+'/functions/v1/pazo-paypal-live-webhook',{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
    headers:{apikey:anon,Accept:'application/json'}
   })
   if(!probe?.ok||probe.status!==200)throw Error('intake')
   const status=await probe.json()
   if(status?.source!=='pazo_live_webhook_readiness_v1'||status.ready!==true||status.mayGrantBenefits!==false)
    throw Error('intake')
  }catch{return forbidden(503,'live_ingestion_unavailable')}
  if(req.method==='GET'){
   if(['canary','limited','public'].includes(pinned.releaseMode)){
    let ownerId,allowed=false
    try{
     ownerId=await resolveAuthenticatedOwner(req)
     if(!UUID.test(ownerId||''))return forbidden(401,'authentication_required')
     allowed=await admit({ownerId,action:'live_checkout',merchantGeneration:pinned.merchantGeneration})
    }catch{return forbidden(503,'checkout_admission_unavailable')}
    if(!allowed)return forbidden(403,'checkout_admission_denied')
   }else if(pinned.releaseMode!=='public')return forbidden(503,'live_route_inactive')
   let route
   try{route=new URL(req.url)}catch{return forbidden(400,'invalid_request')}
   const locale=route.searchParams.get('locale')
   if(route.searchParams.size!==1||!['es','en'].includes(locale))
    return forbidden(400,'invalid_offer_locale')
   const offer=getPazoLiveOffer(locale)
   if(!offer)return forbidden(503,'offer_unavailable')
   return new Response(JSON.stringify({
    code:'live_checkout_ready',ready:true,mayGrantBenefits:false,offer
   }),{status:200,headers:{'content-type':'application/json',
    'cache-control':'no-store','x-content-type-options':'nosniff',...cors}})
  }
  // Origin and merchant are pinned to the same DB revision per request.
  const serve=createPazoLiveCheckoutHttpHandler({
   released:true,resolveAuthenticatedOwner,readActiveRoute:async()=>pinned,
   getSecret,readGenerationCredentials,rpc,
   admit:args=>admit({...args,merchantGeneration:pinned.merchantGeneration}),
   verifyConsent,publicOrigin:origin,fetchImpl
  })
  const response=await serve(req)
  const headers=new Headers(response.headers)
  for(const [name,value] of Object.entries(cors))headers.set(name,value)
  return new Response(response.body,{status:response.status,headers})
 }
}
