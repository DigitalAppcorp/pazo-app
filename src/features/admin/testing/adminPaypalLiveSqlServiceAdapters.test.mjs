import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveServiceRpc,createPazoLiveCheckoutSqlStores} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const serviceRoleKey='TEST_ONLY_SERVICE_ROLE_SECRET_1234567890'
const owner='12345678-1234-4234-8234-123456789abc'
const requestKey='23456789-1234-4234-8234-123456789abc'
const intent='intent-34567890-1234-4234-8234-123456789abc'
const plan='P-ABCDEFGHIJKLMN'
test('service role adapter only calls pinned Supabase RPC names and never exports credentials',async()=>{
 const requests=[]
 const fetchImpl=async(uri,opts)=>{
  requests.push({uri,headers:opts.headers,payload:JSON.parse(opts.body)})
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})
 }
 const rpc=createPazoLiveServiceRpc({projectUrl:url,serviceRoleKey,fetchImpl})
 await rpc('begin',{p_owner:owner})
 assert.equal(requests.length,1)
 assert.equal(requests[0].uri,url+'/rest/v1/rpc/pazo_f16_live_service_checkout_begin')
 assert.equal(requests[0].headers.apikey,serviceRoleKey)
 assert.equal(requests[0].headers.Authorization,'Bearer '+serviceRoleKey)
 await assert.rejects(rpc('arbitrary',{p_owner:owner}),/unavailable/)
 assert.equal(requests.length,1)
})
test('idempotent checkout store maps intent and binding without granting entitlements',async()=>{
 const operations=[]
 const r={
  ok:true,ownerId:owner,requestKey,intentId:intent,planId:plan,
  merchantGeneration:7,sourceEnvironment:'live',locale:'es',
  termsVersion:'pazo-supporter-live.offer-v1',termsDigest:'a'.repeat(64),
  createdAt:'2026-10-20T00:00:00Z',state:'pending'
 }
 const rpc=async(name,payload)=>{
  operations.push({name,payload})
  if(name==='begin')return r
  if(name==='claim')return true
  if(name==='bind')return 'bound'
  throw Error('unexpected')
 }
 const {consentStore,intentStore}=createPazoLiveCheckoutSqlStores({rpc})
 const started=await consentStore.beginForOwner({ownerId:owner,requestKey,locale:'es',
  termsVersion:r.termsVersion,termsDigest:r.termsDigest,merchantGeneration:7,
  expectedPlanId:plan,affirmativeConsent:true})
 assert.deepEqual(started,r)
 assert.equal(await consentStore.claimProviderCreate({ownerId:owner,intentId:intent,
  requestKey,merchantGeneration:7,sourceEnvironment:'live'}),true)
 const bound=await intentStore.bindVerified({ownerId:owner,intentId:intent,
  requestKey,subscriptionId:'I-SAMPLE_SUBSCRIPTION_123',sourceEnvironment:'live',
  planId:plan,merchantGeneration:7,provider:'paypal'})
 assert.deepEqual(bound,{state:'bound',result:'new_binding',entitlement:false})
 assert.deepEqual(operations.map(x=>x.name),['begin','claim','bind'])
 assert.equal(operations[0].payload.p_generation,7)
 assert.equal(operations[2].payload.p_subscription,'I-SAMPLE_SUBSCRIPTION_123')
})
test('mismatched generation or wrong owner cannot generate a trusted local intent',async()=>{
 let calls=0
 const rpc=async()=>{calls++;return {ok:true,ownerId:owner,requestKey,
  merchantGeneration:8,intentId:intent,planId:plan}}
 const {consentStore}=createPazoLiveCheckoutSqlStores({rpc})
 await assert.rejects(consentStore.beginForOwner({ownerId:owner,requestKey,
  merchantGeneration:7,expectedPlanId:plan,affirmativeConsent:true}),/unavailable/)
 assert.equal(calls,1)
 await assert.rejects(consentStore.beginForOwner({ownerId:owner,requestKey,
  merchantGeneration:7,expectedPlanId:plan,affirmativeConsent:false}),/unavailable/)
 assert.equal(calls,1)
})
test('transport errors are sanitized, no fallback or blind retry',async()=>{
 let n=0
 const rpc=createPazoLiveServiceRpc({projectUrl:url,serviceRoleKey,
  fetchImpl:async()=>{n++;throw Error('NETWORK_WITH_SECRET_123')}})
 await assert.rejects(rpc('bind',{p_owner:owner}),e=>
  e.message==='live_private_service_unavailable')
 assert.equal(n,1)
})
