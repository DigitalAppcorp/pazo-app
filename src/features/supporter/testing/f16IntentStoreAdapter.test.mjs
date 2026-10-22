import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16IntentStore} from '../../../../supabase/functions/f16-paypal-webhook/intentStoreAdapter.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const KEY='isolated-test-backend-secret-key-use-no-real-secret'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const INTENT='intent-0d7c7f0e-16a0-4c59-b052-18774ab8231e'
const PLAN='P-14V25407JP6850922NLHMDKI'
const SUB='I-SANDBOX-AAAA'
function fixture({created=true,read,bind='new_binding',ok=true}={}){
 const calls=[]
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts})
  const name=url.split('/').at(-1)
  const data=name==='f16_paypal_create_private_intent'?created:
    name==='f16_paypal_read_private_intent'?
       (read===undefined?{id:INTENT,owner_id:OWNER,plan_id:PLAN,state:'pending',
          external_subscription_id:null}:read):bind
  return {ok,json:async()=>data}
 }
 const store=createF16IntentStore({projectUrl:URL,serviceRoleKey:KEY,fetchImpl,
  uuid:()=>INTENT.slice(7)})
 return {store,calls}
}
test('creates unpredictable intent scoped to authenticated owner through fixed RPC',async()=>{
 const x=fixture()
 const result=await x.store.createForVerifiedOwner(OWNER)
 assert.equal(result.id,INTENT)
 assert.equal(result.verifiedOwnerBinding,true)
 assert.equal(result.state,'pending')
 assert.equal(result.planId,PLAN)
 assert.equal(x.calls[0].url,URL+'/rest/v1/rpc/f16_paypal_create_private_intent')
 assert.equal(x.calls[0].opts.headers.Authorization,'Bearer '+KEY)
 assert.deepEqual(JSON.parse(x.calls[0].opts.body),{p_owner_id:OWNER,p_intent_id:INTENT})
 assert.equal(x.calls[0].opts.redirect,'error')
})
test('reads only permitted state from private RPC, then binds no entitlement',async()=>{
 const x=fixture()
 const saved=await x.store.load(INTENT)
 assert.equal(saved.ownerId,OWNER)
 assert.equal(saved.verifiedOwnerBinding,undefined)
 const result=await x.store.bindVerified({
  ownerId:OWNER,intentId:INTENT,externalSubscriptionId:SUB,provider:'paypal',planId:PLAN,
 })
 assert.deepEqual(result,{state:'bound',result:'new_binding',entitlement:false})
 assert.equal(x.calls[1].url,URL+'/rest/v1/rpc/f16_paypal_bind_private_intent')
 assert.equal(JSON.stringify(x.calls).includes('email_address'),false)
})
test('no network for invalid IDs, forged values or hostile URLs',async()=>{
 const x=fixture()
 await assert.rejects(x.store.createForVerifiedOwner('wrong'),/invalid_verified_owner/)
 await assert.rejects(x.store.load('../etc/passwd'),/invalid_intent_id/)
 await assert.rejects(x.store.bindVerified({
  ownerId:OWNER,intentId:INTENT,externalSubscriptionId:'I-BAD?url=evil',
  provider:'paypal',planId:PLAN,
 }),/invalid_verified_binding/)
 assert.equal(x.calls.length,0)
 for(const projectUrl of ['https://evil.example',URL+'/', 'http://mrybvqdebbgcayuvgkkr.supabase.co']){
  assert.throws(()=>createF16IntentStore({projectUrl,serviceRoleKey:KEY}),/not_configured/)
 }
})
test('RPC failure or forged returned identity fails closed',async()=>{
 for(const obj of [
  {read:{id:INTENT,owner_id:OWNER,plan_id:'P-WRONG',state:'pending'}},
  {read:{id:INTENT,owner_id:OWNER,plan_id:PLAN,state:'bound',external_subscription_id:null}},
  {ok:false},
 ]){
  const x=fixture(obj)
  await assert.rejects(x.store.load(INTENT))
 }
 const x=fixture({created:false})
 await assert.rejects(x.store.createForVerifiedOwner(OWNER),/private_intent_not_durable/)
 const y=fixture({bind:'hacked'})
 await assert.rejects(y.store.bindVerified({
  ownerId:OWNER,intentId:INTENT,externalSubscriptionId:SUB,planId:PLAN,provider:'paypal',
 }),/private_binding_not_committed/)
})
