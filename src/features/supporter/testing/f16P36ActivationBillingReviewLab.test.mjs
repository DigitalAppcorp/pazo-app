import test from 'node:test'
import assert from 'node:assert/strict'
import {createP36ActivationBillingReview as create} from '../../../../supabase/functions/f16-paypal-webhook/p36ActivationBillingReviewLab.mjs'
const arg={eventId:'WH-P36-SALE',claimToken:'11111111-1111-4111-8111-111111111111'}
const sale={id:arg.eventId,event_type:'PAYMENT.SALE.COMPLETED',resource:{id:'SALE-P36',billing_agreement_id:'I-P36-SUB'}}
const activation={event_type:'BILLING.SUBSCRIPTION.ACTIVATED',resource:{id:'I-P36-SUB'},create_time:'2026-10-15T10:00:00Z'}
const snapshot={id:'I-P36-SUB',status:'ACTIVE',billing_info:{next_billing_time:'2026-11-14T10:00:00Z'}}
test('matching mock readers cannot grant paid time',async()=>{
 const calls=[]
 const review=create({readClaimedSale:async()=>{calls.push('sale');return sale},
 readVerifiedActivation:async p=>{calls.push('activation');assert.equal(p.subscriptionId,'I-P36-SUB');return activation},
 readBillingSnapshot:async p=>{calls.push('billing');assert.equal(p.subscriptionId,'I-P36-SUB');return snapshot}})
 const r=await review(arg)
 assert.deepEqual(calls,['sale','activation','billing'])
 assert.equal(r.activationLinked,true);assert.equal(r.authenticatedEvidence,false)
 assert.equal(r.cycleVerified,false);assert.equal(r.mayRecordPayment,false);assert.equal(r.paidThrough,null)
})
test('missing activation or mismatched subscription denies',async()=>{
 for(const changed of [null,{...activation,resource:{id:'I-OTHER'}}]){
  const review=create({readClaimedSale:async()=>sale,readVerifiedActivation:async()=>changed,readBillingSnapshot:async()=>snapshot})
  assert.equal((await review(arg)).activationLinked,false)
 }
})
test('unverified sale does not read activation or merchant billing',async()=>{
 let calls=0
 const review=create({readClaimedSale:async()=>({...sale,id:'OTHER'}),
 readVerifiedActivation:async()=>{calls++},readBillingSnapshot:async()=>{calls++}})
 assert.equal((await review(arg)).reason,'sale_claim_unverified')
 assert.equal(calls,0)
})
