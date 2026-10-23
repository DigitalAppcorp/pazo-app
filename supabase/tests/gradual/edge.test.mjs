import test from 'node:test'
import assert from 'node:assert/strict'
import {createGradualAdminHandler,GRADUAL_CONFIRMATIONS} from '../../functions/pazo-admin-gradual-live/handler.mjs'
import {createGradualMaintenance} from '../../functions/pazo-paypal-live-worker/gradualMaintenance.mjs'
import {createPazoLiveServiceRpc} from '../../functions/pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
const id='82000000-0000-4000-8000-00000000ffff'
const input={action:'start',confirmation:GRADUAL_CONFIRMATIONS.start,expectedRevision:0,requestId:id}
const req=(value=input,overrides={})=>new Request('https://fixture.supabase.co/functions/v1/pazo-admin-gradual-live',{method:'POST',headers:{origin:'https://pazo-app.vercel.app','content-type':'application/json'},body:JSON.stringify(value),...overrides})
const actor={id,isAdmin:true,freshSession:true}
test('admin start/pause/resume/stop/public all require fresh verified admin and exact confirmation',async()=>{
 for(const [action,confirmation] of Object.entries(GRADUAL_CONFIRMATIONS)){
  let calls=0;const h=createGradualAdminHandler({authenticateAdmin:async()=>actor,change:async v=>{calls++;assert.equal(v.actorId,id);assert.equal(v.action,action);return {code:'updated',revision:1,token:'NEVER_RETURN',owner:'NEVER_RETURN'}}})
  const response=await h(req({...input,action,confirmation}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{code:'updated',revision:1,mayCharge:false});assert.equal(calls,1)
  assert.equal((await h(req({...input,action,confirmation:'yes'}))).status,400);assert.equal(calls,1)
 }
})
test('stale MFA, regular owner, unavailable proof and forged actor cannot reach service mutation',async()=>{
 for(const value of [{...actor,freshSession:false},{...actor,isAdmin:false},{...actor,id:'not-a-uuid'},null]){
  let calls=0;const h=createGradualAdminHandler({authenticateAdmin:async()=>value,change:async()=>{calls++}})
  assert.equal((await h(req())).status,403);assert.equal(calls,0)
 }
})
test('strict request, bounded JSON, trusted origin and path fail closed',async()=>{
 let calls=0;const h=createGradualAdminHandler({authenticateAdmin:async()=>actor,change:async()=>{calls++;return {code:'updated'}}})
 for(const value of [{...input,owner:id},{...input,expectedRevision:-1},{...input,requestId:'bad'},{...input,action:'__proto__'},null,[],{...input,confirmation:'x'.repeat(3000)}])assert.equal((await h(req(value))).status,400)
 assert.equal((await h(req(input,{headers:{origin:'https://attacker.invalid','content-type':'application/json'}}))).status,403)
 assert.equal((await h(req(input,{headers:{origin:'https://pazo-app.vercel.app','content-type':'text/plain'}}))).status,415)
 assert.equal((await h(new Request('https://fixture.supabase.co/functions/v1/pazo-admin-gradual-live?bypass=true',{headers:{origin:'https://pazo-app.vercel.app'}}))).status,404)
 assert.equal((await h(new Request('https://fixture.supabase.co/functions/v1/pazo-admin-gradual-live',{method:'OPTIONS',headers:{origin:'https://pazo-app.vercel.app'}}))).status,204)
 assert.equal(calls,0)
})
test('lost admin response never invents a successful release or leaks diagnostic content',async()=>{
 for(const change of [async()=>{throw Error('SECRET')},async()=>({code:'secret-diagnostic'})]){
  const r=await createGradualAdminHandler({authenticateAdmin:async()=>actor,change})(req())
  assert.equal(r.status,503);assert.deepEqual(await r.json(),{code:'outcome_unknown',mayCharge:false})
 }
})
test('durable maintenance uses only fixed tick/notice RPCs and stops after ten notices',async()=>{
 const effects=[]
 await createGradualMaintenance({readWebhookReady:async()=>true,rpc:async(name,args)=>{effects.push([name,args]);return name==='gradualNoticeClaim'?{campaign:id,owner:id,kind:'verified',version:1,lease:id}:true}})({outcome:'processed'})
 assert.equal(effects.filter(([n])=>n==='gradualNoticeDeliver').length,10)
 assert.deepEqual(effects[0],['gradualTick',{p_webhook_ready:true,p_financial_review:false}])
 assert.ok(effects.every(([n])=>['gradualTick','gradualNoticeClaim','gradualNoticeDeliver'].includes(n)))
})
test('unhealthy webhook and ambiguous financial outcome persist a pause signal',async()=>{
 const effects=[];await createGradualMaintenance({readWebhookReady:async()=>{throw Error('timeout')},rpc:async(n,a)=>{effects.push([n,a]);return null}})({outcome:'unknown'})
 assert.deepEqual(effects,[['gradualTick',{p_webhook_ready:false,p_financial_review:true}],['gradualNoticeClaim',{}]])
})
test('delivery interruption exits for durable lease retry without repeating financial work',async()=>{
 const effects=[]
 await assert.rejects(createGradualMaintenance({readWebhookReady:async()=>true,rpc:async n=>{effects.push(n);if(n==='gradualNoticeClaim')return {campaign:id,owner:id,kind:'invitation',version:2,lease:id};if(n==='gradualNoticeDeliver')throw Error('ACK lost')}})({outcome:'idle'}),/ACK lost/)
 assert.deepEqual(effects,['gradualTick','gradualNoticeClaim','gradualNoticeDeliver'])
})
test('service adapter pins all four gradual operations to the original Supabase project',async()=>{
 const paths=[];const rpc=createPazoLiveServiceRpc({projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',serviceRoleKey:'SYNTHETIC_SERVICE_ONLY_123456789012345',fetchImpl:async(url)=>{paths.push(new URL(url).pathname);return new Response('true',{headers:{'content-type':'application/json'}})}})
 for(const name of ['gradualAdmin','gradualTick','gradualNoticeClaim','gradualNoticeDeliver'])await rpc(name,{})
 assert.deepEqual(paths,['/rest/v1/rpc/pazo_f16_gradual_admin_action','/rest/v1/rpc/pazo_f16_gradual_tick','/rest/v1/rpc/pazo_f16_gradual_notice_claim','/rest/v1/rpc/pazo_f16_gradual_notice_deliver'])
 await assert.rejects(rpc('gradualRawSql',{}))
})

test('limited readiness revalidates authenticated owner and current SQL admission without provider CREATE',async()=>{
 const {createPazoLiveHostedCheckout}=await import('../../functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs')
 for(const allowed of [true,false]){
  const calls=[];const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
  const h=createPazoLiveHostedCheckout({released:true,getEnv:n=>({SUPABASE_URL:project,SUPABASE_ANON_KEY:'SYNTHETIC_ANON_1234567890123456789',SUPABASE_SERVICE_ROLE_KEY:'SYNTHETIC_SERVICE_1234567890123456789'})[n],fetchImpl:async(url,opts)=>{
   calls.push([url,opts.method]);let result
   if(url.endsWith('release_runtime'))result=true
   else if(url.endsWith('active_route'))result={releaseMode:'limited',sourceEnvironment:'live',credentialSource:'vault',merchantGeneration:1,planId:'P-ABCDEFGHIJKLMN',returnOrigin:'https://pazo-app.vercel.app'}
   else if(url.endsWith('worker_health_read'))result={source:'private_live_worker_health',enabled:true,processingAllowed:true,healthy:true}
   else if(url.endsWith('pazo-paypal-live-webhook'))result={source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false}
   else if(url.endsWith('/auth/v1/user'))result={id,aud:'authenticated',is_anonymous:false}
   else if(url.endsWith('release_admit'))result=allowed
   else if(url.includes('/profiles?'))result=[{id,onboarding_completed:true}]
   else throw Error('Unexpected call')
   return Response.json(result)
  }})
  const r=await h(new Request(project+'/functions/v1/pazo-paypal-live-checkout?locale=es',{headers:{origin:'https://pazo-app.vercel.app',authorization:'Bearer e30.eyJzdWIiOiJ0ZXN0In0.ZmFrZXNpZw'}}))
  assert.equal(r.status,allowed?200:403);assert.equal((await r.json()).code,allowed?'live_checkout_ready':'checkout_admission_denied')
  assert.ok(calls.every(([url])=>new URL(url).hostname==='mrybvqdebbgcayuvgkkr.supabase.co'))
  assert.ok(!calls.some(([url])=>url.includes('checkout_begin')))
 }
})

test('gradual delivery failure after original worker completion cannot replay the financial batch',async()=>{
 const {createPazoLiveHostedPrivateWorker}=await import('../../functions/pazo-paypal-live-worker/hostedPrivateWorker.mjs')
 const calls=[];const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
 const worker=createPazoLiveHostedPrivateWorker({released:true,getEnv:n=>({SUPABASE_URL:project,SUPABASE_ANON_KEY:'SYNTHETIC_ANON_KEY_1234567890',SUPABASE_SERVICE_ROLE_KEY:'SYNTHETIC_SERVICE_KEY_1234567890'})[n],fetchImpl:async(url)=>{
  calls.push(new URL(url).pathname)
  if(url.endsWith('worker_admit'))return Response.json({authenticated:true,enabled:true,busy:false,processingAllowed:true,leaseToken:id,expectedBuild:'pazo_live_worker_v2',event:null,monitorDue:false})
  if(url.endsWith('worker_complete'))return Response.json(true)
  if(url.endsWith('pazo-paypal-live-webhook'))return Response.json({source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
  if(url.endsWith('gradual_tick'))return Response.json({processed:true})
  if(url.endsWith('gradual_notice_claim'))throw Error('response lost')
  throw Error('Unexpected financial or credential read')
 }})
 const response=await worker(new Request(project+'/functions/v1/pazo-paypal-live-worker',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'a'.repeat(64)},body:JSON.stringify({action:'drain'})}))
 assert.equal(response.status,200);assert.equal((await response.json()).outcome,'idle')
 assert.equal(calls.filter(p=>p.endsWith('worker_complete')).length,1)
 assert.ok(!calls.some(p=>/vault|settlement|checkout_begin/.test(p)))
})
