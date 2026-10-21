import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveHostedWebhook} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedWebhook.mjs'
import {createPazoLiveHostedInbox} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedInbox.mjs'
const origin='https://mrybvqdebbgcayuvgkkr.supabase.co'
const key='TEST_SERVICE_ROLE_LONG_ENOUGH_12345678901'
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const r=new Request(origin+'/functions/v1/pazo-paypal-live-webhook?generation=7',{
 method:'POST',headers:{'content-type':'application/json'},body:'{}'
})
const event={provider:'paypal',sourceEnvironment:'live',
 merchantGeneration:7,ownerId:owner,intentId:intent,subscriptionId:'I-LIVE12345',
 eventId:'WH-LIVE-EVENT1234',eventType:'PAYMENT.SALE.COMPLETED',signatureEvidence:{
  proofSource:'paypal_live_postback_success',signedBodySha256:'a'.repeat(64),
  webhookId:'WH-SYNTHETIC1234',subscriptionId:'I-LIVE12345',subjectId:'SALE-SYNTHETIC',
  providerEventAt:'2026-10-21T06:00:00.000Z',subjectAt:'2026-10-21T06:00:00.000Z',
  activationAt:null,nextBillingAt:null}}
test('Hosted webhook entrypoint remains compile-time OFF, with no environment reads',async()=>{
 const src=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-webhook/index.ts',import.meta.url),'utf8')
 assert.match(src,/const LIVE_WEBHOOK_RELEASED=false/)
 assert.match(src,/createPazoLiveHostedWebhook/)
 let reads=0,requests=0
 const handler=createPazoLiveHostedWebhook({released:false,
  getEnv:()=>{reads++;throw Error('not called')},
  fetchImpl:async()=>{requests++;throw Error('not called')}})
 const response=await handler(r)
 assert.equal(response.status,503)
 assert.equal(reads,0);assert.equal(requests,0)
})
test('Live webhook without provider secrets or service role remains inert',async()=>{
 const handler=createPazoLiveHostedWebhook({
  released:true,getEnv:name=>name==='SUPABASE_URL'?origin:undefined,
  fetchImpl:async()=>{throw Error('must not make provider calls')}
 })
 assert.equal((await handler(r)).status,503)
})
test('trusted webhook inbox only persists validated scope to fixed service-only RPC',async()=>{
 const writes=[]
 const inbox=createPazoLiveHostedInbox({supabaseUrl:origin,serviceRoleKey:key,
  fetchImpl:async(url,opts)=>{
   writes.push({url,method:opts.method,headers:opts.headers,body:JSON.parse(opts.body)})
   return new Response(JSON.stringify('queued'),{status:200,headers:{'content-type':'application/json'}})
  }})
 assert.equal(await inbox.recordIfAbsent(event),true)
 assert.equal(writes.length,1)
 assert.equal(writes[0].url,origin+'/rest/v1/rpc/pazo_f16_live_service_signed_event_queue')
 assert.equal(writes[0].body.p_owner,owner)
 assert.equal(writes[0].body.p_generation,7)
 assert.equal(writes[0].body.p_event_type,'PAYMENT.SALE.COMPLETED')
 assert.deepEqual(writes[0].body.p_evidence,event.signatureEvidence)
 assert.ok(!JSON.stringify(writes[0].body).includes('payer_email'))
})
test('duplicate webhook is acknowledged safely; incorrect owner or provider cannot persist',async()=>{
 let calls=0
 const inbox=createPazoLiveHostedInbox({supabaseUrl:origin,serviceRoleKey:key,
  fetchImpl:async()=>{calls++;return new Response(JSON.stringify('duplicate_verified_event'),
   {status:200,headers:{'content-type':'application/json'}})}})
 assert.equal(await inbox.recordIfAbsent(event),false)
 await assert.rejects(inbox.recordIfAbsent({...event,provider:'stripe'}))
 await assert.rejects(inbox.recordIfAbsent({...event,sourceEnvironment:'sandbox'}))
 await assert.rejects(inbox.recordIfAbsent({...event,signatureEvidence:undefined}))
 assert.equal(calls,1)
})
