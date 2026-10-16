import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP26FirstObligationEvidence as assess} from '../../../../supabase/functions/f16-paypal-webhook/p26OfflineProvenanceGate.mjs'
const owner='11111111-1111-4111-8111-111111111111'
const token='22222222-2222-4222-8222-222222222222'
const intent='intent-77777777-7777-4777-8777-777777777777'
const valid=()=>({
 claim:{workerEnabled:true,status:'processing',eventId:'WH-P26-01',leaseToken:token,
  leaseValid:true,prospectiveCutoffPassed:true},
 originalEvent:{id:'WH-P26-01',eventType:'PAYMENT.SALE.COMPLETED',
  signatureStatus:'verified',persistedInVerifiedInbox:true},
 merchantSale:{id:'SALE-P26-01',eventId:'WH-P26-01',status:'COMPLETED',
  currency:'USD',amountMinor:299,subscriptionId:'I-P26-ONE'},
 merchantSubscription:{id:'I-P26-ONE',intentId:intent,status:'ACTIVE'},
 privateBinding:{intentId:intent,subscriptionId:'I-P26-ONE',ownerId:owner,state:'bound'},
 consent:{validP06:true,intentId:intent,ownerId:owner,
  immutablePublishedOffer:true,sha256Verified:true},
 reviewReservation:{state:'review_required',intentId:intent,ownerId:owner,
  eventId:'WH-P26-01',saleId:'SALE-P26-01',obligationOrdinal:0},
 history:{phase:'WINDOWS_CHECKED_REVIEW_ONLY'},
 refunds:{phase:'NO_REFUND_REFS_REVIEW_ONLY'},
 disputes:{phase:'DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY'}
})
const safe=(r)=>{
 assert.ok(['DENIED','REVIEW_REQUIRED'].includes(r.phase))
 for(const field of ['sourceAttestedByThisCode','cycleVerified',
  'financialHistoryComplete','refundsDisputesCoverageComplete',
  'mayRecordPayment','mayGrantBenefits','mayCreatePaidPeriod'])
  assert.equal(r[field],false,field)
 assert.equal(r.paidThrough,null);assert.equal(r.dbWrites,0)
 assert.equal(r.networkPaymentWrites,0)
 for(const value of ['SALE-P26-01','WH-P26-01',owner,intent,token])
  assert.ok(!JSON.stringify(r).includes(value))
}
test('P26 matching synthetic evidence still never authorizes financial rights',()=>{
 const r=assess(valid());safe(r);assert.equal(r.phase,'REVIEW_REQUIRED')
 assert.equal(r.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
})
test('P26 denies mismatched identities, replay and missing consent',()=>{
 const cases=[
  x=>{x.claim.workerEnabled=false},
  x=>{x.claim.leaseValid=false},
  x=>{x.claim.prospectiveCutoffPassed=false},
  x=>{x.originalEvent.signatureStatus='unverified'},
  x=>{x.merchantSale.id='SALE-FOREIGN';x.reviewReservation.saleId='SALE-P26-01'},
  x=>{x.merchantSale.subscriptionId='I-FOREIGN'},
  x=>{x.privateBinding.ownerId='33333333-3333-4333-8333-333333333333'},
  x=>{x.consent.validP06=false},
  x=>{x.consent.sha256Verified=false},
  x=>{x.reviewReservation.obligationOrdinal=1},
  x=>{x.reviewReservation.eventId='WH-FOREIGN'},
  x=>{x.merchantSale.amountMinor=300}
 ]
 for(const mutate of cases){
  const x=valid();mutate(x);const r=assess(x);safe(r)
  assert.notEqual(r.reason,'merchant_source_cycle_reversals_and_atomic_credit_unproven')
 }
})
test('P26 incomplete refund/dispute/history is review only',()=>{
 for(const edit of [
  x=>{x.history=null},
  x=>{x.refunds.phase='REVIEW_REQUIRED'},
  x=>{x.disputes.phase='REVIEW_REQUIRED'},
  x=>{x.refunds.phase='REFUND_LINEAGE_REVIEW_ONLY'},
 ]){const x=valid();edit(x);const r=assess(x);safe(r)}
})
test('P26 no inputs is denied and has no side effects',()=>{
 const r=assess();safe(r);assert.equal(r.phase,'DENIED')
})
