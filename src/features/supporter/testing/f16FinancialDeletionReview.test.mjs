import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16FinancialDeletionReview} from '../../../../supabase/functions/f16-paypal-webhook/financialDeletionReview.mjs'

const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const empty={owner_id:owner,intent_count:0,payment_count:0,reversal_count:0,
 has_unresolved_global_financial_events:false}
function evaluate(row) {
 const review=createF16FinancialDeletionReview({loadPrivateExposure:async()=>row})
 return review.inspect(owner)
}
test('empty F16 records are not authorization to delete Auth or finance rows',async()=>{
 const result=await evaluate(empty)
 assert.equal(result.mayDeleteAuthUser,false)
 assert.equal(result.mayPurgeFinancialRecords,false)
 assert.equal(result.entitlement,false)
 assert.equal(result.financialReviewRequired,false)
})
test('intent, payment, reversal and pending provider records require finance review',async()=>{
 for(const patch of [{intent_count:1},{payment_count:1},{reversal_count:1},
  {has_unresolved_global_financial_events:true}]){
  const result=await evaluate({...empty,...patch})
  assert.equal(result.financialReviewRequired,true)
  assert.equal(result.mayDeleteAuthUser,false)
  assert.equal(result.mayPurgeFinancialRecords,false)
 }
})
test('untrusted, incomplete or extra-field outputs are quarantined',async()=>{
 for(const row of [null,undefined,false,{},[],{...empty,payment_count:-1},
  {...empty,intent_count:'0'},{...empty,owner_id:'not-matching'},
  {...empty,unexpected_field:'secret'}]){
  const result=await evaluate(row)
  assert.equal(result.financialReviewRequired,true)
  assert.equal(result.mayDeleteAuthUser,false)
 }
})
test('invalid owner never reaches private storage; server failures sanitize errors',async()=>{
 let reads=0
 const review=createF16FinancialDeletionReview({loadPrivateExposure:async()=>{
  reads++;throw Error('sensitive provider response')}})
 for(const id of ['','invalid','../x']) {
  const result=await review.inspect(id)
  assert.equal(result.reason,'invalid_owner_id')
 }
 assert.equal(reads,0)
 const result=await review.inspect(owner)
 assert.equal(result.reason,'private_financial_exposure_unavailable')
 assert.equal(JSON.stringify(result).includes('sensitive provider response'),false)
})
test('constructor requires server-supplied private exposure adapter',()=>{
 assert.throws(()=>createF16FinancialDeletionReview(),/reader_required/)
})
