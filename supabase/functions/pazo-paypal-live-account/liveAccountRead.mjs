import {createPazoLiveOwnerCancellation} from './liveOwnerCancellation.mjs'
// PAZO F16 — authenticated owner's original Live subscription management.
// No payment creation, refund, benefit grant, or browser-derived financial proof.
// Sanitizes the service-role SQL response: never expose PayPal subscription IDs,
// request keys, merchant IDs, owner IDs, raw plan, original origin or signatures.
const PATHS=new Set(['/pazo-paypal-live-account',
 '/functions/v1/pazo-paypal-live-account'])
const ORIGINS=new Set(['https://pazo-app-t83r.vercel.app',
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
   canDownloadAcceptance:false,
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
 claimCancel,finishCancel,postCancel}={}){
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
   (data.action==='status'&&keys==='action,intentId'&&
    INTENT.test(data.intentId||''))||
   (data.action==='cancel'&&keys==='action,confirmCancellation,intentId'&&
    INTENT.test(data.intentId||'')&&data.confirmCancellation===true)))
   return reply(request,400,'invalid_request')
  let owner
  try{owner=await resolveAuthenticatedOwner(request)}
  catch{return reply(request,401,'authentication_required')}
  if(!UUID.test(owner||''))return reply(request,401,'authentication_required')
  try{
   const slots=await readPrivateOwner({ownerId:owner})
   const accounts=normalizePazoLiveOwnerSlots(slots)
   if(data.action==='list')
    return reply(request,200,'live_account_list_verified',{accounts})
   // The browser supplies only a PAZO intent ID; it NEVER chooses the PayPal
   // subscription ID, merchant generation, owner, plan or credentials.
   const selected=accounts.find(a=>a.intentId===data.intentId)
   if(!selected||selected.state!=='bound'||
     typeof readProviderStatus!=='function')
    return reply(request,409,'live_status_not_available')
   const original=slots.accounts.find(a=>a.intentId===selected.intentId)
   if(!original||!SUB.test(original.subscriptionId||'')||
     !PLAN.test(original.planId||'')||
     !Number.isSafeInteger(original.merchantGeneration)||original.merchantGeneration<1)
    return reply(request,409,'live_status_not_available')
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
   // ACTIVE is NOT paid. Financial periods are verified separately from signed
   // sale events and the dedicated original-generation reconciliation worker.
   return reply(request,200,'live_provider_status_read',{
    providerStatus:remote.status})
  }catch{return reply(request,503,'live_account_list_unavailable')}
 }
}
