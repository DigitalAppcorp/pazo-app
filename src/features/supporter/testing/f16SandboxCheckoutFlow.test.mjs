import test from 'node:test'
import assert from 'node:assert/strict'
import {createSandboxCheckoutFlow} from '../../../../supabase/functions/f16-paypal-webhook/sandboxCheckoutFlow.mjs'
const A='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const ID='intent-0d7c7f0e-16a0-4c59-b052-18774ab8231e'
const SUB='I-SANDBOX-AAAA'
const PLAN='P-14V25407JP6850922NLHMDKI'
const LINK='https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=MOCK'
function setup({owner=A,verified=true,denied=false}={}){
 const calls=[]
 const flow=createSandboxCheckoutFlow({
  resolveOwnerFromVerifiedSession:async()=>{calls.push('auth');return owner},
  intentStore:{
   createForVerifiedOwner:async ownerId=>{calls.push('store');return{
    id:ID,ownerId,provider:'paypal',planId:PLAN,state:'pending',verifiedOwnerBinding:true}},
   bindVerified:async b=>{calls.push('bind');return{result:'new_binding',entitlement:false}},
  },
  providerCreator:{create:async({intent})=>{calls.push('paypal');return{
   subscriptionId:SUB,approvalUrl:LINK,entitlement:false}}},
  ownerVerifier:async()=>{calls.push('verify');return verified?{
   readyToBind:true,entitlement:false,binding:{
     ownerId:A,intentId:ID,externalSubscriptionId:SUB,provider:'paypal',planId:PLAN,
   }}:{readyToBind:false,entitlement:false,reason:'owner_mismatch'}},
 })
 return {flow,calls,request:new Request('https://localhost/f16',{method:'POST'})}
}
test('prepare requires verified Auth identity and creates only an approval-pending subscription',async()=>{
 const x=setup()
 assert.deepEqual(await x.flow.prepare({request:x.request}),{
  ok:true,entitlement:false,state:'approval_pending',
  intentId:ID,subscriptionId:SUB,approvalUrl:LINK,
 })
 assert.deepEqual(x.calls,['auth','store','paypal'])
})
test('ownerless start must not write a DB intent or contact PayPal',async()=>{
 const x=setup({owner:null})
 assert.deepEqual(await x.flow.prepare({request:x.request}),{ok:false,reason:'unauthenticated'})
 assert.deepEqual(x.calls,['auth'])
})
test('confirmed PayPal subscription binds but never becomes a paid member',async()=>{
 const x=setup()
 const r=await x.flow.confirm({request:x.request,intentId:ID,subscriptionId:SUB})
 assert.equal(r.ok,true)
 assert.equal(r.state,'linked_unpaid')
 assert.equal(r.entitlement,false)
 assert.deepEqual(x.calls,['verify','bind'])
})
test('forged custom_id, owner or missing external evidence cannot bind',async()=>{
 const x=setup({verified:false})
 const r=await x.flow.confirm({request:x.request,intentId:ID,subscriptionId:SUB})
 assert.equal(r.ok,false)
 assert.equal(r.entitlement,false)
 assert.deepEqual(x.calls,['verify'])
})
test('client-controlled request-shaped objects are rejected before providers',async()=>{
 const x=setup()
 assert.equal((await x.flow.prepare({request:{headers:new Headers()}})).ok,false)
 assert.equal((await x.flow.confirm({request:{headers:new Headers()},intentId:ID,subscriptionId:SUB})).ok,false)
 assert.deepEqual(x.calls,[])
})
test('cannot construct checkout without trusted private store and verifier',()=>{
 assert.throws(()=>createSandboxCheckoutFlow({}),/not_configured/)
})
