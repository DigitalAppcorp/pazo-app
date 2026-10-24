import {createPazoLiveOwnerCancellation} from './liveOwnerCancellation.mjs'
import {createPazoLiveOwnerRecovery} from './liveOwnerRecovery.mjs'
import {readPazoLiveAcceptedOffer} from '../pazo-paypal-live-checkout/liveOfferRegistry.mjs'
// PAZO F16 — authenticated owner's original Live subscription management.
// No new checkout consent, refund, benefit grant or browser financial proof.
// Explicit recovery can replay only the original durably claimed request.
// Sanitizes the service-role SQL response: never expose PayPal subscription IDs,
// request keys, merchant IDs, owner IDs, raw plan, original origin or signatures.
const PATHS=new Set(['/pazo-paypal-live-account',
 '/functions/v1/pazo-paypal-live-account'])
// Two exact reviewed PAZO origins. Preserve the former deployed origin for
// already-consented subscription management and permit the official beta app.
// Never accept arbitrary Vercel previews or wildcard Origin headers.
const ORIGINS=new Set(['https://pazo-app.vercel.app',
 'https://pazo-app-t83r.vercel.app',
 'http://localhost:5173','http://127.0.0.1:5173'])
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const reply=(req,status,code,extra={})=>{
 const origin=req?.headers?.get?.('origin')
 const cors=ORIGINS.has(origin)?{
  'access-control-allow-origin':origin,
  'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
  vary:'Origin'}:{vary:'Origin'}
 return new Response(JSON.stringify({ok:status===200,code,
  environment:'live',mayCharge:false,mayGrantBenefits:false,
  paidThrough:null,...extra}),{
  status,headers:{...cors,'content-type':'application/json',
   'cache-control':'no-store','x-content-type-options':'nosniff'}})
}
export function normalizePazoLiveOwnerSlots(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  raw.source!=='private_original_live_owner_checkouts'||
  !Array.isArray(raw.accounts)||raw.accounts.length>20||
  (raw.currentIntentId!==null&&!INTENT.test(raw.currentIntentId||'')))
  throw Error('untrusted_owner_slots')
 const open=[]
 for(const entry of raw.accounts){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
   !INTENT.test(entry.intentId||'')||
   !Number.isInteger(entry.merchantGeneration)||entry.merchantGeneration<1||
   typeof entry.createdAt!=='string'||!Number.isFinite(Date.parse(entry.createdAt))||
   !(entry.closedAt===null||typeof entry.closedAt==='string'))
   throw Error('untrusted_owner_slots')
  // Closed, already-reconciled attempts are history, not active checkout.
  // Their historical provider status is irrelevant to the active slot.
  if(entry.closedAt!==null)continue
  if(!['pending','bound'].includes(entry.state)||
   !(entry.providerStatus===null||
    (typeof entry.providerStatus==='string'&&/^[A-Z_]{2,35}$/.test(entry.providerStatus)))||
   !(entry.providerCreateClaimedAt===null||typeof entry.providerCreateClaimedAt==='string')||
   !(entry.subscriptionId===null||typeof entry.subscriptionId==='string')||
   !(entry.cancelState==null||['claimed','confirmed','review_required'].includes(entry.cancelState))
  )throw Error('untrusted_owner_slots')
  open.push({intentId:entry.intentId,state:entry.state,
   canDownloadAcceptance:true,
   needsReconciliation:entry.state==='pending'&&entry.providerCreateClaimedAt!==null,
   ...(entry.cancelState!=null ?{
    cancelInReview:entry.cancelState==='claimed'||entry.cancelState==='review_required',
    cancelConfirmed:entry.cancelState==='confirmed'
   }:{})})
 }
 if(open.length>1||
  (open.length===0&&raw.currentIntentId!==null)||
  (open.length===1&&open[0].intentId!==raw.currentIntentId))
  throw Error('untrusted_owner_slots')
 return open
}
export function createPazoLiveOwnerAccountRead({released=false,
 resolveAuthenticatedOwner,readPrivateOwner,readProviderStatus,
 claimCancel,finishCancel,postCancel,getOriginalProvider,claimRecovery,
 finishRecovery,retireTerminal,abandonUnclaimed,readRecoveryReadiness,
 readAcceptance}={}){
 return async request=>{
  if(released!==true)return reply(request,503,'live_account_read_not_released')
  if(!(request instanceof Request))return reply(request,400,'invalid_request')
  let url
  try{url=new URL(request.url)}catch{return reply(request,400,'invalid_request')}
  if(!PATHS.has(url.pathname)||url.search||url.hash)
   return reply(request,400,'invalid_request')
  const origin=request.headers.get('origin')
  if(origin!==null&&!ORIGINS.has(origin))
   return reply(request,403,'untrusted_origin')
  if(request.method==='OPTIONS'){
   if(!origin||request.headers.get('access-control-request-method')!=='POST')
    return reply(request,400,'invalid_preflight')
   const r=reply(request,200,'preflight')
   return new Response(null,{status:204,headers:r.headers})
  }
  if(request.method!=='POST')return reply(request,405,'post_required')
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(
   request.headers.get('content-type')||''))
   return reply(request,415,'json_required')
  if(typeof resolveAuthenticatedOwner!=='function'||
   typeof readPrivateOwner!=='function')
   return reply(request,503,'live_account_backend_unavailable')
  let data
  try{
   const advertised=request.headers.get('content-length')
   if(advertised!==null&&(!/^\d+$/.test(advertised)||Number(advertised)>256))
    return reply(request,413,'request_too_large')
   const body=await request.text()
   if(body.length>256)throw Error('too_large')
   data=JSON.parse(body)
  }catch{return reply(request,400,'invalid_request')}
  if(!data||typeof data!=='object'||Array.isArray(data))
   return reply(request,400,'invalid_request')
  const keys=Object.keys(data).sort().join(',')
  if(!((data.action==='list'&&keys==='action')||
   (['status','resume','reconcile','abandon','acknowledgement'].includes(data.action)&&keys==='action,intentId'&&
    INTENT.test(data.intentId||''))||
   (data.action==='cancel'&&keys==='action,confirmCancellation,intentId'&&
    INTENT.test(data.intentId||'')&&data.confirmCancellation===true)||
   (data.action==='abandon_pending'&&keys==='action,confirmAbandon,intentId'&&
    INTENT.test(data.intentId||'')&&data.confirmAbandon===true)))
   return reply(request,400,'invalid_request')
  let owner
  try{owner=await resolveAuthenticatedOwner(request)}
  catch{return reply(request,401,'authentication_required')}
  if(!UUID.test(owner||''))return reply(request,401,'authentication_required')
  try{
   const slots=await readPrivateOwner({ownerId:owner})
   const accounts=normalizePazoLiveOwnerSlots(slots)
   if(data.action==='list')
    return reply(request,200,'live_account_list_verified',{accounts,
     acceptances:slots.accounts.filter(a=>a.closedAt!==null).map(a=>({
      intentId:a.intentId,acceptedAt:a.createdAt}))})
   // The browser supplies only a PAZO intent ID; it NEVER chooses the PayPal
   // subscription ID, merchant generation, owner, plan or credentials.
   const selected=accounts.find(a=>a.intentId===data.intentId)
   if(!selected&&data.action!=='acknowledgement')
    return reply(request,409,'live_status_not_available')
   const original=slots.accounts.find(a=>a.intentId===data.intentId)
   if(data.action==='acknowledgement'){
    if(!original)return reply(request,409,'live_status_not_available')
    if(typeof readAcceptance!=='function')return reply(request,503,'live_acceptance_unavailable')
    const accepted=await readAcceptance({ownerId:owner,intentId:original.intentId})
    const offer=readPazoLiveAcceptedOffer(accepted)
    if(!offer||accepted.source!=='original_live_offer_acceptance'||
     accepted.intentId!==original.intentId||accepted.affirmativeConsent!==true||
     accepted.exactCopy!==offer.exactCopy||accepted.consentLabel!==offer.consentLabel||
     accepted.title!==offer.title||accepted.priceMinor!==299||accepted.currency!=='USD'||
     accepted.cadence!=='MONTH_1'||typeof accepted.acceptedAt!=='string'||
     !Number.isFinite(Date.parse(accepted.acceptedAt)))
     return reply(request,503,'live_acceptance_unverified')
    const headers=new Headers(reply(request,200,'live_acceptance_verified').headers)
    headers.set('content-type','text/plain;charset=utf-8')
    headers.set('content-disposition','attachment; filename="pazo-accepted-terms.txt"')
    return new Response([offer.title,offer.version,offer.locale,accepted.acceptedAt,
     offer.termsDigest,offer.consentLabel,offer.exactCopy].join('\n\n'),{status:200,headers})
   }
   if(['resume','reconcile','abandon'].includes(data.action)){
    const recover=createPazoLiveOwnerRecovery({getOriginalProvider,claimRecovery,
     finishRecovery,retireTerminal,abandonUnclaimed,readRecoveryReadiness})
    const outcome=await recover({ownerId:owner,original,action:data.action})
    return reply(request,outcome.ok?200:409,outcome.code,
     outcome.ok?{...(outcome.approvalUrl?{approvalUrl:outcome.approvalUrl}:{}),
      ...(outcome.providerStatus?{providerStatus:outcome.providerStatus}:{})}:{})
   }
   if(!selected||selected.state!=='bound'||
     typeof readProviderStatus!=='function')
    return reply(request,409,'live_status_not_available')
   if(!original||!SUB.test(original.subscriptionId||'')||
     !PLAN.test(original.planId||'')||
     !Number.isSafeInteger(original.merchantGeneration)||original.merchantGeneration<1)
    return reply(request,409,'live_status_not_available')
   if(data.action==='abandon_pending'){
    // Abandoning a buyer's unfinished PayPal approval is NOT cancellation
    // of an ACTIVE member. Require explicit confirmation and an unchanged
    // original Live owner+merchant binding; no second CREATE.
    if(original.state!=='bound'||original.closedAt!==null)
     return reply(request,409,'live_approval_not_pending')
    const abandon=createPazoLiveOwnerCancellation({
     readProviderStatus,claimCancel,finishCancel,postCancel,
     allowPendingApproval:true
    })
    const outcome=await abandon({ownerId:owner,original:{
     ...original,intentId:selected.intentId
    }})
    if(outcome.confirmed!==true||outcome.providerStatus!=='CANCELLED')
     return reply(request,409,outcome.code||'live_approval_requires_reconciliation')
    // Final owner-bound SQL closes only terminal attempts after pending signed
    // events, cancellation claims and paid periods have all been reconciled.
    if(typeof retireTerminal!=='function')return reply(request,503,'live_approval_retirement_unavailable')
    const released=await retireTerminal({ownerId:owner,intentId:selected.intentId,
     merchantGeneration:original.merchantGeneration,subscriptionId:original.subscriptionId,
     providerStatus:'CANCELLED'})
    return reply(request,released===true?200:409,released===true
     ?'live_checkout_slot_released':'live_coverage_or_events_pending')
   }
   if(data.action==='cancel'){
    // Never trust a browser-provided subscription, plan or merchant. The
    // owner must request cancellation explicitly; the original DB binding
    // and its provider generation are fixed before any side effect.
    const perform=createPazoLiveOwnerCancellation({
     readProviderStatus,claimCancel,finishCancel,postCancel
    })
    const outcome=await perform({ownerId:owner,original:{
     ...original,intentId:selected.intentId
    }})
    if(outcome.confirmed===true&&outcome.providerStatus==='CANCELLED')
     return reply(request,200,'future_renewals_cancelled',{
      cancelled:true,providerStatus:'CANCELLED'})
    return reply(request,409,outcome.code||'live_cancel_requires_reconciliation')
   }
   let remote
   try{remote=await readProviderStatus({merchantGeneration:original.merchantGeneration,
    planId:original.planId,intentId:selected.intentId,
    subscriptionId:original.subscriptionId})}
   catch{return reply(request,503,'live_provider_status_unavailable')}
   if(remote?.id!==original.subscriptionId||remote?.plan_id!==original.planId||
    remote?.custom_id!==selected.intentId||
    !['ACTIVE','APPROVAL_PENDING','APPROVED','SUSPENDED','CANCELLED','EXPIRED'].includes(remote.status))
    return reply(request,503,'live_provider_status_unverified')
   // A previous owner-confirmed cancellation may have reached PayPal before
   // PAZO lost its HTTP response. A later GET can finalize that SAME claim;
   // never send a second cancel POST just to clear the review state.
   if(remote.status==='CANCELLED'&&['claimed','review_required'].includes(original.cancelState)){
    if(typeof finishCancel!=='function'||await finishCancel({ownerId:owner,
     intentId:selected.intentId,merchantGeneration:original.merchantGeneration,
     outcome:'confirmed'})!==true)
     return reply(request,503,'live_cancel_requires_reconciliation')
   }
   // ACTIVE is NOT paid. Financial periods are verified separately from signed
   // sale events and the dedicated original-generation reconciliation worker.
   return reply(request,200,'live_provider_status_read',{
    providerStatus:remote.status,...(remote.status==='CANCELLED'?{cancelled:true}:{})})
  }catch{return reply(request,503,'live_account_list_unavailable')}
 }
}
