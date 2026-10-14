import test from 'node:test'
import assert from 'node:assert/strict'
import {assessPaypalSandboxPayment,assessPaypalSandboxReversal,PAZO_SANDBOX_PLAN} from '../../../../supabase/functions/f16-paypal-webhook/paymentReconciliation.mjs'

const ownerId='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const subscriptionId='I-PAZO12345'
function context() {
 return {
  environment:'sandbox',
  intent:{id:'intent-correlation-123',provider:'paypal',ownerId,
    externalSubscriptionId:subscriptionId,planId:PAZO_SANDBOX_PLAN,
    state:'bound',verifiedOwnerBinding:true},
  subscription:{id:subscriptionId,plan_id:PAZO_SANDBOX_PLAN,custom_id:'intent-correlation-123',status:'ACTIVE'},
  transactionLookupSubscriptionId:subscriptionId,
  merchantScopedByPayPalApi:true,
  knownReversalIds:[],
  transaction:{id:'9AE123456789',status:'COMPLETED',time:'2026-10-13T19:00:00Z',
    amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}},
 }
}
test('verified completed payment is ONLY ledger candidate, never entitlement',()=>{
 const r=assessPaypalSandboxPayment(context())
 assert.equal(r.acceptedForLedger,true)
 assert.equal(r.entitlement,false)
 assert.equal(r.reason,'candidate_requires_atomic_persistence_and_period')
 assert.deepEqual(r.candidate,{
   provider:'paypal',externalPaymentId:'9AE123456789',externalSubscriptionId:subscriptionId,
   ownerId,grossMinorUnits:299,currency:'USD',completedAt:'2026-10-13T19:00:00Z',
 })
 assert.equal(JSON.stringify(r).includes('payer_email'),false)
})
test('approval, billing status and webhook alone cannot credit',()=>{
 for(const change of [
  {transaction:undefined},
  {transaction:{...context().transaction,status:'PENDING'}},
  {transaction:{...context().transaction,status:'FAILED'}},
  {transaction:{...context().transaction,status:'REFUNDED'}},
  {transaction:{...context().transaction,status:'PARTIALLY_REFUNDED'}},
 ]){
  const r=assessPaypalSandboxPayment({...context(),...change})
  assert.equal(r.acceptedForLedger,false)
  assert.equal(r.entitlement,false)
 }
})
test('no attribution to wrong owner, intent, subscription, plan or merchant',()=>{
 const c=context()
 for(const patch of [
  {intent:{...c.intent,ownerId:'wrong'}},
  {intent:{...c.intent,provider:'stripe'}},
  {intent:{...c.intent,verifiedOwnerBinding:false}},
  {intent:{...c.intent,state:'pending'}},
  {intent:{...c.intent,state:'revoked'}},
  {intent:{...c.intent,planId:'P-OTHER'}},
  {intent:{...c.intent,externalSubscriptionId:'I-OTHER'}},
  {subscription:{...c.subscription,custom_id:'wrong-intent'}},
  {subscription:{...c.subscription,plan_id:'P-OTHER'}},
  {transactionLookupSubscriptionId:'I-OTHER'},
  {merchantScopedByPayPalApi:false},
  {environment:'live'},
 ]){
  assert.equal(assessPaypalSandboxPayment({...c,...patch}).acceptedForLedger,false)
 }
})
test('amount, currency, time and missing payment ID are all rejected',()=>{
 const c=context()
 const variants=[
  {...c.transaction,amount_with_breakdown:{gross_amount:{currency_code:'EUR',value:'2.99'}}},
  {...c.transaction,amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'3.00'}}},
  {...c.transaction,amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.990'}}},
  {...c.transaction,time:'not-a-date'},
  {...c.transaction,time:'2026-02-30T19:00:00Z'},
  {...c.transaction,id:'bad/id'},
 ]
 for(const transaction of variants) {
  assert.equal(assessPaypalSandboxPayment({...c,transaction}).acceptedForLedger,false)
 }
})
test('unknown reversal state and pre-existing tombstone deny candidate',()=>{
 const c=context()
 assert.equal(assessPaypalSandboxPayment({...c,knownReversalIds:undefined}).reason,'reversal_state_unknown')
 assert.equal(assessPaypalSandboxPayment({...c,knownReversalIds:['9AE123456789']}).reason,'payment_reversed')
 assert.equal(assessPaypalSandboxPayment({...c,knownReversalIds:['https://invalid.example/xx']}).reason,'reversal_state_unknown')
})
test('reversal signal requires independent provider evidence',()=>{
 assert.deepEqual(assessPaypalSandboxReversal({
  environment:'sandbox',transactionId:'9AE123456789',
  verifiedTransactionStatus:'REFUNDED',
 }),{reconciliationRequired:true,reason:'provider_refund_confirmed',externalPaymentId:'9AE123456789'})
 assert.equal(assessPaypalSandboxReversal({
  environment:'sandbox',transactionId:'9AE123456789',verifiedTransactionStatus:'COMPLETED',
 }).reconciliationRequired,false)
 assert.equal(assessPaypalSandboxReversal({
  environment:'live',transactionId:'9AE123456789',verifiedTransactionStatus:'REFUNDED',
 }).reconciliationRequired,false)
})
test('user-controlled PII from PayPal never lands in minimal candidate',()=>{
 const c=context()
 c.transaction.payer_email='a.private@example.com'
 c.transaction.payer_id='HIDDEN'
 c.subscription.subscriber={email_address:'somebody@example.com'}
 const r=assessPaypalSandboxPayment(c)
 assert.equal(r.acceptedForLedger,true)
 assert.equal(JSON.stringify(r).includes('@example.com'),false)
 assert.equal(JSON.stringify(r).includes('HIDDEN'),false)
})
