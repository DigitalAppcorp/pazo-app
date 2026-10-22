import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP32FirstPeriodContract as check} from '../../../../supabase/functions/f16-paypal-webhook/p32FirstPeriodContractLab.mjs'
const valid={activationTime:'2026-10-15T10:00:00Z',observedNextBillingTime:'2026-11-14T10:00:00Z',
 activationMerchantVerified:true,nextBillingMerchantVerified:true,regularSaleMatched:true,
 ownerIntentBound:true,originalConsentVerified:true,refundHistoryComplete:true,disputeHistoryComplete:true}
test('matching synthetic merchant dates never become paidThrough',()=>{
 const x=check(valid)
 assert.equal(x.contractIntervalCandidate,true);assert.equal(x.cycleVerified,false)
 assert.equal(x.mayRecordPayment,false);assert.equal(x.mayCreatePaidPeriod,false)
 assert.equal(x.mayGrantBenefits,false);assert.equal(x.paidThrough,null)
})
test('missing next date, reversed dates, inferred 30d and untrusted source block',()=>{
 for(const p of [{observedNextBillingTime:null},{observedNextBillingTime:'2026-10-14T10:00:00Z'},
 {nextBillingMerchantVerified:false},{originalConsentVerified:false},{regularSaleMatched:false}]){
  const x=check({...valid,...p})
  assert.equal(x.contractIntervalCandidate,false)
  assert.equal(x.periodStart,null);assert.equal(x.periodEnd,null)
 }
})
test('late payment or absent reversal coverage never generates extra cycle',()=>{
 assert.equal(check({...valid,lateOrRecovered:true}).reason,'recovered_payment_requires_verified_original_cycle')
 assert.equal(check({...valid,refundHistoryComplete:false}).reason,'reversal_history_incomplete')
})
