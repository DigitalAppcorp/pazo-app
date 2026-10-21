import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP34ActivationSnapshot as assess} from '../../../../supabase/functions/f16-paypal-webhook/p34ActivationSnapshotLab.mjs'
const fixture={saleEvent:{event_type:'PAYMENT.SALE.COMPLETED',resource:{id:'SALE-P34',billing_agreement_id:'I-P34-TEST'}},activationEvent:{event_type:'BILLING.SUBSCRIPTION.ACTIVATED',create_time:'2026-10-15T10:00:00Z',resource:{id:'I-P34-TEST'}},subscriptionSnapshot:{id:'I-P34-TEST',status:'ACTIVE',billing_info:{next_billing_time:'2026-11-14T10:00:00Z'}}}
test('matching simulated cycle is still review only',()=>{
 const result=assess(fixture)
 assert.equal(result.activationLinked,true);assert.equal(result.cycleVerified,false)
 assert.equal(result.mayRecordPayment,false);assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.paidThrough,null)
})
test('cross subscription, missing merchant next billing and reversed dates blocked',()=>{
 for(const change of [
  {activationEvent:{...fixture.activationEvent,resource:{id:'I-OTHER'}}},
  {subscriptionSnapshot:{...fixture.subscriptionSnapshot,billing_info:{next_billing_time:null}}},
  {subscriptionSnapshot:{...fixture.subscriptionSnapshot,billing_info:{next_billing_time:'2026-10-14T10:00:00Z'}}},
  {subscriptionSnapshot:{...fixture.subscriptionSnapshot,status:'CANCELLED'}}
 ]){const r=assess({...fixture,...change});assert.equal(r.activationLinked,false);assert.equal(r.mayCreatePaidPeriod,false)}
})
