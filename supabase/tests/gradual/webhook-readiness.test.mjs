import test from 'node:test'
import assert from 'node:assert/strict'
import {probePazoWebhookReadiness} from '../../functions/pazo-paypal-live-worker/webhookReadinessProbe.mjs'
const project='https://mrybvqdebbgcayuvgkkr.supabase.co'
const apiKey='SYNTHETIC_PUBLIC_KEY_ONLY'
const healthy=()=>Response.json({source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false})
const run=fetchImpl=>probePazoWebhookReadiness({projectUrl:project,apiKey,fetchImpl})

test('healthy readiness is checked exactly once without any payment side effect',async()=>{
 const calls=[]
 assert.equal(await run(async(url,init)=>{
  calls.push({url,init})
  return healthy()
 }),true)
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,project+'/functions/v1/pazo-paypal-live-webhook')
 assert.equal(calls[0].init.method,'GET')
 assert.equal(calls[0].init.redirect,'error')
 assert.equal(calls[0].init.cache,'no-store')
 assert.equal(calls[0].init.headers.apikey,apiKey)
 assert.ok(calls[0].init.signal instanceof AbortSignal)
})

test('a single transport timeout is retried exactly once and may recover without reporting a false negative',async()=>{
 const timeouts=[]
 const ok=await run(async(_url,init)=>{
  timeouts.push(init.signal)
  if(timeouts.length===1)throw new DOMException('synthetic timeout','TimeoutError')
  return healthy()
 })
 assert.equal(ok,true)
 assert.equal(timeouts.length,2)
})

test('persistent timeout is fail closed after only two bounded reads',async()=>{
 let calls=0
 assert.equal(await run(async()=>{calls++;throw Error('private unavailable')}),false)
 assert.equal(calls,2)
})

test('explicit HTTP 503 and explicit unhealthy response each stop without retry',async()=>{
 for(const response of [new Response(null,{status:503}),Response.json({source:'pazo_live_webhook_readiness_v1',ready:false,mayGrantBenefits:false})]){
  let calls=0
  assert.equal(await run(async()=>{calls++;return response}),false)
  assert.equal(calls,1)
 }
})

test('malformed body and benefit-granting reply do not qualify as readiness',async()=>{
 for(const response of [new Response('{bad json',{status:200}),Response.json({source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:true}),Response.json({source:'unknown',ready:true,mayGrantBenefits:false})]){
  let calls=0
  assert.equal(await run(async()=>{calls++;return response}),false)
  assert.equal(calls,1)
 }
})

test('foreign origin, bad credentials, and missing transport fail without requests',async()=>{
 let calls=0
 const fetchImpl=async()=>{calls++;return healthy()}
 for(const options of [{projectUrl:'https://other.supabase.co',apiKey}, {projectUrl:project+'/private',apiKey},{projectUrl:project,apiKey:''},{projectUrl:'invalid',apiKey}]){
  assert.equal(await probePazoWebhookReadiness({...options,fetchImpl}),false)
 }
 assert.equal(calls,0)
})
