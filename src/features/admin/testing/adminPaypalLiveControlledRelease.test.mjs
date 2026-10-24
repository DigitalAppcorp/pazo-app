import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveReleaseHandler} from '../../../../supabase/functions/pazo-admin-paypal-release/handler.mjs'
import {createPazoLiveHostedCheckout} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs'
import {createPazoLiveHostedWebhook} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedWebhook.mjs'
import {parsePazoLiveReleaseStatus} from '../liveReleaseStatus.mjs'
const origin='https://pazo-app-t83r.vercel.app'
const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
const actorId='a9456789-1234-4234-8234-123456789abc'
const actor={id:actorId,isAdmin:true,freshSession:true}
const requestId='b9456789-1234-4234-8234-123456789abc'
const body={action:'canary',confirmation:'AUTORIZO PRUEBA LIVE DE 2.99 USD',expectedRevision:0,requestId}
const request=(data=body,overrides={})=>new Request(project+'/functions/v1/pazo-admin-paypal-release',{
 method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data),...overrides
})
const env={SUPABASE_URL:project,SUPABASE_ANON_KEY:'SYNTHETIC_PUBLIC_KEY_12345678901234',
 SUPABASE_SERVICE_ROLE_KEY:'SYNTHETIC_PRIVATE_KEY_12345678901234'}
const response=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})
test('release requires independently verified admin and recent MFA before the SQL controller',async()=>{
 for(const invalid of [null,{...actor,isAdmin:false},{...actor,freshSession:false},{...actor,id:'forged'}]){
  let writes=0
  const handler=createPazoLiveReleaseHandler({authenticateAdmin:async()=>invalid,changeRelease:async()=>{writes++}})
  assert.equal((await handler(request())).status,403);assert.equal(writes,0)
 }
})
test('only explicit bounded operator confirmation and revision reach the service bridge',async()=>{
 const calls=[]
 const handler=createPazoLiveReleaseHandler({authenticateAdmin:async()=>actor,changeRelease:async value=>{
  calls.push(value);return {code:'release_state_updated',mode:'canary',revision:1}
 }})
 for(const invalid of [{...body,actorId},{...body,confirmation:''},{...body,action:'__proto__'},
  {...body,expectedRevision:-1},{...body,expectedRevision:1.1},{...body,requestId:'client-flag'},
  {...body,confirmation:'x'.repeat(3000)}])assert.equal((await handler(request(invalid))).status,400)
 assert.equal(calls.length,0)
 const result=await handler(request());assert.equal(result.status,200)
 assert.deepEqual(calls,[{actorId,action:'canary',expectedRevision:0,requestId}])
 assert.deepEqual(await result.json(),{code:'release_state_updated',mode:'canary',revision:1,mayCharge:false})
})
test('unknown outcomes and foreign backend messages never claim a successful activation or repeat a write',async()=>{
 for(const changeRelease of [async()=>{throw Error('PRIVATE_PROVIDER_DETAIL')},async()=>({code:'PRIVATE_PROVIDER_DETAIL'}),
  async()=>({code:'release_state_updated',mode:'public',revision:'1'})]){
  let writes=0
  const handler=createPazoLiveReleaseHandler({authenticateAdmin:async()=>actor,changeRelease:async value=>{writes++;return changeRelease(value)}})
  const result=await handler(request());assert.equal(result.status,503)
  const text=await result.text();assert.match(text,/release_outcome_unknown/);assert.doesNotMatch(text,/PRIVATE_PROVIDER_DETAIL/)
  assert.equal(writes,1)
 }
})
test('stale or already recorded requests return the server current state and never enable benefits',async()=>{
 const h=createPazoLiveReleaseHandler({authenticateAdmin:async()=>actor,
  changeRelease:async()=>({code:'release_request_already_recorded',mode:'off',revision:4})})
 const result=await h(request());assert.equal(result.status,200)
 assert.deepEqual(await result.json(),{code:'release_request_already_recorded',mode:'off',revision:4,mayCharge:false})
})
test('new canonical admin origin receives CORS but still requires fresh MFA',async()=>{
 const canonical='https://pazo-app.vercel.app'
 const h=createPazoLiveReleaseHandler({authenticateAdmin:async()=>null,changeRelease:async()=>{throw Error('must never call')}})
 const pre=await h(new Request(project+'/functions/v1/pazo-admin-paypal-release',{
  method:'OPTIONS',headers:{origin:canonical,'access-control-request-method':'POST'}}))
 assert.equal(pre.status,200)
 assert.equal(pre.headers.get('access-control-allow-origin'),canonical)
 const denied=await h(new Request(project+'/functions/v1/pazo-admin-paypal-release',{
  method:'POST',headers:{origin:canonical,'content-type':'application/json'},
  body:JSON.stringify(body)}))
 assert.equal(denied.status,403)
 assert.equal((await denied.json()).code,'fresh_admin_mfa_required')
 const attacker=await h(new Request(project+'/functions/v1/pazo-admin-paypal-release',{
  method:'OPTIONS',headers:{origin:'https://pazo-app.vercel.app.evil.test'}}))
 assert.equal(attacker.status,403)
 assert.equal(attacker.headers.get('access-control-allow-origin'),null)
})
test('origin, path, MIME and streaming size boundaries cannot call privileged SQL',async()=>{
 let writes=0
 const h=createPazoLiveReleaseHandler({authenticateAdmin:async()=>actor,changeRelease:async()=>{writes++}})
 assert.equal((await h(request(body,{headers:{origin:'https://attacker.invalid','content-type':'application/json'}}))).status,403)
 assert.equal((await h(request(body,{headers:{origin,'content-type':'text/plain'}}))).status,415)
 assert.equal((await h(new Request(project+'/functions/v1/pazo-admin-paypal-release?activate=true',{method:'POST',headers:{origin},body:'{}'}))).status,404)
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(' '.repeat(2049)));controller.close()}})
 assert.equal((await h(new Request(project+'/functions/v1/pazo-admin-paypal-release',{
  method:'POST',headers:{origin,'content-type':'application/json'},body:stream,duplex:'half'}))).status,400)
 assert.equal(writes,0)
})
test('armed checkout and webhook verify the operator deployment artifact before reading a route or a provider',async()=>{
 for(const type of ['checkout','webhook'])for(const proof of [false,null,{ready:true}]){
  const calls=[]
  const fetchImpl=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return response(proof)}
  const create=type==='checkout'?createPazoLiveHostedCheckout:createPazoLiveHostedWebhook
  const h=create({released:true,getEnv:n=>env[n],fetchImpl})
  const result=await h(new Request(project+'/functions/v1/pazo-paypal-live-'+type,{method:'POST',body:'{}',headers:{origin}}))
  assert.equal(result.status,503);assert.equal(calls.length,1)
  assert.equal(calls[0].url,project+'/rest/v1/rpc/pazo_f16_live_service_release_runtime')
  assert.deepEqual(calls[0].body,{p_component:type,p_build:'pazo_live_'+type+'_controlled_v1'})
 }
})
test('canary readiness is owner-scoped by verified GoTrue and SQL before any Vault read or PayPal operation',async()=>{
 const calls=[]
 const h=createPazoLiveHostedCheckout({released:true,getEnv:n=>env[n],fetchImpl:async(url,options)=>{
  calls.push(url)
  if(url.endsWith('release_runtime'))return response(true)
  if(url.endsWith('active_route'))return response({releaseMode:'canary',returnOrigin:origin,
   merchantGeneration:1,sourceEnvironment:'live',credentialSource:'vault',planId:'P-CONTROLLAB123456'})
  if(url.endsWith('worker_health_read'))return response({source:'private_live_worker_health',enabled:true,processingAllowed:true,healthy:true})
  if(url.endsWith('/functions/v1/pazo-paypal-live-webhook'))return response({source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
  if(url.endsWith('/auth/v1/user'))return response({id:actorId,aud:'authenticated'})
  if(url.endsWith('release_admit')){
   assert.deepEqual(JSON.parse(options.body),{p_owner:actorId,p_generation:1});return response(false)
  }
  throw Error('unexpected credential/provider access')
 }})
 const result=await h(new Request(project+'/functions/v1/pazo-paypal-live-checkout?locale=es',{
  headers:{origin,authorization:'Bearer e30.eyJzdWIiOiJ0ZXN0In0.dGVzdA'}}))
 assert.equal(result.status,403);assert.equal((await result.json()).code,'checkout_admission_denied')
 assert.equal(calls.length,6);assert.ok(calls.every(url=>url.startsWith(project)))
})
test('release status parser rejects privilege claims, incoherent readiness and leaked extra fields',()=>{
 const row={source:'pazo_live_release_status_v1',mode:'off',revision:0,engineeringVerified:false,
  preparationReady:false,originalOperator:false,mayCharge:false,asOf:'2026-10-22T00:00:00Z'}
 assert.deepEqual(parsePazoLiveReleaseStatus(row),row)
 for(const patch of [{mayCharge:true},{mode:'live'},{revision:-1},{revision:1.1},
  {preparationReady:true},{actorId},{asOf:'invalid'}])assert.equal(parsePazoLiveReleaseStatus({...row,...patch}),null)
})
test('healthy worker cannot compensate for unavailable deployed webhook intake',async()=>{
 const calls=[]
 const h=createPazoLiveHostedCheckout({released:true,getEnv:n=>env[n],fetchImpl:async(url)=>{
  calls.push(url)
  if(url.endsWith('release_runtime'))return response(true)
  if(url.endsWith('active_route'))return response({releaseMode:'public',returnOrigin:origin,
   merchantGeneration:1,sourceEnvironment:'live',credentialSource:'vault',planId:'P-CONTROLLAB123456'})
  if(url.endsWith('worker_health_read'))return response({source:'private_live_worker_health',enabled:true,processingAllowed:true,healthy:true})
  if(url.endsWith('/functions/v1/pazo-paypal-live-webhook'))return new Response(null,{status:503})
  throw Error('provider or credential read forbidden')
 }})
 const result=await h(new Request(project+'/functions/v1/pazo-paypal-live-checkout?locale=es',{headers:{origin}}))
 assert.equal(result.status,503);assert.equal((await result.json()).code,'live_ingestion_unavailable')
 assert.equal(calls.length,4);assert.ok(calls.every(url=>url.startsWith(project)))
})
test('webhook availability probe is read-only and does not stand for verified signature or a paid period',async()=>{
 const calls=[]
 const h=createPazoLiveHostedWebhook({released:true,getEnv:n=>env[n],fetchImpl:async(url)=>{
  calls.push(url);assert.ok(url.endsWith('/pazo_f16_live_service_release_runtime'));return response(true)
 }})
 const result=await h(new Request(project+'/functions/v1/pazo-paypal-live-webhook'))
 assert.equal(result.status,200)
 assert.deepEqual(await result.json(),{source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
 assert.equal(calls.length,1)
})
