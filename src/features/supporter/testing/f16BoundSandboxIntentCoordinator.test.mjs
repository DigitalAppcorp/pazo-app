import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16BoundSandboxIntentCoordinator} from '../../../../supabase/functions/f16-paypal-webhook/f16BoundSandboxIntentCoordinator.mjs'

const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const other='a0d116f8-9c7a-4f4f-b1d3-a1218c054129'
const intent='intent-00000000-0000-4000-8000-000000000001'
const id='I-PAZO-BOUND-E2E001'
const plan='P-14V25407JP6850922NLHMDKI'
const base={
 id:intent,ownerId:owner,planId:plan,provider:'paypal',state:'pending',
}
const paypal={
 id,plan_id:plan,custom_id:intent,status:'APPROVAL_PENDING',
}
function fixture(mod={}){
 const audit={auth:0,created:0,loaded:0,provider:0,bound:0,last:null}
 const options={
  resolveOwnerFromVerifiedSession:async(ctx)=>{
   audit.auth++
   return mod.owner===undefined?owner:mod.owner
  },
  newIntentId:()=>mod.newId===undefined?intent:mod.newId,
  createPrivateIntent:async(data)=>{
   audit.created++;audit.last=data
   if(mod.failCreate)throw Error('secret@example.com')
   return mod.createResult===undefined?true:mod.createResult
  },
  loadPrivateIntent:async()=>{
   audit.loaded++
   if(mod.failLoad)throw Error('secret@example.com')
   return mod.privateIntent===undefined?base:mod.privateIntent
  },
  readPayPalSubscription:async()=>{
   audit.provider++
   if(mod.failProvider)throw Error('secret@example.com')
   return mod.paypal===undefined?paypal:mod.paypal
  },
  bindPrivateIntent:async(data)=>{
   audit.bound++;audit.last=data
   if(mod.failBind)throw Error('secret@example.com')
   return mod.bindResult===undefined?'new_binding':mod.bindResult
  },
 }
 return {coordinator:createF16BoundSandboxIntentCoordinator(options),audit}
}
function assertNotEntitled(result){
 assert.equal(result.entitlement,false)
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.mayCountPaidMonth,false)
 assert.equal(result.paidThrough,null)
 const dump=JSON.stringify(result)
 assert.equal(dump.includes(owner),false)
 assert.equal(dump.includes('secret@example.com'),false)
}
test('E2E prepares only a server-generated v4 private intent for verified PAZO Auth owner',async()=>{
 const {coordinator,audit}=fixture()
 const data=await coordinator.prepare({requestContext:{headers:{get:()=>null},ownerId:other}})
 assertNotEntitled(data)
 assert.equal(data.readyForSandboxCreation,true)
 assert.equal(data.readyForSandboxApproval,false)
 assert.equal(data.planId,plan)
 assert.equal(data.intentId,intent)
 assert.equal(audit.created,1)
 assert.deepEqual(audit.last,{ownerId:owner,intentId:intent})
 assert.equal(audit.provider,0)
 assert.equal(audit.bound,0)
})
test('E2E prepares no private intent when user is unauthenticated or server UUID invalid',async()=>{
 for(const x of [{owner:null},{owner:other,newId:'intent-not-uuid'},{
  owner:undefined,newId:'intent-00000000-0000-1000-8000-000000000001'},
  {newId:'intent-00000000-0000-4000-0000-000000000001'}]){
  const {coordinator,audit}=fixture(x)
  const result=await coordinator.prepare({})
  assertNotEntitled(result)
  assert.equal(result.readyForSandboxCreation,false)
  assert.equal(audit.created,0)
 }
})
test('E2E duplicate or unavailable private intent insert does not launch PayPal',async()=>{
 for(const m of [{createResult:false},{createResult:'true'},{failCreate:true}]){
  const {coordinator,audit}=fixture(m)
  const result=await coordinator.prepare({})
  assertNotEntitled(result)
  assert.equal(result.readyForSandboxCreation,false)
  assert.equal(audit.provider,0)
  assert.equal(audit.bound,0)
 }
})
test('E2E binds only AFTER Auth+private intent+PayPal read matches, with minimum server-only RPC args',async()=>{
 const {coordinator,audit}=fixture()
 const result=await coordinator.bind({
  requestContext:{ownerId:other},intentId:intent,subscriptionId:id,
 })
 assertNotEntitled(result)
 assert.equal(result.readyForSandboxApproval,true)
 assert.equal(result.bound,true)
 assert.equal(result.bindingState,'new_binding')
 assert.deepEqual(audit.last,{
  intentId:intent,ownerId:owner,subscriptionId:id,planId:plan,
 })
 assert.equal(audit.auth,1)
 assert.equal(audit.loaded,1)
 assert.equal(audit.provider,1)
 assert.equal(audit.bound,1)
})
test('E2E retries of exactly the same verified binding are safe, not duplicated months',async()=>{
 const {coordinator}=fixture({bindResult:'already_bound',
  privateIntent:{...base,state:'bound',externalSubscriptionId:id}})
 const result=await coordinator.bind({intentId:intent,subscriptionId:id})
 assertNotEntitled(result)
 assert.equal(result.bound,true)
 assert.equal(result.bindingState,'already_bound')
})
test('E2E never binds a subscription already ACTIVE/CANCELLED/APPROVED/SUSPENDED',async()=>{
 for(const status of ['ACTIVE','CANCELLED','APPROVED','SUSPENDED','EXPIRED',undefined]){
  const {coordinator,audit}=fixture({paypal:{...paypal,status}})
  const result=await coordinator.bind({intentId:intent,subscriptionId:id})
  assertNotEntitled(result)
  assert.equal(result.bound,false)
  assert.equal(audit.bound,0)
 }
})
test('E2E corrupted owner, plan, custom_id or subscription data fails before write',async()=>{
 const variants=[
  {owner:null},
  {owner:other},
  {privateIntent:{...base,ownerId:other}},
  {privateIntent:{...base,state:'cancelled'}},
  {privateIntent:{...base,planId:'P-DIFFERENT-PLAN'}},
  {privateIntent:{...base,provider:'other'}},
  {privateIntent:{...base,state:'bound',externalSubscriptionId:'I-OTHER-PAZO'}},
  {paypal:{...paypal,custom_id:'intent-different'}},
  {paypal:{...paypal,plan_id:'P-OTHER'}},
  {paypal:{...paypal,id:'I-OTHER'}},
  {failLoad:true},
  {failProvider:true},
 ]
 for(const changes of variants){
  const {coordinator,audit}=fixture(changes)
  const result=await coordinator.bind({intentId:intent,subscriptionId:id})
  assertNotEntitled(result)
  assert.equal(result.bound,false)
  assert.equal(audit.bound,0)
 }
})
test('E2E untrusted browser reference cannot bind or trigger a provider read',async()=>{
 for(const data of [
  {intentId:'../../../user',subscriptionId:id},
  {intentId:intent,subscriptionId:'https://evil.com'},
  {intentId:intent,subscriptionId:'I-?id=malicious'},
  {intentId:undefined,subscriptionId:id},
 ]){
  const {coordinator,audit}=fixture()
  const r=await coordinator.bind({...data,requestContext:{ownerId:other}})
  assertNotEntitled(r)
  assert.equal(r.bound,false)
  assert.equal(audit.provider,0)
  assert.equal(audit.bound,0)
 }
})
test('E2E binding errors and unexpected success values fail closed without leaking exceptions',async()=>{
 for(const m of [{failBind:true},{bindResult:true},{bindResult:'written'},
   {bindResult:null}]){
  const {coordinator}=fixture(m)
  const r=await coordinator.bind({intentId:intent,subscriptionId:id})
  assertNotEntitled(r)
  assert.equal(r.bound,false)
  assert.equal(r.readyForSandboxApproval,false)
 }
})
test('E2E Auth/preflight exceptions do not reach browser; no paid benefit ever emitted',async()=>{
 const fail=createF16BoundSandboxIntentCoordinator({
  resolveOwnerFromVerifiedSession:async()=>{throw Error('secret@example.com')},
  createPrivateIntent:async()=>{throw Error('must not run')},
  loadPrivateIntent:async()=>{throw Error('must not run')},
  readPayPalSubscription:async()=>{throw Error('must not run')},
  bindPrivateIntent:async()=>{throw Error('must not run')},
  newIntentId:()=>intent,
 })
 const a=await fail.prepare({}),b=await fail.bind({intentId:intent,subscriptionId:id})
 assertNotEntitled(a);assertNotEntitled(b)
 assert.equal(a.readyForSandboxCreation,false)
 assert.equal(b.bound,false)
})
