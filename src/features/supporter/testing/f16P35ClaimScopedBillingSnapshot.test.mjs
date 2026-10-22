import test from 'node:test'
import assert from 'node:assert/strict'
import {createP35ClaimScopedBillingSnapshot as create} from '../../../../supabase/functions/f16-paypal-webhook/p35ClaimScopedBillingSnapshot.mjs'
const input={subscriptionId:'I-P35-TEST',eventId:'WH-P35-TEST',claimToken:'11111111-1111-4111-8111-111111111111'}
const event={id:input.eventId,event_type:'PAYMENT.SALE.COMPLETED',resource:{billing_agreement_id:input.subscriptionId}}
test('disabled snapshot makes no calls',async()=>{
 let calls=0
 const reader=create({getClaimedMerchantEvent:async()=>{calls++},getAccessToken:async()=>{calls++}})
 assert.equal(await reader(input),null);assert.equal(calls,0)
})
test('claim-scoped subscription retains observed merchant billing date',async()=>{
 const calls=[]
 const reader=create({enabled:true,getClaimedMerchantEvent:async()=>{calls.push('claim');return event},
 getAccessToken:async()=>{calls.push('token');return 'synthetic-token'},
 fetchImpl:async(url,opts)=>{calls.push('merchant');assert.match(url,/\/v1\/billing\/subscriptions\/I-P35-TEST$/);assert.equal(opts.method,'GET');return {ok:true,json:async()=>({id:input.subscriptionId,status:'ACTIVE',billing_info:{next_billing_time:'2026-11-14T10:00:00Z'},payer:{email:'ignored'}})}}})
 const result=await reader(input)
 assert.deepEqual(calls,['claim','token','merchant'])
 assert.deepEqual(result,{id:'I-P35-TEST',status:'ACTIVE',billing_info:{next_billing_time:'2026-11-14T10:00:00Z'}})
})
test('wrong agreement or absent merchant date denies',async()=>{
 const blocked=create({enabled:true,getClaimedMerchantEvent:async()=>({...event,resource:{billing_agreement_id:'I-OTHER'}}),
 getAccessToken:async()=>{throw Error('should not be called')}})
 assert.equal(await blocked(input),null)
 const missing=create({enabled:true,getClaimedMerchantEvent:async()=>event,
 getAccessToken:async()=> 'synthetic-token',fetchImpl:async()=>({ok:true,json:async()=>({id:input.subscriptionId,status:'ACTIVE',billing_info:{next_billing_time:null}})})})
 assert.equal(await missing(input),null)
})
