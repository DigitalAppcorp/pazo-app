import test from 'node:test'
import assert from 'node:assert/strict'
import {createP37PrivateActivationClaimReader as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p37PrivateActivationClaimReader.mjs'
import {createP37ActivationEventReader}
 from '../../../../supabase/functions/f16-paypal-webhook/p37ActivationEventReader.mjs'

const HOST='https://mrybvqdebbgcayuvgkkr.supabase.co'
const KEY='SYNTHETIC_PRIVILEGED_TEST_KEY_DO_NOT_USE'
const CLAIM='11111111-1111-4111-8111-111111111111'
const EVENT='WH-P37-BOUND'
const SUB='I-P37-BOUND'
const params={eventId:EVENT,claimToken:CLAIM}
const proof=()=>({id:EVENT,type:'BILLING.SUBSCRIPTION.ACTIVATED',
 processingState:'processing',subscriptionId:SUB,
 source:'p40_inbox_binding_claim',leaseCurrent:true})

test('P37 default-off reader never calls network or needs credentials',async()=>{
 let calls=0
 const r=create({projectUrl:HOST,serviceRoleKey:KEY,
  fetchImpl:async()=>{calls++;throw Error('unexpected')}})
 assert.equal(await r.readClaimedActivation(params),null)
 assert.equal(calls,0)
})
test('P37 private reader passes only event and lease token to exact server RPC',async()=>{
 const calls=[]
 const r=create({enabled:true,projectUrl:HOST,serviceRoleKey:KEY,
  fetchImpl:async(url,init)=>{
   calls.push({url,init})
   return {ok:true,json:async()=>proof()}
  }})
 assert.deepEqual(await r.readClaimedActivation(params),proof())
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,HOST+'/rest/v1/rpc/f16_p37_read_claimed_activation')
 assert.equal(calls[0].init.method,'POST')
 assert.equal(calls[0].init.headers.Authorization,'Bearer '+KEY)
 assert.deepEqual(JSON.parse(calls[0].init.body),
  {p_event_id:EVENT,p_claim_token:CLAIM})
 assert.equal(calls[0].init.redirect,'error')
})
test('P37 rejects malformed UUID lease before calling private RPC',async()=>{
 let calls=0
 const reader=create({enabled:true,projectUrl:HOST,serviceRoleKey:KEY,
  fetchImpl:async()=>{calls++;return {ok:true,json:async()=>proof()}}})
 assert.equal(await reader.readClaimedActivation({
  eventId:EVENT,claimToken:'11111111-1111-4111-111111111111'}),null)
 assert.equal(calls,0)
 assert.deepEqual(await reader.readClaimedActivation(params),proof())
 assert.equal(calls,1)
})
test('P37 private reader refuses forged, absent and expanded binding output',async()=>{
 for(const obj of [null,{...proof(),source:'client'},
  {...proof(),subscriptionId:'I-FOREIGN',signatureVerified:true},
  {...proof(),ownerId:'11111111-1111-4111-8111-111111111111'},
  {...proof(),leaseCurrent:false},{...proof(),processingState:'pending'},
  {...proof(),id:'WH-FOREIGN'},['bad'],{success:true}]){
  const r=create({enabled:true,projectUrl:HOST,serviceRoleKey:KEY,
   fetchImpl:async()=>({ok:true,json:async()=>obj})})
  assert.equal(await r.readClaimedActivation(params),null)
 }
})
test('P37 no config, foreign host and unavailable RPC fail before PayPal',async()=>{
 let calls=0
 for(const config of [
  {projectUrl:HOST,serviceRoleKey:'not-long-enough'},
  {projectUrl:'https://other.example.invalid',serviceRoleKey:KEY},
 ]){
  const r=create({...config,enabled:true,fetchImpl:async()=>{calls++}})
  assert.equal(await r.readClaimedActivation(params),null)
 }
 const r=create({enabled:true,projectUrl:HOST,serviceRoleKey:KEY,
  fetchImpl:async()=>{calls++;return {ok:false,status:404}}})
 assert.equal(await r.readClaimedActivation(params),null)
 assert.equal(calls,1)
})
test('P37 merchant GET occurs only after P40 bounded claim response',async()=>{
 const request={activationEventId:EVENT,activationClaimToken:CLAIM,subscriptionId:SUB}
 let rpcCalls=0,providerCalls=0
 const readClaimedActivation=create({enabled:true,projectUrl:HOST,
  serviceRoleKey:KEY,fetchImpl:async()=>{
   rpcCalls++;return {ok:true,json:async()=>proof()}
  }}).readClaimedActivation
 const lookup=createP37ActivationEventReader({
  enabled:true,readClaimedActivation,
  getAccessToken:async()=> 'SYNTHETIC_PAYPAL_TOKEN',
  fetchImpl:async(url,init)=>{
   providerCalls++
   assert.equal(init.method,'GET')
   assert.equal(url,'https://api-m.sandbox.paypal.com/v1/notifications/webhooks-events/'+EVENT)
   return {ok:true,json:async()=>({
    id:EVENT,event_type:'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time:'2026-10-16T18:00:00Z',
    resource:{id:SUB,payer:{email_address:'secret@example.invalid'}},
   })}
  },
 })
 const result=await lookup(request)
 assert.equal(rpcCalls,1);assert.equal(providerCalls,1)
 assert.deepEqual(result,{event_type:'BILLING.SUBSCRIPTION.ACTIVATED',
  create_time:'2026-10-16T18:00:00Z',resource:{id:SUB}})
 assert.ok(!JSON.stringify(result).includes('secret@example.invalid'))
})
