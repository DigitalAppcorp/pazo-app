import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveHostedCheckout}
 from '../../../../supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs'
import {createPazoLiveHostedWebhook}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedWebhook.mjs'

const read=path=>readFileSync(new URL('../../../../'+path,import.meta.url),'utf8')
test('default financial entrypoints select the controlled runtime; alternative files never bypass its SQL guards',()=>{
 const checkout=read('supabase/functions/pazo-paypal-live-checkout/index.ts')
 const webhook=read('supabase/functions/pazo-paypal-live-webhook/index.ts')
 const candidateCheckout=read('supabase/functions/pazo-paypal-live-checkout/index.release-candidate.ts')
 const candidateWebhook=read('supabase/functions/pazo-paypal-live-webhook/index.release-candidate.ts')
 assert.match(checkout,/const CONTROLLED_CHECKOUT_RUNTIME=true/)
 assert.match(webhook,/const CONTROLLED_WEBHOOK_RUNTIME=true/)
 assert.match(candidateCheckout,/createPazoLiveHostedCheckout\(\{\s*released:true/)
 assert.match(candidateWebhook,/createPazoLiveHostedWebhook\(\{\s*released:true/)
 for(const text of [candidateCheckout,candidateWebhook]){
  assert.doesNotMatch(text,/clientSecret:|privateKey:|PayPal-Request-Id:|process\.env|localStorage/)
  assert.match(text,/Deno\.env\.get\(name\)/)
 }
 const config=read('supabase/config.toml')
 assert.doesNotMatch(config,/entrypoint\s*=\s*['"][^'"]*index\.release-candidate\.ts/)
})
test('compiled-on checkout cannot start without a merchant route and never contacts PayPal',async()=>{
 const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
 const env={SUPABASE_URL:project,SUPABASE_ANON_KEY:'LOCAL_PUBLIC_TEST_KEY_123456789',
  SUPABASE_SERVICE_ROLE_KEY:'TEST_PRIVATE_SERVICE_KEY_1234567890123'}
 let calls=0
 const h=createPazoLiveHostedCheckout({released:true,
  getEnv:name=>env[name],
  fetchImpl:async uri=>{
   calls++
   if(uri.endsWith('/pazo_f16_live_service_release_runtime'))return new Response('true',{status:200})
   assert.match(uri,/pazo_f16_live_service_active_route$/)
   return new Response('null',{status:200,headers:{'content-type':'application/json'}})
  }
 })
 const req=new Request(project+'/functions/v1/pazo-paypal-live-checkout?locale=es',
  {method:'GET',headers:{origin:'https://pazo-app-t83r.vercel.app'}})
 const response=await h(req)
 assert.equal(response.status,503)
 assert.equal((await response.json()).code,'live_route_inactive')
 assert.equal(calls,2,'no GoTrue or provider request if active route is OFF')
})
test('compiled-on webhook cannot accept unsigned event without backend secrets',async()=>{
 let called=0
 const h=createPazoLiveHostedWebhook({released:true,getEnv:()=>undefined,
  fetchImpl:async()=>{called++;throw Error('provider should not be contacted')}})
 const result=await h(new Request(
  'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook?generation=1',
  {method:'POST',body:'{}'}))
 assert.equal(result.status,503)
 assert.equal((await result.json()).code,'live_webhook_not_released')
 assert.equal(called,0)
})
