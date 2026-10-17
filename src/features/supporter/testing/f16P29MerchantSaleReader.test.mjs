import test from 'node:test'
import assert from 'node:assert/strict'
import {createP29MerchantSaleReader} from '../../../../supabase/functions/f16-paypal-webhook/p29MerchantSaleReader.mjs'
const args={saleId:'SALE-P29-TEST',eventId:'WH-P29-TEST',claimToken:'11111111-1111-4111-8111-111111111111'}
const event={id:args.eventId,event_type:'PAYMENT.SALE.COMPLETED',resource:{id:args.saleId,billing_agreement_id:'I-P29-TEST'}}
test('default disabled denies without network',async()=>{
 let calls=0
 const read=createP29MerchantSaleReader({readClaimedMerchantEvent:async()=>{calls++},getAccessToken:async()=>{calls++}})
 assert.equal(await read(args),null);assert.equal(calls,0)
})
test('merchant sale requires matching claim and sale',async()=>{
 const sale={id:args.saleId,state:'completed',billing_agreement_id:'I-P29-TEST',amount:{currency:'USD',total:'2.99'}}
 const read=createP29MerchantSaleReader({enabled:true,readClaimedMerchantEvent:async()=>event,
 getAccessToken:async()=> 'sandbox-test-token',
 fetchImpl:async(url,opts)=>{assert.match(url,/\/v1\/payments\/sale\/SALE-P29-TEST$/);assert.equal(opts.method,'GET');return {ok:true,json:async()=>sale}}})
 assert.deepEqual(await read(args),sale)
})
test('mismatched claim denies sale',async()=>{
 let called=0
 const read=createP29MerchantSaleReader({enabled:true,readClaimedMerchantEvent:async()=>({...event,resource:{...event.resource,id:'OTHER'}}),
 getAccessToken:async()=>{called++},fetchImpl:async()=>{called++}})
 assert.equal(await read(args),null);assert.equal(called,0)
})
