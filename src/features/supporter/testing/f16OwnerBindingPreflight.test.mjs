import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16OwnerBindingPreflight} from '../../../../supabase/functions/f16-paypal-webhook/ownerBindingPreflight.mjs'
const A='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const B='8b134f73-5ee3-49a2-9a36-3e1592e5af81'
const ID='intent-a-abcdefghijklmnop'
const SUB='I-SANDBOX-AAAA'
const PLAN='P-14V25407JP6850922NLHMDKI'
function setup({sessionOwner=A,record={},provider={}}={}){
 const calls=[]
 const service=createF16OwnerBindingPreflight({
  resolveOwnerFromVerifiedSession:async ctx=>{calls.push('auth');return ctx?.valid?sessionOwner:null},
  loadPrivateIntent:async id=>{calls.push('intent');return{
   id:ID,ownerId:A,provider:'paypal',planId:PLAN,state:'pending',...record}},
  readPayPalSubscription:async id=>{calls.push('provider');return {
   id:SUB,plan_id:PLAN,custom_id:ID,status:'ACTIVE',
   subscriber:{email_address:'private@example.com'},...provider}},
 })
 return {service,calls}
}
const request={requestContext:{valid:true},intentId:ID,subscriptionId:SUB}
test('server-verified account + private intent + merchant subscription yield candidate only',async()=>{
 const x=setup()
 const verdict=await x.service.inspect(request)
 assert.equal(verdict.readyToBind,true)
 assert.equal(verdict.entitlement,false)
 assert.equal(verdict.binding.ownerId,A)
 assert.deepEqual(x.calls,['auth','intent','provider'])
 assert.equal(JSON.stringify(verdict).includes('private@example.com'),false)
 assert.equal(JSON.stringify(verdict).includes('ACTIVE'),false)
})
test('spoofed browser ownerId does not override verified session owner',async()=>{
 const x=setup({sessionOwner:B})
 const verdict=await x.service.inspect({...request,ownerId:A,rawUserMetadata:{id:A}})
 assert.equal(verdict.readyToBind,false)
 assert.equal(verdict.reason,'owner_intent_mismatch')
 assert.deepEqual(x.calls,['auth','intent'])
})
test('anonymous session blocks before private intent or PayPal API',async()=>{
 const x=setup({sessionOwner:null})
 const verdict=await x.service.inspect({...request,requestContext:{valid:false}})
 assert.equal(verdict.reason,'unauthenticated')
 assert.deepEqual(x.calls,['auth'])
})
test('wrong PayPal custom_id, plan, subscription and forged intent deny binding',async()=>{
 for(const provider of [
  {custom_id:'intent-other-abcdefghijklmnop'},
  {plan_id:'P-WRONG'},
  {id:'I-OTHER'},
 ]) {
  const x=setup({provider})
  const result=await x.service.inspect(request)
  assert.equal(result.readyToBind,false)
  assert.equal(result.entitlement,false)
  assert.equal(result.reason,'paypal_subscription_mismatch')
 }
 for(const record of [{ownerId:B},{provider:'stripe'},{planId:'P-WRONG'},{state:'revoked'}]){
  const x=setup({record})
  assert.equal((await x.service.inspect(request)).readyToBind,false)
  assert.deepEqual(x.calls,['auth','intent'])
 }
})
test('bound intent is idempotent only with the same provider subscription',async()=>{
 const x=setup({record:{state:'bound',externalSubscriptionId:SUB}})
 assert.equal((await x.service.inspect(request)).readyToBind,true)
 const y=setup({record:{state:'bound',externalSubscriptionId:'I-OTHER'}})
 assert.equal((await y.service.inspect(request)).reason,'already_bound_different_subscription')
})
test('invalid references never call authentication, DB or provider',async()=>{
 const x=setup()
 for(const patch of [{intentId:'../etc'},{subscriptionId:'http://evil.test'},
   {subscriptionId:'I-SANDBOX-AAAA?x=1'},{intentId:''}]){
  const result=await x.service.inspect({...request,...patch})
  assert.equal(result.readyToBind,false)
 }
 assert.equal(x.calls.length,0)
})
test('missing trusted adapters fails at construction; provider outage rejects preflight',async()=>{
 assert.throws(()=>createF16OwnerBindingPreflight({}),/not_configured/)
 const service=createF16OwnerBindingPreflight({
  resolveOwnerFromVerifiedSession:async()=>A,
  loadPrivateIntent:async()=>({id:ID,ownerId:A,provider:'paypal',planId:PLAN,state:'pending'}),
  readPayPalSubscription:async()=>{throw Error('provider down')},
 })
 await assert.rejects(service.inspect(request),/provider down/)
})
