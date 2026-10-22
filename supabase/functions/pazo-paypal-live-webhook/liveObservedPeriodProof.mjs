// Implements the PO's prospective contract boundary, not a PayPal-issued
// paid-period field. Dates come from signed activation / fresh merchant GET
// and the previous verified obligation. No calendar-month calculation.
import {canonicalPaypalInstant as iso} from './liveBillingSnapshot.mjs'
const review=(code,retryable=false)=>Object.freeze({ready:false,code,retryable,
 paymentRecorded:false,mayGrantBenefits:false})
export function createPazoLiveObservedPeriodProof({rpc,readerForGeneration,eventReaderForGeneration,
 verifyAcceptedConsent,now=Date.now}={}){
 return async({binding,event,lease,sale}={})=>{
  if([rpc,readerForGeneration,eventReaderForGeneration,verifyAcceptedConsent,now].some(f=>typeof f!=='function'))
   return review('period_source_not_configured')
  if(lease?.claimed!==true||event?.signatureVerified!==true||sale?.verified!==true||
   sale.originVerified!==true||sale.originSource!=='original_generation_subscription_transactions'||
   lease.eventId!==event.eventId||lease.ownerId!==binding?.ownerId||lease.intentId!==binding?.intentId||
   sale.saleId!==event.saleId||sale.subscriptionId!==binding?.subscriptionId||
   sale.merchantGeneration!==binding?.merchantGeneration)
   return review('period_original_sale_binding_unverified')
  let context,snapshot
  try{
   context=await rpc('financialContext',{p_generation:binding.merchantGeneration,
    p_event_id:event.eventId,p_lease:lease.leaseToken})
  }catch{return review('period_context_temporarily_unavailable',true)}
  if(context?.source!=='original_bound_live_financial_context'||context.ownerId!==binding.ownerId||
   context.intentId!==binding.intentId||context.subscriptionId!==binding.subscriptionId||
   context.merchantGeneration!==binding.merchantGeneration||context.planId!==binding.planId||
   context.eventId!==event.eventId||context.affirmativeConsent!==true||
   !iso(context.consentedAt)||!Number.isSafeInteger(context.paidPeriodCount)||context.paidPeriodCount<0||
   context.paidPeriodCount>=1200||context.activeHold!==false||context.unreconciledFinancialRisk!==false)
   return review('period_original_context_or_financial_hold')
  try{if(await verifyAcceptedConsent(context)!==true)return review('prospective_contract_version_unverified')}
  catch{return review('prospective_contract_version_unverified')}
  const paid=iso(sale.paidAt),instant=now()
  if(!paid||!Number.isFinite(instant)||Date.parse(context.consentedAt)>Date.parse(paid)||
   Date.parse(paid)>instant+60000||instant-Date.parse(paid)>86400000)
   return review('late_or_invalid_payment_requires_review')
  try{
   const reader=await readerForGeneration({merchantGeneration:binding.merchantGeneration,sourceEnvironment:'live'})
   snapshot=await reader.readBillingSnapshot({subscriptionId:binding.subscriptionId,intentId:binding.intentId,
    expectedGeneration:binding.merchantGeneration})
  }catch{return review('billing_snapshot_temporarily_unavailable',true)}
  if(snapshot?.verifiedProviderRead!==true||snapshot.proofSource!=='paypal_live_original_generation_get'||
   snapshot.sourceEnvironment!=='live'||snapshot.subscriptionId!==binding.subscriptionId||
   snapshot.intentId!==binding.intentId||snapshot.merchantGeneration!==binding.merchantGeneration||
   snapshot.planId!==binding.planId||snapshot.planTermsVerified!==true||snapshot.status!=='ACTIVE'||
   !iso(snapshot.observedAt)||Math.abs(instant-Date.parse(snapshot.observedAt))>300000||
   snapshot.lastPaymentAt!==paid||snapshot.lastPaymentMinor!==299||snapshot.currency!=='USD'||
   snapshot.cyclesCompleted!==context.paidPeriodCount+1||snapshot.failedPaymentsCount!==0||
   snapshot.outstandingBalanceZero!==true||snapshot.lastFailedPaymentPresent!==false||!iso(snapshot.nextBillingAt))
   return review('scheduled_obligation_not_uniquely_correlated')
  let start
  if(context.paidPeriodCount===0){
   if(!Array.isArray(context.activationReceipts)||context.activationReceipts.length===0)
    return review('signed_activation_receipt_pending',true)
   if(context.activationReceipts.length!==1||context.lastPaidPeriod!==null)
    return review('activation_history_ambiguous')
   const activation=context.activationReceipts[0]
   if(!iso(activation.activationAt)||activation.nextBillingAt!==snapshot.nextBillingAt||
    !/^[a-f0-9]{64}$/.test(activation.signedBodySha256||'')||
    Date.parse(context.consentedAt)>Date.parse(activation.activationAt))
    return review('activation_contract_boundary_unverified')
   let original
   try{
    const lookup=await eventReaderForGeneration({merchantGeneration:binding.merchantGeneration,sourceEnvironment:'live'})
    original=await lookup({eventId:activation.eventId,eventType:'BILLING.SUBSCRIPTION.ACTIVATED',
     expectedGeneration:binding.merchantGeneration})
   }catch{return review('activation_original_event_temporarily_unavailable',true)}
   if(original?.verifiedProviderRead!==true||original.provider!=='paypal'||original.sourceEnvironment!=='live'||
    original.merchantGeneration!==binding.merchantGeneration||original.eventId!==activation.eventId||
    original.eventType!=='BILLING.SUBSCRIPTION.ACTIVATED'||original.subscriptionId!==binding.subscriptionId||
    original.subjectId!==binding.subscriptionId||original.activationAt!==activation.activationAt||
    original.nextBillingAt!==activation.nextBillingAt)
    return review('activation_original_event_mismatch')
   start=activation.activationAt
  }else{
   const previous=context.lastPaidPeriod,expected='regular_'+String(context.paidPeriodCount).padStart(6,'0')
   if(previous?.cycleKey!==expected||previous.saleId===sale.saleId||
    !iso(previous.serviceStart)||!iso(previous.serviceEnd)||
    Date.parse(previous.serviceStart)>=Date.parse(previous.serviceEnd))
    return review('previous_obligation_boundary_unverified')
   start=previous.serviceEnd
  }
  const end=snapshot.nextBillingAt
  // Correlation tolerance is a review threshold, never extra service time.
  // Arrears, recovered/late payments and missed cycles are never reassigned.
  if(Date.parse(end)<=Date.parse(start)||Date.parse(end)-Date.parse(start)>32*86400000||
   Date.parse(paid)<Date.parse(start)-300000||Date.parse(paid)>Date.parse(start)+21600000||
   instant>=Date.parse(end))return review('obligation_dates_require_review')
  return Object.freeze({ready:true,code:'prospective_observed_obligation_correlated',retryable:false,
   period:Object.freeze({providerPeriodVerified:true,periodSource:'prospective_observed_billing_boundary',
    contractVersion:context.termsVersion,cycleKey:'regular_'+String(snapshot.cyclesCompleted).padStart(6,'0'),
    serviceStart:start,serviceEnd:end}),paymentRecorded:false,mayGrantBenefits:false})
 }
}
