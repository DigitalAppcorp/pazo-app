import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalSandboxEventReader} from '../../../../supabase/functions/f16-paypal-webhook/paypalSandboxEventReader.mjs'
const CLIENT='offline-test-client-id',SECRET='offline-test-client-secret'
const EVENT='WH-PAZO12345'
const SUB='I-PAZO12345'
function setup({eventType='PAYMENT.SALE.COMPLETED',apiOk=true,id=EVENT}={}){
 const calls=[]
 const fetchImpl=async(uri,options)=>{
  calls.push({uri,options})
  if(uri==='https://api-m.sandbox.paypal.com/v1/oauth2/token')return {
    ok:true,json:async()=>({access_token:'mock-token',token_type:'Bearer'})}
  if(uri==='https://api-m.sandbox.paypal.com/v1/notifications/webhooks-events/'+EVENT)
    return {ok:apiOk,json:async()=>({id,event_type:eventType,
      create_time:'2026-10-13T19:00:00Z',
      resource:{id:'SALE-123',billing_agreement_id:SUB,
        payer_email:'hidden@example.com',payer_id:'payer-PRIVATE'}})}
  throw Error('unexpected_provider_endpoint')
 }
 const reader=createPaypalSandboxEventReader({
   clientId:CLIENT,clientSecret:SECRET,fetchImpl,
 })
 return {reader,calls}
}
test('webhook event read uses known Sandbox API paths only and strips all PII',async()=>{
 const x=setup()
 const result=await x.reader.readEvent(EVENT)
 assert.deepEqual(result,{eventId:EVENT,eventType:'PAYMENT.SALE.COMPLETED',
   occurredAt:'2026-10-13T19:00:00Z',externalPaymentId:'SALE-123',
   externalSubscriptionId:SUB,requiresReversalReview:false})
 assert.equal(x.calls.length,2)
 assert.equal(x.calls.every(v=>v.options.redirect==='error'),true)
 assert.equal(x.calls[1].options.headers.Authorization,'Bearer mock-token')
 assert.equal(JSON.stringify(result).includes('@example.com'),false)
 assert.equal(JSON.stringify(result).includes('payer-PRIVATE'),false)
})
test('refund event is quarantined and sale fields are not trusted for correlation',async()=>{
 const x=setup({eventType:'PAYMENT.SALE.REFUNDED'})
 const v=await x.reader.readEvent(EVENT)
 assert.equal(v.requiresReversalReview,true)
 assert.equal(v.externalPaymentId,null)
 assert.equal(v.externalSubscriptionId,null)
})
test('provider ID mismatch blocks and event is not silently accepted',async()=>{
 const x=setup({id:'WH-OTHER'})
 await assert.rejects(x.reader.readEvent(EVENT),/event_id_mismatch/)
})
test('event ID injection is rejected before network',async()=>{
 const x=setup()
 for(const eventId of ['', 'https://evil.example', '../private', 'WH-PAZO?secret=abc']){
  await assert.rejects(x.reader.readEvent(eventId),/invalid_event_id/)
 }
 assert.equal(x.calls.length,0)
})
test('PayPal event read HTTP error never becomes successful billing signal',async()=>{
 const x=setup({apiOk:false})
 await assert.rejects(x.reader.readEvent(EVENT),/paypal_event_query_unavailable/)
})
test('bad credentials fail closed before any query',()=>{
 assert.throws(()=>createPaypalSandboxEventReader({clientId:'',clientSecret:SECRET}),/not_configured/)
})
