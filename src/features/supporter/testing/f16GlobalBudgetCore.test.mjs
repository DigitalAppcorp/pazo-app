import test from 'node:test'
import assert from 'node:assert/strict'
import {createSafeF16WebhookHandler} from '../../../../supabase/functions/f16-paypal-webhook/core.mjs'
import {createF16WorkerAdmissionGate} from '../../../../supabase/functions/f16-paypal-webhook/workerAdmissionGate.mjs'

const hdr={
 'content-type':'application/json',
 'paypal-transmission-id':'TX-fixture','paypal-transmission-time':'2026-10-14T06:00:00Z',
 'paypal-transmission-sig':'placeholder','paypal-auth-algo':'SHA256withRSA',
 'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-fixture',
}
const req=()=>new Request('https://example.invalid/webhook',{
 method:'POST',headers:hdr,body:JSON.stringify({id:'WH-fixture',event_type:'PAYMENT.SALE.COMPLETED'}),
})
function fixture(tryAdmit){
 const calls={verify:0,inbox:0,admit:0}
 const handler=createSafeF16WebhookHandler({
  environment:'sandbox',webhookId:'6N7889790V1467139',planId:'P-14V25407JP6850922NLHMDKI',
  admissionGate:createF16WorkerAdmissionGate({maxInFlight:1,maxPerWindow:10}),
  globalAdmission:{tryAdmit:async()=>{
   calls.admit++;return tryAdmit()
  }},
  verifySignature:async()=>{calls.verify++;return true},
  inbox:{insertIfAbsent:async()=>{calls.inbox++;return true}},
 })
 return {calls,handler}
}
test('global quota denial is retryable and prevents outbound provider and inbox requests',async()=>{
 const a=fixture(()=>false)
 const response=await a.handler(req())
 assert.equal(response.status,503)
 assert.equal(response.headers.get('retry-after'),'5')
 assert.equal((await response.json()).code,'f16_global_budget_exhausted')
 assert.deepEqual(a.calls,{verify:0,inbox:0,admit:1})
})
test('broken global quota response fails closed and releases local gate',async()=>{
 let count=0
 const a=fixture(()=>{count++;if(count===1)throw Error('synthetic SQL offline');return true})
 assert.equal((await a.handler(req())).status,503)
 assert.deepEqual(a.calls,{verify:0,inbox:0,admit:1})
 assert.equal((await a.handler(req())).status,202)
 assert.deepEqual(a.calls,{verify:1,inbox:1,admit:2})
})
test('invalid certificate is discarded before global budget or remote provider',async()=>{
 const a=fixture(()=>true)
 const invalid=new Request('https://example.invalid/webhook',{
  method:'POST',headers:{...hdr,'paypal-cert-url':'https://not-paypal.invalid/not-a-cert'},
  body:JSON.stringify({id:'WH-fixture',event_type:'PAYMENT.SALE.COMPLETED'}),
 })
 assert.equal((await a.handler(invalid)).status,503)
 assert.deepEqual(a.calls,{verify:0,inbox:0,admit:0})
})
