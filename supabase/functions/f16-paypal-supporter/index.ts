// PAZO F16: consumer-facing Sandbox QA checkout, DEFAULT DENIED.
// Only one private allowlisted Supabase Auth owner can exercise test checkout.
// The QA gate is not legal approval for public or Live subscriptions.
import {createClient} from 'npm:@supabase/supabase-js@2.117.2'
import {createVerifiedAuthOwnerResolver}
 from '../f16-paypal-webhook/verifiedAuthOwner.mjs'
import {createF16IntentStore}
 from '../f16-paypal-webhook/intentStoreAdapter.mjs'
import {createPazoCheckoutConsentStore}
 from '../f16-paypal-webhook/p06CheckoutConsentStore.mjs'
import {createPaypalSandboxSubscriptionCreator}
 from '../f16-paypal-webhook/paypalSandboxSubscriptionCreate.mjs'
import {createPaypalSandboxSubscriptionReader}
 from '../f16-paypal-webhook/paypalSandboxTransactions.mjs'
import {createPazoSandboxVerifiedCheckout}
 from '../f16-paypal-webhook/p06SandboxVerifiedCheckout.mjs'
import {createPazoSandboxCancellationProvider}
 from '../f16-paypal-webhook/p06SandboxCancellationProvider.mjs'
import {createPazoSandboxCancellationHandler}
 from '../f16-paypal-webhook/p06SandboxCancellationHandler.mjs'
import {createF16GlobalAdmission}
 from '../f16-paypal-webhook/globalAdmissionAdapter.mjs'
import {isP06SandboxQaAuthorized}
 from './p06SandboxQaGate.mjs'

const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const reply=(status,code)=>new Response(JSON.stringify({
 ok:false,code,paidThrough:null,mayGrantBenefits:false,
}),{status,headers:{'content-type':'application/json',
 'cache-control':'no-store'}})
function validOrigin(value){
 if(typeof value!=='string')return false
 try{
  const url=new URL(value)
  return url.protocol==='https:'&&
   url.username===''&&url.password===''&&url.port===''&&
   url.pathname==='/'&&url.search===''&&url.hash===''&&
   url.origin===value
 }catch{return false}
}
function compose(){
 const env=Deno.env
 const get=(k:string)=>env.get(k)
 if(get('PAZO_F16_PAYPAL_ENV')!=='sandbox'||
  get('PAZO_F16_PAYPAL_PLAN_ID')!==PLAN||
  get('SUPABASE_URL')!==BASE||
  !validOrigin(get('PAZO_F16_APP_ORIGIN')))
  throw Error('supporter_server_release_not_configured')
 const origin=get('PAZO_F16_APP_ORIGIN')!
 const key=get('SUPABASE_SERVICE_ROLE_KEY')!
 const clientId=get('PAZO_F16_PAYPAL_CLIENT_ID')!
 const clientSecret=get('PAZO_F16_PAYPAL_CLIENT_SECRET')!
 const returnUrl=get('PAZO_F16_PAYPAL_RETURN_URL')!
 const cancelUrl=get('PAZO_F16_PAYPAL_CANCEL_URL')!
 if(new URL(returnUrl).origin!==origin||new URL(cancelUrl).origin!==origin)
  throw Error('consumer_redirect_origin_mismatch')
 const supabase=createClient(BASE,key,{auth:{
  autoRefreshToken:false,persistSession:false}})
 const resolveAuthenticatedOwner=createVerifiedAuthOwnerResolver({authClient:supabase})
 const store=createF16IntentStore({projectUrl:BASE,serviceRoleKey:key})
 const consentStore=createPazoCheckoutConsentStore({projectUrl:BASE,serviceRoleKey:key})
 const provider=createPaypalSandboxSubscriptionCreator({
  clientId,clientSecret,returnUrl,cancelUrl})
 const reader=createPaypalSandboxSubscriptionReader({clientId,clientSecret})
 const cancellation=createPazoSandboxCancellationProvider({clientId,clientSecret})
 const limiter=createF16GlobalAdmission({projectUrl:BASE,serviceRoleKey:key})
 const admit=()=>limiter.tryAdmit()
 const checkout=createPazoSandboxVerifiedCheckout({
  resolveAuthenticatedOwner,admit,consentStore,
  subscriptionCreator:provider,subscriptionReader:reader,intentStore:store,
 })
 const manage=createPazoSandboxCancellationHandler({
  resolveAuthenticatedOwner,admit,privateIntentStore:store,
  provider:cancellation,trustedOrigins:[origin],
 })
 return {origin,checkout,manage,consentStore,resolveAuthenticatedOwner,admit}
}
function addCors(response:Response,origin:string){
 const headers=new Headers(response.headers)
 headers.set('access-control-allow-origin',origin)
 headers.set('vary','Origin')
 headers.set('cache-control','no-store')
 return new Response(response.body,{status:response.status,headers})
}
// F16-P06 SAFE DEPLOY 2026-10-16: STATIC NO-GO, regardless of project secrets.
// Enabling QA requires a NEW source review and separate PO GO + redeploy.
const QA_CHECKOUT_RELEASE_APPROVED = false
Deno.serve(async(request:Request)=>{
 if(!QA_CHECKOUT_RELEASE_APPROVED ||
    Deno.env.get('PAZO_F16_P06_QA_ENABLE')!=='true')
  return reply(503,'paid_supporter_checkout_not_released')
 let runtime
 try{runtime=compose()}catch{return reply(503,'checkout_unavailable')}
 if(request.headers.get('origin')!==runtime.origin)
  return reply(403,'origin_not_allowed')
 if(request.method==='OPTIONS')return addCors(new Response(null,{status:204,
  headers:{'access-control-allow-methods':'POST, OPTIONS',
   'access-control-allow-headers':'authorization, apikey, content-type'}}),runtime.origin)
 if(request.method!=='POST')return addCors(reply(405,'method_not_allowed'),runtime.origin)
 let data
 try{
  const raw=await request.clone().text()
  if(raw.length>2048) return addCors(reply(413,'request_too_large'),runtime.origin)
  data=JSON.parse(raw)
 }catch{return addCors(reply(400,'invalid_request'),runtime.origin)}
 if(!data||typeof data!=='object'||Array.isArray(data)||
  typeof data.action!=='string')
  return addCors(reply(400,'invalid_request'),runtime.origin)
 // Always verify identity with Supabase Auth server. Never trust browser UID.
 let qaOwner: string | null = null
 try{qaOwner=await runtime.resolveAuthenticatedOwner(request)}catch{qaOwner=null}
 if(!isP06SandboxQaAuthorized({getEnv:(k:string)=>Deno.env.get(k),
      verifiedOwnerId:qaOwner}))
  return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
 if(data.action==='status'||data.action==='cancel')
  return addCors(await runtime.manage(request),runtime.origin)
 let result
 if(data.action==='offer'){
  if(Object.keys(data).sort().join('|')!=='action|locale')
   return addCors(reply(400,'invalid_request'),runtime.origin)
  try{
   if(!await runtime.resolveAuthenticatedOwner(request)||
      await runtime.admit()!==true)
    return addCors(reply(403,'not_authorized'),runtime.origin)
   const offer=await runtime.consentStore.readOffer({locale:data.locale})
   result=offer?{phase:'PUBLISHED_OFFER',offer,
     entitlement:false,paidThrough:null}:{phase:'OFFER_UNAVAILABLE'}
  }catch{return addCors(reply(503,'offer_unavailable'),runtime.origin)}
 }else if(data.action==='begin'){
  if(Object.keys(data).sort().join('|')!=='action|consent')
   return addCors(reply(400,'invalid_request'),runtime.origin)
  result=await runtime.checkout.begin({request,consent:data.consent})
 }else return addCors(reply(400,'invalid_request'),runtime.origin)
 return addCors(new Response(JSON.stringify(result),{
  status:result.phase==='APPROVAL_PENDING'||result.phase==='PUBLISHED_OFFER'?200:409,
  headers:{'content-type':'application/json','cache-control':'no-store'},
 }),runtime.origin)
})
