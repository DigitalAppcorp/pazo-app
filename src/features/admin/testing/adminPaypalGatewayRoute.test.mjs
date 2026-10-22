import test from 'node:test'
import assert from 'node:assert/strict'
import {classifyBoundPaypalSubscription,classifyNewPaypalCheckout} from '../../../../supabase/functions/pazo-admin-paypal-validate/paymentGatewayRoute.mjs'
const legacy={
 ownerVerified:true,environment:'sandbox',provider:'paypal',
 source:'f16_legacy_qa',generation:1,planId:'P-14V25407JP6850922NLHMDKI',
 intentId:'intent-12345678-1234-4234-8234-123456789abc',
 subscriptionId:'I-TESTMERCHANT1234',
}
test('immutable original merchant is retained for historic read and cancellation classification',()=>{
 for(const operation of ['read','cancel','refund_review']){
  const x=classifyBoundPaypalSubscription({operation,binding:legacy})
  assert.equal(x.route,'f16_legacy_sandbox')
  assert.equal(x.mayCharge,false)
  assert.equal(x.mayCancel,false)
  assert.equal(x.mayRecordPayment,false)
 }
})
test('unknown generation or cross environment historical subscriptions fail closed, with no cross-merchant fallback',()=>{
 const others=[
  {...legacy,ownerVerified:false},
  {...legacy,environment:'live'},
  {...legacy,source:'live'},
  {...legacy,generation:2},
  {...legacy,planId:'P-1234567890AAAA'},
  {...legacy,subscriptionId:'fake'},
  {...legacy,intentId:'wrong'},
  {...legacy,provider:'other'},
 ]
 for(const binding of others){
  const x=classifyBoundPaypalSubscription({operation:'cancel',binding})
  assert.equal(x.ok,false)
  assert.equal(x.mayCancel,false)
  assert.equal(x.mayCharge,false)
 }
 assert.equal(classifyBoundPaypalSubscription({operation:'create',binding:legacy}).ok,false)
 assert.equal(classifyBoundPaypalSubscription({operation:'cancel'}).ok,false)
})
test('Sandbox localhost route never implies a charge; Live never inherits Sandbox credentials',()=>{
 const runtime={active_environment:'sandbox',live_checkout_enabled:false}
 const x=classifyNewPaypalCheckout({runtime,verifiedMode:'localhost_sandbox_qa'})
 assert.equal(x.ok,true)
 assert.equal(x.route,'existing_sandbox_qa')
 assert.equal(x.mayCharge,false)
 for(const inputs of [
  {runtime,verifiedMode:'live'},
  {runtime,verifiedMode:'public_beta'},
  {runtime:{...runtime,active_environment:'live'},verifiedMode:'localhost_sandbox_qa'},
  {runtime:{...runtime,live_checkout_enabled:true},verifiedMode:'localhost_sandbox_qa'},
  {runtime:null,verifiedMode:'localhost_sandbox_qa'}
 ]){
  const result=classifyNewPaypalCheckout(inputs)
  assert.equal(result.ok,false)
  assert.equal(result.mayCharge,false)
 }
})
