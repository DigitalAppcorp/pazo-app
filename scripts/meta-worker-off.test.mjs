import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaWorkerHandler}
  from '../supabase/functions/pazo-meta-worker/workerCore.mjs'
import {createMetaWorkerAuthenticator}
  from '../supabase/functions/pazo-meta-worker/workerAuth.mjs'

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
