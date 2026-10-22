import test from 'node:test'
import assert from 'node:assert/strict'
import {reviewPazoLiveSubscriptionTransactions as verify}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoPaypalLiveSubscriptionTransactionsProof.mjs'

const id='SALE-PAZO-20261017-00001'
const webhookTime='2026-10-17T11:30:00Z'
const paidTime='2026-10-17T11:22:00Z'
const transaction=(diff={})=>({
 id,status:'COMPLETED',time:paidTime,
 amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}},
 ...diff,
})
const req=(diff={})=>({
 document:{transactions:[transaction()],total_items:1,total_pages:1},
 expectedTransactionId:id,verifiedWebhookTime:webhookTime,...diff,
})
const blocked=r=>r.state==='BLOCKED' && !r.transactionVerified &&
 !r.mayRecordPayment && !r.mayCreatePaidPeriod && !r.mayGrantBenefits &&
 r.paidThrough===null
test('F16 PayPal subscriptions v1 completed transaction only yields REVIEW_REQUIRED',()=>{
 const result=verify(req())
 assert.equal(result.state,'REVIEW_REQUIRED')
 assert.equal(result.transactionVerified,true)
 assert.equal(result.transactionId,id)
 assert.equal(result.merchantPaidAt,paidTime)
 assert.equal(result.mayRecordPayment,false)
 assert.equal(result.mayCreatePaidPeriod,false)
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.paidThrough,null)
 assert.equal(result.serviceStart,null)
 assert.equal(result.serviceEnd,null)
})
test('F16 transaction never credits pending failed declined partially or fully refunded payments',()=>{
 for(const status of ['PENDING','DECLINED','FAILED','REFUNDED','PARTIALLY_REFUNDED'])
  assert.ok(blocked(verify(req({document:{
   transactions:[transaction({status})],total_items:1,total_pages:1
  }}))))
})
test('F16 transaction rejects insufficient pagination and duplicate matches',()=>{
 for(const document of [
   {transactions:[transaction()],total_items:2,total_pages:2},
   {transactions:[transaction()],total_items:2,total_pages:1},
   {transactions:[transaction()],total_items:1,total_pages:undefined},
   {transactions:[transaction(),transaction()],total_items:2,total_pages:1},
   {transactions:[],total_items:0,total_pages:1},
   {transactions:[transaction({id:'OTHER-TX-001'})],total_items:1,total_pages:1},
 ])
  assert.ok(blocked(verify(req({document}))))
})
test('F16 subscription transactions fail closed on price, currency and missing time',()=>{
 for(const changes of [
  {amount_with_breakdown:{gross_amount:{currency_code:'EUR',value:'2.99'}}},
  {amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.98'}}},
  {time:'2031-01-01T00:00:00Z'},
  {time:'broken'},
  {status:'APPROVED'},
 ]) assert.ok(blocked(verify(req({document:{
   transactions:[transaction(changes)],total_items:1,total_pages:1
 }}))))
})
test('F16 transaction empty, malformed and unverified arguments never credit',()=>{
 for(const inputs of [
  req({document:null}),req({document:{transactions:{},total_items:0,total_pages:1}}),
  req({expectedTransactionId:'../../unsafe'}),req({verifiedWebhookTime:'not-verified'}),
  req({document:{transactions:[null],total_items:1,total_pages:1}}),
  req({document:{transactions:Array.from({length:21},()=>transaction()),total_items:21,total_pages:1}}),
 ])assert.ok(blocked(verify(inputs)))
})
