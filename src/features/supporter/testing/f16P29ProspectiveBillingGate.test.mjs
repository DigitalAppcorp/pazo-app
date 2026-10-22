import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateF16ProspectiveBillingGate as check} from '../../../../supabase/functions/f16-paypal-webhook/p29ProspectiveBillingGate.mjs'
const keys=['publishedTerms','ownerAcceptance','providerSaleVerified','contractCycleVerified','refundCoverageVerified','disputeCoverageVerified','idempotentLedgerVerified','workerAuthorized']
test('missing prospective evidence blocks each independent gate',()=>{
 for(const key of keys){
  const evidence=Object.fromEntries(keys.map(k=>[k,k!==key]))
  const x=check(evidence)
  assert.equal(x.phase,'BLOCKED');assert.deepEqual(x.blockers,[key])
  assert.equal(x.mayRecordPayment,false);assert.equal(x.mayGrantBenefits,false)
 }
})
test('even all caller-supplied evidence claims cannot authorize financial actions',()=>{
 const x=check(Object.fromEntries(keys.map(k=>[k,true])))
 assert.equal(x.phase,'REVIEW_REQUIRED');assert.equal(x.evidenceAttested,false)
 assert.equal(x.productionAuthorized,false);assert.equal(x.mayRecordPayment,false)
 assert.equal(x.mayCreatePaidPeriod,false);assert.equal(x.paidThrough,null)
})
test('empty input fails closed',()=>{assert.equal(check().blockers.length,keys.length)})
