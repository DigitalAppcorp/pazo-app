import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalSandboxSubscriptionCreator} from '../../../../supabase/functions/f16-paypal-webhook/paypalSandboxSubscriptionCreate.mjs'
const UUID='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const INTENT='intent-0d7c7f0e-16a0-4c59-b052-18774ab8231e'
const PLAN='P-14V25407JP6850922NLHMDKI'
const URL='https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=TEST'
const OWNER={id:INTENT,ownerId:UUID,provider:'paypal',planId:PLAN,
 state:'pending',verifiedOwnerBinding:true}
function setup({subscription={},statusCode=true}={}){
 const calls=[]
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts})
  if(url==='https://api-m.sandbox.paypal.com/v1/oauth2/token')
   return {ok:true,json:async()=>({token_type:'Bearer',access_token:'mock-token'})}
  if(url==='https://api-m.sandbox.paypal.com/v1/billing/subscriptions')
   return {ok:statusCode,json:async()=>({
     id:'I-PAZO-MOCK001',status:'APPROVAL_PENDING',plan_id:PLAN,
     custom_id:INTENT,
     links:[{rel:'approve',method:'GET',href:URL}],
     subscriber:{email_address:'private@example.com'},
     ...subscription,
   })}
  throw Error('unexpected URL')
 }
 const creator=createPaypalSandboxSubscriptionCreator({
  clientId:'mock-sandbox-client-98765',
  clientSecret:'mock-sandbox-secret-98765',
  returnUrl:'https://app.example.com/supporter/return',
  cancelUrl:'https://app.example.com/supporter/cancel',
  fetchImpl,
 })
 return {creator,calls}
}
test('create sends only server-fixed plan, UUID custom_id and idempotency header',async()=>{
 const x=setup()
 const result=await x.creator.create({intent:OWNER})
 assert.equal(result.subscriptionId,'I-PAZO-MOCK001')
 assert.equal(result.approvalUrl,URL)
 assert.equal(result.entitlement,false)
 assert.equal(JSON.stringify(result).includes('private@example.com'),false)
 assert.deepEqual(x.calls.map(c=>c.url),[
  'https://api-m.sandbox.paypal.com/v1/oauth2/token',
  'https://api-m.sandbox.paypal.com/v1/billing/subscriptions'])
 const second=x.calls[1].opts
 assert.equal(second.redirect,'error')
 assert.equal(second.headers['PayPal-Request-Id'],INTENT.slice(7))
 assert.equal(second.headers.Authorization,'Bearer mock-token')
 assert.deepEqual(JSON.parse(second.body),{
  plan_id:PLAN,custom_id:INTENT,
  application_context:{
   return_url:'https://app.example.com/supporter/return',
   cancel_url:'https://app.example.com/supporter/cancel',
   user_action:'SUBSCRIBE_NOW',
  },
 })
})
test('unverified owner, mutable plan or a bound intent cannot start provider request',async()=>{
 const x=setup()
 for(const patch of [
  {ownerId:'8b134f73-5ee3-49a2-9a36-3e1592e5af81',verifiedOwnerBinding:false},
  {planId:'P-WRONG'},{state:'bound'},{verifiedOwnerBinding:false},
  {id:'intent-not-random'}, {provider:'stripe'},
 ]) {
  await assert.rejects(x.creator.create({intent:{...OWNER,...patch}}),/unverified_server_intent/)
 }
 assert.equal(x.calls.length,0)
})
test('approval URL stays on sandbox PayPal host only',async()=>{
 for(const href of [
  'http://www.sandbox.paypal.com/webapps/billing/subscriptions',
  'https://www.sandbox.paypal.com.attacker.net/path',
  'https://paypal.com/webapps/billing/subscriptions',
  'https://user:secret@www.sandbox.paypal.com/path',
  'https://www.sandbox.paypal.com/path#secret',
 ]) {
  const x=setup({subscription:{links:[{rel:'approve',method:'GET',href}]}})
  await assert.rejects(x.creator.create({intent:OWNER}),/unsafe_approval_url/)
 }
})
test('provider custom ID mismatch, wrong plan and API failure fail closed',async()=>{
 for(const subscription of [
  {custom_id:'intent-fake-id'},{plan_id:'P-WRONG'},
  {id:'http://evil.com'}, {status:'ACTIVE'},
 ]) {
  const x=setup({subscription})
  await assert.rejects(x.creator.create({intent:OWNER}))
 }
 const y=setup({statusCode:false})
 await assert.rejects(y.creator.create({intent:OWNER}),/sandbox_provider_unavailable/)
})
test('bad server redirect origins and credentials reject at construction',()=>{
 const base={clientId:'sandbox-client-123',clientSecret:'sandbox-secret-123'}
 for(const opts of [
  {...base,returnUrl:'http://app.example.com/a',cancelUrl:'https://app.example.com/b'},
  {...base,returnUrl:'https://user:pass@app.example.com/a',cancelUrl:'https://app.example.com/b'},
  {...base,returnUrl:'https://app.example.com/a',cancelUrl:'https://evil.example.com/b'},
  {...base,returnUrl:'https://localhost/a',cancelUrl:'https://localhost/b'},
  {...base,returnUrl:'https://app.example.com/a?evil=x',cancelUrl:'https://app.example.com/b'},
  {...base,returnUrl:'https://app.example.com/a',cancelUrl:''},
 ]) assert.throws(()=>createPaypalSandboxSubscriptionCreator(opts))
})
