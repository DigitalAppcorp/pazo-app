// F16: fail-closed settlement decision, independent of beta domain.
// This never calls PayPal nor grants benefits by itself. It accepts ONLY
// an already verified merchant-scoped receipt from a trusted server verifier.
// All billing periods must have independently proven start/end: do not
// manufacture cycle dates from billing cadence or PayPal redirect.
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const CYCLE=/^[A-Za-z0-9_-]{6,100}$/
const fail=code=>Object.freeze({ready:false,reason:code,mayGrantBenefits:false})
const iso=s=>typeof s==='string'&&s.length>=20&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===new Date(Date.parse(s)).toISOString()
export function assessPazoLiveVerifiedSale({binding,receipt,period}={}){
 if(binding?.sourceEnvironment!=='live'||binding?.provider!=='paypal'||
  binding?.ownerVerified!==true||binding?.merchantGenerationVerified!==true||
  !UUID.test(binding?.ownerId||'')||!INTENT.test(binding?.intentId||'')||
  !SUB.test(binding?.subscriptionId||'')||
  !Number.isSafeInteger(binding?.merchantGeneration)||binding.merchantGeneration<1)
  return fail('immutable_live_binding_unverified')
 if(receipt?.sourceEnvironment!=='live'||receipt?.provider!=='paypal'||
  receipt?.merchantVerified!==true||receipt?.signatureVerified!==true||
  receipt?.subscriptionVerified!==true||receipt?.state!=='COMPLETED'||
  receipt?.subscriptionId!==binding.subscriptionId||
  receipt?.merchantGeneration!==binding.merchantGeneration||
  !SALE.test(receipt?.saleId||'')||!SALE.test(receipt?.eventId||'')||
  receipt?.eventType!=='PAYMENT.SALE.COMPLETED'||
  receipt?.currency!=='USD'||receipt?.amountMinor!==299)
  return fail('provider_sale_not_proven')
 if(!CYCLE.test(period?.cycleKey||'')||
  !iso(period?.serviceStart)||!iso(period?.serviceEnd)||
  period?.providerPeriodVerified!==true||
  Date.parse(period.serviceStart)>=Date.parse(period.serviceEnd)||
  Date.parse(period.serviceEnd)-Date.parse(period.serviceStart)>32*86400000)
  return fail('provider_service_period_unverified')
 return Object.freeze({ready:true,mayGrantBenefits:false,
  record:Object.freeze({
   p_owner:binding.ownerId,p_intent:binding.intentId,
   p_subscription:binding.subscriptionId,p_generation:binding.merchantGeneration,
   p_event_id:receipt.eventId,p_sale_id:receipt.saleId,
   p_cycle_key:period.cycleKey,p_amount_minor:299,p_currency:'USD',
   p_start:period.serviceStart,p_end:period.serviceEnd
  })})
}
export function assessPazoLiveVerifiedReversal({binding,receipt}={}){
 if(binding?.sourceEnvironment!=='live'||binding?.provider!=='paypal'||
  binding?.ownerVerified!==true||binding?.merchantGenerationVerified!==true||
  !UUID.test(binding?.ownerId||'')||!INTENT.test(binding?.intentId||'')||
  !SUB.test(binding?.subscriptionId||'')||
  !Number.isSafeInteger(binding?.merchantGeneration)||binding.merchantGeneration<1)
  return fail('immutable_live_binding_unverified')
 if(receipt?.provider!=='paypal'||receipt?.sourceEnvironment!=='live'||
  receipt?.signatureVerified!==true||receipt?.merchantVerified!==true||
  receipt?.subscriptionVerified!==true||
  receipt?.subscriptionId!==binding.subscriptionId||
  receipt?.merchantGeneration!==binding.merchantGeneration||
  !SALE.test(receipt?.saleId||'')||!SALE.test(receipt?.eventId||'')||
  !SALE.test(receipt?.holdId||'')||
  !['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(receipt?.eventType))
  return fail('provider_reversal_not_proven')
 return Object.freeze({ready:true,mayGrantBenefits:false,
  record:Object.freeze({
   p_owner:binding.ownerId,p_intent:binding.intentId,
   p_subscription:binding.subscriptionId,p_generation:binding.merchantGeneration,
   p_sale_id:receipt.saleId,p_event_id:receipt.eventId,
   p_hold_id:receipt.holdId,
   p_kind:receipt.eventType==='PAYMENT.SALE.REFUNDED'?'refunded':'reversed'
  })})
}
