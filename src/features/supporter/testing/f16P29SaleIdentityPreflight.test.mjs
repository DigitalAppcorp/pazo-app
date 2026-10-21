import test from 'node:test'
import assert from 'node:assert/strict'
import {createP29SaleIdentityPreflight as create} from '../../../../supabase/functions/f16-paypal-webhook/p29SaleIdentityPreflight.mjs'
const input={eventId:'WH-P29-PROSPECTIVE',claimToken:'11111111-1111-4111-8111-111111111111'}
const event={id:input.eventId,event_type:'PAYMENT.SALE.COMPLETED',
 resource:{id:'SALE-P29-A',billing_agreement_id:'I-P29PROSPECTIVE',
 amount:{currency:'USD',total:'2.99'}}}
const sale={id:'SALE-P29-A',billing_agreement_id:'I-P29PROSPECTIVE',state:'completed',
 amount:{currency:'USD',total:'2.99'}}
test('exact matching merchant Event GET and Sale GET remains review only',async()=>{
 let calls=0
 const h=create({readClaimedMerchantEvent:async()=>{calls++;return event},
 readMerchantSale:async args=>{calls++;assert.deepEqual(args,{saleId:'SALE-P29-A',...input});return sale}})
 const r=await h(input)
 assert.equal(calls,2);assert.equal(r.reason,'sale_identity_matches_review_only')
 assert.equal(r.mayRecordPayment,false);assert.equal(r.mayCreatePaidPeriod,false)
 assert.equal(r.mayGrantBenefits,false);assert.equal(r.paidThrough,null)
})
test('wrong sale, subscription, amount, status or unavailable provider are blocked',async()=>{
 for(const override of [{id:'SALE-OTHER'},{billing_agreement_id:'I-OTHER'},
  {amount:{currency:'USD',total:'3.99'}},{state:'pending'},null]){
  const h=create({readClaimedMerchantEvent:async()=>event,readMerchantSale:async()=>override})
  assert.equal((await h(input)).reason,'sale_identity_mismatch')
 }
 const unavailable=create({readClaimedMerchantEvent:async()=>event,readMerchantSale:async()=>{throw Error('offline')}})
 assert.equal((await unavailable(input)).reason,'merchant_evidence_unavailable')
})
test('unclaimed references never contact merchant',async()=>{
 let calls=0
 const h=create({readClaimedMerchantEvent:async()=>{calls++},readMerchantSale:async()=>{calls++}})
 assert.equal((await h({...input,eventId:'*'})).reason,'invalid_claim')
 assert.equal(calls,0)
})
