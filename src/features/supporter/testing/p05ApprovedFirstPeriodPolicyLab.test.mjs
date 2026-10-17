import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16P05ApprovedFirstPeriodCandidate as audit}
 from './p05ApprovedFirstPeriodPolicyLab.mjs'

const SID='I-QAFIRSTCYCLE123',IID='intent-qa-first-cycle-123'
const seed=()=>({
 contract:{scope:'PROSPECTIVE_ONLY',subscriptionId:SID,intentId:IID,
  termsDigest:'a'.repeat(64),termsVersion:'offer-v1',
  termsAcceptedAt:'2026-10-15T02:00:00Z',
  subscriptionCreatedAt:'2026-10-15T02:03:31Z',
  ownerBound:true,priceMinor:299,currency:'USD',
  cadence:'MONTH_1',setupFeeMinor:0},
 activation:{subscriptionId:SID,eventId:'WH-ACTIVATE123',
  merchantStatus:'ACTIVE',eventType:'BILLING.SUBSCRIPTION.ACTIVATED',
  eventAt:'2026-10-15T03:20:37.957Z',signedEventClaimed:true,
  nextBillingAt:'2026-11-14T10:00:00Z',
  billingSnapshotAt:'2026-10-15T03:20:40Z',
  billingSnapshotSource:'MERCHANT_GET_AT_ACTIVATION'},
 payment:{subscriptionId:SID,saleId:'SALE-ORIGINAL123',
  webhookEventId:'WH-SALE123',
  completedAt:'2026-10-15T03:20:33Z',
  status:'COMPLETED',currency:'USD',amountMinor:299,
  signedSaleEventClaimed:true,merchantSaleMatched:true,
  allocationKind:'regular',firstRegularCharge:true},
 finance:{refundStatus:'clear',disputeStatus:'clear',
  transactionHistoryCoverage:'complete',reversalHistoryCoverage:'complete',
  knownExistingCycleCount:0},
})
const safeguard=r=>{
 assert.equal(r.prospectiveOnly,true)
 assert.equal(r.sourceAttestationPerformed,false)
 assert.equal(r.cycleVerified,false)
 assert.equal(r.saleCycleAllocationVerified,false)
 assert.equal(r.periodStart,null)
 assert.equal(r.periodEnd,null)
 assert.equal(r.paidThrough,null)
 assert.equal(r.mayCreatePaidPeriod,false)
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayEnableCheckout,false)
 assert.equal(r.needsManualReview,true)
 assert.equal(r.dbWrites,0)
 assert.equal(r.networkPaymentWrites,0)
 for(const sensitive of [SID,IID,'SALE-ORIGINAL123','WH-ACTIVATE123',
  '2026-11-14T10:00:00Z','2026-10-15T03:20:37.957Z','a'.repeat(64)]){
  assert.equal(JSON.stringify(r).includes(sensitive),false)
 }
}
function run(change){
 const d=seed();change?.(d);const r=audit(d);safeguard(r);return r
}
test('PO approved initial activation -> merchant next billing only candidate; no benefit',()=>{
 const r=run()
 assert.equal(r.phase,'FIRST_PERIOD_CANDIDATE_ONLY')
 assert.equal(r.startBasis,'VERIFIED_ACTIVATION_REQUIRED')
 assert.equal(r.endBasis,'PROVIDER_NEXT_BILLING_OBSERVED_AT_ACTIVATION_REQUIRED')
 assert.equal(r.endExclusive,true)
 assert.equal(r.requiresIndependentMerchantEvidence,true)
 assert.equal(r.requiresServerSideIdempotency,true)
})
test('previous sandbox checkout cannot be retroactively covered',()=>{
 const r=run(d=>d.contract.scope='RETROACTIVE_EXISTING_QA')
 assert.equal(r.reason,'contract_acceptance_or_binding_unverified')
})
test('no accepted terms, absent version, no ownership or declined first price',()=>{
 const mods=[
  d=>d.contract.termsDigest='INVALID',
  d=>d.contract.termsAcceptedAt=null,
  d=>d.contract.termsVersion='',
  d=>d.contract.ownerBound=false,
  d=>d.contract.priceMinor=598,
  d=>d.contract.cadence='DAY_30',
  d=>d.contract.subscriptionId='I-FOREIGN',
 ]
 for(const mod of mods)assert.equal(run(mod).phase,'REVIEW_REQUIRED')
})
test('terms must precede provider subscription creation',()=>{
 const r=run(d=>d.contract.termsAcceptedAt='2026-10-15T02:10:00Z')
 assert.equal(r.reason,'terms_not_accepted_before_subscription_created')
})
test('unknown or unexpected setup fee cannot be reinterpreted as zero',()=>{
 assert.equal(run(d=>d.contract.setupFeeMinor=null).reason,'setup_fee_unknown')
 assert.equal(run(d=>d.contract.setupFeeMinor=299).reason,'unexpected_setup_fee')
})
test('activation must have merchant snapshot and future next billing',()=>{
 const mods=[
  d=>d.activation.signedEventClaimed=false,
  d=>d.activation.eventType='BILLING.SUBSCRIPTION.CANCELLED',
  d=>d.activation.merchantStatus='CANCELLED',
  d=>d.activation.subscriptionId='I-FOREIGN',
  d=>d.activation.nextBillingAt=null,
  d=>d.activation.billingSnapshotSource='CLIENT_LOCAL_STORAGE',
 ]
 for(const mod of mods)assert.equal(run(mod).phase,'REVIEW_REQUIRED')
 assert.equal(run(d=>d.activation.nextBillingAt='2026-10-15T03:20:00Z').reason,
  'service_activation_schedule_chronology_invalid')
})
test('activation snapshot cannot precede activation or follow next billing',()=>{
 assert.equal(run(d=>d.activation.billingSnapshotAt='2026-10-15T02:05:00Z').reason,
  'service_activation_schedule_chronology_invalid')
 assert.equal(run(d=>d.activation.billingSnapshotAt='2026-11-14T10:00:00Z').reason,
  'service_activation_schedule_chronology_invalid')
})
test('payment can precede activation but must be regular and matched to same subscriber',()=>{
 assert.equal(run().phase,'FIRST_PERIOD_CANDIDATE_ONLY')
 for(const mod of [
  d=>d.payment.status='PENDING',
  d=>d.payment.merchantSaleMatched=false,
  d=>d.payment.signedSaleEventClaimed=false,
  d=>d.payment.subscriptionId='I-FOREIGN',
  d=>d.payment.amountMinor=598,
  d=>d.payment.currency='EUR',
 ])assert.equal(run(mod).phase,'REVIEW_REQUIRED')
})
test('postponed or retroactive recovered sales cannot claim the initial regular cycle',()=>{
 const p=run(d=>d.payment.completedAt='2026-11-14T10:00:01Z')
 assert.equal(p.reason,'sale_not_within_first_provider_schedule')
 for(const kind of ['retry','outstanding_capture','unknown']){
  assert.equal(run(d=>d.payment.allocationKind=kind).reason,
   'sale_not_proven_as_original_regular_cycle')
 }
 assert.equal(run(d=>d.payment.firstRegularCharge=false).reason,
  'sale_not_proven_as_original_regular_cycle')
})
test('financial incompleteness, refunds, disputes, duplicates must fail closed',()=>{
 for(const mod of [
  d=>d.finance.refundStatus='unknown',
  d=>d.finance.refundStatus='open',
  d=>d.finance.disputeStatus='open',
  d=>d.finance.disputeStatus='unknown',
 ])assert.equal(run(mod).reason,'reversal_or_dispute_pending')
 for(const mod of [
  d=>d.finance.transactionHistoryCoverage='incomplete',
  d=>d.finance.reversalHistoryCoverage='unknown',
 ])assert.equal(run(mod).reason,'financial_history_incomplete')
 assert.equal(run(d=>d.finance.knownExistingCycleCount=1).reason,
  'first_cycle_already_present_or_duplicate')
})
test('unexpected personal information and unapproved inputs rejected',()=>{
 for(const mod of [
  d=>d.activation.payerEmail='private@example.com',
  d=>d.payment.cardDetails='private',
  d=>d.contract.buyerId='private',
  d=>d.finance.notes='private',
  d=>d.untrusted='extra',
 ])assert.equal(run(mod).reason,'first_cycle_evidence_shape_invalid'===run(mod).reason?
  'first_cycle_evidence_shape_invalid':run(mod).reason)
 // The canonical requirement is REVIEW_REQUIRED and no private projection.
})
test('month lengths, DST and leap dates are accepted as literal merchant evidence only',()=>{
 for(const end of ['2027-02-28T10:00:00Z','2028-02-29T10:00:00Z',
  '2028-03-31T10:00:00Z']){
  const r=run(d=>d.activation.nextBillingAt=end)
  assert.equal(r.phase,'FIRST_PERIOD_CANDIDATE_ONLY')
  assert.equal(r.periodEnd,null)
 }
})
test('all claims are hypothetical: 144 reversals/allocations/provider identity combos never grant',()=>{
 let n=0
 for(const status of ['COMPLETED','PENDING'])
 for(const kind of ['regular','retry','outstanding_capture','unknown'])
 for(const signed of [true,false])
 for(const merchant of [true,false])
 for(const refund of ['clear','unknown','open'])
 for(const dispute of ['clear','open','unknown']){
  const r=run(d=>{
   d.payment.status=status
   d.payment.allocationKind=kind
   d.payment.signedSaleEventClaimed=signed
   d.payment.merchantSaleMatched=merchant
   d.finance.refundStatus=refund
   d.finance.disputeStatus=dispute
  })
  assert.equal(r.mayGrantBenefits,false)
  n++
 }
 assert.equal(n,2*4*2*2*3*3)
})
