import {maintenanceAllowsNewCheckout,requiresMaintenanceCheckoutAdmission} from '../_shared/maintenanceCheckoutGate.mjs'
// PAZO F16: ISOLATED Sandbox V2-ONLY checkout and account management.
// This Edge slug is NOT the legacy production or P06 endpoint. Requires
// authenticated Auth owner; local Sandbox checkout auto-enrols on consent.
// Nonlocal preview retains exact private QA allowlist + preview origin.
// Sandbox-only Local Vite allows confirmed Auth owners; global rate limit and
// one-shot original V2 intent remain server/database enforced.
// The QA gate is not legal approval for public or Live subscriptions.
import {createClient} from 'npm:@supabase/supabase-js@2.117.2'
import {createVerifiedAuthOwnerResolver}
 from '../f16-paypal-webhook/verifiedAuthOwner.mjs'
import {createF16IntentStore}
 from '../f16-paypal-webhook/intentStoreAdapter.mjs'
import {createPazoCheckoutConsentStore}
 from '../f16-paypal-webhook/p06CheckoutConsentStore.mjs'
import {createPazoSandboxV2RetryConsentStore}
 from '../f16-paypal-webhook/pazoSandboxV2RetryConsentStore.mjs'
import {createPaypalSandboxSubscriptionCreator}
 from '../f16-paypal-webhook/paypalSandboxSubscriptionCreate.mjs'
import {createPaypalSandboxSubscriptionReader}
 from '../f16-paypal-webhook/paypalSandboxTransactions.mjs'
import {createPazoSandboxVerifiedCheckout}
 from '../f16-paypal-webhook/p06SandboxVerifiedCheckout.mjs'
import {createPazoSandboxCancellationProvider}
 from '../f16-paypal-webhook/p06SandboxCancellationProvider.mjs'
import {createPazoSandboxSupporterAccountHandler}
 from '../f16-paypal-webhook/p14SandboxSupporterAccountHandler.mjs'
import {createPazoSandboxV2MultiAccountStore}
 from '../f16-paypal-webhook/pazoSandboxV2MultiAccountStore.mjs'
import {createPazoSandboxV2ProofStore}
 from '../f16-paypal-webhook/pazoSandboxV2ProofStore.mjs'
import {createPazoSandboxV2MerchantVerifier}
 from '../f16-paypal-webhook/pazoSandboxV2MerchantVerify.mjs'
import {createPazoSandboxV2InventoryRead}
 from '../f16-paypal-webhook/pazoSandboxV2InventoryRead.mjs'
import {createPazoSandboxV2UnfilteredInventoryRead}
 from '../f16-paypal-webhook/pazoSandboxV2UnfilteredInventoryRead.mjs'
import {createPazoSandboxV2CreatedEventCandidateStore}
 from '../f16-paypal-webhook/pazoSandboxV2CreatedEventCandidateStore.mjs'
import {createPazoSandboxV2CreatedEventAudit}
 from '../f16-paypal-webhook/pazoSandboxV2CreatedEventAudit.mjs'
import {createPazoSandboxV2RetryMerchantProof}
 from '../f16-paypal-webhook/pazoSandboxV2RetryMerchantProof.mjs'
import {createF16GlobalAdmission}
 from '../f16-paypal-webhook/globalAdmissionAdapter.mjs'

const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const QA_ORIGIN='https://pazo-app-t83r-git-f13-section-titles-20261012-digitalapp.vercel.app'
// Local Vite execution of REAL PAZO for same-owner Sandbox end-to-end,
// while Vercel deployment is quota-limited. No arbitrary HTTP origins.
const QA_LOCAL_ORIGINS=new Set(['http://localhost:5173','http://127.0.0.1:5173'])
const QA_BROWSER_ORIGINS=new Set([QA_ORIGIN,...QA_LOCAL_ORIGINS])
const PLAN='P-14V25407JP6850922NLHMDKI'
// Old P06 buyer offer explicitly said no perks. Never sell benefit QA using it.
const SANDBOX_BENEFITS_OFFER_V2='pazo-supporter-sandbox.benefits-v2'
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
// This checkout uses isolated QA-only redirect secrets.
// Do not overwrite the existing project-wide PAZO_F16_APP_ORIGIN;
// other released Edge Functions may depend on that value.
function compose(requestOrigin:string){
 const env=Deno.env
 const get=(k:string)=>env.get(k)
 if(get('PAZO_F16_PAYPAL_ENV')!=='sandbox'||
  get('PAZO_F16_PAYPAL_PLAN_ID')!==PLAN||
  get('SUPABASE_URL')!==BASE||
  !validOrigin(QA_ORIGIN)||!QA_BROWSER_ORIGINS.has(requestOrigin))
  throw Error('supporter_server_release_not_configured')
 const origin=requestOrigin
 const key=get('SUPABASE_SERVICE_ROLE_KEY')!
 const clientId=get('PAZO_F16_PAYPAL_CLIENT_ID')!
 const clientSecret=get('PAZO_F16_PAYPAL_CLIENT_SECRET')!
 // Preserve the subscription context across provider navigation.
 // Neither callback constitutes a verified charge; entitlement remains
 // server-authoritative and is checked on the supporter screen.
 const returnUrl=QA_ORIGIN+'/paypal/return'
 const cancelUrl=QA_ORIGIN+'/paypal/cancel'
 if(new URL(returnUrl).origin!==QA_ORIGIN||new URL(cancelUrl).origin!==QA_ORIGIN)
  throw Error('consumer_redirect_origin_mismatch')
 const supabase=createClient(BASE,key,{auth:{
  autoRefreshToken:false,persistSession:false}})
 const resolveAuthenticatedOwner=createVerifiedAuthOwnerResolver({authClient:supabase})
 const store=createF16IntentStore({projectUrl:BASE,serviceRoleKey:key})
 const consentStore=createPazoCheckoutConsentStore({projectUrl:BASE,serviceRoleKey:key,qaV2:true})
 const retryConsentStore=createPazoSandboxV2RetryConsentStore({
  projectUrl:BASE,serviceRoleKey:key,offerStore:consentStore})
 const provider=createPaypalSandboxSubscriptionCreator({
  clientId,clientSecret,returnUrl,cancelUrl})
 const reader=createPaypalSandboxSubscriptionReader({clientId,clientSecret})
 const cancellation=createPazoSandboxCancellationProvider({clientId,clientSecret})
 const v2AccountStore=createPazoSandboxV2MultiAccountStore({projectUrl:BASE,serviceRoleKey:key})
 const v2ProofStore=createPazoSandboxV2ProofStore({projectUrl:BASE,serviceRoleKey:key})
 const canBuy=async(ownerId:string)=>{
  const r=await fetch(BASE+'/rest/v1/rpc/f16_qa_v2_owner_can_checkout',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
   headers:{apikey:key,Authorization:'Bearer '+key,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify({p_owner_id:ownerId})
  })
  if(!r.ok)return false
  return (await r.json())===true
 }
 // A previously unregistered, confirmed PAZO owner enters QA only after an
 // explicit local Sandbox checkout consent. No browser-provided owner ID.
 // This RPC is service_role-only, and keeps disabled/historical rows unchanged.
 const autoAdmitLocalOwner=async(ownerId:string)=>{
  if(!QA_LOCAL_ORIGINS.has(origin)||!/^([0-9a-f]{8}-){1}[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId))
   return false
  try{
   const r=await fetch(BASE+'/rest/v1/rpc/f16_qa_v2_auto_admit_local_sandbox_owner',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{apikey:key,Authorization:'Bearer '+key,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_owner_id:ownerId})
   })
   return r.ok&&(await r.json())===true
  }catch{return false}
 }
 // SQL-only necessary condition; never decides whether PayPal is cancelled.
 const canAbandonPending=async(ownerId:string,intentId:string)=>{
  try{
   const r=await fetch(BASE+'/rest/v1/rpc/f16_qa_v2_abandonment_preflight',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{apikey:key,Authorization:'Bearer '+key,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_owner_id:ownerId,p_intent_id:intentId})
   })
   return r.ok&&(await r.json())===true
  }catch{return false}
 }
 // Owner-only, Sandbox-local diagnostic reset: archives the old, unapproved
 // checkout in PAZO after two fresh merchant reads and signed CREATED proof.
 // It NEVER mutates/cancels PayPal, grants benefits, or represents a payment.
 const archiveUnapprovedLocalQa=async({ownerId,intentId,subscriptionId,checkedAt}:{
  ownerId:string;intentId:string;subscriptionId:string;checkedAt:string
 })=>{
  try{
   const r=await fetch(BASE+'/rest/v1/rpc/f16_qa_v2_archive_pending_approval_qa',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{apikey:key,Authorization:'Bearer '+key,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
     p_owner_id:ownerId,p_intent_id:intentId,
     p_subscription_id:subscriptionId,p_provider_checked_at:checkedAt
    })
   })
   return r.ok&&(await r.json())===true
  }catch{return false}
 }
 const inventoryRead=createPazoSandboxV2InventoryRead({clientId,clientSecret})
 const unfilteredInventoryRead=createPazoSandboxV2UnfilteredInventoryRead({clientId,clientSecret})
 const createdCandidateStore=createPazoSandboxV2CreatedEventCandidateStore({
  projectUrl:BASE,serviceRoleKey:key})
 const createdEventAudit=createPazoSandboxV2CreatedEventAudit({clientId,clientSecret})
 const retryMerchantProof=createPazoSandboxV2RetryMerchantProof({
  clientId,clientSecret,inventoryRead,createdCandidateStore,createdEventAudit})
 const merchantVerifier=createPazoSandboxV2MerchantVerifier({
  clientId,clientSecret,commitVerified:v2ProofStore.commitVerified,
  markReversal:v2ProofStore.markReversal})
 const limiter=createF16GlobalAdmission({projectUrl:BASE,serviceRoleKey:key})
 const admit=()=>limiter.tryAdmit()
 const checkout=createPazoSandboxVerifiedCheckout({
  resolveAuthenticatedOwner,admit,consentStore,
  subscriptionCreator:provider,subscriptionReader:reader,intentStore:store,
 })
 // PREPARED ONLY: requires a reconciled merchant grant + SQL migration +
 // owner account/read path. Hard disabled independently of Sandbox checkout.
 const retryCheckout=createPazoSandboxVerifiedCheckout({
  resolveAuthenticatedOwner,admit,consentStore:retryConsentStore,
  subscriptionCreator:provider,subscriptionReader:reader,intentStore:store,
 })
 const manage=createPazoSandboxSupporterAccountHandler({
  resolveAuthenticatedOwner,admit,privateIntentStore:v2AccountStore,
  provider:cancellation,consentStore:v2AccountStore,trustedOrigins:[origin],
  allowLoopbackQa:QA_LOCAL_ORIGINS.has(origin),
 })
 return {origin,checkout,retryCheckout,retryConsentStore,manage,consentStore,v2AccountStore,merchantVerifier,inventoryRead,unfilteredInventoryRead,createdCandidateStore,createdEventAudit,reader,cancellation,canAbandonPending,archiveUnapprovedLocalQa,retryMerchantProof,resolveAuthenticatedOwner,admit,canBuy,autoAdmitLocalOwner}
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
const QA_CHECKOUT_RELEASE_APPROVED = true
// Cancel/receipt/status must remain possible after the purchase gate closes.
// This second release gate also starts OFF and requires a reviewed QA deploy.
const QA_V2_MANAGEMENT_RELEASE_APPROVED = true
// F16 Sandbox QA retry only: explicit PO go, merchant grants still ZERO.
// 404 alone never authorizes a new PayPal subscription. Private evidence grant,
// owner allowlist and a fresh consent remain mandatory before any POST.
const QA_V2_RETRY_RELEASE_APPROVED = true
// Separate read-only CREATED event correlation gate. The matching private
// SQL RPC has NOT been installed or authorized; keep this OFF on deployment.
const QA_V2_CREATED_WEBHOOK_AUDIT_RELEASE_APPROVED = true
Deno.serve(async(request:Request)=>{
 if(!QA_CHECKOUT_RELEASE_APPROVED && !QA_V2_MANAGEMENT_RELEASE_APPROVED)
  return reply(503,'sandbox_qa_features_not_released')
 let runtime
 const incomingOrigin=request.headers.get('origin')
 if(!incomingOrigin||!QA_BROWSER_ORIGINS.has(incomingOrigin))
  return reply(403,'sandbox_qa_origin_required')
 try{runtime=compose(incomingOrigin)}catch{return reply(503,'checkout_unavailable')}
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
 if(!qaOwner)
  return addCors(reply(401,'authentication_required'),runtime.origin)
 if(requiresMaintenanceCheckoutAdmission(data.action)&&!await maintenanceAllowsNewCheckout({
  projectUrl:BASE,serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 }))return addCors(reply(503,'application_maintenance'),runtime.origin)
 // A buyer may explicitly close the ORIGINAL pending approval; no retry
 // grant is issued and no fresh PayPal create/charge is attempted. The merchant
 // must GET-verify APPROVAL_PENDING before POST and CANCELLED afterwards.
 if(data.action==='abandon_pending'){
  if(!QA_V2_MANAGEMENT_RELEASE_APPROVED)
   return addCors(reply(503,'qa_v2_management_not_released'),runtime.origin)
  if(Object.keys(data).sort().join('|')!=='action|confirmAbandon|intentId'||
    data.confirmAbandon!==true||
    typeof data.intentId!=='string'||
    !/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.intentId))
   return addCors(reply(400,'explicit_pending_cancel_consent_required'),runtime.origin)
  if(!QA_CHECKOUT_RELEASE_APPROVED||!await runtime.canBuy(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
  try{
   if(await runtime.admit()!==true)
    return addCors(reply(429,'rate_limited'),runtime.origin)
   // No fresh charge or user-level mutation if owner/ledger preflight fails.
   if(!await runtime.canAbandonPending(qaOwner,data.intentId))
    return addCors(reply(409,'pending_cancellation_preflight_blocked'),runtime.origin)
   const account=await runtime.v2AccountStore.readForOwner({
    ownerId:qaOwner,intentId:data.intentId})
   if(!account||account.state!=='bound'||!account.externalSubscriptionId||
      account.planId!==PLAN||account.intentId!==data.intentId)
    return addCors(reply(409,'private_account_read_unavailable'),runtime.origin)
   const state=await runtime.cancellation.cancelPending({
    intentId:account.intentId,subscriptionId:account.externalSubscriptionId})
   if(state.status!=='CANCELLED')
    return addCors(reply(503,'pending_cancellation_confirmation_missing'),runtime.origin)
   return addCors(new Response(JSON.stringify({
    ok:true,code:'pending_approval_cancelled',
    environment:'sandbox',providerStatus:'CANCELLED',cancelled:true,
    retryEligible:false,mayRetry:false,mayRecordPayment:false,
    mayGrantBenefits:false,entitlement:false,paidThrough:null
   }),{status:200,headers:{'content-type':'application/json',
    'cache-control':'no-store'}}),runtime.origin)
  }catch{
   // Provider 404, rejected/ambiguous status, timeout and missing merchant
   // evidence all fail closed. Neither grant nor paid state may be fabricated.
   return addCors(reply(503,'pending_cancellation_confirmation_missing'),runtime.origin)
  }
 }
 // Existing V2 subscription management must work even when buying is OFF.
 // Each account lookup is scoped to getUser() + a V2 acceptance row; no
 // legacy P06 subscription can be cancelled through these routes.
 // Nothing below may execute retry RPCs or create a subscription while OFF.
 if(data.action==='retry_status'||data.action==='retry_begin'){
  if(!QA_V2_RETRY_RELEASE_APPROVED)
   return addCors(reply(503,'sandbox_retry_not_released'),runtime.origin)
  if(!QA_CHECKOUT_RELEASE_APPROVED||!await runtime.canBuy(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
  if(data.action==='retry_status'){
   if(Object.keys(data).sort().join('|')!=='action')
    return addCors(reply(400,'invalid_request'),runtime.origin)
   try{
    if(await runtime.admit()!==true)
     return addCors(reply(429,'rate_limited'),runtime.origin)
    const eligible=await runtime.retryConsentStore.isEligible({ownerId:qaOwner})
    return addCors(new Response(JSON.stringify({ok:true,environment:'sandbox',eligible,
     entitlement:false,mayRecordPayment:false,mayGrantBenefits:false,paidThrough:null}),
     {status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}),runtime.origin)
   }catch{return addCors(reply(503,'retry_eligibility_unavailable'),runtime.origin)}
  }
  if(Object.keys(data).sort().join('|')!=='action|consent'||
     data.consent?.termsVersion!==SANDBOX_BENEFITS_OFFER_V2)
   return addCors(reply(400,'new_four_benefit_sandbox_terms_required'),runtime.origin)
  // Recheck the *same* predecessor against PayPal immediately before a
  // new merchant POST. An old 404/terminal proof cannot be replayed after
  // PayPal starts showing an approved, active, or collectible subscription.
  try{
   const source=await runtime.v2AccountStore.readForOwner({ownerId:qaOwner})
   if(!source||source.state!=='bound'||!source.externalSubscriptionId||
     source.planId!==PLAN)
    return addCors(reply(409,'retry_predecessor_unverified'),runtime.origin)
   const activeGrant=await runtime.retryConsentStore.isEligible({ownerId:qaOwner})
   if(activeGrant!==true)
    return addCors(reply(409,'retry_proof_not_accepted'),runtime.origin)
   await runtime.retryMerchantProof.verify({
    ownerId:qaOwner,intentId:source.intentId,
    subscriptionId:source.externalSubscriptionId,
    consentedAt:source.consentedAt})
  }catch{
   return addCors(reply(409,'retry_merchant_reconciliation_pending'),runtime.origin)
  }
  // Guarded durable SQL begin + one-shot provider-create claim; no implicit
  // retries even if a merchant POST times out. No entitlement on return.
  const result=await runtime.retryCheckout.begin({request,consent:data.consent})
  return addCors(new Response(JSON.stringify(result),{
   status:result.phase==='APPROVAL_PENDING'?200:409,
   headers:{'content-type':'application/json','cache-control':'no-store'}}),runtime.origin)
 }
 const isManagement=['status','cancel','acknowledgement','list','verify_payment','resume_approval'].includes(data.action)
 if(isManagement && !QA_V2_MANAGEMENT_RELEASE_APPROVED)
  return addCors(reply(503,'qa_v2_management_not_released'),runtime.origin)
 if(isManagement && ['status','cancel','acknowledgement'].includes(data.action))
  return addCors(await runtime.manage(request),runtime.origin)
 // Read-only merchant inventory diagnostics for 404; NOT a retry grant.
 if(data.action==='audit_retry_inventory'){
  if(Object.keys(data).sort().join('|')!=='action|intentId'||
    !/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.intentId||''))
   return addCors(reply(400,'invalid_request'),runtime.origin)
  if(!await runtime.canBuy(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
  try{
   if(await runtime.admit()!==true)
    return addCors(reply(429,'rate_limited'),runtime.origin)
   const account=await runtime.v2AccountStore.readForOwner({
     ownerId:qaOwner,intentId:data.intentId})
   if(!account||account.state!=='bound'||!account.externalSubscriptionId)
    return addCors(reply(409,'private_account_read_unavailable'),runtime.origin)
   const evidence=await runtime.inventoryRead.inspect({
     subscriptionId:account.externalSubscriptionId,planId:account.planId})
   // Secondary unfiltered merchant scope: never infer absence or issue grants
   // from a partial/failed scan. Distinct from the plan-filtered collection.
   let broader={code:'unfiltered_inventory_read_unavailable',merchantInventoryEnumerated:false}
   try{broader=await runtime.unfilteredInventoryRead.inspect({
     subscriptionId:account.externalSubscriptionId,planId:account.planId})}
   catch{/* Fail-closed, retain the first scope's diagnostic. */}
   return addCors(new Response(JSON.stringify({
     ok:true,...evidence,unfilteredCode:broader.code,
     unfilteredProviderStatus:'providerStatus' in broader?broader.providerStatus:null,
     unfilteredInventoryEnumerated:broader.merchantInventoryEnumerated===true,
     merchantAuditGrantIssued:false,
     paidThrough:null,mayRecordPayment:false,mayGrantBenefits:false
   }),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}),runtime.origin)
  }catch(error){
   // Diagnostic is a reviewed fixed code only, never PayPal's raw response.
   const known=new Set([
    'inventory_oauth_denied','inventory_token_denied',
    'inventory_merchant_scope_unavailable','inventory_request_rejected',
    'inventory_endpoint_unavailable','inventory_rate_limited',
    'inventory_provider_unavailable','inventory_malformed',
    'inventory_network_unavailable','inventory_oauth_invalid',
    'inventory_binding_unverified'
   ])
   const code=error instanceof Error&&known.has(error.message)
    ?error.message:'merchant_inventory_read_unavailable'
   return addCors(reply(code==='inventory_rate_limited'?429:503,code),runtime.origin)
  }
 }
 // Server-only review of the original VERIFIED CREATED inbox candidate.
 // PREPARED ONLY until private read-only SQL migration has a separate PO GO.
 // This does not ACK or mutate pending inbox rows and never issues retry grants.
 if(data.action==='audit_created_webhook'){
  if(!QA_V2_CREATED_WEBHOOK_AUDIT_RELEASE_APPROVED)
   return addCors(reply(503,'created_audit_not_released'),runtime.origin)
  if(Object.keys(data).sort().join('|')!=='action|intentId'||
    !/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.intentId||''))
   return addCors(reply(400,'invalid_request'),runtime.origin)
  if(!await runtime.canBuy(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
  try{
   if(await runtime.admit()!==true)
    return addCors(reply(429,'rate_limited'),runtime.origin)
   const account=await runtime.v2AccountStore.readForOwner({
    ownerId:qaOwner,intentId:data.intentId})
   if(!account||account.state!=='bound'||!account.externalSubscriptionId)
    return addCors(reply(409,'private_account_read_unavailable'),runtime.origin)
   // Signed inbox provenance and uniqueness come from the protected SQL RPC.
   const candidate=await runtime.createdCandidateStore.readForOwner({
    ownerId:qaOwner,intentId:account.intentId})
   if(!candidate)
    return addCors(new Response(JSON.stringify({ok:true,
     environment:'sandbox',code:'created_event_candidate_unavailable',
     correlated:false,eventReconciled:false,mayRetry:false,mayRecordPayment:false,
     mayGrantBenefits:false,paidThrough:null
    }),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}),runtime.origin)
   const result=await runtime.createdEventAudit.inspect({
    eventId:candidate.eventId,eventType:candidate.eventType,
    subscriptionId:account.externalSubscriptionId,
    intentId:account.intentId,planId:account.planId})
   return addCors(new Response(JSON.stringify({ok:true,...result}),{
    status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}),runtime.origin)
  }catch(error){
   const known=new Set([
    'created_inbox_candidate_unavailable','created_inbox_candidate_untrusted',
    'created_audit_binding_unverified','created_audit_network_unavailable',
    'created_audit_oauth_denied','created_audit_event_not_found',
    'created_audit_access_denied','created_audit_rate_limited',
    'created_audit_provider_unavailable','created_audit_invalid_response',
    'created_audit_invalid_token'
   ])
   const diagnostic=error instanceof Error&&known.has(error.message)
    ?error.message:'created_audit_unavailable'
   return addCors(reply(diagnostic==='created_audit_rate_limited'?429:503,diagnostic),runtime.origin)
  }
 }
 // This action never creates a subscription. It either returns the
 // previous approval URL or issues a service-only reconciled retry grant.
 // A fresh, published-terms acceptance is still required in retry_begin.
 if(data.action==='recover_retry'){
  if(Object.keys(data).sort().join('|')!=='action|intentId'||
   typeof data.intentId!=='string'||
   !/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.intentId))
   return addCors(reply(400,'invalid_request'),runtime.origin)
  if(!QA_CHECKOUT_RELEASE_APPROVED||!QA_V2_RETRY_RELEASE_APPROVED||
   !await runtime.canBuy(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
  let stage='admission'
  try{
   if(await runtime.admit()!==true)
    return addCors(reply(429,'rate_limited'),runtime.origin)
   stage='owner_record'
   const account=await runtime.v2AccountStore.readForOwner({
    ownerId:qaOwner,intentId:data.intentId})
   if(!account||account.state!=='bound'||!account.externalSubscriptionId||
    account.planId!==PLAN)return addCors(reply(409,'private_account_read_unavailable'),runtime.origin)
   stage='paypal_lookup'
   let merchant=null,notFound=false
   try{merchant=await runtime.reader.readSubscription(
    account.externalSubscriptionId,{includeApprovalLink:true})}
   catch(e){
    if(e instanceof Error&&e.message==='paypal_subscription_not_found')
     notFound=true
    else return addCors(reply(503,'paypal_subscription_read_unavailable'),runtime.origin)
   }
   if(!notFound&&merchant){
    if(merchant.id!==account.externalSubscriptionId||
      merchant.custom_id!==account.intentId||
      merchant.plan_id!==PLAN)
     return addCors(reply(409,'merchant_owner_plan_mismatch'),runtime.origin)
    if(merchant.status==='APPROVAL_PENDING'){
     // User explicitly requested to pay again after abandoning an approval.
     // A saved ba_token may no longer render in PayPal Sandbox. Instead of
     // blindly reopening it, close ONLY the still-unapproved subscription.
     // A separate new affirmative consent is required for any replacement.
     stage='cancel_eligibility'
     if(!await runtime.canAbandonPending(qaOwner,account.intentId))
      return addCors(reply(409,'pending_cancellation_preflight_blocked'),runtime.origin)
     if(QA_LOCAL_ORIGINS.has(runtime.origin)){
       // A merchant GET with APPROVAL_PENDING is not proof of cancellation,
       // but this disposable Sandbox owner explicitly wants a fresh checkout.
       // Preserve old merchant intent and audit; never lie that it is terminal.
       stage='qa_signed_created'
       const candidate=await runtime.createdCandidateStore.readForOwnerMulti({
         ownerId:qaOwner,intentId:account.intentId})
       if(!candidate)return addCors(reply(409,'qa_created_event_unverified'),runtime.origin)
       const signed=await runtime.createdEventAudit.inspect({
         eventId:candidate.eventId,eventType:candidate.eventType,
         subscriptionId:account.externalSubscriptionId,
         intentId:account.intentId,planId:PLAN})
       if(signed?.correlated!==true)
         return addCors(reply(409,'qa_created_event_unverified'),runtime.origin)
       stage='qa_confirm_pending'
       const again=await runtime.reader.readSubscription(
         account.externalSubscriptionId,{includeApprovalLink:false})
       if(again?.id!==account.externalSubscriptionId||
          again?.plan_id!==PLAN||again?.custom_id!==account.intentId||
          again?.status!=='APPROVAL_PENDING')
        return addCors(reply(409,'qa_pending_status_changed'),runtime.origin)
       stage='qa_archive'
       const archived=await runtime.archiveUnapprovedLocalQa({
         ownerId:qaOwner,intentId:account.intentId,
         subscriptionId:account.externalSubscriptionId,
         checkedAt:new Date().toISOString()})
       if(archived!==true)
         return addCors(reply(409,'qa_archive_not_authorized'),runtime.origin)
       return addCors(new Response(JSON.stringify({
         ok:true,environment:'sandbox',phase:'QA_ABANDONED_PENDING_RESET',
         code:'qa_fresh_consent_required',approvalUrl:null,
         paymentVerified:false,paidThrough:null,
         mayGrantBenefits:false,mayRecordPayment:false,
         previousPayPalSubscriptionCancelled:false
       }),{status:200,headers:{'content-type':'application/json',
         'cache-control':'no-store'}}),runtime.origin)
     }
     stage='paypal_cancel_pending'
     const cancelled=await runtime.cancellation.cancelPending({
      intentId:account.intentId,subscriptionId:account.externalSubscriptionId})
     if(cancelled.status!=='CANCELLED')
      return addCors(reply(409,'pending_cancellation_confirmation_missing'),runtime.origin)
     // The merchant-proof verifier below requires signed CREATED evidence,
     // a second terminal GET, and zero scoped transactions. No grant on 404.
    }
    else if(!['CANCELLED','EXPIRED'].includes(merchant.status))
     return addCors(reply(409,'existing_subscription_not_terminal'),runtime.origin)
   }
   stage='merchant_evidence'
   const proof=await runtime.retryMerchantProof.verify({
    ownerId:qaOwner,intentId:account.intentId,
    subscriptionId:account.externalSubscriptionId,
    consentedAt:account.consentedAt})
   stage='grant_authorization'
   const granted=await runtime.retryConsentStore.approveReconciled({
    ownerId:qaOwner,intentId:account.intentId,
    subscriptionId:account.externalSubscriptionId,...proof})
   if(granted!==true)return addCors(reply(409,'retry_proof_not_accepted'),runtime.origin)
   return addCors(new Response(JSON.stringify({
    ok:true,environment:'sandbox',phase:'RETRY_READY',
    code:'reconciled_retry_ready',approvalUrl:null,eligible:true,
    paidThrough:null,mayGrantBenefits:false,mayRecordPayment:false
   }),{status:200,headers:{'content-type':'application/json',
    'cache-control':'no-store'}}),runtime.origin)
  }catch(error){
   // Safe operation-specific diagnostic codes for cancelled-but-unapproved
   // checkout recovery. NEVER relay PayPal raw bodies, debug IDs or URLs.
   if(stage==='paypal_cancel_pending'){
     const code=error instanceof Error?error.message:''
     const cancelFailures:Record<string,string>={
       pazo_cancel_before_http_404:'recovery_cancel_pre_not_found',
       pazo_cancel_before_http_403:'recovery_cancel_pre_denied',
       pazo_cancel_before_http_401:'recovery_cancel_pre_denied',
       pazo_cancel_post_http_422:'recovery_cancel_post_rejected',
       pazo_cancel_post_http_404:'recovery_cancel_post_not_found',
       pazo_cancel_post_http_403:'recovery_cancel_post_denied',
       pazo_cancel_post_http_401:'recovery_cancel_post_denied',
       pazo_cancel_after_http_404:'recovery_cancel_after_not_found',
       pazo_cancel_confirmation_pending:'recovery_cancel_status_pending',
       pazo_cancel_post_status_changed:'recovery_cancel_status_changed',
       pazo_cancel_pending_status_unverified:'recovery_cancel_status_changed',
       pazo_cancel_subscription_mismatch:'recovery_cancel_owner_mismatch',
       pazo_cancel_paypal_oauth_unavailable:'recovery_cancel_oauth',
       pazo_cancel_paypal_unavailable:'recovery_cancel_provider_unavailable',
       pazo_cancel_paypal_transport_unavailable:'recovery_cancel_provider_unavailable'
     }
     return addCors(reply(409,cancelFailures[code]||'recovery_cancel_unclassified'),runtime.origin)
   }
   // Stage-only result: no subscriber, subscription, payer, PayPal raw
   // response, or user identifier. Lets support diagnose instead of
   // telling every buyer to "try again later".
   const failures:Record<string,string>={
    admission:'recovery_check_admission',
    owner_record:'recovery_check_account',
    paypal_lookup:'recovery_check_provider',
    cancel_eligibility:'recovery_check_cancel_eligibility',
    paypal_cancel_pending:'recovery_check_cancel_provider',
    merchant_evidence:'recovery_check_merchant_evidence',
    grant_authorization:'recovery_check_grant',
    qa_signed_created:'recovery_check_qa_created',
    qa_confirm_pending:'recovery_check_qa_status',
    qa_archive:'recovery_check_qa_archive'
   }
   return addCors(reply(409,failures[stage]||'recovery_check_unavailable'),runtime.origin)
  }
 }
 // Recover only the original PayPal approval for an already-bound QA V2
 // attempt. No PayPal POST creates a second subscription; no paid entitlement.
 if(data.action==='resume_approval'){
  if(!((Object.keys(data).sort().join('|')==='action')||
    (Object.keys(data).sort().join('|')==='action|intentId'&&
     /^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.intentId||''))))
   return addCors(reply(400,'invalid_request'),runtime.origin)
  if(!QA_CHECKOUT_RELEASE_APPROVED||!await runtime.canBuy(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
  // All requests are owner-scoped and read-only. Safe diagnostic categories
  // contain NO PayPal subscription IDs, payer data, URLs or raw provider output.
  let admission
  try{admission=await runtime.admit()}
  catch{return addCors(reply(503,'sandbox_admission_unavailable'),runtime.origin)}
  if(admission!==true)
   return addCors(reply(429,'rate_limited'),runtime.origin)
  let account
  try{account=await runtime.v2AccountStore.readForOwner({ownerId:qaOwner,intentId:data.intentId})}
  catch{return addCors(reply(503,'private_account_read_unavailable'),runtime.origin)}
  if(!account||account.state!=='bound'||!account.externalSubscriptionId)
   return addCors(reply(409,'existing_v2_subscription_not_bound'),runtime.origin)
  let merchant
  try{merchant=await runtime.reader.readSubscription(
    account.externalSubscriptionId,{includeApprovalLink:true})}
  catch(error){
   // No provider error text or subscriber data may escape the Edge boundary.
   // Only static, reviewed codes returned by the Sandbox read adapter.
   const safe=new Set([
    'paypal_oauth_denied','paypal_oauth_invalid_token',
    'paypal_subscription_not_found','paypal_subscription_access_denied',
    'paypal_provider_rate_limited','paypal_provider_unavailable',
    'paypal_provider_request_rejected','paypal_provider_invalid_response',
    'paypal_subscription_response_mismatch','paypal_network_unavailable',
   ])
   const diagnostic=error instanceof Error&&safe.has(error.message)
     ?error.message:'paypal_subscription_read_unavailable'
   return addCors(reply(diagnostic==='paypal_provider_rate_limited'?429:503,
    diagnostic),runtime.origin)
  }
  if(merchant.id!==account.externalSubscriptionId||
     merchant.plan_id!==PLAN||merchant.custom_id!==account.intentId)
   return addCors(reply(409,'merchant_owner_plan_mismatch'),runtime.origin)
  if(!['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'].includes(merchant.status))
   return addCors(reply(409,'merchant_status_unrecognized'),runtime.origin)
  const code=merchant.status==='APPROVAL_PENDING'
   ? merchant.approvalUrl?'approval_can_resume'
     : merchant.approvalLinkState==='rejected'?'approval_link_rejected'
     : 'approval_link_unavailable'
   : 'approval_no_longer_pending'
  return addCors(new Response(JSON.stringify({
    ok:true,environment:'sandbox',phase:merchant.status,code,
    approvalUrl:merchant.status==='APPROVAL_PENDING'?merchant.approvalUrl:null,
    entitlement:false,mayRecordPayment:false,mayGrantBenefits:false,
    paidThrough:null,
  }),{status:200,headers:{'content-type':'application/json',
    'cache-control':'no-store'}}),runtime.origin)
 }
 if(data.action==='verify_payment'){
  if(!((Object.keys(data).sort().join('|')==='action')||
    (Object.keys(data).sort().join('|')==='action|intentId'&&
     /^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.intentId||''))))
   return addCors(reply(400,'invalid_request'),runtime.origin)
  try{
   if(await runtime.admit()!==true)
    return addCors(reply(429,'rate_limited'),runtime.origin)
   const account=await runtime.v2AccountStore.readForOwner({ownerId:qaOwner,intentId:data.intentId})
   if(!account||account.state!=='bound'||!account.externalSubscriptionId)
    return addCors(reply(409,'v2_subscription_not_bound'),runtime.origin)
   const state=await runtime.merchantVerifier.verifyFirstPaidCycle({
    ownerId:qaOwner,intentId:account.intentId,
    subscriptionId:account.externalSubscriptionId,
    termsVersion:account.termsVersion,
   })
   return addCors(new Response(JSON.stringify({ok:true,code:state.phase,
    environment:'sandbox',...state}),{
    status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}),runtime.origin)
  }catch(error){
   // Fixed diagnostics only for the authenticated owner. No merchant payload,
   // sale ID, subscription ID, payer details or exception text leaves Edge.
   const cause=error instanceof Error?error.message:''
   const known:Record<string,string>={
    qa_v2_merchant_merchant_period_dates_missing:'sandbox_payment_period_evidence_missing',
    qa_v2_merchant_incomplete_subscription_transactions:'sandbox_payment_history_evidence_missing',
    qa_v2_merchant_regular_paid_sale_not_unique_or_reversed:'sandbox_payment_sale_evidence_missing',
    qa_v2_merchant_sale_time_not_in_first_cycle:'sandbox_payment_sale_evidence_missing',
    qa_v2_merchant_independent_sale_not_completed:'sandbox_payment_sale_evidence_missing',
    qa_v2_merchant_refund_merchant_get_mismatch:'sandbox_payment_sale_evidence_missing',
    qa_v2_merchant_provider_get_unavailable:'sandbox_payment_provider_read_unavailable',
    qa_v2_merchant_network_unavailable:'sandbox_payment_provider_read_unavailable',
    qa_v2_merchant_invalid_provider_reply:'sandbox_payment_provider_read_unavailable',
    qa_v2_merchant_oauth_invalid:'sandbox_payment_provider_read_unavailable',
    qa_v2_merchant_durable_period_not_confirmed:'sandbox_payment_recording_unavailable',
    qa_v2_proof_rpc_unavailable:'sandbox_payment_recording_unavailable',
    qa_v2_merchant_refund_not_durably_held:'sandbox_payment_recording_unavailable',
   }
   return addCors(reply(503,known[cause]||'sandbox_merchant_payment_not_verified'),runtime.origin)
  }
 }
 if(data.action==='list'){
  if(Object.keys(data).sort().join('|')!=='action')
   return addCors(reply(400,'invalid_request'),runtime.origin)
  try{
   if(await runtime.admit()!==true)
    return addCors(reply(429,'rate_limited'),runtime.origin)
   const accounts=await runtime.v2AccountStore.listForOwner({ownerId:qaOwner})
   return addCors(new Response(JSON.stringify({ok:true,phase:'V2_ACCOUNTS',
     accounts,entitlement:false,paidThrough:null,mayGrantBenefits:false}),{
     status:200,headers:{'content-type':'application/json','cache-control':'no-store'}}),runtime.origin)
  }catch{return addCors(reply(503,'qa_v2_account_list_unavailable'),runtime.origin)}
 }
 // New subscriptions remain separately disabled after QA ends, without
 // removing an owner's ability to cancel an already bound V2 subscription.
 if(!QA_CHECKOUT_RELEASE_APPROVED)
  return addCors(reply(503,'paid_supporter_checkout_not_released'),runtime.origin)
 // In local Vite Sandbox only, authenticated owners may READ the offer
 // without a manually inserted allowlist row. The durable QA row is created
 // exclusively for an explicitly consented 'begin' request below.
 const localSandbox=QA_LOCAL_ORIGINS.has(runtime.origin)
 if(data.action==='begin' && localSandbox){
  const c=data.consent
  if(Object.keys(data).sort().join('|')!=='action|consent'||
     !c||typeof c!=='object'||Array.isArray(c)||
     Object.keys(c).sort().join('|')!=='affirmativeConsent|locale|requestKey|termsDigest|termsVersion'||
     c.affirmativeConsent!==true||
     !['es','en'].includes(c.locale)||
     c.termsVersion!==SANDBOX_BENEFITS_OFFER_V2||
     !/^[a-f0-9]{64}$/.test(c.termsDigest||'')||
     !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(c.requestKey||''))
   return addCors(reply(400,'explicit_sandbox_consent_required'),runtime.origin)
  if(!await runtime.autoAdmitLocalOwner(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
 }else if(!localSandbox || data.action!=='offer'){
  if(!await runtime.canBuy(qaOwner))
   return addCors(reply(403,'sandbox_qa_owner_required'),runtime.origin)
 }
 let result
 if(data.action==='offer'){
  if(Object.keys(data).sort().join('|')!=='action|locale')
   return addCors(reply(400,'invalid_request'),runtime.origin)
  try{
   if(!await runtime.resolveAuthenticatedOwner(request)||
      await runtime.admit()!==true)
    return addCors(reply(403,'not_authorized'),runtime.origin)
   const offer=await runtime.consentStore.readOffer({locale:data.locale})
   result=offer?.version===SANDBOX_BENEFITS_OFFER_V2
     ? {phase:'PUBLISHED_OFFER',offer,entitlement:false,paidThrough:null}
     : {phase:'OFFER_UNAVAILABLE'}
  }catch{return addCors(reply(503,'offer_unavailable'),runtime.origin)}
 }else if(data.action==='begin'){
  if(Object.keys(data).sort().join('|')!=='action|consent')
   return addCors(reply(400,'invalid_request'),runtime.origin)
  if(data.consent?.termsVersion!==SANDBOX_BENEFITS_OFFER_V2)
   return addCors(reply(409,'new_four_benefit_sandbox_terms_required'),runtime.origin)
  result=await runtime.checkout.begin({request,consent:data.consent})
 }else return addCors(reply(400,'invalid_request'),runtime.origin)
 return addCors(new Response(JSON.stringify(result),{
  status:result.phase==='APPROVAL_PENDING'||result.phase==='PUBLISHED_OFFER'?200:409,
  headers:{'content-type':'application/json','cache-control':'no-store'},
 }),runtime.origin)
})
