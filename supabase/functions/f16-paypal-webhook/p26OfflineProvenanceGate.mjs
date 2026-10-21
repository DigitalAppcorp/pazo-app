// PAZO F16-P26: offline-only gate. Inputs are NOT authenticated by this module.
// Import nowhere in frontend/Edge/worker. No financial writer or provider calls.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const safe=(phase,reason)=>Object.freeze({
 step:'f16_p26_offline_provenance_gate',environment:'sandbox',phase,reason,
 sourceAttestedByThisCode:false,cycleVerified:false,
 financialHistoryComplete:false,refundsDisputesCoverageComplete:false,
 mayRecordPayment:false,mayGrantBenefits:false,mayCreatePaidPeriod:false,
 paidThrough:null,periodStart:null,periodEnd:null,dbWrites:0,networkPaymentWrites:0,
})
const review=reason=>safe('REVIEW_REQUIRED',reason)
const deny=reason=>safe('DENIED',reason)
// This gate never emits PROVEN or READY_TO_CREDIT: that state requires a
// separately reviewed merchant integration and transactionally fenced ledger.
export function assessP26FirstObligationEvidence({
 claim,originalEvent,merchantSale,merchantSubscription,
 privateBinding,consent,reviewReservation,history,refunds,disputes,
}={}){
 if(!claim||claim.workerEnabled!==true||claim.status!=='processing'||
    !REF.test(claim.eventId||'')||!UUID.test(claim.leaseToken||'')||
    claim.leaseValid!==true||claim.prospectiveCutoffPassed!==true)
  return deny('live_prospective_claim_required')
 if(!originalEvent||originalEvent.id!==claim.eventId||
    originalEvent.eventType!=='PAYMENT.SALE.COMPLETED'||
    originalEvent.signatureStatus!=='verified'||
    originalEvent.persistedInVerifiedInbox!==true)
  return deny('verified_ingress_evidence_required')
 if(!merchantSale||!REF.test(merchantSale.id||'')||
    merchantSale.eventId!==claim.eventId||
    merchantSale.status!=='COMPLETED'||merchantSale.currency!=='USD'||
    merchantSale.amountMinor!==299||!SUB.test(merchantSale.subscriptionId||''))
  return review('original_merchant_sale_mismatch')
 if(!merchantSubscription||
    merchantSubscription.id!==merchantSale.subscriptionId||
    !INTENT.test(merchantSubscription.intentId||'')||
    !['ACTIVE','CANCELLED'].includes(merchantSubscription.status))
  return deny('merchant_subscription_mismatch')
 if(!privateBinding||privateBinding.state!=='bound'||
    privateBinding.intentId!==merchantSubscription.intentId||
    privateBinding.subscriptionId!==merchantSale.subscriptionId||
    !UUID.test(privateBinding.ownerId||''))
  return deny('private_owner_intent_mismatch')
 if(!consent||consent.validP06!==true||
    consent.intentId!==privateBinding.intentId||
    consent.ownerId!==privateBinding.ownerId||
    consent.immutablePublishedOffer!==true||
    consent.sha256Verified!==true)
  return deny('original_consent_not_attested')
 // The existing pazo-supporter-sandbox.qa* acceptance explicitly grants
 // NO paid service period or benefits. Even a genuinely consented QA sale
 // must not be promoted to a prospective paid-service contract.
 // These flags must eventually originate from an independently verified
 // immutable, published *service* offer; this OFFLINE gate cannot attest
 // them on its own.
 if(consent.offerPurpose!=='PAID_SERVICE_PROSPECTIVE'||
    consent.firstPeriodContractAttested!==true||
    consent.qaOnly!==false||
    typeof consent.termsVersion!=='string'||
    consent.termsVersion.length<8||
    /(?:^|[.-])qa(?:[.\d-]|$)/i.test(consent.termsVersion))
  return deny('prospective_paid_service_terms_not_attested')
 if(!reviewReservation||reviewReservation.state!=='review_required'||
    reviewReservation.intentId!==privateBinding.intentId||
    reviewReservation.ownerId!==privateBinding.ownerId||
    reviewReservation.eventId!==claim.eventId||
    reviewReservation.saleId!==merchantSale.id||
    reviewReservation.obligationOrdinal!==0)
  return deny('p25_reservation_binding_mismatch')
 // Upstream results are informative observations, not proof of source,
 // complete history, reversals, contractual cycle or an atomic ledger write.
 if(!history||history.phase!=='WINDOWS_CHECKED_REVIEW_ONLY')
  return review('merchant_history_incomplete')
 if(!refunds||!['NO_REFUND_REFS_REVIEW_ONLY',
   'REFUND_LINEAGE_REVIEW_ONLY'].includes(refunds.phase))
  return review('refund_lineage_unresolved')
 if(!disputes||disputes.phase!=='DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY')
  return review('disputes_unresolved')
 return review('merchant_source_cycle_reversals_and_atomic_credit_unproven')
}
