import test from 'node:test'
import assert from 'node:assert/strict'
import { assessPazoSandboxWebhooks,PAZO_REQUIRED_PAYPAL_EVENTS,
 PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS } from './paypalSandboxWebhookContract.mjs'
const valid=()=>({webhooks:[{id:'WH-123456789',url:'https://example.com/paypal/hooks',
  event_types:PAZO_REQUIRED_PAYPAL_EVENTS.map(name=>({name}))}]})
test('reports existing registered webhook with complete subscription events',()=>{
  const r=assessPazoSandboxWebhooks(valid())
  assert.equal(r.ok,true);assert.equal(r.status,'subscriptions_configured')
  assert.equal(r.financialReconciliationReady,false)
  assert.deepEqual(r.candidates[0].missingDisputeEvents,
   PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS)
  assert.equal(r.candidates[0].webhookId,'WH-123456789')
  assert.deepEqual(r.candidates[0].missingEvents,[])
  assert.equal(JSON.stringify(r).includes('example.com'),false)
})
test('reports no existing webhooks without inventing anything',()=>{
  assert.deepEqual(assessPazoSandboxWebhooks({webhooks:[]}),{
    ok:false,financialReconciliationReady:false,
    status:'needs_webhook_configuration',count:0,candidates:[],
  })
})
test('flags missing event types without silently enabling payments',()=>{
  const v=valid()
  v.webhooks[0].event_types=[{name:'BILLING.SUBSCRIPTION.ACTIVATED'}]
  const r=assessPazoSandboxWebhooks(v)
  assert.equal(r.ok,false)
  assert.ok(r.candidates[0].missingEvents.includes('PAYMENT.SALE.REFUNDED'))
})
test('wildcard event subscription covers all required subscription event types',()=>{
  const v=valid();v.webhooks[0].event_types=[{name:'*'}]
  const r=assessPazoSandboxWebhooks(v)
  assert.equal(r.ok,true)
  assert.equal(r.financialReconciliationReady,true)
})
test('rejects invalid URL and does not expose listener URL',()=>{
  for(const url of ['http://example.com/h','https://localhost/h',
    'https://127.0.0.1/h','https://user:pw@example.com/h','not-a-url']) {
    const v=valid();v.webhooks[0].url=url
    const r=assessPazoSandboxWebhooks(v)
    assert.equal(r.ok,false,url)
    assert.equal(JSON.stringify(r).includes(url),false)
  }
})
test('malformed API payload fails closed',()=>{
  assert.equal(assessPazoSandboxWebhooks(null).status,'invalid_response')
  assert.equal(assessPazoSandboxWebhooks({webhooks:'invalid'}).ok,false)
})

test('full dispute lifecycle plus sale events enables coverage configuration only',()=>{
 const v=valid()
 v.webhooks[0].event_types=[
  ...PAZO_REQUIRED_PAYPAL_EVENTS,
  ...PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS,
 ].map(name=>({name}))
 const r=assessPazoSandboxWebhooks(v)
 assert.equal(r.ok,true)
 assert.equal(r.financialReconciliationReady,true)
 assert.deepEqual(r.candidates[0].missingDisputeEvents,[])
 assert.equal(JSON.stringify(r).includes('example.com'),false)
})
test('partial dispute subscriptions block financial readiness',()=>{
 for(const event of PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS){
  const v=valid()
  v.webhooks[0].event_types=[
   ...PAZO_REQUIRED_PAYPAL_EVENTS,
   ...PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS.filter(x=>x!==event),
  ].map(name=>({name}))
  const r=assessPazoSandboxWebhooks(v)
  assert.equal(r.ok,true)
  assert.equal(r.financialReconciliationReady,false)
  assert.deepEqual(r.candidates[0].missingDisputeEvents,[event])
 }
})
test('dispute events on a different hook do not prove same listener coverage',()=>{
 const v=valid()
 v.webhooks.push({id:'WH-OTHER999',url:'https://other.example.invalid/paypal',
  event_types:PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS.map(name=>({name}))})
 const r=assessPazoSandboxWebhooks(v)
 assert.equal(r.ok,true)
 assert.equal(r.financialReconciliationReady,false)
})
