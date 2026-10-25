import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveHostedCheckout} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs'
import {getPazoLiveOffer} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'
const origin='https://pazo.example.com'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const jwt='e30.eyJzdWIiOiIxMjM0In0.dGVzdA'
const owner='12345678-1234-4234-8234-123456789abc'
const consent={requestKey:'23456789-1234-4234-8234-123456789abc',
 termsVersion:getPazoLiveOffer('es').version,termsDigest:getPazoLiveOffer('es').termsDigest,
 locale:'es',affirmativeConsent:true}
const req=(method='POST',requestOrigin=origin)=>new Request(url+'/functions/v1/pazo-paypal-live-checkout'+
 (method==='GET'?'?locale=es':''),{
 method,headers:{origin:requestOrigin,'content-type':'application/json',authorization:'Bearer '+jwt},
 ...(method==='POST'?{body:JSON.stringify({action:'subscribe',consent})}:{})
})
const env=Object.freeze({
 SUPABASE_URL:url,SUPABASE_ANON_KEY:'TEST_ANON_KEY_1234567890123456789',
 SUPABASE_SERVICE_ROLE_KEY:'TEST_SERVICE_ROLE_KEY_123456789012345'
})
const response=(status,body)=>new Response(JSON.stringify(body),{status,
 headers:{'content-type':'application/json'}})
test('compiled Edge entrypoint selects only the SQL-guarded hosted composition',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-checkout/index.ts',import.meta.url),'utf8')
 assert.match(edge,/const CONTROLLED_CHECKOUT_RUNTIME=true/)
 assert.match(edge,/createPazoLiveHostedCheckout/)
 assert.doesNotMatch(edge,/createPazoLiveVerifiedCheckout\(\)/)
})
test('default OFF has no env reads, provider requests or database effects',async()=>{
 let reads=0,calls=0
 const h=createPazoLiveHostedCheckout({released:false,
  getEnv:()=>{reads++;throw Error('not expected')},
  fetchImpl:async()=>{calls++;throw Error('not expected')}})
 const r=await h(req())
 assert.equal(r.status,503)
 assert.equal((await r.json()).code,'live_checkout_not_released')
 assert.equal(reads,0)
 assert.equal(calls,0)
})
test('missing backend keys blocks before any provider activity; terms require no manual environment settings',async()=>{
 let calls=0
 const h=createPazoLiveHostedCheckout({released:true,
  getEnv:name=>{assert.ok(!name.startsWith('PAZO_F16_LIVE_TERMS_'));return name==='SUPABASE_SERVICE_ROLE_KEY'?null:env[name]},
  fetchImpl:async()=>{calls++;throw Error('not expected')}})
 const r=await h(req())
 assert.equal(r.status,503)
 assert.equal(calls,0)
})
test('active host allows only the official HTTPS origin; no wildcard CORS',async()=>{
 const h=createPazoLiveHostedCheckout({released:true,
  getEnv:name=>env[name],fetchImpl:async(uri)=>{
   if(uri.endsWith('/functions/v1/pazo-paypal-live-webhook'))return response(200,{source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_runtime'))return response(200,true)
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_admit'))return response(200,true)

   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
    return response(200,{releaseMode:'public',sourceEnvironment:'live',credentialSource:'edge_secrets',
      merchantGeneration:7,planId:'P-ABCDEFGHIJKLMN',returnOrigin:origin})
   throw Error('unexpected')
  }})
 const preflight=await h(req('OPTIONS'))
 assert.equal(preflight.status,204)
 assert.equal(preflight.headers.get('access-control-allow-origin'),origin)
 const invalid=await h(req('OPTIONS','https://attacker.example'))
 assert.equal(invalid.status,403)
 const denied=await h(req('POST','https://attacker.example'))
 assert.equal(denied.status,403)
 assert.equal(denied.headers.get('access-control-allow-origin'),null)
})
test('canonical app gets diagnostic CORS without bypassing previously certified origin',async()=>{
 const canonical='https://pazo-app.vercel.app'
 let readAttempts=0
 const h=createPazoLiveHostedCheckout({released:true,
  getEnv:name=>env[name],
  fetchImpl:async uri=>{
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_runtime'))
    return response(200,true)
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
    return response(200,{releaseMode:'canary',sourceEnvironment:'live',
     credentialSource:'vault',merchantGeneration:1,
     planId:'P-ABCDEFGHIJKLMN',returnOrigin:'https://pazo-app-t83r.vercel.app'})
   readAttempts++
   throw Error('no worker, profile or payment calls before origin migration')
  }})
 const pre=await h(req('OPTIONS',canonical))
 assert.equal(pre.status,204)
 assert.equal(pre.headers.get('access-control-allow-origin'),canonical)
 const check=await h(req('GET',canonical))
 assert.equal(check.status,409)
 assert.equal((await check.json()).code,'live_origin_migration_required')
 assert.equal(check.headers.get('access-control-allow-origin'),canonical)
 assert.equal(readAttempts,0)
 const evil=await h(req('GET','https://pazo-app.vercel.app.evil.invalid'))
 assert.equal(evil.status,403)
 assert.equal(evil.headers.get('access-control-allow-origin'),null)
})
test('authenticated owner must have completed onboarding before any provider call',async()=>{
 let providerCalls=0
 const fetchImpl=async(uri,opts)=>{
   if(uri.endsWith('/functions/v1/pazo-paypal-live-webhook'))return response(200,{source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_runtime'))return response(200,true)
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_admit'))return response(200,true)

  if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_worker_health_read'))
   return response(200,{source:'private_live_worker_health',
    enabled:true,processingAllowed:true,healthy:true})
  if(uri.endsWith('/auth/v1/user'))return response(200,{id:owner,aud:'authenticated'})
  if(uri.includes('/rest/v1/profiles?'))return response(200,[{id:owner,onboarding_completed:false}])
  if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
   return response(200,{releaseMode:'public',sourceEnvironment:'live',credentialSource:'edge_secrets',
    merchantGeneration:7,planId:'P-ABCDEFGHIJKLMN',returnOrigin:origin})
  providerCalls++
  throw Error('provider must not be called')
 }
 const h=createPazoLiveHostedCheckout({released:true,getEnv:name=>env[name],fetchImpl})
 const r=await h(req())
 assert.equal(r.status,409)
 assert.equal((await r.json()).code,'checkout_admission_denied')
 assert.equal(providerCalls,0)
})
test('temporary Vercel beta origin and future custom domain are pinned from admin route, not source code',async()=>{
 const temporary='https://pazo-app-t83r.vercel.app'
 const future='https://pazo.example.com'
 for(const activeOrigin of [temporary,future]){
  let providerCalls=0
  const h=createPazoLiveHostedCheckout({released:true,
   getEnv:name=>env[name],
   fetchImpl:async uri=>{
   if(uri.endsWith('/functions/v1/pazo-paypal-live-webhook'))return response(200,{source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_runtime'))return response(200,true)
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_admit'))return response(200,true)

    if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
     return response(200,{
      releaseMode:'public',sourceEnvironment:'live',credentialSource:'edge_secrets',
      merchantGeneration:7,planId:'P-ABCDEFGHIJKLMN',
      returnOrigin:activeOrigin
     })
    providerCalls++
    throw Error('unexpected provider or owner access')
   }
  })
  const permitted=await h(req('OPTIONS',activeOrigin))
  assert.equal(permitted.status,204)
  assert.equal(permitted.headers.get('access-control-allow-origin'),activeOrigin)
  const mismatched=await h(req('OPTIONS',activeOrigin===temporary?future:temporary))
  assert.equal(mismatched.status,403)
  assert.equal(mismatched.headers.get('access-control-allow-origin'),null)
  assert.equal(providerCalls,0)
 }
})

test('server readiness requires actual Live route and a healthy private financial worker',async()=>{
 const records=[]
 const h=createPazoLiveHostedCheckout({
  released:true,getEnv:name=>env[name],
  fetchImpl:async uri=>{
   if(uri.endsWith('/functions/v1/pazo-paypal-live-webhook'))return response(200,{source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_runtime'))return response(200,true)
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_admit'))return response(200,true)
   if(uri.endsWith('/auth/v1/user'))return response(200,{id:owner,aud:'authenticated'})
   if(uri.includes('/rest/v1/profiles?'))return response(200,[{id:owner,onboarding_completed:true}])

   records.push(uri)
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
    return response(200,{releaseMode:'public',sourceEnvironment:'live',credentialSource:'vault',
     merchantGeneration:1,planId:'P-ABCDEFGHIJKLMN',returnOrigin:origin})
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_worker_health_read'))
    return response(200,{source:'private_live_worker_health',
     enabled:true,processingAllowed:true,healthy:true})
   throw Error('no provider request expected')
  }
 })
 const status=await h(req('GET'))
 assert.equal(status.status,200)
 const body=await status.json()
 assert.equal(body.code,'live_checkout_ready')
 assert.equal(body.ready,true)
 assert.equal(body.mayGrantBenefits,false)
 assert.equal(body.offer?.version,getPazoLiveOffer('es').version)
 assert.equal(body.offer?.termsDigest,getPazoLiveOffer('es').termsDigest)
 assert.equal(body.offer?.exactCopy,getPazoLiveOffer('es').exactCopy)
 assert.equal(status.headers.get('access-control-allow-origin'),origin)
 assert.match(status.headers.get('access-control-allow-methods'),/GET/)
 assert.equal(records.length,2)
})

test('no worker heartbeat means GET and POST fail closed before GoTrue and PayPal',async()=>{
 let queries=0
 const h=createPazoLiveHostedCheckout({
  released:true,getEnv:name=>env[name],
  fetchImpl:async uri=>{
   if(uri.endsWith('/functions/v1/pazo-paypal-live-webhook'))return response(200,{source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_runtime'))return response(200,true)
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_release_admit'))return response(200,true)

   queries++
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
    return response(200,{releaseMode:'public',sourceEnvironment:'live',credentialSource:'vault',
     merchantGeneration:1,planId:'P-ABCDEFGHIJKLMN',returnOrigin:origin})
   if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_worker_health_read'))
    return response(200,{source:'private_live_worker_health',
     enabled:true,processingAllowed:true,healthy:false})
   throw Error('no owner or payment service access on unhealthy worker')
  }
 })
 for(const method of ['GET','POST']){
  const res=await h(req(method))
  assert.equal(res.status,503)
  assert.equal((await res.json()).code,'live_processing_unavailable')
 }
 assert.equal(queries,4)
})
