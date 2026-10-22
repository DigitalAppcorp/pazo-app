import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac,webcrypto} from 'node:crypto'
import {createP42LabSignedActivationRecorder as create} from '../../../../supabase/functions/f16-paypal-webhook/p42LabSignedActivationRecorder.mjs'
const secret='LAB_TEST_ONLY_P42_SIGNATURE_KEY_NOT_FOR_HOSTED_USE_2026'
const config={
 enabled:true,projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
 serviceRoleKey:'TEST_SERVICE_ROLE_PLACEHOLDER_123456789',
 privateSigningKey:secret,subtleImpl:webcrypto.subtle,
 makeNonce:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 now:()=>new Date('2026-10-16T09:00:00Z')
}
const event={eventId:'WH-P42-TEST',subscriptionId:'I-P42-TEST',origin:'postback_verified_sandbox_activation'}
test('default disabled sends no HTTP requests',async()=>{
 let sent=0
 const reader=create({...config,enabled:false,fetchImpl:async()=>{sent++;return {ok:true,json:async()=>true}}})
 assert.equal(await reader.bindVerifiedActivation(event),false)
 assert.equal(sent,0)
})
test('HMAC envelope binds event/sub/time/nonce and never exports signing key',async()=>{
 let sent=0
 const reader=create({...config,fetchImpl:async(url,opts)=>{
  sent++;assert.match(url,/\/rest\/v1\/rpc\/f16_p42_lab_register_authenticated_activation$/)
  assert.equal(opts.method,'POST');assert.equal(opts.redirect,'error')
  const payload=JSON.parse(opts.body)
  assert.equal(payload.p_event_id,event.eventId)
  assert.equal(payload.p_subscription_id,event.subscriptionId)
  assert.equal(payload.p_issued_at,'2026-10-16T09:00:00Z')
  assert.equal(payload.p_nonce,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  const message=['p42','LAB_V1',payload.p_event_id,payload.p_subscription_id,
  payload.p_issued_at,payload.p_nonce].join('|')
  assert.equal(payload.p_mac_hex,createHmac('sha256',secret).update(message).digest('hex'))
  assert.equal(opts.body.includes(secret),false)
  return {ok:true,json:async()=>true}
 }})
 assert.equal(await reader.bindVerifiedActivation(event),true)
 assert.equal(sent,1)
 assert.equal(await reader.bindVerifiedActivation({...event,origin:'faked'}),false)
 assert.equal(await reader.bindVerifiedActivation({...event,subscriptionId:'OTHER'}),false)
 assert.equal(sent,1)
})
test('invalid timestamps, nonce, keys and RPC failures fail closed',async()=>{
 let sent=0
 for(const update of [
  {privateSigningKey:'short'},
  {makeNonce:()=> 'bad'},
  {now:()=>new Date('invalid')},
  {projectUrl:'https://unknown.example.com'}
 ]){
  const reader=create({...config,...update,fetchImpl:async()=>{sent++;return {ok:true,json:async()=>true}}})
  assert.equal(await reader.bindVerifiedActivation(event),false)
 }
 assert.equal(sent,0)
 for(const fetchImpl of [async()=>({ok:false}),
  async()=>({ok:true,json:async()=>({ok:true})}),
  async()=>{throw Error('offline failure')}])
  assert.equal(await create({...config,fetchImpl}).bindVerifiedActivation(event),false)
})
