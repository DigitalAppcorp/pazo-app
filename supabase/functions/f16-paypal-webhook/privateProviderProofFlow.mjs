// PAZO F16 — OFFLINE ONLY. Not an Edge entrypoint, scheduler or released worker.
// The adapters must be SERVER-OWNED: SQL service_role inbox claim and private
// intent, Auth Admin getUserById, fixed-host PayPal Sandbox OAuth reads and
// atomic lease-bound finance RPC. No browser-provided owner or PayPal payload.
// NO entitlements, no checkout, no hosted execution.
import {assessPaypalSandboxPayment,PAZO_SANDBOX_PLAN} from './paymentReconciliation.mjs'
import {assessPaypalSandboxReversalEvidence} from './sandboxReversalEvidence.mjs'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DENY=(reason)=>Object.freeze({recorded:false,entitlement:false,reason})
const SALE='PAYMENT.SALE.COMPLETED',REFUND='PAYMENT.SALE.REFUNDED'
const safeResults=new Set(['inserted_uncredited','duplicate_uncredited',
 'inserted_blocked','duplicate_blocked','reversal_recorded','reversal_duplicate'])
export function createF16PrivateProviderProofFlow({
 leaseStore,eventReader,subscriptionReader,originalReader,
 loadPrivateBoundIntent,verifyAuthOwner,loadKnownReversalIds,financeStore,
}={}){
 if(typeof leaseStore?.claim!=='function'||typeof leaseStore?.release!=='function'||
    typeof eventReader?.readEvent!=='function'||
    typeof subscriptionReader?.read!=='function'||
    typeof originalReader?.readSale!=='function'||
    typeof originalReader?.readRefund!=='function'||
    typeof originalReader?.readVerifiedRefundEvent!=='function'||
    typeof loadPrivateBoundIntent!=='function'||
    typeof verifyAuthOwner!=='function'||typeof loadKnownReversalIds!=='function'||
    typeof financeStore?.commitClaimedSale!=='function'||
    typeof financeStore?.commitClaimedReversal!=='function')
  throw Error('f16_private_proof_flow_not_configured')

 async function inspectOwner(subscriptionId,observed){
  if(!SUB.test(subscriptionId||'')||
    observed?.lookupSubscriptionId!==subscriptionId||
    observed.merchantScopedByPayPalApi!==true||
    !Array.isArray(observed.transactions))
   return null
  const intent=await loadPrivateBoundIntent(subscriptionId)
  if(!intent||intent.state!=='bound'||intent.provider!=='paypal'||
     intent.planId!==PAZO_SANDBOX_PLAN||
     intent.externalSubscriptionId!==subscriptionId||
     !REF.test(intent.id||'')||!UUID.test(intent.ownerId||'')||
     observed.subscription?.id!==subscriptionId||
     observed.subscription?.custom_id!==intent.id||
     observed.subscription?.plan_id!==PAZO_SANDBOX_PLAN)
   return null
  // Auth Admin confirms this is STILL a real non-anonymous PAZO account.
  // The private intent proves binding; email/custom_id from browser do NOT.
  if(await verifyAuthOwner(intent.ownerId)!==true) return null
  return Object.freeze({...intent,verifiedOwnerBinding:true})
 }
 function matchingOriginal(original,paymentId,subscriptionId){
  return original?.verifiedByMerchantApi===true&&
   original.id===paymentId&&original.subscriptionId===subscriptionId&&
   original.currency==='USD'&&original.grossMinorUnits===299
 }
 function matchedTransaction(observed,paymentId){
  const matches=observed.transactions.filter(x=>x?.id===paymentId)
  return matches.length===1?matches[0]:null
 }
 async function saleProof(ref,event,window){
  if(!REF.test(event.externalPaymentId||'')||
     !SUB.test(event.externalSubscriptionId||''))return DENY('missing_sale_link')
  const sub=event.externalSubscriptionId
  const observed=await subscriptionReader.read({subscriptionId:sub,startTime:window.startTime,endTime:window.endTime})
  const intent=await inspectOwner(sub,observed)
  if(!intent) return DENY('owner_not_independently_verified')
  const transaction=matchedTransaction(observed,event.externalPaymentId)
  if(!transaction)return DENY('unique_payment_not_confirmed')
  const original=await originalReader.readSale(event.externalPaymentId)
  if(!matchingOriginal(original,event.externalPaymentId,sub)||
      original.state!=='completed')
   return DENY('original_sale_unverified')
  const reversals=await loadKnownReversalIds(sub)
  const decision=assessPaypalSandboxPayment({
   environment:'sandbox',intent,subscription:observed.subscription,
   transaction,transactionLookupSubscriptionId:observed.lookupSubscriptionId,
   merchantScopedByPayPalApi:observed.merchantScopedByPayPalApi,
   knownReversalIds:reversals,
  })
  if(decision.acceptedForLedger!==true||decision.entitlement!==false||
     !decision.candidate)return DENY('payment_reconciliation_blocked')
  return Object.freeze({ready:true,type:'sale',candidate:decision.candidate})
 }
 async function refundProof(ref,event,window){
  if(event.requiresReversalReview!==true)return DENY('reversal_event_invalid')
  const verifiedRefundEvent=await originalReader.readVerifiedRefundEvent(ref.eventId)
  if(verifiedRefundEvent.eventId!==ref.eventId||
     verifiedRefundEvent.eventType!==REFUND||
     !REF.test(verifiedRefundEvent.refundId||''))
   return DENY('refund_origin_not_verified')
  const refund=await originalReader.readRefund(verifiedRefundEvent.refundId)
  if(refund.id!==verifiedRefundEvent.refundId||
     refund.verifiedByMerchantApi!==true||refund.state!=='completed'||
     refund.currency!=='USD'||refund.refundMinorUnits<=0||
     refund.refundMinorUnits>299||!REF.test(refund.originalSaleId||''))
   return DENY('refund_original_not_verified')
  const original=await originalReader.readSale(refund.originalSaleId)
  if(!SUB.test(original.subscriptionId||'')||
     !matchingOriginal(original,refund.originalSaleId,original.subscriptionId))
   return DENY('original_sale_unverified')
  const observed=await subscriptionReader.read({subscriptionId:original.subscriptionId,startTime:window.startTime,endTime:window.endTime})
  const intent=await inspectOwner(original.subscriptionId,observed)
  if(!intent)return DENY('owner_not_independently_verified')
  const tx=matchedTransaction(observed,refund.originalSaleId)
  const kind=refund.refundMinorUnits===299?'REFUNDED':'PARTIALLY_REFUNDED'
  // Transaction history is independent of refund resource. Inconsistency
  // blocks closure, rather than guessing whether refund is full or partial.
  if(!tx||tx.status!==kind)return DENY('refund_history_not_concordant')
  const decision=assessPaypalSandboxReversalEvidence({
   environment:'sandbox',
   inbox:{ready:true,entitlement:false,
    handling:'reversal_requires_independent_original_payment_proof'},
   event:{eventId:ref.eventId,eventType:REFUND},
   independentlyVerifiedReversal:{
    eventId:ref.eventId,eventType:REFUND,verifiedByMerchantApi:true,
    originalSaleId:refund.originalSaleId,subscriptionId:original.subscriptionId,
    status:kind,verifiedAt:refund.verifiedAt,
   },
   independentlyVerifiedOriginalSale:{
    id:original.id,subscriptionId:original.subscriptionId,
    planId:PAZO_SANDBOX_PLAN,grossMinorUnits:original.grossMinorUnits,
    currency:original.currency,verifiedByMerchantApi:true,
   },
   merchantScopedByPayPalApi:observed.merchantScopedByPayPalApi,
  })
  if(decision.candidateForTombstone!==true||decision.entitlement!==false)
   return DENY('refund_reconciliation_blocked')
  // F16 P06 pending: one tombstone per sale cannot represent successive
  // partial refunds safely. Keep these cases unprocessed for review.
  if(decision.candidate?.kind==='partially_refunded')
   return DENY('partial_refund_ledger_not_ready')
  return Object.freeze({ready:true,type:'refund',candidate:decision.candidate})
 }
 return Object.freeze({
  async process(ref,window){
   if(ref?.provider!=='paypal'||!REF.test(ref.eventId||'')||
     (ref.eventType!==SALE&&ref.eventType!==REFUND))
    return DENY('unsupported_verified_event')
   if(!window||typeof window.startTime!=='string'||typeof window.endTime!=='string')
    return DENY('transaction_window_required')
   // claim() must call service-only atomic SQL, never receive a browser row.
   let claimed
   try{claimed=await leaseStore.claim(ref)}catch{return DENY('inbox_claim_unavailable')}
   if(claimed===null)return DENY('inbox_unavailable_or_claimed')
   if(claimed?.provider_event_id!==ref.eventId||
     claimed.event_type!==ref.eventType||
     !UUID.test(claimed.lease_token||'')||
     !Number.isInteger(claimed.attempt)||
     claimed.attempt<1||claimed.attempt>5||
     typeof claimed.lease_expires_at!=='string'||
     !Number.isFinite(Date.parse(claimed.lease_expires_at))||
     Date.parse(claimed.lease_expires_at)<=Date.now())
    throw Error('f16_inconsistent_claim_requires_private_recovery')
   let committed=false,answer=DENY('provider_proof_unavailable')
   try {
    const event=await eventReader.readEvent(ref.eventId)
    if(event?.eventId===ref.eventId&&event.eventType===ref.eventType){
     const proof=ref.eventType===SALE?
        await saleProof(ref,event,window):await refundProof(ref,event,window)
     if(!proof?.ready)answer=proof
     else {
      const result=proof.type==='sale'?
       await financeStore.commitClaimedSale({
        eventId:ref.eventId,leaseToken:claimed.lease_token,
        candidate:proof.candidate,planId:PAZO_SANDBOX_PLAN,
       }):
       await financeStore.commitClaimedReversal({
        eventId:ref.eventId,leaseToken:claimed.lease_token,
        candidate:proof.candidate,
       })
      if(!safeResults.has(result)||(
        proof.type==='sale'&&!result.endsWith('_uncredited')&&!result.endsWith('_blocked')
       )||(proof.type==='refund'&&!result.startsWith('reversal_')))
       throw Error('f16_financial_commit_unconfirmed')
      committed=true
      answer=Object.freeze({recorded:true,entitlement:false,reason:result})
     }
    }else answer=DENY('provider_event_mismatch')
   } catch {answer=DENY('provider_or_finance_unavailable')}
   if(!committed){
    // Conservatively release only with same token; if commit succeeded but
    // response was lost, this can fail -> explicit recovery, never false ACK.
    try {
     const released=await leaseStore.release(ref.eventId,claimed.lease_token,
       'unverified_provider_state')
     if(released!==true)throw Error('lease_recovery_pending')
    }catch {throw Error('f16_private_lease_recovery_required')}
   }
   return answer
  },
 })
}
