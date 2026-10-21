// PAZO F16 — LIVE signed-webhook private owner + merchant resolver, NOT WIRED.
// This resolver runs only AFTER PayPal webhook postback SUCCESS and uses
// DB-stored subscription binding; never takes owner or merchant from PayPal
// custom fields. It reads provider facts, never credits money or benefits.
const OWNER=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const PAYMENT=new Set(['PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED',
 'PAYMENT.SALE.REVERSED'])
const SUBSCRIPTION=new Set([
 'BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.ACTIVATED',
 'BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.CANCELLED',
 'BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.EXPIRED',
 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'
])
const unavailable=()=>{throw Error('live_owner_merchant_scope_unavailable')}
export function requirePazoLiveProviderSubscription(eventType,resource){
 if(!resource||Array.isArray(resource)||typeof resource!=='object')return null
 const id=PAYMENT.has(eventType)?resource.billing_agreement_id:
  SUBSCRIPTION.has(eventType)?resource.id:null
 if(!SUB.test(id||''))return null
 if(PAYMENT.has(eventType)&&!SALE.test(resource.id||''))return null
 return id
}
export function createPazoLiveOwnerScopeResolver({
 findBoundSubscription,readerForGeneration,findOriginalSaleBinding
}={}){
 if(typeof findBoundSubscription!=='function'||
  typeof readerForGeneration!=='function')
  throw Error('live_scope_adapters_not_configured')
 return async({eventId,eventType,resource,sourceEnvironment,merchantGeneration}={})=>{
  if(sourceEnvironment!=='live'||!SALE.test(eventId||''))unavailable()
  let subscriptionId=requirePazoLiveProviderSubscription(eventType,resource)
  let record
  let originalSaleId=null
  try{
   if(!subscriptionId&&['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(eventType)&&
    Number.isSafeInteger(merchantGeneration)&&typeof findOriginalSaleBinding==='function'){
    originalSaleId=resource?.sale_id||resource?.id
    if(!SALE.test(originalSaleId||''))unavailable()
    record=await findOriginalSaleBinding({merchantGeneration,saleId:originalSaleId})
    if(record?.recorded!==true||record.saleId!==originalSaleId||record.merchantGeneration!==merchantGeneration)unavailable()
    subscriptionId=record.subscriptionId
   }else{
    if(!subscriptionId)unavailable()
    record=await findBoundSubscription({subscriptionId})
   }
  }catch{unavailable()}
  if(!record||record.provider!=='paypal'||
   record.sourceEnvironment!=='live'||
   record.subscriptionId!==subscriptionId||
   !OWNER.test(record.ownerId||'')||
   !INTENT.test(record.intentId||'')||
   !PLAN.test(record.planId||'')||
   !Number.isSafeInteger(record.merchantGeneration)||
   record.merchantGeneration<1||
   record.state!=='bound'||record.consentVerified!==true)
   unavailable()
  let reader
  try{reader=await readerForGeneration({
   merchantGeneration:record.merchantGeneration,sourceEnvironment:'live'
  })}catch{unavailable()}
  if(typeof reader?.readVerifiedSubscription!=='function')unavailable()
  let verified
  try{verified=await reader.readVerifiedSubscription({
   subscriptionId,intentId:record.intentId,
   expectedGeneration:record.merchantGeneration
  })}catch{unavailable()}
  if(verified?.id!==subscriptionId||verified.plan_id!==record.planId||
   verified.custom_id!==record.intentId||
   verified.sourceEnvironment!=='live'||
   verified.merchantGeneration!==record.merchantGeneration)
   unavailable()
  // Only ownership + plan verified. A verified SELLING event must be
  // independently reconciled against a completed PayPal transaction and
  // confirmed billing period before a worker records payment.
  return Object.freeze({
   confirmed:true,sourceEnvironment:'live',
   ownerIntentVerified:true,planVerified:true,
   ownerId:record.ownerId,intentId:record.intentId,
   subscriptionId,merchantGeneration:record.merchantGeneration,
   ...(originalSaleId?{originalSaleId,originalSaleVerified:true}:{}),
   saleVerified:false,mayRecordPayment:false,mayGrantBenefits:false
  })
 }
}
export function createPazoLiveVerifiedInboxAdapter({queueVerifiedEvent}={}){
 if(typeof queueVerifiedEvent!=='function')
  throw Error('live_inbox_rpc_unavailable')
 return Object.freeze({
  async recordIfAbsent({provider,sourceEnvironment,merchantGeneration,
   ownerId,intentId,subscriptionId,eventId,eventType,signatureEvidence}={}){
   if(provider!=='paypal'||sourceEnvironment!=='live'||!OWNER.test(ownerId||'')||
    !INTENT.test(intentId||'')||!SUB.test(subscriptionId||'')||
    !Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
    !SALE.test(eventId||'')||
    !(PAYMENT.has(eventType)||SUBSCRIPTION.has(eventType)))unavailable()
   // RPC does not trust client owner; the future Edge composition must
   // derive owner through immutable private table + PayPal provider GET.
   let result
   try{result=await queueVerifiedEvent({
    ownerId,intentId,subscriptionId,merchantGeneration,eventId,eventType,
    ...(signatureEvidence===undefined?{}:{signatureEvidence})
   })}catch{unavailable()}
   if(result==='queued')return true
   if(result==='duplicate_verified_event')return false
   unavailable()
  }
 })
}
