// PAZO F16 — refund reconciliation of an original recorded merchant sale.
// CODE ONLY / OFF BY DEFAULT. Event claim, immutable paid sale and original
// merchant provider reader MUST be independently authenticated server adapters.
// This module does not create a refund at PayPal nor grant/revoke entitlements.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const utc=s=>typeof s==='string'&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s
const review=code=>Object.freeze({
 state:'REVIEW_REQUIRED',code,entitlementGranted:false,paymentRecorded:false,
 refundRecorded:false
})
export function createPazoLiveRefundReconciliationGate({
 released=false,claimVerifiedEvent,findOriginalBinding,
 findRecordedSale,readerForGeneration,writer
}={}){
 return async function reconcileRefund({queueEventId}={}){
  if(released!==true)return review('live_refund_reconciler_not_released')
  if([claimVerifiedEvent,findOriginalBinding,findRecordedSale,
   readerForGeneration,writer?.recordVerifiedReversal].some(fn=>typeof fn!=='function'))
   return review('live_refund_reconciler_not_configured')
  if(!REF.test(queueEventId||''))return review('invalid_refund_queue_id')
  let event
  try{event=await claimVerifiedEvent({queueEventId})}
  catch{return review('signed_refund_event_claim_unavailable')}
  if(event?.claimed!==true||event?.eventId!==queueEventId||
   event?.sourceEnvironment!=='live'||event?.provider!=='paypal'||
   event?.signatureVerified!==true||
   !['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(event?.eventType)||
   !REF.test(event?.saleId||'')||!SUB.test(event?.subscriptionId||'')||
   !Number.isSafeInteger(event?.merchantGeneration)||event.merchantGeneration<1)
   return review('signed_refund_event_not_verified')

  let binding
  try{binding=await findOriginalBinding({subscriptionId:event.subscriptionId})}
  catch{return review('refund_original_binding_unavailable')}
  if(binding?.sourceEnvironment!=='live'||binding?.provider!=='paypal'||
   binding?.state!=='bound'||binding?.consentVerified!==true||
   binding?.subscriptionId!==event.subscriptionId||
   binding?.merchantGeneration!==event.merchantGeneration||
   !UUID.test(binding?.ownerId||'')||!INTENT.test(binding?.intentId||'')||
   !PLAN.test(binding?.planId||''))
   return review('refund_original_binding_unverified')
  let recorded
  try{recorded=await findRecordedSale({
   ownerId:binding.ownerId,intentId:binding.intentId,
   subscriptionId:binding.subscriptionId,
   merchantGeneration:binding.merchantGeneration,saleId:event.saleId
  })}catch{return review('refund_original_recorded_sale_unavailable')}
  if(recorded?.recorded!==true||recorded?.sourceEnvironment!=='live'||
   recorded?.ownerId!==binding.ownerId||recorded?.intentId!==binding.intentId||
   recorded?.subscriptionId!==binding.subscriptionId||
   recorded?.merchantGeneration!==binding.merchantGeneration||
   recorded?.saleId!==event.saleId||recorded?.amountMinor!==299||
   recorded?.currency!=='USD')
   return review('refund_original_recorded_sale_unverified')
  // Do not infer a reversal from a signed event alone. Subscription transaction
  // status must be independently obtained from the original pinned merchant.
  // Validate window BEFORE resolving merchant credentials or contacting
  // the original-merchant provider reader.
  if(!utc(event.searchStart)||!utc(event.searchEnd)||
    Date.parse(event.searchStart)>=Date.parse(event.searchEnd)||
    Date.parse(event.searchEnd)-Date.parse(event.searchStart)>31*86400000)
   return review('refund_audited_search_window_invalid')
  let reader
  try{reader=await readerForGeneration({
   merchantGeneration:binding.merchantGeneration,sourceEnvironment:'live'
  })}catch{return review('refund_original_merchant_unavailable')}
  if(typeof reader?.readRefundEvidence!=='function')
   return review('refund_original_merchant_unavailable')
  let evidence
  try{evidence=await reader.readRefundEvidence({
   subscriptionId:binding.subscriptionId,intentId:binding.intentId,
   saleId:event.saleId,expectedGeneration:binding.merchantGeneration,
   startTime:event.searchStart,endTime:event.searchEnd
  })}catch{return review('refund_provider_evidence_unavailable')}
  if(evidence?.verified!==true||evidence?.sourceEnvironment!=='live'||
   evidence?.merchantGeneration!==binding.merchantGeneration||
   evidence?.subscriptionId!==binding.subscriptionId||
   evidence?.intentId!==binding.intentId||
   evidence?.saleId!==event.saleId||
   evidence?.amountMinor!==299||evidence?.currency!=='USD')
   return review('refund_provider_evidence_unverified')
  // A PayPal subscription transaction REFUNDED supports a full refunded
  // status; PARTIALLY_REFUNDED does not support a full hold automatically.
  // REVERSED is not part of this transaction-status API: it needs a separate
  // provider reversal proof and stays review-only in this gate.
  if(event.eventType!=='PAYMENT.SALE.REFUNDED')
   return review('reversal_requires_separate_original_merchant_proof')
  if(evidence.status==='PARTIALLY_REFUNDED'||
   evidence.refundKind==='partially_refunded'||
   evidence.holdReviewRequired===true)
   return review('partial_refund_requires_manual_review')
  if(evidence.status!=='REFUNDED'||evidence.refundKind!=='refunded'||
   evidence.holdReviewRequired!==false)
   return review('full_refund_not_proven')

  const trustedBinding=Object.freeze({
   provider:'paypal',sourceEnvironment:'live',ownerVerified:true,
   merchantGenerationVerified:true,ownerId:binding.ownerId,
   intentId:binding.intentId,subscriptionId:binding.subscriptionId,
   merchantGeneration:binding.merchantGeneration
  })
  const trustedReceipt=Object.freeze({
   provider:'paypal',sourceEnvironment:'live',merchantVerified:true,
   signatureVerified:true,subscriptionVerified:true,
   subscriptionId:binding.subscriptionId,
   merchantGeneration:binding.merchantGeneration,
   saleId:event.saleId,eventId:event.eventId,
   holdId:event.eventId,eventType:event.eventType,
   currency:'USD',amountMinor:299,refundKind:'refunded',
   originalSaleVerified:true,providerReversalVerified:true
  })
  try{
   const result=await writer.recordVerifiedReversal({
    binding:trustedBinding,receipt:trustedReceipt
   })
   if(result?.state==='RECORDED'||result?.state==='ALREADY_RECORDED')
    return Object.freeze({...result,refundRecorded:result.state==='RECORDED',
     entitlementGranted:false,paymentRecorded:false})
   return review('verified_refund_ledger_requires_review')
  }catch{return review('verified_refund_write_outcome_unknown')}
 }
}
