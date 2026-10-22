import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16WorkerAdmissionGate} from '../../../../supabase/functions/f16-paypal-webhook/workerAdmissionGate.mjs'
import {createSafeF16WebhookHandler} from '../../../../supabase/functions/f16-paypal-webhook/core.mjs'

const HEADERS={
 'content-type':'application/json',
 'paypal-transmission-id':'TX-safe-fixture',
 'paypal-transmission-time':'2026-10-14T06:00:00Z',
 'paypal-transmission-sig':'synthetic-signature',
 'paypal-auth-algo':'SHA256withRSA',
 'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-fixture',
}
const event={id:'WH-SYNTHETIC-01',event_type:'PAYMENT.SALE.COMPLETED',
 resource:{payer_email:'private@example.invalid'}}
const request=(body=JSON.stringify(event))=>new Request('https://example.invalid/webhook',{
 method:'POST',headers:HEADERS,body,
})
function receiver({gate,verifySignature=async()=>true,inbox={insertIfAbsent:async()=>true}}){
 return createSafeF16WebhookHandler({
  environment:'sandbox',webhookId:'6N7889790V1467139',
  planId:'P-14V25407JP6850922NLHMDKI',
  verifySignature,inbox,admissionGate:gate,
 })
}
test('worker gate has fixed bounded accounting; release is idempotent and window expires',()=>{
 let time=1000
 const gate=createF16WorkerAdmissionGate({
  maxInFlight:2,maxPerWindow:2,windowMs:1000,now:()=>time,
 })
 const a=gate.tryEnter(),b=gate.tryEnter()
 assert.equal(typeof a,'function')
 assert.equal(typeof b,'function')
 assert.equal(gate.tryEnter(),null)
 a();a();b()
 assert.equal(gate.tryEnter(),null,'per-minute work cap holds even after release')
 time=2000
 const c=gate.tryEnter()
 assert.equal(typeof c,'function')
 c()
})
test('gate is shared across handlers and returns retryable 503 before expensive verifier',async()=>{
 let finish
 const hold=new Promise(resolve=>{finish=resolve})
 const gate=createF16WorkerAdmissionGate({maxInFlight:1,maxPerWindow:3})
 let verificationCalls=0,insertCalls=0
 const verifySignature=async()=>{verificationCalls++;await hold;return true}
 const inbox={insertIfAbsent:async()=>{insertCalls++;return true}}
 const a=receiver({gate,verifySignature,inbox})
 const b=receiver({gate,verifySignature,inbox})
 const pending=a(request())
 // Let the first handler finish asynchronous body reading and acquire the slot.
 for(let i=0;i<30&&verificationCalls===0;i++)await new Promise(resolve=>setImmediate(resolve))
 assert.equal(verificationCalls,1)
 const denied=await b(request())
 assert.equal(denied.status,503)
 assert.equal(denied.headers.get('retry-after'),'5')
 assert.equal((await denied.json()).code,'f16_worker_busy')
 assert.equal(verificationCalls,1)
 assert.equal(insertCalls,0)
 finish()
 assert.equal((await pending).status,202)
 assert.equal(insertCalls,1)
 assert.equal((await b(request())).status,202)
})
test('network and database failures release slot but remain fail-closed',async()=>{
 for(const {verifySignature,inbox,expected} of [
  {verifySignature:async()=>{throw Error('provider private diagnostics')},
   inbox:{insertIfAbsent:async()=>true},expected:503},
  {verifySignature:async()=>false,
   inbox:{insertIfAbsent:async()=>true},expected:401},
  {verifySignature:async()=>true,
   inbox:{insertIfAbsent:async()=>{throw Error('private DB error')}},expected:503},
  {verifySignature:async()=>true,
   inbox:{insertIfAbsent:async()=>false},expected:200},
 ]){
  const gate=createF16WorkerAdmissionGate({maxInFlight:1,maxPerWindow:2})
  const handle=receiver({gate,verifySignature,inbox})
  const first=await handle(request())
  assert.equal(first.status,expected)
  assert.doesNotMatch(await first.text(),/private|email|credential/)
  const second=await handle(request())
  assert.equal(second.status,expected,'slot must be released even on failure/duplicate')
  assert.equal((await handle(request())).status,503,'fixed window limits outbound work')
 }
})
test('invalid body is rejected before admission, without consuming budget or contacting provider',async()=>{
 let calls=0
 const gate=createF16WorkerAdmissionGate({maxInFlight:1,maxPerWindow:1})
 const handle=receiver({gate,verifySignature:async()=>{calls++;return true}})
 const bad=await handle(request('invalid json'))
 assert.equal(bad.status,400)
 assert.equal(calls,0)
 assert.equal((await handle(request())).status,202)
 assert.equal(calls,1)
 assert.equal((await handle(request())).status,503)
 assert.equal(calls,1)
})
test('misconfigured admission is rejected rather than bypassed',async()=>{
 let calls=0
 const handle=receiver({gate:{},verifySignature:async()=>{calls++;return true}})
 const result=await handle(request())
 assert.equal(result.status,503)
 assert.equal(calls,0)
})
