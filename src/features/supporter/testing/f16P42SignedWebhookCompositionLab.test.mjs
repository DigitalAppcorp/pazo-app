import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {createSafeF16WebhookHandler as receiver} from '../../../../supabase/functions/f16-paypal-webhook/core.mjs'
import {createP42LabSignedActivationRecorder as createRecorder} from '../../../../supabase/functions/f16-paypal-webhook/p42LabSignedActivationRecorder.mjs'
const event={id:'WH-P42-E2E',event_type:'BILLING.SUBSCRIPTION.ACTIVATED',resource:{id:'I-P42-E2E'}}
const req=(data=event)=>new Request('https://offline.test/hook',{
 method:'POST',
 headers:{'content-type':'application/json','paypal-transmission-id':'transmission-test',
 'paypal-transmission-time':'2026-10-16T10:00:00Z','paypal-transmission-sig':'offline-test',
 'paypal-auth-algo':'SHA256withRSA',
 'paypal-cert-url':'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-P42E2E'},
 body:JSON.stringify(data)
})
const build=(signature,recorder,inbox)=>receiver({
 environment:'sandbox',webhookId:'P42WEBHOOK',planId:'P-P42LAB',
 verifySignature:async()=>signature,inbox,activationBindingEnabled:true,
 verifiedActivationRecorder:recorder,admissionGate:{tryEnter:()=>()=>{}}
})
const recorder=fetchImpl=>createRecorder({
 enabled:true,projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
 serviceRoleKey:'TEST_SERVICE_ROLE_PLACEHOLDER_123456789',
 privateSigningKey:'LAB_P42_SYNTHETIC_SIGNER_ONLY_DO_NOT_DEPLOY_2026',
 subtleImpl:webcrypto.subtle,
 makeNonce:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 now:()=>new Date('2026-10-16T10:00:00Z'),fetchImpl
})
test('invalid PayPal signature never causes any inbox or signed registration',async()=>{
 let count=0
 const handler=build(false,recorder(async()=>{count++;return {ok:true,json:async()=>true}}),
 {insertIfAbsent:async()=>{count++;return true}})
 assert.equal((await handler(req())).status,401)
 assert.equal(count,0)
})
test('signed activation -> durable inbox -> HMAC-bound scoped writer only',async()=>{
 const ops=[]
 const writer=recorder(async(url,opts)=>{ops.push('signed-rpc');
  const data=JSON.parse(opts.body)
  assert.equal(data.p_event_id,event.id)
  assert.equal(data.p_subscription_id,event.resource.id)
  assert.match(data.p_mac_hex,/^[0-9a-f]{64}$/)
  assert.equal(url.endsWith('/f16_p42_lab_register_authenticated_activation'),true)
  return {ok:true,json:async()=>true}})
 const handler=build(true,writer,{insertIfAbsent:async()=>{ops.push('inbox');return true}})
 assert.equal((await handler(req())).status,202)
 assert.deepEqual(ops,['inbox','signed-rpc'])
})
test('RPC unavailable after inbox insert keeps event retryable, including duplicate',async()=>{
 let requests=0
 const handler=build(true,recorder(async()=>{requests++;return {ok:false}}),
 {insertIfAbsent:async()=>false})
 assert.equal((await handler(req())).status,503)
 assert.equal(requests,1)
})
test('invalid subscription in verified event blocks any inbox write',async()=>{
 let calls=0
 const handler=build(true,recorder(async()=>{calls++;return {ok:true,json:async()=>true}}),
 {insertIfAbsent:async()=>{calls++;return true}})
 assert.equal((await handler(req({...event,resource:{id:'BAD!'}}))).status,503)
 assert.equal(calls,0)
})
