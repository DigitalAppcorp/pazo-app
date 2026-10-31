import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaWorkerHandler}
  from '../supabase/functions/pazo-meta-worker/workerCore.mjs'
import {createMetaWorkerAuthenticator}
  from '../supabase/functions/pazo-meta-worker/workerAuth.mjs'
import {createMetaWorkerRuntime}
  from '../supabase/functions/pazo-meta-worker/runtime.mjs'

const SECRET='synthetic_worker_dispatch_secret_123456789_ABC'
const OTHER='synthetic_wrong_worker_dispatch_secret_1234567'
const req=({method='POST',auth=SECRET,body=null,headers={}}={})=>new Request(
 'https://pazo.invalid/functions/v1/pazo-meta-worker',{
 method,headers:{
  ...(auth?{authorization:'Bearer '+auth}:{}),...headers
 },...(body===null?{}:{body}),
})
const read=async response=>({http:response.status,...await response.json()})

test('OFF and missing release gates cause zero secret, DB or provider calls',async()=>{
 for(const patch of [{},{released:true},{released:true,privacyReviewed:true},
   {released:true,privacyReviewed:true,matchFieldsApproved:true}]){
  let auth=0,worker=0
  const handler=createMetaWorkerHandler({...patch,
   authenticate:async()=>{auth++;return true},
   run:async()=>{worker++;return {status:'accepted'}}})
  const result=await handler(req())
  assert.deepEqual(await read(result),{http:503,status:'disabled'})
  assert.equal(auth+worker,0)
 }
})
test('service-only bearer verifies known secret without revealing it',async()=>{
 const names=[]
 const authenticate=createMetaWorkerAuthenticator({
  readSecret:name=>{names.push(name);return SECRET},
 })
 assert.equal(await authenticate(SECRET),true)
 assert.equal(await authenticate(OTHER),false)
 assert.equal(await authenticate('tiny'),false)
 assert.deepEqual(names,['META_WORKER_DISPATCH_SECRET','META_WORKER_DISPATCH_SECRET'])
 assert.equal(await createMetaWorkerAuthenticator({readSecret:()=>undefined})(SECRET),false)
 assert.equal(await createMetaWorkerAuthenticator({readSecret:()=>{throw Error('secrets unavailable')}})(SECRET),false)
})
test('reject browser origin, cookie, body, wrong method and wrong bearer before running worker',async()=>{
 let runs=0,verifications=0
 const handler=createMetaWorkerHandler({
  released:true,privacyReviewed:true,matchFieldsApproved:true,
  providerApproved:true,
  authenticate:async()=>{verifications++;return true},
  run:async()=>{runs++;return {status:'accepted'}},
 })
 for(const options of [
  {method:'GET'},{auth:OTHER,headers:{origin:'https://pazo-app.vercel.app'}},
  {headers:{cookie:'session=synthetic'}},{auth:''},
  {auth:'short'},{body:'{"ownerId":"spoofed"}'},
  {body:''},{headers:{'content-length':'9'}},
 ]) {
  const x=await handler(req(options))
  assert.notEqual(x.status,200,JSON.stringify(options))
  assert.equal((await x.json()).status,'not_available')
 }
 assert.equal(runs,0)
 assert.equal(verifications,0)
})
test('wrong schedule key cannot invoke CAPI worker',async()=>{
 const verify=createMetaWorkerAuthenticator({readSecret:()=>SECRET})
 let runs=0
 const handler=createMetaWorkerHandler({
  released:true,privacyReviewed:true,matchFieldsApproved:true,
  providerApproved:true,authenticate:verify,
  run:async()=>{runs++;return {status:'accepted'}},
 })
 const denied=await handler(req({auth:OTHER}))
 assert.deepEqual(await read(denied),{http:401,status:'not_available'})
 assert.equal(runs,0)
 const granted=await handler(req())
 assert.deepEqual(await read(granted),{http:200,status:'accepted'})
 assert.equal(runs,1)
 assert.equal(granted.headers.get('access-control-allow-origin'),null)
 assert.equal(granted.headers.get('cache-control'),'no-store, private')
})
test('status-only envelope prevents data and token leakage in worker response',async()=>{
 const handler=createMetaWorkerHandler({
  released:true,privacyReviewed:true,matchFieldsApproved:true,
  providerApproved:true,authenticate:async()=>true,
  run:async()=>({status:'accepted',eventId:'secret-event',token:SECRET,
    email:'fake@example.invalid',user_id:'sensitive-id'}),
 })
 const r=await handler(req())
 assert.equal(r.status,200)
 assert.deepEqual(await r.json(),{status:'accepted'})
})
test('worker failure, unknown status and disabled runtime fail closed',async()=>{
 for(const [value,code,state] of [
  [{status:'provider_error'},503,'unavailable'],
  [{status:'not_configured'},503,'not_configured'],
  [{status:'suppressed'},200,'suppressed'],
  [{status:'not_eligible'},200,'not_eligible'],
  [{status:'disabled'},503,'disabled'],
 ]) {
  const handler=createMetaWorkerHandler({
   released:true,privacyReviewed:true,matchFieldsApproved:true,
   providerApproved:true,authenticate:async()=>true,
   run:async()=>value,
  })
  assert.deepEqual(await read(await handler(req())),{http:code,status:state})
 }
 const handler=createMetaWorkerHandler({
  released:true,privacyReviewed:true,matchFieldsApproved:true,
  providerApproved:true,authenticate:async()=>true,
  run:async()=>{throw Error('sensitive message must not leak')},
 })
 const r=await handler(req())
 assert.deepEqual(await read(r),{http:503,status:'unavailable'})
})

test('Edge runtime defaults to OFF and missing approved match reader never accesses secrets or network',async()=>{
 let secrets=0,requests=0,reads=0
 for(const patch of [
   {},
   {released:true,privacyReviewed:true,matchFieldsApproved:true,providerApproved:true},
   {released:true,privacyReviewed:true,matchFieldsApproved:true,providerApproved:true,
     url:'https://mrybvqdebbgcayuvgkkr.supabase.co',
     serviceKey:'synthetic_service_role_key_NOT_REAL_123456789'},
 ]) {
   const handler=createMetaWorkerRuntime({...patch,
     readSecret:()=>{secrets++;return SECRET},
     fetchImpl:async()=>{requests++;throw Error('network forbidden')},
     readApprovedMatchField:null,
   })
   assert.deepEqual(await read(await handler(req())),{http:503,status:'disabled'})
 }
 assert.equal(secrets+requests+reads,0)
})
test('synthetic Edge runtime routes authorized outbox lease through CAPI without leaking identifiers',async()=>{
 const now=Date.now()
 const eventId='11111111-2222-4333-8444-555555555555'
 const leaseId='77777777-8888-4999-aaaa-bbbbbbbbbbbb'
 const ownerId='16900000-0000-4000-8000-000000000001'
 const eventTime=new Date(now-5000).toISOString()
 const consentTime=new Date(now-10000).toISOString()
 const dataset='1438916858347709'
 const events=[],rpcCalls=[],secretReads=[]
 let canLease=true, matchReads=0
 const fetchImpl=async(url,options)=>{
   if(url.startsWith('https://mrybvqdebbgcayuvgkkr.supabase.co/rest/v1/rpc/')){
     const name=url.split('/').pop()
     rpcCalls.push(name)
     const args=JSON.parse(options.body)
     let rows
     if(name==='pazo_meta_lease_candidate'){
       rows=canLease?[{owner_id:ownerId,event_id:eventId,lease_id:leaseId,
         event_time:eventTime}]:[]
       canLease=false
     } else if(name==='pazo_meta_check_claim_candidate'){
       assert.deepEqual(args,{p_event:eventId,p_lease:leaseId})
       rows=[{owner_id:ownerId,eligible:true,
         purpose:'meta_conversions_v1',version:'pazo-meta-conversions-v1',
         decision:'granted',decided_at:consentTime,withdrawn_at:null,
         gpc:false,sharing_opt_out:false,event_time:eventTime}]
     } else if(name==='pazo_meta_settle_candidate'){
       assert.deepEqual(args,{p_event:eventId,p_lease:leaseId,p_status:'sent'})
       rows=true
     } else throw Error('unknown rpc')
     return new Response(JSON.stringify(rows),{status:200,
       headers:{'content-type':'application/json'}})
   }
   assert.equal(url,'https://graph.facebook.com/v26.0/'+dataset+'/events')
   assert.equal(options.headers.authorization,'Bearer synthetic_capi_token_ABC_123456789123456')
   const payload=JSON.parse(options.body)
   assert.deepEqual(Object.keys(payload),['data'],'no test code in deployable worker')
   events.push(payload.data[0])
   return new Response(JSON.stringify({events_received:1}),{status:200,
     headers:{'content-type':'application/json'}})
 }
 const secrets={
   META_WORKER_DISPATCH_SECRET:SECRET,
   META_DATASET_ID:dataset,
   META_CAPI_ACCESS_TOKEN:'synthetic_capi_token_ABC_123456789123456',
 }
 const handler=createMetaWorkerRuntime({
   released:true,privacyReviewed:true,matchFieldsApproved:true,
   providerApproved:true,url:'https://mrybvqdebbgcayuvgkkr.supabase.co',
   serviceKey:'synthetic_service_role_key_NOT_REAL_123456789',
   readApprovedMatchField:async owner=>{
     assert.equal(owner,ownerId)
     matchReads++
     return {em:'a'.repeat(64),clientUserAgent:'Mozilla/5.0 (PAZO Synthetic Worker Test)'}
   },
   readSecret:key=>{secretReads.push(key);return secrets[key]},
   apiVersion:'v26.0',fetchImpl,clock:()=>now,
 })
 assert.deepEqual(await read(await handler(req({auth:OTHER}))),
   {http:401,status:'not_available'})
 assert.equal(events.length,0)
 assert.deepEqual(await read(await handler(req())),
   {http:200,status:'accepted'})
 assert.equal(matchReads,1)
 assert.equal(events.length,1)
 assert.equal(events[0].event_id,eventId)
 assert.equal(events[0].event_name,'CompleteRegistration')
 assert.deepEqual(Object.keys(events[0].user_data).sort(),
   ['client_user_agent','em'])
 assert.deepEqual(await read(await handler(req())),
   {http:200,status:'not_eligible'})
 assert.equal(events.length,1,'no duplicate provider event')
 assert.deepEqual(rpcCalls.filter(x=>x==='pazo_meta_settle_candidate'),
   ['pazo_meta_settle_candidate'])
 assert.ok(secretReads.includes('META_WORKER_DISPATCH_SECRET'))
 assert.ok(secretReads.includes('META_CAPI_ACCESS_TOKEN'))
})

test('worker reports sanitized accepted-with-warnings status, not provider warning details',async()=>{
 const handler=createMetaWorkerHandler({
   released:true,privacyReviewed:true,matchFieldsApproved:true,providerApproved:true,
   authenticate:async()=>true,
   run:async()=>({status:'accepted_with_warnings',
     messages:['test_event_code TESTSYNTH01 is not active'],
     token:SECRET}),
 })
 assert.deepEqual(await read(await handler(req())),{
  http:200,status:'accepted_with_warnings',
 })
})
