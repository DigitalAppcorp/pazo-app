// PAZO F16: merchant-pinned PayPal LIVE payment evidence reader.
// Unreleased. Called ONLY after a trusted server resolves immutable merchant
// generation and account binding, and AFTER cryptographic webhook verification.
// GET provider facts; NEVER derives paidThrough, grants benefits, or writes DB.
import {normalizePazoLiveBillingSnapshot,canonicalPaypalInstant} from './liveBillingSnapshot.mjs'
import {createPazoLiveDisputeEvidenceReader} from './liveDisputeEvidence.mjs'
import {validatePazoPaypalLiveMonthlyPlan} from '../f16-paypal-webhook/pazoPaypalLivePlanContract.mjs'
const HOST='https://api-m.paypal.com'
const PLAN=/^P-[A-Z0-9]{12,40}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ASCII=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&/^[\x21-\x7e]+$/.test(s)
const MAX_RESPONSE=65536
const NO='live_provider_evidence_unavailable'
const date=d=>{
 if(typeof d!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(d))
  return false
 const t=Date.parse(d)
 if(!Number.isFinite(t))return false
 const normalized=d.replace(/(?:\.(\d{1,3}))?Z$/,(_match,frac)=>'.'+(frac||'').padEnd(3,'0')+'Z')
 return new Date(t).toISOString()===normalized
}
function fail(providerFailure,providerHttpStatus){throw Object.assign(Error(NO),{providerFailure,providerHttpStatus})}
async function json(fetchImpl,url,options){
 let response
 try{response=await fetchImpl(url,{...options,redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(12000)})}catch{fail('network')}
 if(!response?.ok||response.status!==200){
  // A bounded PayPal error enum/correlation reference can help the operator
  // resolve a real 404. Never retain message/details/payer/URLs or raw body.
  let providerErrorName=null,providerDebugId=null
  try{const raw=await response?.text();if(typeof raw==='string'&&raw.length<=MAX_RESPONSE){const e=JSON.parse(raw)
   if(new Set(['RESOURCE_NOT_FOUND','NOT_AUTHORIZED','PERMISSION_DENIED','INVALID_RESOURCE_ID','AUTHENTICATION_FAILURE','INTERNAL_SERVER_ERROR','UNPROCESSABLE_ENTITY','INVALID_REQUEST']).has(e?.name))providerErrorName=e.name
   if(typeof e?.debug_id==='string'&&/^[a-f0-9]{8,32}$/.test(e.debug_id))providerDebugId=e.debug_id
  }}catch{/* Do not expose an error body. */}
  throw Object.assign(Error(NO),{providerFailure:'http',providerHttpStatus:response?.status,providerErrorName,providerDebugId})
 }
 const ct=response.headers?.get?.('content-type')
 if(typeof ct!=='string'||!/^application\/json(?:\s*;|$)/i.test(ct))fail('content_type',response.status)
 let body
 try{body=await response.text()}catch{fail('body',response.status)}
 if(typeof body!=='string'||body.length>MAX_RESPONSE)fail('body',response.status)
 let d
 try{d=JSON.parse(body)}catch{fail('json',response.status)}
 if(!d||Array.isArray(d)||typeof d!=='object')fail('object',response.status)
 return d
}
export function createPaypalLiveMerchantEvidenceReader({
 merchantGeneration,planId,clientId,clientSecret,fetchImpl=fetch
}={}){
 if(!Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
  !PLAN.test(planId||'')||!ASCII(clientId)||clientId.includes(':')||
  !ASCII(clientSecret)||typeof fetchImpl!=='function')
  throw Error('live_merchant_generation_not_configured')
 async function token(){
  // PayPal requires OAuth POST; no checkout/mutating provider endpoints invoked.
  const raw=await json(fetchImpl,HOST+'/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials'
  })
  if(raw.token_type?.toLowerCase()!=='bearer'||!ASCII(raw.access_token))fail()
  return raw.access_token
 }
 const auth=t=>({Authorization:'Bearer '+t,Accept:'application/json'})
 async function subscription(subscriptionId,intentId){
  if(!SUB.test(subscriptionId||'')||!INTENT.test(intentId||''))fail()
  const t=await token()
  const d=await json(fetchImpl,HOST+'/v1/billing/subscriptions/'+
   encodeURIComponent(subscriptionId),{method:'GET',headers:auth(t)})
  if(d.id!==subscriptionId||d.plan_id!==planId||
   d.custom_id!==intentId||!['APPROVAL_PENDING','APPROVED','ACTIVE',
    'SUSPENDED','CANCELLED','EXPIRED'].includes(d.status))fail()
  return Object.freeze({id:d.id,plan_id:d.plan_id,custom_id:d.custom_id,
   status:d.status,merchantGeneration,sourceEnvironment:'live',
   statusUpdatedAt:canonicalPaypalInstant(d.status_update_time)})
 }
 async function transactionForSale({subscriptionId,intentId,saleId,expectedGeneration,
   startTime,endTime}={}){
   if(expectedGeneration!==merchantGeneration||!SALE.test(saleId||'')||
    !date(startTime)||!date(endTime)||Date.parse(endTime)<=Date.parse(startTime)||
    Date.parse(endTime)-Date.parse(startTime)>31*86400000)fail()
   // Read the subscription from the pinned merchant first, then its payments.
   await subscription(subscriptionId,intentId)
   const t=await token()
   const path='/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)+
    '/transactions?start_time='+encodeURIComponent(startTime)+
    '&end_time='+encodeURIComponent(endTime)
   let url=HOST+path,expectedPages=null,expectedItems=null,pageCount=0
   const all=[],seenUrls=new Set(),seenIds=new Set()
   while(url){
    if(seenUrls.has(url)||pageCount>=10)fail()
    seenUrls.add(url);pageCount++
    const d=await json(fetchImpl,url,{method:'GET',headers:auth(t)})
    if(!Array.isArray(d.transactions)||!Number.isSafeInteger(d.total_pages)||
     d.total_pages<1||d.total_pages>10||!Number.isSafeInteger(d.total_items)||
     d.total_items<1||d.total_items>500)fail()
    if(expectedPages===null){expectedPages=d.total_pages;expectedItems=d.total_items}
    if(expectedPages!==d.total_pages||expectedItems!==d.total_items)fail()
    for(const row of d.transactions){
     if(!SALE.test(row?.id||'')||seenIds.has(row.id)||all.length>=500)fail()
     seenIds.add(row.id);all.push(row)
    }
    if(d.links!==undefined&&!Array.isArray(d.links))fail()
    const next=(d.links||[]).filter(x=>x?.rel==='next')
    if(next.length>1)fail()
    url=null
    if(next.length){
     const link=next[0];let parsed
     try{parsed=new URL(link.href)}catch{fail()}
     if(link.method!=='GET'||parsed.origin!==HOST||parsed.username||parsed.password||parsed.hash||
      parsed.pathname!=='/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)+'/transactions'||
      parsed.searchParams.get('start_time')!==startTime||parsed.searchParams.get('end_time')!==endTime||
      [...parsed.searchParams.keys()].some(k=>!['start_time','end_time','page','page_size'].includes(k))||
      [...parsed.searchParams.keys()].some(k=>parsed.searchParams.getAll(k).length!==1)||
      (parsed.searchParams.has('page')&&!/^[1-9][0-9]{0,3}$/.test(parsed.searchParams.get('page')))||
      (parsed.searchParams.has('page_size')&&!/^[1-9][0-9]{0,2}$/.test(parsed.searchParams.get('page_size'))))fail()
     url=parsed.href
    }
   }
   if(pageCount!==expectedPages||all.length!==expectedItems)fail()
   const matching=all.filter(x=>x?.id===saleId)
   if(matching.length!==1)fail()
   const x=matching[0]
   if(x.amount_with_breakdown?.gross_amount?.currency_code!=='USD'||
    x.amount_with_breakdown?.gross_amount?.value!=='2.99'||!date(x.time)||
    Date.parse(x.time)<Date.parse(startTime)||
    Date.parse(x.time)>Date.parse(endTime))fail()
   return x // Never return unfiltered transaction outside this module.
 }
 return Object.freeze({
  // Private original-QA audit. A complete transaction read is required even
  // when PAZO has no paid periods. Never returns raw provider/customer data.
  async readOriginalQaAudit({subscriptionId,intentId,expectedGeneration,createdAt,now=new Date().toISOString()}={}){
   let qaStage='input',originalPlanVerified=false
   try{
   if(expectedGeneration!==merchantGeneration||!SUB.test(subscriptionId||'')||!INTENT.test(intentId||'')||
    !canonicalPaypalInstant(createdAt)||!canonicalPaypalInstant(now))fail()
   const start=new Date(Date.parse(createdAt)-86400000).toISOString()
   if(Date.parse(now)<=Date.parse(start)||Date.parse(now)-Date.parse(start)>31*86400000)fail()
   qaStage='oauth'
   const t=await token(),base='/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)
   qaStage='plan_get'
   const plan=await json(fetchImpl,HOST+'/v1/billing/plans/'+encodeURIComponent(planId),{method:'GET',headers:auth(t)})
   qaStage='plan_terms'
   if(!validatePazoPaypalLiveMonthlyPlan(plan,planId).ready)fail()
   originalPlanVerified=true
   qaStage='subscription_get'
   const d=await json(fetchImpl,HOST+base,{method:'GET',headers:auth(t)})
   qaStage='binding'
   if(d.id!==subscriptionId||d.plan_id!==planId||d.custom_id!==intentId||
    !['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'].includes(d.status))fail()
   qaStage='create_time'
   const created=canonicalPaypalInstant(d.create_time)
   if(!created||Date.parse(created)<Date.parse(start)||Date.parse(created)>Date.parse(now))fail()
   let url=HOST+base+'/transactions?start_time='+encodeURIComponent(start)+'&end_time='+encodeURIComponent(now)
   let pages=0,totalPages=null,totalItems=null,count=0,completed=0
   const seen=new Set(),ids=new Set()
   while(url){
    if(seen.has(url)||pages>=10)fail();seen.add(url);pages++
    qaStage='transactions_get'
    const body=await json(fetchImpl,url,{method:'GET',headers:auth(t)})
    qaStage='transactions_shape'
    if(!Array.isArray(body.transactions)||!Number.isSafeInteger(body.total_items)||body.total_items<0||body.total_items>500||
     !Number.isSafeInteger(body.total_pages)||body.total_pages<0||body.total_pages>10)fail()
    if(totalPages===null){totalPages=body.total_pages;totalItems=body.total_items}
    if(totalPages!==body.total_pages||totalItems!==body.total_items)fail()
    for(const row of body.transactions){if(!SALE.test(row?.id||'')||ids.has(row.id))fail();ids.add(row.id);count++;if(row.status==='COMPLETED')completed++}
    if(body.links!==undefined&&!Array.isArray(body.links))fail()
    const next=(body.links||[]).filter(x=>x?.rel==='next');if(next.length>1)fail();url=null
    qaStage='pagination'
    if(next.length){
     let parsed;try{parsed=new URL(next[0].href)}catch{fail()}
     if(next[0].method!=='GET'||parsed.origin!==HOST||parsed.pathname!==base+'/transactions'||parsed.username||parsed.password||parsed.hash||
      parsed.searchParams.get('start_time')!==start||parsed.searchParams.get('end_time')!==now||
      [...parsed.searchParams.keys()].some(k=>!['start_time','end_time','page','page_size'].includes(k)||parsed.searchParams.getAll(k).length!==1))fail()
     url=parsed.href
    }
   }
   qaStage='transaction_coverage'
   if(count!==totalItems||pages!==Math.max(1,totalPages)||(totalPages===0&&count!==0))fail()
   return Object.freeze({source:'original_qa_provider_audit_v1',bindingVerified:true,planVerified:true,
    originalGenerationVerified:true,status:d.status,statusUpdatedAt:canonicalPaypalInstant(d.status_update_time),
    createTime:canonicalPaypalInstant(d.create_time),observedAt:canonicalPaypalInstant(now),transactionsComplete:true,transactionCount:count,completedPayments:completed,
    lastPaymentPresent:d.billing_info?.last_payment!=null,nextBillingPresent:d.billing_info?.next_billing_time!=null,
    cycleExecutionsPresent:Array.isArray(d.billing_info?.cycle_executions),
    mayCreate:false,mayCancel:false,mayGrantBenefits:false})
   }catch(error){throw Object.assign(Error('qa_original_provider_audit_unavailable'),{qaStage,originalPlanVerified,providerFailure:error?.providerFailure,providerHttpStatus:error?.providerHttpStatus,providerErrorName:error?.providerErrorName,providerDebugId:error?.providerDebugId})}
  },
  async readSaleDisputes(args={}){
   // Corroborate the exact original subscription and transaction before the
   // dispute API. Never inspect unrelated merchant or customer transactions.
   const x=await transactionForSale(args),t=await token()
   const read=createPazoLiveDisputeEvidenceReader({getJson:path=>json(fetchImpl,HOST+path,{method:'GET',headers:auth(t)})})
   return read({saleId:args.saleId,originalPaymentAt:x.time,knownDisputeIds:args.knownDisputeIds})
  },
  async readVerifiedSubscription({subscriptionId,intentId,expectedGeneration}={}){
   if(expectedGeneration!==merchantGeneration)fail()
   return subscription(subscriptionId,intentId)
  },
  async readBillingSnapshot({subscriptionId,intentId,expectedGeneration}={}){
   if(expectedGeneration!==merchantGeneration||!SUB.test(subscriptionId||'')||!INTENT.test(intentId||''))fail()
   const t=await token()
   const raw=await json(fetchImpl,HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),
    {method:'GET',headers:auth(t)})
   if(raw.id!==subscriptionId||raw.plan_id!==planId||raw.custom_id!==intentId)fail()
   const plan=await json(fetchImpl,HOST+'/v1/billing/plans/'+encodeURIComponent(planId),
    {method:'GET',headers:auth(t)})
   return normalizePazoLiveBillingSnapshot({subscription:raw,plan,subscriptionId,intentId,merchantGeneration})
  },
  async readCompletedSale(args={}){
   const x=await transactionForSale(args)
   if(x.status!=='COMPLETED')fail()
   return Object.freeze({verified:true,sourceEnvironment:'live',
    merchantGeneration,subscriptionId:args.subscriptionId,intentId:args.intentId,
    saleId:args.saleId,amountMinor:299,currency:'USD',paidAt:x.time,
    originVerified:true,originSource:'original_generation_subscription_transactions',
    servicePeriodVerified:false,paidThrough:null,mayGrantBenefits:false})
  },
  async readRefundEvidence(args={}){
   const x=await transactionForSale(args)
   if(!['REFUNDED','PARTIALLY_REFUNDED'].includes(x.status))fail()
   // Partial refunds need explicit business policy. Never automatically
   // revoke an entire paid period or grant paidThrough from this response.
   return Object.freeze({verified:true,sourceEnvironment:'live',
    merchantGeneration,subscriptionId:args.subscriptionId,intentId:args.intentId,
    saleId:args.saleId,status:x.status,
    refundKind:x.status==='REFUNDED'?'refunded':'partially_refunded',
    amountMinor:299,currency:'USD',originalPaymentAt:x.time,
    holdReviewRequired:x.status==='PARTIALLY_REFUNDED',
    originVerified:true,originSource:'original_generation_subscription_transactions',
    providerReversalVerified:x.status==='REFUNDED',
    mayMutateBenefits:false,paidThrough:null})
  },
  async readReversalEvidence(args={}){
   const x=await transactionForSale(args)
   if(x.status!=='REFUNDED')fail()
   const t=await token()
   // Subscription SALE resources have no v2 capture ID. Read the original
   // v1 sale only as corroboration; never create/capture/refund through it.
   const d=await json(fetchImpl,HOST+'/v1/payments/sale/'+encodeURIComponent(args.saleId),
    {method:'GET',headers:auth(t)})
   if(d.id!==args.saleId||d.billing_agreement_id!==args.subscriptionId||d.state!=='refunded'||
    d.reason_code!=='CHARGEBACK'||d.amount?.currency!=='USD'||d.amount.total!=='2.99'||
    !date(d.create_time)||Date.parse(d.create_time)!==Date.parse(x.time))fail()
   return Object.freeze({verified:true,providerReversalVerified:true,sourceEnvironment:'live',merchantGeneration,
    subscriptionId:args.subscriptionId,intentId:args.intentId,saleId:args.saleId,status:'REFUNDED',
    refundKind:'reversed',amountMinor:299,currency:'USD',originalPaymentAt:x.time,
    originVerified:true,originSource:'original_generation_subscription_transactions',
    holdReviewRequired:false,mayMutateBenefits:false,paidThrough:null})
  }
 })
}
