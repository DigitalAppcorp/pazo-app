import test from 'node:test'
import assert from 'node:assert/strict'
import {createSafeF16WebhookHandler as create} from '../../../../supabase/functions/f16-paypal-webhook/core.mjs'
const event={id:'WH-P39-VERIFIED-ACT',event_type:'BILLING.SUBSCRIPTION.ACTIVATED',resource:{id:'I-P39-OWNER'}}
const makeRequest=(e=event)=>new Request('https://offline.test/webhook',{
 method:'POST',
 headers:{'content-type':'application/json','paypal-transmission-id':'test-transmission',
 'paypal-transmission-time':'2026-10-15T10:00:00Z','paypal-transmission-sig':'synthetic-signature',
 'paypal-auth-algo':'SHA256withRSA',
 'paypal-cert-url':'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-P39TEST'},
 body:JSON.stringify(e)
})
const handler=(verifySignature,inbox,verifiedActivationRecorder,activationBindingEnabled=true)=>create({
 environment:'sandbox',webhookId:'P39WEBHOOK',planId:'P-P39LAB',
 verifySignature,inbox,verifiedActivationRecorder,activationBindingEnabled,
 admissionGate:{tryEnter:()=>()=>{}}
})
test('only postback-verified activation reaches the optional private recorder',async()=>{
 const events=[]
 const records=[]
 const receive=handler(async()=>true,{insertIfAbsent:async item=>{events.push(item);return true}},
 {bindVerifiedActivation:async x=>{records.push(x);return true}})
 const response=await receive(makeRequest())
 assert.equal(response.status,202);assert.equal(events.length,1)
 assert.deepEqual(records,[{eventId:event.id,subscriptionId:'I-P39-OWNER',origin:'postback_verified_sandbox_activation'}])
})
test('signature rejection never writes event or binding',async()=>{
 let writes=0
 const receive=handler(async()=>false,{insertIfAbsent:async()=>{writes++;return true}},
 {bindVerifiedActivation:async()=>{writes++;return true}})
 assert.equal((await receive(makeRequest())).status,401)
 assert.equal(writes,0)
})
test('failed private attribution retries even after original inbox insert',async()=>{
 let inserted=0,attempt=0
 const receive=handler(async()=>true,{insertIfAbsent:async()=>{inserted++;return inserted===1}},
 {bindVerifiedActivation:async()=>{attempt++;return attempt===2}})
 assert.equal((await receive(makeRequest())).status,503)
 assert.equal((await receive(makeRequest())).status,200)
 assert.equal(inserted,2);assert.equal(attempt,2)
})
test('invalid activation reference fails closed, and disabled optional gate has no new writes',async()=>{
 let inserts=0,bindings=0
 const inbox={insertIfAbsent:async()=>{inserts++;return true}}
 const recorder={bindVerifiedActivation:async()=>{bindings++;return true}}
 assert.equal((await handler(async()=>true,inbox,recorder)(makeRequest({...event,resource:{id:'I-BAD!'}}))).status,503)
 assert.equal(inserts,0)
 assert.equal((await handler(async()=>true,inbox,recorder,false)(makeRequest())).status,202)
 assert.equal(inserts,1);assert.equal(bindings,0)
})
