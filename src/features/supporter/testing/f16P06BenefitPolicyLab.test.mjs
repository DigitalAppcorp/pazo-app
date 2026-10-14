import test from 'node:test'
import assert from 'node:assert/strict'
import {classifyF16P06Cycle} from '../../../../supabase/functions/f16-paypal-webhook/p06BenefitPolicyLab.mjs'

const base={
 cycleBoundVerified:true,evidenceReconciled:true,periodVerified:true,
 paymentState:'completed',subscriptionState:'active',
 refundState:'none',refundMinor:0,disputeState:'none',
}
const check=(patch={})=>classifyF16P06Cycle({...base,...patch})
const safe=r=>{
 assert.equal(r.allowGrant,false)
 assert.equal(r.allowRevoke,false)
 assert.equal(r.mayChangeBilling,false)
 assert.equal(r.preserveFreeFeatures,true)
 assert.equal(r.entitlement,false)
 assert.equal(r.paidThrough,null)
 assert.equal(r.commemorativeMonths,null)
}
test('P06 approved cancellation keeps the proven, unreversed cycle but never charges or grants',()=>{
 const cancelled=check({subscriptionState:'cancelled'})
 safe(cancelled)
 assert.equal(cancelled.cycleHandling,'preserve_verified_paid_cycle')
 assert.equal(cancelled.reason,'cancelled_does_not_refund_verified_period')
 assert.equal(cancelled.needsReview,false)
})
test('P06 pending/failed payment never extends benefits, even on ACTIVE subscription',()=>{
 for(const paymentState of ['pending','failed']){
  const d=check({paymentState})
  safe(d)
  assert.equal(d.cycleHandling,'do_not_extend_cycle')
 }
})
test('P06 partial refund demands review of affected cycle, never automatic pro rata, cancellation, or removal',()=>{
 for(const cents of [1,100,199,298]){
  const d=check({refundState:'partial',refundMinor:cents,
   subscriptionState:'cancelled'})
  safe(d)
  assert.equal(d.cycleHandling,'review_affected_cycle')
  assert.equal(d.needsReview,true)
  assert.equal(d.reason,'partial_refund_no_automatic_proration')
 }
})
test('P06 verified full refund excludes this cycle in policy only, no revocation command',()=>{
 const d=check({refundState:'full',refundMinor:299})
 safe(d)
 assert.equal(d.cycleHandling,'exclude_refunded_cycle')
 assert.equal(d.reason,'full_refund_target_cycle_only')
 assert.equal(d.needsReview,false)
})
test('P06 full refund cannot be mapped to a cycle without P05 verified period',()=>{
 const d=check({refundState:'full',refundMinor:299,periodVerified:false})
 safe(d)
 assert.equal(d.cycleHandling,'manual_review')
 assert.equal(d.needsReview,true)
})
test('P06 disputes take precedence over refund, cancellation, or successful payment; never infer fraud',()=>{
 for(const disputeState of ['open','resolved','unknown']){
  const d=check({disputeState,refundState:'full',refundMinor:299,
   subscriptionState:'cancelled'})
  safe(d)
  assert.equal(d.cycleHandling,'hold_new_credit')
  assert.equal(d.reason,'dispute_needs_independent_resolution')
 }
})
test('P06 no period proof means no created paid-through or month count',()=>{
 const d=check({periodVerified:false})
 safe(d)
 assert.equal(d.reason,'billing_period_not_verified')
 assert.equal(d.cycleHandling,'manual_review')
})
test('P06 suspended or unknown status blocks even completed cycles pending evidence',()=>{
 for(const subscriptionState of ['suspended','unknown']){
  const d=check({subscriptionState})
  safe(d)
  assert.equal(d.cycleHandling,'manual_review')
 }
})
test('P06 reject contradictory amounts, unknown refund, forged assertions',()=>{
 for(const patch of [
  {refundState:'none',refundMinor:1},
  {refundState:'full',refundMinor:199},
  {refundState:'partial',refundMinor:299},
  {refundState:'partial',refundMinor:0},
  {refundState:'unknown',refundMinor:0},
 ]){
  const d=check(patch)
  safe(d)
  assert.equal(d.reason,'refund_evidence_inconsistent')
 }
 for(const patch of [
  {cycleBoundVerified:false},{evidenceReconciled:false},
 ]){
  const d=check(patch)
  safe(d)
  assert.equal(d.cycleHandling,'manual_review')
  assert.equal(d.reason,'cycle_or_provider_evidence_not_verified')
 }
})
test('P06 untrusted input and extra personal data are never accepted or echoed',()=>{
 for(const v of [undefined,null,'',[],{},false,
  {...base,paymentState:'completed',refundMinor:'0'},
  {...base,periodVerified:'true'},
  {...base,paymentState:'COMPLETED'},
  {...base,extraPayerEmail:'buyer@example.com'},
  {...base,refundMinor:1.5},
  {...base,refundMinor:-2},
 ]){
  const d=classifyF16P06Cycle(v)
  safe(d)
  assert.equal(d.cycleHandling,'manual_review')
  assert.equal(d.reason,'untrusted_or_incomplete_cycle_evidence')
  assert.equal(JSON.stringify(d).includes('buyer@example.com'),false)
 }
})
test('P06 matrix never creates an operational entitlement for any valid state combination',()=>{
 const states={
  paymentState:['completed','pending','failed','unknown'],
  subscriptionState:['active','cancelled','suspended','unknown'],
  disputeState:['none','open','resolved','unknown'],
 }
 let n=0
 for(const paymentState of states.paymentState)
  for(const subscriptionState of states.subscriptionState)
   for(const disputeState of states.disputeState)
    for(const [refundState,refundMinor] of [
      ['none',0],['partial',100],['full',299],['unknown',null]]){
     for(const periodVerified of [false,true]){
      const d=check({paymentState,subscriptionState,disputeState,
       refundState,refundMinor,periodVerified})
      safe(d)
      n++
     }
    }
 assert.equal(n,512)
})
