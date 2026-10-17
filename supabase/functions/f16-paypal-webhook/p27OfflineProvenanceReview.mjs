// F16-P27 offline bridge: compose already-existing P05 merchant readers with
// P26 fail-closed assessment. No live imports, no network by default,
// no ledger, no payment or entitlement writer.
import {assessP26FirstObligationEvidence} from './p26OfflineProvenanceGate.mjs'
import {assessF16P05FirstRegularObligation} from './p05FirstRegularObligationLab.mjs'
import {assessP24RefundLineage} from './p24RefundLineageLab.mjs'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const safe=(phase,reason)=>Object.freeze({phase,reason,environment:'sandbox',
 sourceAttestedByThisCode:false,mayRecordPayment:false,
 mayCreatePaidPeriod:false,mayGrantBenefits:false,
 financialHistoryComplete:false,paidThrough:null,dbWrites:0,
 networkPaymentWrites:0})
// Stable, minimal projection of the server-owned review fence. This is NOT
// authentication, only a defense against evidence changing between awaits.
// The eventual SQL financial writer MUST revalidate and lock these rows
// atomically in the SAME transaction as any ledger write.
const reviewFence=c=>JSON.stringify([
 c?.claim?.eventId,c?.claim?.leaseToken,c?.claim?.workerEnabled,
 c?.claim?.status,c?.claim?.leaseValid,c?.claim?.prospectiveCutoffPassed,
 c?.originalEvent?.id,c?.originalEvent?.eventType,
 c?.originalEvent?.signatureStatus,c?.originalEvent?.persistedInVerifiedInbox,
 c?.privateBinding?.ownerId,c?.privateBinding?.intentId,
 c?.privateBinding?.subscriptionId,c?.privateBinding?.state,
 c?.consent?.validP06,c?.consent?.intentId,c?.consent?.ownerId,
 c?.consent?.immutablePublishedOffer,c?.consent?.sha256Verified,
 c?.consent?.offerPurpose,c?.consent?.firstPeriodContractAttested,
 c?.consent?.qaOnly,c?.consent?.termsVersion,c?.consent?.termsDigest,
 c?.consent?.acceptedAt,c?.reviewReservation?.state,
 c?.reviewReservation?.intentId,c?.reviewReservation?.ownerId,
 c?.reviewReservation?.eventId,c?.reviewReservation?.saleId,
 c?.reviewReservation?.obligationOrdinal,
])
export function createP27OfflineProvenanceReview({
 scope='DISABLED', merchantReader,readPrivateReviewContext,
 readIndependentMerchantSale,inspectHistory,inspectRefunds,inspectDisputes,
 readFirstObligationEvidence,readRefundLineageEvidence,
}={}){
 if(scope!=='OFFLINE_SYNTHETIC_TEST_ONLY')
  return Object.freeze({inspect:async()=>safe('DISABLED','scope_disabled')})
 if(!merchantReader||typeof merchantReader.getMerchantEvent!=='function'||
  typeof merchantReader.getMerchantSubscription!=='function'||
  [readPrivateReviewContext,readIndependentMerchantSale,
   inspectHistory,inspectRefunds,inspectDisputes,
   readFirstObligationEvidence,readRefundLineageEvidence]
   .some(x=>typeof x!=='function'))
  throw Error('p27_offline_dependencies_required')
 return Object.freeze({async inspect({eventId,claimToken}={}){
  if(!REF.test(eventId||'')||!UUID.test(claimToken||''))
   return safe('DENIED','invalid_claim_request')
  try{
   // The merchantReader must independently enforce the live, private claim
   // before both GETs. No caller-supplied PayPal URLs are forwarded.
   const event=await merchantReader.getMerchantEvent({eventId,claimToken})
   if(event?.id!==eventId||
     event?.event_type!=='PAYMENT.SALE.COMPLETED'||
     !event.resource?.id||!event.resource?.billing_agreement_id)
    return safe('REVIEW_REQUIRED','merchant_event_invalid')
   const sub=await merchantReader.getMerchantSubscription({
    eventId,claimToken,subscriptionId:event.resource.billing_agreement_id})
   if(sub?.id!==event.resource.billing_agreement_id||
      !sub.custom_id)
    return safe('REVIEW_REQUIRED','merchant_subscription_invalid')
   const privateContext=await readPrivateReviewContext({
    eventId,claimToken,subscriptionId:sub.id,intentId:sub.custom_id})
   if(!privateContext||typeof privateContext!=='object')
    return safe('REVIEW_REQUIRED','private_claim_context_missing')
   // The exact claimed token is a credential-like fence: compare it before
   // any downstream history/refund/dispute inspections. Never echo it.
   if(privateContext.claim?.eventId!==eventId||
      privateContext.claim?.leaseToken!==claimToken)
    return safe('DENIED','private_claim_context_mismatch')
   const initialFence=reviewFence(privateContext)
   const source={
    ...privateContext,
    merchantSale:{
     id:event.resource.id,eventId,
     status:['COMPLETED','completed'].includes(event.resource.state)?'COMPLETED':null,
     currency:event.resource.amount?.currency,
     amountMinor:event.resource.amount?.total==='2.99'?299:null,
     subscriptionId:sub.id,
    },
    merchantSubscription:{
     id:sub.id,intentId:sub.custom_id,status:sub.status,
    },
   }
   // Reuse P26's single set of identity, P06-consent and P25-reservation
   // checks BEFORE requesting further merchant observations.
   const preflight=assessP26FirstObligationEvidence(source)
   if(preflight.phase!=='REVIEW_REQUIRED'||
      preflight.reason!=='merchant_history_incomplete')
    return safe(preflight.phase,preflight.reason)
   // Reuse the independent original SALE GET reader P29 only AFTER the
   // P26 identity/consent/reservation preflight. A signed webhook event is
   // not independent confirmation of the merchant sale's current state.
   // This synthetic callback must be backed by a lease-fenced server-only
   // reader in a separately authorized hosted execution; never by UI data.
   const originalSale=await readIndependentMerchantSale({
    saleId:event.resource.id,eventId,claimToken,
   })
   if(!originalSale||originalSale.id!==event.resource.id||
      originalSale.billing_agreement_id!==sub.id||
      !['COMPLETED','completed'].includes(originalSale.state)||
      originalSale.amount?.currency!=='USD'||
      originalSale.amount?.total!=='2.99')
    return safe('REVIEW_REQUIRED','independent_merchant_sale_unverified')
   // Offline-only observations; even all three cannot attest global
   // coverage or authorize a ledger write or paid service period.
   const [history,refunds,disputes]=await Promise.all([
    inspectHistory({eventId,claimToken}),
    inspectRefunds({eventId,claimToken,saleId:event.resource.id}),
    inspectDisputes({eventId,claimToken,saleId:event.resource.id}),
   ])
   // A server callback may hold the same object reference as the first
   // private read. Check the captured projection BEFORE passing that object
   // into another evaluator; it may have been mutated during merchant awaits.
   if(reviewFence(privateContext)!==initialFence)
    return safe('REVIEW_REQUIRED','private_claim_or_obligation_changed_during_review')
   const result=assessP26FirstObligationEvidence({
    ...source,history,refunds,disputes,
   })
   // Do not inspect raw contractual/refund evidence until every P26
   // merchant-history and dispute snapshot gate has been considered.
   if(result.reason!=='merchant_source_cycle_reversals_and_atomic_credit_unproven')
    return safe(result.phase,result.reason)
   const scope={eventId,claimToken,saleId:event.resource.id,
    subscriptionId:sub.id,intentId:sub.custom_id}
   const firstEvidence=await readFirstObligationEvidence(scope)
   // Bind both independent synthetic lab contracts to the SAME original
   // service acceptance, sale, owner intent and subscription.
   if(!firstEvidence||firstEvidence.contract?.saleId!==scope.saleId||
      firstEvidence.contract?.subscriptionId!==scope.subscriptionId||
      firstEvidence.contract?.intentId!==scope.intentId||
      firstEvidence.contract?.termsDigest!==privateContext.consent?.termsDigest||
      firstEvidence.contract?.termsAcceptedAt!==privateContext.consent?.acceptedAt)
    return safe('REVIEW_REQUIRED','first_obligation_contract_binding_missing')
   const first=assessF16P05FirstRegularObligation(firstEvidence)
   if(first.phase!=='CLEAN_FIRST_CHARGE_CANDIDATE_ONLY')
    return safe('REVIEW_REQUIRED','first_regular_obligation_ambiguous')
   const lineageEvidence=await readRefundLineageEvidence(scope)
   const chargedAt=firstEvidence.transactionHistory?.transactions?.[0]?.processedAt
   if(!lineageEvidence||
      lineageEvidence.originalSale?.id!==scope.saleId||
      lineageEvidence.originalSale?.completedAt!==chargedAt||
      lineageEvidence.originalSale?.grossMinor!==299||
      lineageEvidence.originalSale?.currency!=='USD')
    return safe('REVIEW_REQUIRED','refund_lineage_sale_binding_missing')
   const lineage=assessP24RefundLineage(lineageEvidence)
   if(lineage.phase!==refunds?.phase)
    return safe('REVIEW_REQUIRED','refund_summary_lineage_inconsistent')
   // Any completed, partial or pending refund still freezes the first
   // obligation; no synthetic receipt ever establishes global coverage.
   if(lineage.phase!=='NO_REFUND_REFS_REVIEW_ONLY')
    return safe('REVIEW_REQUIRED','refund_lineage_requires_review')
   // The merchant GETs above are asynchronous. A lease may expire, an
   // obligation may be reassigned or consent revoked while they run.
   // Fail closed on the latest server-owned review projection, then re-run
   // P26's authorization-free consistency check. Still NOT an atomic commit.
   const finalContext=await readPrivateReviewContext({
    eventId,claimToken,subscriptionId:sub.id,intentId:sub.custom_id,
   })
   if(!finalContext||reviewFence(finalContext)!==initialFence)
    return safe('REVIEW_REQUIRED','private_claim_or_obligation_changed_during_review')
   const finalReview=assessP26FirstObligationEvidence({
    ...source,...finalContext,history,refunds,disputes,
   })
   if(finalReview.reason!=='merchant_source_cycle_reversals_and_atomic_credit_unproven')
    return safe('REVIEW_REQUIRED','private_claim_or_obligation_changed_during_review')
   return safe(result.phase,result.reason)
  }catch{return safe('REVIEW_REQUIRED','merchant_or_private_evidence_unavailable')}
 }})
}
