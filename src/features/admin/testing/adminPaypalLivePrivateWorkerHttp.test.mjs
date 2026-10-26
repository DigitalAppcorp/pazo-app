import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLivePrivateWorkerHttp,PAZO_LIVE_WORKER_BUILD} from '../../../../supabase/functions/pazo-paypal-live-worker/privateWorkerHttp.mjs'
import {createPazoLiveHostedPrivateWorker} from '../../../../supabase/functions/pazo-paypal-live-worker/hostedPrivateWorker.mjs'
const invoker='c'.repeat(64),batch='34567890-1234-4234-8234-123456789abc'
const event={merchantGeneration:7,eventId:'WH-PRIVATE-WORKER-123',eventType:'PAYMENT.SALE.COMPLETED'}
const admitted={authenticated:true,enabled:true,busy:false,processingAllowed:true,leaseToken:batch,
 expectedBuild:PAZO_LIVE_WORKER_BUILD,event}
const request=(over={})=>new Request('https://example.test/functions/v1/pazo-paypal-live-worker',{
 method:'POST',headers:{authorization:'Bearer '+invoker,'content-type':'application/json'},body:'{"action":"drain"}',...over})
function fixture(over={}){
 const calls=[]
 const workers=Object.fromEntries(['sale','refund','lifecycle'].map(k=>[k,async()=>{
  calls.push(k);return {state:'RECORDED',leaseReleased:true}
 }]))
 const http=createPazoLivePrivateWorkerHttp({released:true,admit:async()=>{calls.push('admit');return admitted},
  complete:async p=>{calls.push(p);return true},workers,...over})
 return {http,calls}
}
test('release OFF and malformed browser/route/body/capability requests never reach admission',async()=>{
 assert.equal((await createPazoLivePrivateWorkerHttp()(request())).status,503)
 const {http,calls}=fixture()
 for(const req of [request({method:'GET',body:undefined}),
  new Request('https://example.test/functions/v1/pazo-paypal-live-worker?generation=1',{method:'POST'}),
  request({headers:{authorization:'Bearer '+invoker,'content-type':'application/json',origin:'http://localhost:5173'}}),
  request({headers:{'content-type':'application/json'}}),request({body:'{"action":"drain","owner":"forged"}'}),
  request({body:' '.repeat(500)}),request({body:'{"action":"activate"}'})]){
  assert.ok((await http(req)).status>=400)
 }
 assert.deepEqual(calls,[])
})
test('bad invoker has a sanitized rejection; disabled or busy never process a payment',async()=>{
 for(const response of [null,{authenticated:true,enabled:false},{authenticated:true,enabled:true,busy:true}]){
  const {http,calls}=fixture({admit:async()=>response}),r=await http(request()),text=await r.text()
  assert.equal(r.status,response?200:403);assert.deepEqual(calls,[])
  assert.ok(!text.includes(invoker));assert.ok(!text.includes(event.eventId))
 }
})
test('health and processing OFF perform only a bounded health completion',async()=>{
 for(const [admission,action] of [[{...admitted,processingAllowed:false},'drain'],[admitted,'health']]){
  const {http,calls}=fixture({admit:async()=>admission})
  const r=await (await http(request({body:JSON.stringify({action})}))).json()
  assert.equal(r.processed,0);assert.equal(r.outcome,'idle')
  assert.equal(calls.length,1);assert.equal(calls[0].leaseToken,batch);assert.equal(calls[0].outcome,'idle')
 }
})
test('a dispute monitor batch never counts as a new payment, and health never runs its provider reads',async()=>{
 for(const action of ['drain','health']){
  let monitored=0;const completions=[]
  const http=createPazoLivePrivateWorkerHttp({released:true,
   admit:async()=>({...admitted,event:null,monitorDue:true}),complete:async p=>{completions.push(p);return true},
   workers:{sale:async()=>assert.fail('sale'),refund:async()=>assert.fail('refund'),lifecycle:async()=>assert.fail('lifecycle'),
    dispute:async p=>{monitored++;assert.equal(p.batchLease,batch);return {state:'RECORDED',leaseReleased:true,monitorOutcome:'clear'}}}})
  const result=await (await http(request({body:JSON.stringify({action})}))).json()
  assert.equal(monitored,action==='drain'?1:0);assert.equal(result.processed,0)
  assert.equal(completions[0].outcome,'idle');assert.ok(!JSON.stringify(result).includes(batch))
 }
})
test('one admitted event is dispatched once to its exact financial/lifecycle worker',async()=>{
 for(const [type,worker] of [['PAYMENT.SALE.COMPLETED','sale'],['PAYMENT.SALE.REFUNDED','refund'],
  ['PAYMENT.SALE.REVERSED','refund'],['BILLING.SUBSCRIPTION.CANCELLED','lifecycle']]){
  const {http,calls}=fixture({admit:async()=>({...admitted,event:{...event,eventType:type}})})
  const result=await (await http(request())).json()
  assert.equal(result.processed,1);assert.equal(calls[0],worker);assert.equal(calls.length,2)
  assert.equal(calls[1].outcome,'processed');assert.ok(!JSON.stringify(result).includes(event.eventId))
 }
})
test('transient signed-event provider failure stays retryable and cannot be completed as financial review',async()=>{
 const calls=[]
 const worker=async()=>({state:'REVIEW_REQUIRED',code:'signed_sale_provider_event_unavailable',
  retryable:true,leaseReleased:true,paymentRecorded:false,entitlementGranted:false})
 const {http}=fixture({admit:async()=>({...admitted,event:{...event,eventType:'BILLING.SUBSCRIPTION.CREATED'}}),
  workers:{sale:async()=>assert.fail('sale'),refund:async()=>assert.fail('refund'),lifecycle:worker},
  complete:async p=>{calls.push(p);return true}})
 const response=await (await http(request())).json()
 assert.equal(response.outcome,'retry');assert.equal(response.code,'worker_event_pending')
 assert.equal(response.processed,0);assert.equal(calls.length,1);assert.equal(calls[0].outcome,'retry')
 assert.ok(!JSON.stringify(response).includes(event.eventId))
})
test('unknown writer outcome or exception has no automatic retry and no success claim',async()=>{
 let writes=0;const completions=[]
 const workers={sale:async()=>{writes++;throw Error('PRIVATE_PAYER_VALUE')},refund:async()=>{},lifecycle:async()=>{}}
 const {http}=fixture({workers,complete:async p=>{completions.push(p);return true}})
 const r=await (await http(request())).json()
 assert.equal(r.outcome,'unknown');assert.equal(r.processed,0);assert.equal(writes,1)
 assert.equal(completions.length,1);assert.equal(completions[0].outcome,'unknown')
 assert.ok(!JSON.stringify(r).includes('PRIVATE_PAYER_VALUE'))
})
test('uncertain batch completion and mismatched build do not repeat financial processing',async()=>{
 const {http,calls}=fixture({complete:async()=>false})
 assert.equal((await http(request())).status,503);assert.equal(calls.filter(c=>c==='sale').length,1)
 const bad=fixture({admit:async()=>({...admitted,expectedBuild:'unreviewed'})})
 assert.equal((await bad.http(request())).status,503);assert.deepEqual(bad.calls,[])
})
test('hosted worker health uses service-only admission/completion without reading PayPal or Vault keys',async()=>{
 const calls=[]
 const getEnv=name=>{
  assert.ok(!name.startsWith('PAZO_F16_LIVE_TERMS_'))
  return name==='SUPABASE_URL'?'https://mrybvqdebbgcayuvgkkr.supabase.co':
   name==='SUPABASE_SERVICE_ROLE_KEY'?'SYNTHETIC-SERVICE-KEY-123456789':undefined
 }
 const http=createPazoLiveHostedPrivateWorker({released:true,getEnv,fetchImpl:async(url,o)=>{
  calls.push({url,body:JSON.parse(o.body)})
  assert.ok(url.startsWith('https://mrybvqdebbgcayuvgkkr.supabase.co/rest/v1/rpc/'))
  return new Response(JSON.stringify(url.endsWith('worker_admit')?{...admitted,processingAllowed:false,event:null}:true),
   {status:200,headers:{'content-type':'application/json'}})
 }})
 const r=await (await http(request())).json()
 assert.equal(r.outcome,'idle');assert.equal(calls.length,2)
 assert.ok(calls[0].url.endsWith('worker_admit'));assert.ok(calls[1].url.endsWith('worker_complete'))
 assert.ok(!JSON.stringify(r).includes('SYNTHETIC-SERVICE-KEY'))
})
