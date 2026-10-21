// PAZO F16: unreleased original-merchant settlement reconciliation coordinator.
// This is a SERVER-ONLY orchestration contract. No HTTP entrypoint calls it yet.
// It NEVER guesses paid periods from PayPal renewal cadence or callback URLs.
// The event claimant and the period source MUST be durable trusted backends.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const CYCLE=/^[A-Za-z0-9_-]{6,100}$/
const review=code=>Object.freeze({
 state:'REVIEW_REQUIRED',code,entitlementGranted:false,paymentRecorded:false
})
const validIso=s=>typeof s==='string'&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s
// PayPal UTC timestamps need not include milliseconds. Billing period
// evidence is deliberately checked separately using strict canonical dates.
const validProviderInstant=s=>{
 if(typeof s!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s))return false
 const instant=Date.parse(s)
 if(!Number.isFinite(instant))return false
 const canonical=s.replace(/(?:\.(\d{1,3}))?Z$/,(_m,frac)=>'.'+(frac||'').padEnd(3,'0')+'Z')
 return new Date(instant).toISOString()===canonical
}

export function createPazoLiveSettlementReconciliationGate({
 released=false,claimVerifiedEvent,findOriginalBinding,readerForGeneration,
 proveOriginalServicePeriod,writer
}={}){
 return async function reconcile({queueEventId}={}){
  // Only a separate reviewed release enables this worker. An Edge public
  // webhook must NEVER invoke this code directly without durable queue claim.
  if(released!==true)return review('live_reconciler_not_released')
  if(typeof claimVerifiedEvent!=='function'||
   typeof findOriginalBinding!=='function'||
   typeof readerForGeneration!=='function'||
   typeof proveOriginalServicePeriod!=='function'||
   typeof writer?.recordVerifiedSale!=='function')
   return review('live_reconciler_not_configured')
  if(!SALE.test(queueEventId||''))return review('invalid_queue_event_id')
  let event
  try{event=await claimVerifiedEvent({queueEventId})}
  catch{return review('verified_event_claim_unavailable')}
  if(event?.claimed!==true||event?.eventId!==queueEventId||
   event?.signatureVerified!==true||event?.sourceEnvironment!=='live'||
   event?.provider!=='paypal'||event?.eventType!=='PAYMENT.SALE.COMPLETED'||
   !SUB.test(event?.subscriptionId||'')||!SALE.test(event?.saleId||'')||
   !Number.isSafeInteger(event?.merchantGeneration)||event.merchantGeneration<1)
   return review('verified_event_claim_not_proven')

  let binding
  try{binding=await findOriginalBinding({subscriptionId:event.subscriptionId})}
  catch{return review('immutable_binding_unavailable')}
  if(binding?.provider!=='paypal'||binding?.sourceEnvironment!=='live'||
   binding?.subscriptionId!==event.subscriptionId||
   binding?.merchantGeneration!==event.merchantGeneration||
   !UUID.test(binding?.ownerId||'')||!INTENT.test(binding?.intentId||'')||
   binding?.ownerVerified!==true||binding?.merchantGenerationVerified!==true)
   return review('immutable_binding_unverified')

  let provider
  try{provider=await readerForGeneration({
   merchantGeneration:binding.merchantGeneration,sourceEnvironment:'live'
  })}catch{return review('original_merchant_unavailable')}
  if(typeof provider?.readCompletedSale!=='function')
   return review('original_merchant_unavailable')

  // This window is used exclusively to retrieve the sale, not to assert the
  // paid-through date. Bounds must be chosen by a server-side audited source.
  let sale
  try{
   if(!validIso(event.searchStart)||!validIso(event.searchEnd)||
    Date.parse(event.searchStart)>=Date.parse(event.searchEnd)||
    Date.parse(event.searchEnd)-Date.parse(event.searchStart)>31*86400000)
    throw Error('window')
   sale=await provider.readCompletedSale({
    subscriptionId:binding.subscriptionId,intentId:binding.intentId,
    saleId:event.saleId,expectedGeneration:binding.merchantGeneration,
    startTime:event.searchStart,endTime:event.searchEnd
   })
  }catch{return review('provider_completed_sale_not_proven')}
  if(sale?.verified!==true||sale?.sourceEnvironment!=='live'||
   sale?.merchantGeneration!==binding.merchantGeneration||
   sale?.subscriptionId!==binding.subscriptionId||sale?.saleId!==event.saleId||
   sale?.originVerified!==true||sale?.originSource!=='original_generation_subscription_transactions'||
   sale?.amountMinor!==299||sale?.currency!=='USD'||
   !validProviderInstant(sale?.paidAt))
   return review('provider_completed_sale_not_proven')

  let period
  try{period=await proveOriginalServicePeriod({
   ownerId:binding.ownerId,intentId:binding.intentId,
   subscriptionId:binding.subscriptionId,
   merchantGeneration:binding.merchantGeneration,saleId:event.saleId,
   paidAt:sale.paidAt
  })}catch{return review('independent_service_period_unavailable')}
  if(period?.providerPeriodVerified!==true||
   !CYCLE.test(period?.cycleKey||'')||
   !validIso(period?.serviceStart)||!validIso(period?.serviceEnd)||
   Date.parse(period.serviceStart)>=Date.parse(period.serviceEnd)||
   Date.parse(period.serviceEnd)-Date.parse(period.serviceStart)>32*86400000)
   return review('independent_service_period_unverified')

  // These flags are derived only from the already-claimed persisted signed
  // event, independently resolved immutable DB binding and pinned PayPal GET.
  const proofBinding=Object.freeze({...binding})
  const receipt=Object.freeze({
   provider:'paypal',sourceEnvironment:'live',
   merchantVerified:sale.originVerified,signatureVerified:event.signatureVerified,subscriptionVerified:true,
   merchantGeneration:binding.merchantGeneration,
   subscriptionId:binding.subscriptionId,saleId:event.saleId,eventId:event.eventId,
   eventType:event.eventType,state:'COMPLETED',amountMinor:299,currency:'USD'
  })
  try{
   const result=await writer.recordVerifiedSale({
    binding:proofBinding,receipt,period
   })
   if(result?.state==='RECORDED'||result?.state==='ALREADY_RECORDED')
    return result
   return review('verified_ledger_write_requires_review')
  }catch{return review('verified_ledger_write_outcome_unknown')}
 }
}
