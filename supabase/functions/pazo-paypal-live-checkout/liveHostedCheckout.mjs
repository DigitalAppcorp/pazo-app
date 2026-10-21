// PAZO F16 — Hosted Live checkout composition. RELEASE LATCH remains OFF.
// All identity, merchant selection, consent and admission come from the server.
// No browser-supplied environment, plan, price, secret, or owner is trusted.
import {createPazoLiveCheckoutHttpHandler} from './liveCheckoutHttpHandler.mjs'
import {createPazoLiveGoTrueOwnerResolver} from './liveGoTrueOwner.mjs'
import {createPazoLiveServiceRpc} from './liveSqlServiceAdapters.mjs'
import {publicBetaOrigin} from './liveSubscriptionProvider.mjs'
import {createPazoLiveVaultGenerationSecretReader} from '../pazo-paypal-live-webhook/liveVaultGenerationSecrets.mjs'
import {verifyPazoLiveOfferConsent} from './liveOfferRegistry.mjs'
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
   supabaseUrl:api,anonKey:anon,fetchImpl
  })
  readGenerationCredentials=createPazoLiveVaultGenerationSecretReader({
   supabaseUrl:api,serviceRoleKey:service,fetchImpl
  })
 }catch{return createPazoLiveCheckoutHttpHandler({released:false})}
 const readActiveRoute=async()=>rpc('route',{})
 const getSecret=name=>getEnv(name)
 const verifyConsent=async({consent})=>verifyPazoLiveOfferConsent(consent)
 const admit=async({ownerId,action,requestKey,merchantGeneration})=>{
  if(action!=='live_checkout'||!UUID.test(ownerId||'')||
   !UUID.test(requestKey||'')||!Number.isSafeInteger(merchantGeneration)||
   merchantGeneration<1||merchantGeneration>9999)return false
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
  if(!Array.isArray(rows)||rows.length!==1||rows[0]?.id!==ownerId||
   rows[0]?.onboarding_completed!==true)return false
  // A previous CREATE may have succeeded even when our response failed.
  // Never start a second subscription for another requestKey or merchant.
  // The database also serializes owner inserts against concurrent tabs.
  let slot
  try{slot=await rpc('ownerSlot',{p_owner:ownerId,p_generation:merchantGeneration})}
  catch{return false}
  if(slot?.state==='none')return true
  if(slot?.state==='pending_unclaimed'&&
   slot.requestKey===requestKey&&slot.merchantGeneration===merchantGeneration)
   return true
  return false
 }
 return async req=>{
  if(!(req instanceof Request))return forbidden(400,'invalid_request')
  let pinned
  try{pinned=await readActiveRoute()}
  catch{return forbidden(503,'live_route_unavailable')}
  if(!pinned||!publicBetaOrigin(pinned.returnOrigin))
   return forbidden(503,'live_route_inactive')
  const origin=pinned.returnOrigin
  const caller=req.headers.get('origin')||''
  const cors=caller===origin?{
   'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS',
   'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
   vary:'Origin'}:{}
  if(req.method==='OPTIONS')return caller===origin?
   new Response(null,{status:204,headers:cors}):
   forbidden(403,'untrusted_origin')
  if(caller!==origin)return forbidden(403,'untrusted_origin')
  // Origin and merchant are pinned to the same DB revision per request.
  const serve=createPazoLiveCheckoutHttpHandler({
   released:true,resolveAuthenticatedOwner,readActiveRoute:async()=>pinned,
   getSecret,readGenerationCredentials,rpc,admit,verifyConsent,publicOrigin:origin,fetchImpl
  })
  const response=await serve(req)
  const headers=new Headers(response.headers)
  for(const [name,value] of Object.entries(cors))headers.set(name,value)
  return new Response(response.body,{status:response.status,headers})
 }
}
