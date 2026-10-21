// F16-P05 — approved prospective FIRST service-period rule, OFFLINE ONLY.
// Evaluates synthetic asserted evidence; does NOT attest actual PayPal signatures,
// create a cycle/ledger, grant entitlements, store data, or verify legal consent.
const UTC=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/
const validTime=s=>typeof s==='string'&&UTC.test(s)&&Number.isFinite(Date.parse(s))&&
 (new Date(s).toISOString()===s||new Date(s).toISOString().replace(/\.000Z$/,'Z')===s)
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const ID=/^[A-Za-z0-9._:-]{3,128}$/
const DIGEST=/^[a-f0-9]{64}$/
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===keys.slice().sort().join('|')
const B=Object.freeze({
 environment:'sandbox',step:'f16_p05_first_service_period_policy_lab',
 prospectiveOnly:true,sourceAttestationPerformed:false,
 cycleVerified:false,saleCycleAllocationVerified:false,
 periodStart:null,periodEnd:null,paidThrough:null,
 mayCreatePaidPeriod:false,mayRecordPayment:false,mayGrantBenefits:false,
 mayCountCommemorativeMonth:false,mayEnableCheckout:false,
 needsManualReview:true,networkPaymentWrites:0,dbWrites:0,
})
const deny=reason=>Object.freeze({...B,phase:'REVIEW_REQUIRED',reason})
const K=Object.freeze({
 contract:['scope','subscriptionId','intentId','termsDigest','termsVersion',
  'termsAcceptedAt','subscriptionCreatedAt','ownerBound','priceMinor',
  'currency','cadence','setupFeeMinor'],
 activation:['subscriptionId','eventId','merchantStatus','eventType','eventAt',
  'signedEventClaimed','nextBillingAt','billingSnapshotAt','billingSnapshotSource'],
 payment:['subscriptionId','saleId','webhookEventId','completedAt','status',
  'currency','amountMinor','signedSaleEventClaimed','merchantSaleMatched',
  'allocationKind','firstRegularCharge'],
 finance:['refundStatus','disputeStatus','transactionHistoryCoverage',
  'reversalHistoryCoverage','knownExistingCycleCount'],
})
export function assessF16P05ApprovedFirstPeriodCandidate(input={}){
 if(!exact(input,['contract','activation','payment','finance']))
  return deny('first_cycle_evidence_shape_invalid')
 const {contract:c,activation:a,payment:p,finance:f}=input
 if(!exact(c,K.contract)||c.scope!=='PROSPECTIVE_ONLY'||
  !SUB.test(c.subscriptionId||'')||!ID.test(c.intentId||'')||
  !DIGEST.test(c.termsDigest||'')||!ID.test(c.termsVersion||'')||
  !validTime(c.termsAcceptedAt)||!validTime(c.subscriptionCreatedAt)||
  c.ownerBound!==true||c.priceMinor!==299||c.currency!=='USD'||
  c.cadence!=='MONTH_1')
  return deny('contract_acceptance_or_binding_unverified')
 if(c.setupFeeMinor===null||c.setupFeeMinor===undefined)
  return deny('setup_fee_unknown')
 if(c.setupFeeMinor!==0)return deny('unexpected_setup_fee')
 if(Date.parse(c.termsAcceptedAt)>Date.parse(c.subscriptionCreatedAt))
  return deny('terms_not_accepted_before_subscription_created')
 if(!exact(a,K.activation)||a.subscriptionId!==c.subscriptionId||
  !ID.test(a.eventId||'')||a.eventType!=='BILLING.SUBSCRIPTION.ACTIVATED'||
  a.merchantStatus!=='ACTIVE'||a.signedEventClaimed!==true||
  !validTime(a.eventAt)||!validTime(a.nextBillingAt)||
  !validTime(a.billingSnapshotAt)||
  a.billingSnapshotSource!=='MERCHANT_GET_AT_ACTIVATION')
  return deny('activation_and_provider_schedule_unverified')
 if(Date.parse(a.eventAt)<Date.parse(c.subscriptionCreatedAt)||
  Date.parse(a.billingSnapshotAt)<Date.parse(a.eventAt)||
  Date.parse(a.nextBillingAt)<=Date.parse(a.eventAt)||
  Date.parse(a.billingSnapshotAt)>=Date.parse(a.nextBillingAt))
  return deny('service_activation_schedule_chronology_invalid')
 if(!exact(p,K.payment)||p.subscriptionId!==c.subscriptionId||
  !ID.test(p.saleId||'')||!ID.test(p.webhookEventId||'')||
  !validTime(p.completedAt)||p.status!=='COMPLETED'||
  p.currency!=='USD'||p.amountMinor!==299||
  p.signedSaleEventClaimed!==true||p.merchantSaleMatched!==true)
  return deny('completed_sale_or_subscription_correlation_unverified')
 if(Date.parse(p.completedAt)<Date.parse(c.subscriptionCreatedAt)||
  Date.parse(p.completedAt)>=Date.parse(a.nextBillingAt))
  return deny('sale_not_within_first_provider_schedule')
 if(!['regular','retry','outstanding_capture','unknown'].includes(p.allocationKind)||
  p.allocationKind!=='regular'||p.firstRegularCharge!==true)
  return deny('sale_not_proven_as_original_regular_cycle')
 if(!exact(f,K.finance)||!['clear','open','unknown'].includes(f.refundStatus)||
  !['clear','open','unknown'].includes(f.disputeStatus)||
  !['complete','incomplete','unknown'].includes(f.transactionHistoryCoverage)||
  !['complete','incomplete','unknown'].includes(f.reversalHistoryCoverage)||
  !Number.isSafeInteger(f.knownExistingCycleCount)||f.knownExistingCycleCount<0)
  return deny('financial_coverage_or_idempotency_evidence_missing')
 if(f.refundStatus!=='clear'||f.disputeStatus!=='clear')
  return deny('reversal_or_dispute_pending')
 if(f.transactionHistoryCoverage!=='complete'||f.reversalHistoryCoverage!=='complete')
  return deny('financial_history_incomplete')
 if(f.knownExistingCycleCount!==0)
  return deny('first_cycle_already_present_or_duplicate')
 // All source flags above are caller-supplied assertions. They have NOT been
 // independently authenticated by this pure function. Do not output dates/IDs.
 // Even this maximum candidate state MUST NOT be imported into live entitlements.
 return Object.freeze({...B,phase:'FIRST_PERIOD_CANDIDATE_ONLY',
  reason:'prospective_contract_boundary_consistent_but_no_provider_attestation',
  startBasis:'VERIFIED_ACTIVATION_REQUIRED',
  endBasis:'PROVIDER_NEXT_BILLING_OBSERVED_AT_ACTIVATION_REQUIRED',
  endExclusive:true,requiresIndependentMerchantEvidence:true,
  requiresVersionedTermsAttestation:true,requiresServerSideIdempotency:true,
  requiresRetentionAndLegalRelease:true,
 })
}
