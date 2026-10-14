import test from 'node:test'
import assert from 'node:assert/strict'
import {createSafeF16WebhookHandler} from '../../../../supabase/functions/f16-paypal-webhook/core.mjs'

function setup(overrides={}) {
  const seen=new Set(), queued=[]
  const inbox={insertIfAbsent:async item=>{
    if(seen.has(item.eventId))return false
    seen.add(item.eventId);queued.push(item);return true
  }}
  const config={environment:'sandbox',webhookId:'6N7889790V1467139',
    planId:'P-14V25407JP6850922NLHMDKI',verifySignature:async()=>true,inbox,...overrides}
  const headers={
    'content-type':'application/json',
    'paypal-transmission-id':'TX-1','paypal-transmission-time':'2026-10-13T12:00:00Z',
    'paypal-transmission-sig':'signature',
    'paypal-auth-algo':'SHA256withRSA',
    'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test',
  }
  function request(event={id:'WH-1',event_type:'PAYMENT.SALE.COMPLETED'},options={}) {
    return new Request('https://localhost/hook',{method:'POST',
      headers:{...headers,...(options.headers||{})},
      body:options.body??JSON.stringify(event)})
  }
  return {config,request,queued,inbox}
}
test('fails closed without Sandbox config, inbox or verifier',async()=>{
  const x=setup()
  for(const changes of [{environment:'live'},{environment:undefined},{planId:''},
    {webhookId:''},{inbox:undefined},{verifySignature:undefined}]) {
    const h=createSafeF16WebhookHandler({...x.config,...changes})
    assert.equal((await h(x.request())).status,503)
  }
  assert.equal(x.queued.length,0)
})
test('rejects non-POST and incorrect content type',async()=>{
  const x=setup(),h=createSafeF16WebhookHandler(x.config)
  assert.equal((await h(new Request('https://localhost/hook'))).status,405)
  assert.equal((await h(x.request({}, {headers:{'content-type':'text/plain'}}))).status,415)
})
test('rejects missing signatures and oversized body',async()=>{
  const x=setup(),h=createSafeF16WebhookHandler(x.config)
  assert.equal((await h(x.request({}, {headers:{'paypal-transmission-sig':''}}))).status,400)
  assert.equal((await h(x.request({}, {body:'x'.repeat(65537)}))).status,413)
})
test('invalid JSON and malformed events never call verifier or inbox',async()=>{
  let checked=0
  const x=setup({verifySignature:async()=>{checked++;return true}})
  const h=createSafeF16WebhookHandler(x.config)
  assert.equal((await h(x.request({}, {body:'{broken'}))).status,400)
  assert.equal((await h(x.request({event_type:'PAYMENT.SALE.COMPLETED'}))).status,400)
  assert.equal(checked,0)
  assert.equal(x.queued.length,0)
})
test('signature failure and network error never acknowledge or persist event',async()=>{
  const x=setup({verifySignature:async()=>false})
  assert.equal((await createSafeF16WebhookHandler(x.config)(x.request())).status,401)
  assert.equal((await createSafeF16WebhookHandler({...x.config,verifySignature:async()=>{throw Error('network')}})(x.request())).status,503)
  assert.equal(x.queued.length,0)
})
test('verifier receives same request body bytes, event and configured webhook ID',async()=>{
  let verification
  const x=setup({verifySignature:async data=>{verification=data;return true}})
  const r=await createSafeF16WebhookHandler(x.config)(x.request())
  assert.equal(r.status,202)
  assert.equal(verification.webhookId,'6N7889790V1467139')
  assert.equal(new TextDecoder().decode(verification.rawBody),JSON.stringify({id:'WH-1',event_type:'PAYMENT.SALE.COMPLETED'}))
  assert.equal(verification.event.id,'WH-1')
})
test('stores only minimal verified event references and accepts duplicate idempotently',async()=>{
  const x=setup(),h=createSafeF16WebhookHandler(x.config)
  assert.equal((await h(x.request({id:'WH-1',event_type:'PAYMENT.SALE.COMPLETED',payer_email:'private@example.com'}))).status,202)
  assert.equal((await h(x.request())).status,200)
  assert.deepEqual(x.queued,[{provider:'paypal',eventId:'WH-1',eventType:'PAYMENT.SALE.COMPLETED'}])
})
test('durable inbox failure never returns 2xx',async()=>{
  const x=setup()
  assert.equal((await createSafeF16WebhookHandler({...x.config,inbox:{insertIfAbsent:async()=>{throw Error('unavailable')}}})(x.request())).status,503)
  assert.equal((await createSafeF16WebhookHandler({...x.config,inbox:{insertIfAbsent:async()=>null}})(x.request())).status,503)
})
test('unrecognized signed event safely ignored without writing',async()=>{
  const x=setup(),h=createSafeF16WebhookHandler(x.config)
  assert.equal((await h(x.request({id:'WH-UNKNOWN',event_type:'RANDOM.EVENT'}))).status,200)
  assert.equal(x.queued.length,0)
})
