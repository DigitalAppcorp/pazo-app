import test from 'node:test'
import assert from 'node:assert/strict'
import {
 createP22PrivateLeaseRpcAdapter,
} from '../../../../supabase/functions/f16-paypal-webhook/p22PrivateLeaseRpcAdapter.mjs'
import {
 createP22SandboxReviewWorker,createP22SandboxOfflineMockComposer,
 createP22SandboxPrivilegedReviewComposition,
} from '../../../../supabase/functions/f16-paypal-webhook/p22SandboxReviewWorker.mjs'
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const KEY='synthetic_SERVICE_ROLE_KEY_1234567890123456'
const TOKEN='11111111-1111-4111-8111-111111111111'
const EVT='WH-P22-SYNTHETIC001'
const ID='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-P22-TEST-BOUND001'
const PLAN='P-14V25407JP6850922NLHMDKI'
const WHEN='2026-10-15T03:20:39Z'
const END='2026-10-15T03:25:39Z'
const claim=()=>({eventId:EVT,eventType:'PAYMENT.SALE.COMPLETED',
 verifiedAt:WHEN,processingState:'processing',attemptCount:1,
 leaseToken:TOKEN,leaseExpiresAt:END})
const read=()=>({id:EVT,type:'PAYMENT.SALE.COMPLETED',verifiedAt:WHEN,
 processingState:'processing'})
const bound=()=>({intentId:ID,subscriptionId:SUB,planId:PLAN,
 state:'bound',ownerId:TOKEN})
const SAFE=r=>{
 assert.equal(r.environment,'sandbox')
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.paidThrough,null)
 for(const secret of [KEY,TOKEN,EVT,SUB,ID,'payer@example.invalid']){
  assert.equal(JSON.stringify(r).includes(secret),false)
 }
}
const success=data=>({ok:true,json:async()=>data})
test('P22 default gate never calls merchant or private RPC',async()=>{
 let touched=0
 const bad={claimNextVerifiedEvent:async()=>{touched++}}
 const worker=createP22SandboxReviewWorker({leaseStore:bad,merchantReader:bad})
 const r=await worker.runOnce()
 assert.equal(r.phase,'DISABLED')
 SAFE(r);assert.equal(touched,0)
})
test('P22 privilege-protected RPC adapter is exactly scoped',async()=>{
 const calls=[]
 const payloads={
  f16_p05_draft_claim_next_verified_event:claim(),
  f16_p05_draft_read_claimed_event:read(),
  f16_p22_resolve_bound_under_claim:bound(),
  f16_p05_draft_finish_claimed_event:true,
 }
 const store=createP22PrivateLeaseRpcAdapter({
  projectUrl:BASE,serviceRoleKey:KEY,
  fetchImpl:async(url,opts)=>{
   const name=url.slice(url.lastIndexOf('/')+1)
   calls.push({name,body:JSON.parse(opts.body),opts})
   assert.equal(url,BASE+'/rest/v1/rpc/'+name)
   assert.equal(opts.method,'POST')
   assert.equal(opts.redirect,'error')
   assert.equal(opts.headers.apikey,KEY)
   assert.equal(opts.headers.Authorization,'Bearer '+KEY)
   assert.ok(Object.hasOwn(payloads,name))
   return success(payloads[name])
  },
 })
 assert.deepEqual(await store.claimNextVerifiedEvent(),claim())
 assert.deepEqual(await store.readClaimedEvent({
  eventId:EVT,claimToken:TOKEN}),read())
 assert.deepEqual(await store.resolveClaimedSubscription({
  eventId:EVT,claimToken:TOKEN,
  merchantSubscriptionId:SUB,merchantCustomIntentId:ID}),bound())
 assert.equal(await store.finishClaimedEvent({eventId:EVT,claimToken:TOKEN,
  outcome:'review',reasonCode:'cycle_unproven'}),true)
 assert.deepEqual(calls.map(x=>x.name),[
  'f16_p05_draft_claim_next_verified_event',
  'f16_p05_draft_read_claimed_event',
  'f16_p22_resolve_bound_under_claim',
  'f16_p05_draft_finish_claimed_event',
 ])
 assert.deepEqual(calls[2].body,{p_event_id:EVT,p_claim_token:TOKEN,
  p_subscription_id:SUB,p_intent_id:ID})
 assert.equal(calls[3].body.p_outcome,'review')
})
test('P22 worker with fully correlated synthetic sale only quarantines',async()=>{
 const calls=[]
 const leaseStore={
  claimNextVerifiedEvent:async()=>{calls.push('claim');return claim()},
  readClaimedEvent:async()=>{calls.push('read');return read()},
  resolveClaimedSubscription:async()=>{calls.push('resolve');return bound()},
  finishClaimedEvent:async x=>{calls.push(['finish',x]);return true},
 }
 const merchantReader={
  getMerchantEvent:async()=>{calls.push('event');return{
   id:EVT,event_type:'PAYMENT.SALE.COMPLETED',
   resource:{id:'SALE-P22-ONE',billing_agreement_id:SUB,
    state:'completed',amount:{currency:'USD',total:'2.99'}}}},
  getMerchantSubscription:async()=>{calls.push('subscription');return{
   id:SUB,plan_id:PLAN,custom_id:ID,status:'CANCELLED'}},
 }
 const w=createP22SandboxReviewWorker({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',leaseStore,merchantReader})
 const result=await w.runOnce();SAFE(result)
 assert.equal(result.phase,'REVIEW_REQUESTED')
 assert.equal(result.reason,'cycle_unproven')
 assert.equal(calls[0],'claim')
 assert.equal(calls.filter(x=>x==='resolve').length,1)
 assert.deepEqual(calls[calls.length-1],[ 'finish',{
   eventId:EVT,claimToken:TOKEN,outcome:'review',reasonCode:'cycle_unproven',
 }])
})
test('P22 missing binding never credits or reports success',async()=>{
 let finished
 const store={
  claimNextVerifiedEvent:async()=>claim(),
  readClaimedEvent:async()=>read(),
  resolveClaimedSubscription:async()=>null,
  finishClaimedEvent:async x=>{finished=x;return true},
 }
 const w=createP22SandboxReviewWorker({scope:'OFFLINE_SYNTHETIC_TEST_ONLY',
  leaseStore:store,merchantReader:{
   getMerchantEvent:async()=>({
    id:EVT,event_type:'PAYMENT.SALE.COMPLETED',
    resource:{id:'SALE-P22-ONE',billing_agreement_id:SUB,
     state:'completed',amount:{currency:'USD',total:'2.99'}}}),
   getMerchantSubscription:async()=>({
    id:SUB,plan_id:PLAN,custom_id:ID,status:'ACTIVE'}),
  }})
 const r=await w.runOnce();SAFE(r)
 assert.equal(r.phase,'REVIEW_REQUESTED')
 assert.equal(r.reason,'foreign_reference')
 assert.deepEqual(finished,{eventId:EVT,claimToken:TOKEN,
  outcome:'review',reasonCode:'foreign_reference'})
})
test('P22 malformed private rows and missing service credential fail closed',async()=>{
 assert.throws(()=>createP22PrivateLeaseRpcAdapter({
  projectUrl:BASE,serviceRoleKey:'public-anon-key'}),/not_configured/)
 let network=0
 const store=createP22PrivateLeaseRpcAdapter({
  projectUrl:BASE,serviceRoleKey:KEY,
  fetchImpl:async()=>{network++;return success({
   ...claim(),processingState:'pending'})},
 })
 await assert.rejects(store.claimNextVerifiedEvent(),/contract_mismatch/)
 await assert.rejects(store.finishClaimedEvent({eventId:EVT,claimToken:TOKEN,
   outcome:'processed',reasonCode:'cycle_unproven'}),/invalid_finish_reference/)
 await assert.rejects(store.resolveClaimedSubscription({
  eventId:EVT,claimToken:TOKEN,merchantSubscriptionId:'../bad',
  merchantCustomIntentId:ID}),/invalid_bound_reference/)
 assert.equal(network,1)
})
test('P22 PayPal path uses ONLY OAuth and subscription/event GET in offline mock',async()=>{
 const urls=[]
 const scope={...claim()}
 const leaseStore={
  claimNextVerifiedEvent:async()=>scope,
  readClaimedEvent:async()=>read(),
  resolveClaimedSubscription:async()=>bound(),
  finishClaimedEvent:async()=>true,
 }
 const fetchImpl=async(url,init)=>{
  urls.push({url,method:init.method})
  if(url.endsWith('/v1/oauth2/token'))
   return success({token_type:'Bearer',access_token:'SYNTHETIC_ACCESS_TOKEN'})
  if(url.includes('/v1/notifications/webhooks-events/'))
   return success({id:EVT,event_type:'PAYMENT.SALE.COMPLETED',
    create_time:WHEN,resource:{id:'SALE-P22-ONE',
     billing_agreement_id:SUB,state:'completed',
     amount:{currency:'USD',total:'2.99'},payer_email:'payer@example.invalid'}})
  if(url.endsWith('/v1/billing/subscriptions/'+SUB))
   return success({id:SUB,plan_id:PLAN,custom_id:ID,status:'ACTIVE',
    subscriber:{email_address:'payer@example.invalid'}})
  throw Error('unexpected endpoint '+url)
 }
 const w=createP22SandboxOfflineMockComposer({leaseStore,
  clientId:'SYNTHETIC_CLIENT_ID',clientSecret:'SYNTHETIC_CLIENT_SECRET',
  fetchImpl})
 const r=await w.runOnce();SAFE(r)
 assert.equal(r.phase,'REVIEW_REQUESTED')
 assert.equal(r.reason,'cycle_unproven')
 assert.ok(urls.some(x=>x.method==='GET'))
 assert.ok(urls.filter(x=>x.method==='POST').every(x=>x.url.endsWith('/v1/oauth2/token')))
 assert.ok(urls.every(x=>x.url.startsWith('https://api-m.sandbox.paypal.com/')))
})

test('P22 privileged composition remains disabled with no network or credentials',async()=>{
 let calls=0
 const worker=createP22SandboxPrivilegedReviewComposition({
  fetchImpl:async()=>{calls++;throw Error('unexpected_network')},
 })
 const r=await worker.runOnce()
 SAFE(r);assert.equal(r.phase,'DISABLED');assert.equal(calls,0)
 assert.throws(()=>createP22SandboxPrivilegedReviewComposition({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',projectUrl:BASE,
  serviceRoleKey:KEY,clientId:'SYNTHETIC_CLIENT_ID',
  clientSecret:'SYNTHETIC_CLIENT_SECRET',
 }),/requires_test_transport/)
})
test('P22 privileged composition uses existing private RPC and merchant GET contracts only',async()=>{
 const calls=[]
 const worker=createP22SandboxPrivilegedReviewComposition({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',projectUrl:BASE,
  serviceRoleKey:KEY,clientId:'SYNTHETIC_CLIENT_ID',
  clientSecret:'SYNTHETIC_CLIENT_SECRET',
  fetchImpl:async(url,init)=>{
   calls.push({url,method:init.method,body:init.body})
   if(url.startsWith(BASE+'/rest/v1/rpc/')){
    assert.equal(init.method,'POST')
    assert.equal(init.headers.Authorization,'Bearer '+KEY)
    assert.equal(init.headers.apikey,KEY)
    const rpc=url.split('/').at(-1)
    const data={
     f16_p05_draft_claim_next_verified_event:claim(),
     f16_p05_draft_read_claimed_event:read(),
     f16_p22_resolve_bound_under_claim:bound(),
     f16_p05_draft_finish_claimed_event:true,
    }
    assert.ok(Object.hasOwn(data,rpc))
    return success(data[rpc])
   }
   assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'))
   if(url.endsWith('/v1/oauth2/token')){
    assert.equal(init.method,'POST')
    return success({token_type:'Bearer',access_token:'SYNTHETIC_ACCESS_TOKEN'})
   }
   assert.equal(init.method,'GET')
   if(url.endsWith('/v1/notifications/webhooks-events/'+EVT))
    return success({id:EVT,event_type:'PAYMENT.SALE.COMPLETED',
     create_time:WHEN,resource:{id:'SALE-P22-ONE',
      billing_agreement_id:SUB,state:'completed',
      amount:{currency:'USD',total:'2.99'},
      payer_email:'should-not-leak@example.test'}})
   if(url.endsWith('/v1/billing/subscriptions/'+SUB))
    return success({id:SUB,plan_id:PLAN,custom_id:ID,status:'CANCELLED',
     subscriber:{email_address:'should-not-leak@example.test'}})
   throw Error('unexpected_endpoint')
  },
 })
 const result=await worker.runOnce()
 SAFE(result)
 assert.equal(result.phase,'REVIEW_REQUESTED')
 assert.equal(result.reason,'cycle_unproven')
 assert.equal(result.dispositionConfirmed,true)
 assert.equal(calls.filter(x=>x.url.endsWith('f16_p05_draft_claim_next_verified_event')).length,1)
 assert.equal(calls.filter(x=>x.url.endsWith('f16_p05_draft_finish_claimed_event')).length,1)
 assert.equal(calls.filter(x=>x.method==='GET').length,3)
 assert.ok(calls.every(x=>x.method==='GET'||x.url.includes('/rpc/')||
   x.url.endsWith('/v1/oauth2/token')))
 assert.ok(!JSON.stringify(result).includes('should-not-leak'))
})
test('P22 privileged composition sees disabled inbox as idle and never calls PayPal',async()=>{
 const calls=[]
 const worker=createP22SandboxPrivilegedReviewComposition({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',projectUrl:BASE,
  serviceRoleKey:KEY,clientId:'SYNTHETIC_CLIENT_ID',
  clientSecret:'SYNTHETIC_CLIENT_SECRET',
  fetchImpl:async(url,init)=>{
   calls.push({url,method:init.method})
   assert.equal(url,BASE+'/rest/v1/rpc/f16_p05_draft_claim_next_verified_event')
   return success(null)
  },
 })
 const result=await worker.runOnce()
 SAFE(result);assert.equal(result.phase,'NO_CLAIM')
 assert.equal(calls.length,1)
})
test('P22 privileged composition unavailable private RPC cannot reach provider',async()=>{
 const calls=[]
 const worker=createP22SandboxPrivilegedReviewComposition({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',projectUrl:BASE,
  serviceRoleKey:KEY,clientId:'SYNTHETIC_CLIENT_ID',
  clientSecret:'SYNTHETIC_CLIENT_SECRET',
  fetchImpl:async(url)=>{
   calls.push(url)
   assert.equal(url,BASE+'/rest/v1/rpc/f16_p05_draft_claim_next_verified_event')
   return {ok:false,status:503}
  },
 })
 const result=await worker.runOnce()
 SAFE(result);assert.equal(result.phase,'CLAIM_UNAVAILABLE')
 assert.equal(calls.length,1)
})
