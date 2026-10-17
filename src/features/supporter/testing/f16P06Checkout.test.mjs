import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxVerifiedCheckout as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p06SandboxVerifiedCheckout.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const KEY='22222222-2222-4222-8222-222222222222'
const SUB='I-P06-MOCKPAYPAL123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const TIME='2026-10-15T12:00:00Z'
const consent=()=>({requestKey:KEY,locale:'es',termsVersion:'pazo-supporter-p06.v1',
 termsDigest:'a'.repeat(64),affirmativeConsent:true})
function harness(overrides={}){
 const calls=[]
 let providerClaimed=false
 const api=create({
  resolveAuthenticatedOwner:async request=>{
   calls.push('auth')
   return overrides.owner===undefined?OWNER:overrides.owner
  },
  admit:async x=>{calls.push(['admit',x]);return overrides.admit??true},
  consentStore:{beginForOwner:async x=>{
   calls.push(['consent',x])
   return overrides.saved===undefined?{
    ownerId:OWNER,intentId:INTENT,requestKey:KEY,locale:'es',
    termsVersion:'pazo-supporter-p06.v1',termsDigest:'a'.repeat(64),
    planId:PLAN,createdAt:TIME,state:'pending',
   }:overrides.saved
  },claimProviderCreate:async x=>{
    calls.push(['claim',x])
    if(overrides.claimError)throw Error('PRIVATE_STORE_ERROR')
    if(overrides.claim===false||providerClaimed)return false
    providerClaimed=true
    return true
  }},
  subscriptionCreator:{create:async x=>{
   calls.push(['create',x])
   if(overrides.createError)throw Error('PRIVATE_TOKEN')
   return {subscriptionId:SUB,status:'APPROVAL_PENDING',
    entitlement:false,
    approvalUrl:'https://www.sandbox.paypal.com/webapps/billing/subscriptions'}
  }},
  subscriptionReader:{readSubscription:async id=>{
   calls.push(['read',id])
   return overrides.remote===undefined?
    {id,plan_id:PLAN,custom_id:INTENT,status:'APPROVAL_PENDING'}:
    overrides.remote
  }},
  intentStore:{bindVerified:async x=>{
   calls.push(['bind',x])
   return overrides.binding===undefined?
    {state:'bound',result:'new_binding',entitlement:false}:overrides.binding
  }},
  now:()=>Date.parse('2026-10-15T12:05:00Z'),
 })
 return{api,calls}
}
const request=new Request('https://api.example/checkout',
 {headers:{Authorization:'Bearer TEST_TOKEN_123456789'}})
const secure=x=>{
 assert.equal(x.environment,'sandbox');assert.equal(x.entitlement,false)
 assert.equal(x.mayGrantBenefits,false);assert.equal(x.mayRecordPayment,false)
 assert.equal(x.mayEnableLive,false);assert.equal(x.paidThrough,null)
 assert.ok(!JSON.stringify(x).includes(OWNER))
 assert.ok(!JSON.stringify(x).includes(INTENT))
 assert.ok(!JSON.stringify(x).includes(SUB))
 return x
}
test('verified consent before PayPal create/GET; binding is NOT a payment',async()=>{
 const {api,calls}=harness()
 const r=secure(await api.begin({request,consent:consent()}))
 assert.equal(r.phase,'APPROVAL_PENDING')
 assert.equal(r.approvalUrl.startsWith('https://www.sandbox.paypal.com/'),true)
 assert.deepEqual(calls.map(x=>typeof x==='string'?x:x[0]),
  ['auth','admit','consent','claim','create','read','bind'])
 assert.equal(calls[2][1].ownerId,OWNER)
 assert.equal(calls[2][1].affirmativeConsent,true)
 assert.deepEqual(calls[3][1],{ownerId:OWNER,requestKey:KEY,intentId:INTENT})
 assert.equal(calls[4][1].intent.id,INTENT)
 assert.deepEqual(calls[6][1],{intentId:INTENT,ownerId:OWNER,
  externalSubscriptionId:SUB,provider:'paypal',planId:PLAN})
})
test('no explicit opt-in, missing version/hash or unknown key means no writes',async()=>{
 for(const change of [
  {affirmativeConsent:false},{affirmativeConsent:'true'},
  {termsVersion:'old'},{termsDigest:'wrong'},
  {requestKey:'1234'}, {ownerId:OWNER},
 ]){
  const {api,calls}=harness()
  const r=secure(await api.begin({request,consent:{...consent(),...change}}))
  assert.equal(r.phase,'BLOCKED')
  assert.equal(r.reason,'explicit_versioned_consent_required')
  assert.deepEqual(calls,[])
 }
})
test('missing Auth, global admission or durable consent does not call PayPal',async()=>{
 for(const overrides of [{owner:null},{admit:false},{saved:null}]){
  const {api,calls}=harness(overrides)
  const r=secure(await api.begin({request,consent:consent()}))
  assert.equal(r.phase,'BLOCKED')
  assert.ok(!calls.some(x=>Array.isArray(x)&&x[0]==='create'))
 }
})
test('existing owner+idempotency key linked to PayPal never re-creates',async()=>{
 const {api,calls}=harness({saved:{ownerId:OWNER,intentId:INTENT,
  requestKey:KEY,locale:'es',termsVersion:'pazo-supporter-p06.v1',
  termsDigest:'a'.repeat(64),planId:PLAN,createdAt:TIME,state:'bound'}})
 const r=secure(await api.begin({request,consent:consent()}))
 assert.equal(r.phase,'ALREADY_LINKED_NOT_PAYMENT_VERIFIED')
 assert.ok(!calls.some(x=>Array.isArray(x)&&x[0]==='create'))
})
test('provider GET must match exact intent custom_id/plan/approval status',async()=>{
 for(const remote of [
  {id:'I-FOREIGN',plan_id:PLAN,custom_id:INTENT,status:'APPROVAL_PENDING'},
  {id:SUB,plan_id:'P-OTHER',custom_id:INTENT,status:'APPROVAL_PENDING'},
  {id:SUB,plan_id:PLAN,custom_id:'intent-FOREIGN',status:'APPROVAL_PENDING'},
  {id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE'},
 ]){
  const {api,calls}=harness({remote})
  const r=secure(await api.begin({request,consent:consent()}))
  assert.equal(r.phase,'BLOCKED')
  assert.equal(r.reason,'paypal_subscription_owner_proof_missing')
  assert.ok(!calls.some(x=>Array.isArray(x)&&x[0]==='bind'))
 }
})
test('PayPal POST ambiguity or DB bind failure reports recovery, no approval',async()=>{
 for(const x of [
  {createError:true},
  {binding:{state:'pending',result:'missing',entitlement:false}},
 ]){
  const {api}=harness(x)
  const r=secure(await api.begin({request,consent:consent()}))
  assert.equal(r.phase,'BLOCKED')
  assert.equal('approvalUrl' in r,false)
 }
})
test('failed/denied durable create claim never contacts PayPal',async()=>{
 for(const x of [{claim:false},{claimError:true}]){
  const {api,calls}=harness(x)
  const r=secure(await api.begin({request,consent:consent()}))
  assert.equal(r.phase,'BLOCKED')
  assert.equal(r.reason,x.claimError?'provider_create_claim_unavailable':
   'checkout_requires_manual_recovery')
  assert.ok(!calls.some(c=>Array.isArray(c)&&c[0]==='create'))
 }
})
test('ambiguous PayPal response cannot trigger a second POST on retry',async()=>{
 const {api,calls}=harness({createError:true})
 const first=secure(await api.begin({request,consent:consent()}))
 assert.equal(first.reason,'paypal_checkout_pending_recovery')
 const second=secure(await api.begin({request,consent:consent()}))
 assert.equal(second.reason,'checkout_requires_manual_recovery')
 assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==='create').length,1)
})
test('concurrent checkout requests share one private creation claim',async()=>{
 const {api,calls}=harness()
 const results=await Promise.all([
  api.begin({request,consent:consent()}),
  api.begin({request,consent:consent()}),
 ])
 assert.deepEqual(results.map(x=>secure(x).phase).sort(),['APPROVAL_PENDING','BLOCKED'])
 assert.equal(calls.filter(x=>Array.isArray(x)&&x[0]==='create').length,1)
})
test('pending checkout older than 48 hours cannot cause another provider POST',async()=>{
 const {api,calls}=harness({saved:{ownerId:OWNER,intentId:INTENT,
  requestKey:KEY,locale:'es',termsVersion:'pazo-supporter-p06.v1',
  termsDigest:'a'.repeat(64),planId:PLAN,
  createdAt:'2026-10-11T00:00:00Z',state:'pending'}})
 const r=secure(await api.begin({request,consent:consent()}))
 assert.equal(r.phase,'BLOCKED')
 assert.equal(r.reason,'checkout_requires_manual_recovery')
 assert.ok(!calls.some(x=>Array.isArray(x)&&x[0]==='create'))
})
test('missing dependency fails construction, no fallback to non-durable intent',()=>{
 assert.throws(()=>create({}),/pazo_sandbox_checkout_not_configured/)
})
