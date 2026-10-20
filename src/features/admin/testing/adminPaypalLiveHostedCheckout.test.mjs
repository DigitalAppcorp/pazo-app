import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveHostedCheckout} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs'
const origin='https://pazo.example.com'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const jwt='e30.eyJzdWIiOiIxMjM0In0.dGVzdA'
const owner='12345678-1234-4234-8234-123456789abc'
const consent={requestKey:'23456789-1234-4234-8234-123456789abc',
 termsVersion:'pazo-supporter-live.offer-v1',termsDigest:'a'.repeat(64),
 locale:'es',affirmativeConsent:true}
const req=(method='POST',requestOrigin=origin)=>new Request(url+'/functions/v1/pazo-paypal-live-checkout',{
 method,headers:{origin:requestOrigin,'content-type':'application/json',authorization:'Bearer '+jwt},
 ...(method==='POST'?{body:JSON.stringify({action:'subscribe',consent})}:{})
})
const env=Object.freeze({
 SUPABASE_URL:url,SUPABASE_ANON_KEY:'TEST_ANON_KEY_1234567890123456789',
 SUPABASE_SERVICE_ROLE_KEY:'TEST_SERVICE_ROLE_KEY_123456789012345',
 PAZO_F16_PUBLIC_HTTPS_ORIGIN:origin,
 PAZO_F16_LIVE_TERMS_VERSION:'pazo-supporter-live.offer-v1',
 PAZO_F16_LIVE_TERMS_DIGEST:'a'.repeat(64)
})
const response=(status,body)=>new Response(JSON.stringify(body),{status,
 headers:{'content-type':'application/json'}})
test('compiled Edge entrypoint remains OFF and imports only hosted composition',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-checkout/index.ts',import.meta.url),'utf8')
 assert.match(edge,/const LIVE_CHECKOUT_RELEASED=false/)
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
test('missing published terms or backend keys blocks before any provider activity',async()=>{
 let calls=0
 const h=createPazoLiveHostedCheckout({released:true,
  getEnv:name=>name==='PAZO_F16_LIVE_TERMS_DIGEST'?null:env[name],
  fetchImpl:async()=>{calls++;throw Error('not expected')}})
 const r=await h(req())
 assert.equal(r.status,503)
 assert.equal(calls,0)
})
test('active host allows only the official HTTPS origin; no wildcard CORS',async()=>{
 const h=createPazoLiveHostedCheckout({released:true,
  getEnv:name=>env[name],fetchImpl:async()=>{throw Error('unexpected')}})
 const preflight=await h(req('OPTIONS'))
 assert.equal(preflight.status,204)
 assert.equal(preflight.headers.get('access-control-allow-origin'),origin)
 const invalid=await h(req('OPTIONS','https://attacker.example'))
 assert.equal(invalid.status,403)
 const denied=await h(req('POST','https://attacker.example'))
 assert.equal(denied.status,403)
 assert.equal(denied.headers.get('access-control-allow-origin'),null)
})
test('authenticated owner must have completed onboarding before any provider call',async()=>{
 let providerCalls=0
 const fetchImpl=async(uri,opts)=>{
  if(uri.endsWith('/auth/v1/user'))return response(200,{id:owner,aud:'authenticated'})
  if(uri.includes('/rest/v1/profiles?'))return response(200,[{id:owner,onboarding_completed:false}])
  if(uri.endsWith('/rest/v1/rpc/pazo_f16_live_service_active_route'))
   return response(200,{sourceEnvironment:'live',credentialSource:'edge_secrets',
    merchantGeneration:7,planId:'P-ABCDEFGHIJKLMN'})
  providerCalls++
  throw Error('provider must not be called')
 }
 const h=createPazoLiveHostedCheckout({released:true,getEnv:name=>env[name],fetchImpl})
 const r=await h(req())
 assert.equal(r.status,409)
 assert.equal((await r.json()).code,'checkout_admission_denied')
 assert.equal(providerCalls,0)
})
