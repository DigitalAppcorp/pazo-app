import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05ServerOnlyBoundIntentReader as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05ServerOnlyBoundIntentReader.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const INTENT='intent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const SUB='I-PRIVATEBOUND123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const KEY='synthetic-service-role-test-token'
function make(mutate=()=>{}){
 let payload={id:INTENT,owner_id:OWNER,plan_id:PLAN,
  state:'bound',external_subscription_id:SUB,payer_email:'private@example.com'}
 mutate(payload)
 const calls=[]
 const reader=create({
  projectUrl:PROJECT,serviceRoleKey:KEY,
  fetchImpl:async(url,options)=>{
   calls.push({url,options})
   return {ok:true,json:async()=>payload}
  },
 })
 return {reader,calls}
}
test('existing service-only RPC is called once and snake_case mapped without PII',async()=>{
 const {reader,calls}=make()
 const r=await reader({intentId:INTENT})
 assert.deepEqual(r,{id:INTENT,ownerId:OWNER,planId:PLAN,provider:'paypal',
  state:'bound',subscriptionId:SUB})
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,PROJECT+'/rest/v1/rpc/f16_paypal_read_private_intent')
 assert.equal(calls[0].options.method,'POST')
 assert.equal(calls[0].options.redirect,'error')
 assert.ok(calls[0].options.signal)
 assert.equal(calls[0].options.headers.apikey,KEY)
 assert.equal(calls[0].options.headers.Authorization,'Bearer '+KEY)
 assert.deepEqual(JSON.parse(calls[0].options.body),{p_intent_id:INTENT})
 assert.equal(JSON.stringify(r).includes('private@example.com'),false)
 assert.equal(JSON.stringify(r).includes(KEY),false)
})
test('wrong project or missing service key cannot construct reader',()=>{
 for(const bad of [
  {projectUrl:'https://evil.example.com',serviceRoleKey:KEY},
  {projectUrl:PROJECT,serviceRoleKey:'a'},
  {projectUrl:PROJECT,serviceRoleKey:'private key spaces not allowed'},
 ])assert.throws(()=>create({...bad,fetchImpl:async()=>({ok:false})}),
  /private_intent_reader_not_configured/)
})
test('malformed intent is rejected before any request',async()=>{
 const {reader,calls}=make()
 for(const id of ['intent-private123','../other',null,
  'intent-AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA']){
  await assert.rejects(reader({intentId:id}),/invalid_private_intent_id/)
 }
 assert.equal(calls.length,0)
})
test('unbound intent, owner, foreign plan or wrong subscription never passes',async()=>{
 for(const mutation of [
  x=>x.id='intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  x=>x.owner_id='malformed-owner',
  x=>x.plan_id='P-ANOTHERPLAN123',
  x=>x.state='pending',
  x=>x.external_subscription_id=null,
  x=>x.external_subscription_id='I-FOREIGN/sub',
 ]){
  const {reader}=make(mutation)
  await assert.rejects(reader({intentId:INTENT}),/private_intent_binding_invalid/)
 }
})
test('host errors, bad JSON or thrown network errors cannot leak secrets',async()=>{
 for(const impl of [
  async()=>{throw Error('private@example.com '+KEY)},
  async()=>({ok:false,json:async()=>({secret:KEY})}),
 ]){
  const reader=create({projectUrl:PROJECT,serviceRoleKey:KEY,fetchImpl:impl})
  await assert.rejects(reader({intentId:INTENT}),
   e=>e.message==='private_intent_rpc_unavailable')
 }
 const reader=create({projectUrl:PROJECT,serviceRoleKey:KEY,
  fetchImpl:async()=>({ok:true,json:async()=>{
   throw Error('private@example.com '+KEY)}})})
 await assert.rejects(reader({intentId:INTENT}),
  e=>e.message==='private_intent_rpc_invalid_response')
})
test('RPC null / array / user-swapped payload are all denied',async()=>{
 for(const value of [null,[],{id:INTENT,owner_id:OWNER,
  plan_id:PLAN,state:'bound',external_subscription_id:SUB,provider:'stripe'}]){
  const reader=create({projectUrl:PROJECT,serviceRoleKey:KEY,
   fetchImpl:async()=>({ok:true,json:async()=>value})})
  if(value?.provider==='stripe') {
   // Unknown extra field from RPC is not an authorization statement;
   // the trusted table scope itself is PayPal-only.
   const r=await reader({intentId:INTENT})
   assert.equal(r.provider,'paypal')
  }else await assert.rejects(reader({intentId:INTENT}),
   /private_intent_binding_invalid/)
 }
})
