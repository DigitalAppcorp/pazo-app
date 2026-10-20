// PAZO F16: Browser-to-Edge Live checkout composition. NOT released or deployed.
// Checkout launch is rejected unless the SERVER-selected merchant is Live,
// stored signed-up terms are verified and the full private SQL path is available.
// No browser-provided plan, environment, merchant, origin or secret is trusted.
import {createPazoLiveVerifiedCheckout} from './liveCheckoutCandidate.mjs'
import {createPaypalLiveSubscriptionProvider,publicBetaOrigin}
 from './liveSubscriptionProvider.mjs'
import {createPazoLiveCheckoutSqlStores} from './liveSqlServiceAdapters.mjs'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const PLAN=/^P-[A-Z0-9]{12,40}$/
const LIMIT=12288
const reply=(status,code,extra={})=>new Response(
 JSON.stringify({code,environment:'live',...extra}),
 {status,headers:{'content-type':'application/json','cache-control':'no-store',
  'x-content-type-options':'nosniff'}}
)
export function createPazoLiveCheckoutHttpHandler({
 released=false,resolveAuthenticatedOwner,readActiveRoute,getSecret,
 rpc,admit,verifyConsent,publicOrigin,fetchImpl=fetch
}={}){
 return async function serve(request){
  if(released!==true)return reply(503,'live_checkout_not_released')
  if(!(request instanceof Request)||request.method!=='POST')
   return reply(405,'post_required')
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
   request.headers.get('content-type')||''))return reply(415,'json_required')
  if(typeof resolveAuthenticatedOwner!=='function'||
   typeof readActiveRoute!=='function'||typeof getSecret!=='function'||
   typeof rpc!=='function'||typeof admit!=='function'||
   typeof verifyConsent!=='function'||!publicBetaOrigin(publicOrigin))
   return reply(503,'live_backend_unavailable')
  let body
  try{
   const raw=await request.text()
   if(new TextEncoder().encode(raw).byteLength>LIMIT)throw Error('size')
   body=JSON.parse(raw)
  }catch{return reply(400,'invalid_request')}
  if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).sort().join(',')!=='action,consent'||
   body.action!=='subscribe'||!body.consent||
   typeof body.consent!=='object'||Array.isArray(body.consent)||
   Object.keys(body.consent).sort().join(',')!==
    'affirmativeConsent,locale,requestKey,termsDigest,termsVersion')
   return reply(400,'invalid_request')
  let ownerId
  try{ownerId=await resolveAuthenticatedOwner(request)}
  catch{return reply(401,'authentication_required')}
  if(!UUID.test(ownerId||''))return reply(401,'authentication_required')
  let valid
  try{valid=await verifyConsent({ownerId,consent:body.consent})}
  catch{return reply(503,'consent_verification_unavailable')}
  if(valid!==true)return reply(409,'published_terms_mismatch')
  let route
  try{route=await readActiveRoute()}catch{return reply(503,'live_route_unavailable')}
  if(route?.sourceEnvironment!=='live'||
   route?.credentialSource!=='edge_secrets'||
   !Number.isSafeInteger(route.merchantGeneration)||route.merchantGeneration<1||
   !PLAN.test(route.planId||''))
   return reply(503,'live_route_inactive')
  let clientId,clientSecret
  try{
   const prefix='PAZO_F16_LIVE_G'+route.merchantGeneration+'_'
   const enabled=await getSecret(prefix+'READ_ENABLED')
   clientId=await getSecret(prefix+'CLIENT_ID')
   clientSecret=await getSecret(prefix+'CLIENT_SECRET')
   const pinnedPlan=await getSecret(prefix+'PLAN_ID')
   if(enabled!=='1'||pinnedPlan!==route.planId)throw Error('key')
  }catch{return reply(503,'live_generation_unavailable')}
  let engine
  try{
   const provider=createPaypalLiveSubscriptionProvider({
    clientId,clientSecret,planId:route.planId,origin:publicOrigin,fetchImpl})
   const stores=createPazoLiveCheckoutSqlStores({rpc})
   engine=createPazoLiveVerifiedCheckout({
    releaseReady:true,planId:route.planId,
    merchantGeneration:route.merchantGeneration,
    resolveAuthenticatedOwner:async()=>ownerId,
    admit,consentStore:stores.consentStore,
    subscriptionProvider:provider,intentStore:stores.intentStore
   })
  }catch{return reply(503,'live_generation_unavailable')}
  let result
  try{result=await engine.begin({request,consent:body.consent})}
  catch{return reply(503,'live_checkout_unavailable')}
  if(result?.phase!=='APPROVAL_PENDING'||typeof result.approvalUrl!=='string')
   return reply(409,result?.reason||'live_checkout_requires_review')
  return reply(200,'paypal_approval_required',{
   phase:'APPROVAL_PENDING',approvalUrl:result.approvalUrl,entitlement:false
  })
 }
}
