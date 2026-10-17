import test from 'node:test'
import assert from 'node:assert/strict'
import { receivePaypalEvent } from './offlineWebhookIntake.mjs'

function fixture(overrides={}) {
  const seen=new Set()
  const request={method:'POST',headers:{
    'content-type':'application/json','paypal-transmission-id':'tx-1',
    'paypal-transmission-time':'2026-10-13T00:00:00Z','paypal-transmission-sig':'signature',
    'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api-m.paypal.com/cert.pem'
  },body:new TextEncoder().encode(JSON.stringify({id:'WH-TEST-1',event_type:'PAYMENT.SALE.COMPLETED'}))}
  const dependencies={webhookId:'configured-id',verifySignature:async()=>true,inbox:{
    insertIfAbsent:async e=>{if(seen.has(e.eventId)) return false;seen.add(e.eventId);return true}
  }}
  return {request,dependencies,...overrides}
}
test('rejects untrusted methods and content types',async()=>{
  const x=fixture()
  assert.equal((await receivePaypalEvent({...x.request,method:'GET'},x.dependencies)).status,405)
  assert.equal((await receivePaypalEvent({...x.request,headers:{...x.request.headers,'content-type':'text/plain'}},x.dependencies)).status,415)
})
test('rejects missing transmission metadata and oversize body',async()=>{
  const x=fixture()
  const headers={...x.request.headers};delete headers['paypal-transmission-sig']
  assert.equal((await receivePaypalEvent({...x.request,headers},x.dependencies)).status,400)
  assert.equal((await receivePaypalEvent({...x.request,body:new Uint8Array(65537)},x.dependencies)).status,413)
})
test('fails closed without verifier, webhook id or durable inbox',async()=>{
  const x=fixture()
  assert.equal((await receivePaypalEvent(x.request,{...x.dependencies,verifySignature:undefined})).status,503)
  assert.equal((await receivePaypalEvent(x.request,{...x.dependencies,webhookId:''})).status,503)
})
test('rejects invalid signature and verifier failure before inbox',async()=>{
  const x=fixture();let wrote=false
  const inbox={insertIfAbsent:async()=>{wrote=true;return true}}
  assert.equal((await receivePaypalEvent(x.request,{...x.dependencies,inbox,verifySignature:async()=>false})).status,401)
  assert.equal((await receivePaypalEvent(x.request,{...x.dependencies,inbox,verifySignature:async()=>{throw Error('down')}})).status,503)
  assert.equal(wrote,false)
})
test('signature check receives byte-identical raw request body',async()=>{
  const x=fixture();let observed
  const result=await receivePaypalEvent(x.request,{...x.dependencies,verifySignature:async obj=>{observed=obj;return true}})
  assert.equal(result.status,202)
  assert.strictEqual(observed.rawBody,x.request.body)
  assert.equal(observed.webhookId,'configured-id')
})
test('invalid JSON or missing event id never reaches inbox',async()=>{
  const x=fixture();let wrote=false
  const inbox={insertIfAbsent:async()=>{wrote=true;return true}}
  for (const body of [new TextEncoder().encode('{bad'),new TextEncoder().encode('{"event_type":"x"}')]) {
    assert.equal((await receivePaypalEvent({...x.request,body},{...x.dependencies,inbox})).status,400)
  }
  assert.equal(wrote,false)
})
test('duplicate event is safely acknowledged without second insert',async()=>{
  const x=fixture()
  assert.equal((await receivePaypalEvent(x.request,x.dependencies)).status,202)
  assert.equal((await receivePaypalEvent(x.request,x.dependencies)).status,200)
})
test('inbox error never reports acceptance',async()=>{
  const x=fixture()
  const inbox={insertIfAbsent:async()=>{throw Error('disk full')}}
  assert.equal((await receivePaypalEvent(x.request,{...x.dependencies,inbox})).status,503)
})
