import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveGenerationPinnedWebhook} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveGenerationPinnedWebhook.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const sub='I-LIVE12345'
const headers={
 'content-type':'application/json','paypal-auth-algo':'SHA256withRSA',
 'paypal-transmission-id':'TX-12345678',
 'paypal-transmission-time':'2026-10-19T20:00:00Z',
 'paypal-transmission-sig':'OPAQUE_SIGNED_TEST',
 'paypal-cert-url':'https://api-m.paypal.com/v1/notifications/certs/CERT-ABCDEFG-1234'
}
const event={id:'WH-LIVE-TEST123',event_type:'PAYMENT.SALE.COMPLETED',
 create_time:'2026-10-19T20:00:00Z',
 resource:{id:'SALE-LIVE12345',billing_agreement_id:sub}}
const mkReq=(hint='7',body=event)=>new Request(
 'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook'+hint,
 {method:'POST',headers,body:JSON.stringify(body)})
function build({released=true,confirmedGeneration=7,signature=true}={}){
 const calls=[]
 const gateway=createPazoLiveGenerationPinnedWebhook({
  released,
  resolveVerifierForGeneration:async v=>{
   calls.push({kind:'merchant',value:v})
   return {webhookId:'WH-PINNED-ORIGINAL7',
    verifySignature:async()=>{calls.push({kind:'signature'});return signature}}
  },
  provePazoScope:async v=>{
   calls.push({kind:'owner',value:v})
   return {confirmed:true,sourceEnvironment:'live',ownerIntentVerified:true,
    planVerified:true,ownerId:owner,intentId:intent,subscriptionId:sub,
    merchantGeneration:confirmedGeneration}
  },
  inbox:{recordIfAbsent:async v=>{calls.push({kind:'write',value:v});return true}}
 })
 return {gateway,calls}
}
test('OFF rejects before reading merchant credentials',async()=>{
 const {gateway,calls}=build({released:false})
 const r=await gateway(mkReq('?generation=7'))
 assert.equal(r.status,503)
 assert.equal(calls.length,0)
})
test('strict URL contains only one integer generation and no alternate routing',async()=>{
 const {gateway,calls}=build()
 for(const suffix of ['','?generation=0','?generation=07','?generation=10000',
  '?generation=7&generation=8','?generation=7&mode=live',
  '?generation=7%3B8','?generation=__proto__','#generation=7']){
  const r=await gateway(mkReq(suffix))
  assert.equal(r.status,400,suffix)
 }
 assert.equal(calls.length,0)
})
test('signed webhook queues only for original merchant generation',async()=>{
 const {gateway,calls}=build()
 const r=await gateway(mkReq('?generation=7'))
 assert.equal(r.status,202)
 assert.deepEqual(calls.map(x=>x.kind),['merchant','signature','owner','write'])
 assert.equal(calls[0].value.merchantGeneration,7)
 assert.equal(calls[3].value.merchantGeneration,7)
 assert.equal(calls[3].value.ownerId,owner)
})
test('a signed G7 event for G8 owner is rejected and never reaches inbox',async()=>{
 const {gateway,calls}=build({confirmedGeneration:8})
 const r=await gateway(mkReq('?generation=7'))
 assert.equal(r.status,503)
 assert.deepEqual(calls.map(x=>x.kind),['merchant','signature','owner'])
 assert.equal((await r.json()).code,'ownership_proof_unavailable')
})
test('invalid PayPal signature never calls owner resolver or inbox',async()=>{
 const {gateway,calls}=build({signature:false})
 const r=await gateway(mkReq('?generation=7'))
 assert.equal(r.status,401)
 assert.deepEqual(calls.map(x=>x.kind),['merchant','signature'])
})

test('Supabase Edge internal route accepts the same signed event but no route variants',async()=>{
 const {gateway,calls}=build()
 const requestFor=(path)=>new Request('http://edge-runtime.internal'+path,{
  method:'POST',headers,body:JSON.stringify(event)})
 const ok=await gateway(requestFor('/pazo-paypal-live-webhook?generation=7'))
 assert.equal(ok.status,202)
 assert.deepEqual(calls.map(x=>x.kind),['merchant','signature','owner','write'])
 for(const invalid of [
  '/pazo-paypal-live-webhook/?generation=7',
  '/pazo-paypal-live-webhook%2F?generation=7',
  '/not-pazo-paypal-live-webhook?generation=7',
  '/pazo-paypal-live-webhook?generation=7&source=live'
 ]){
  const before=calls.length
  const result=await gateway(requestFor(invalid))
  assert.equal(result.status,400,invalid)
  assert.equal(calls.length,before,'invalid URL cannot read merchant or write events')
 }
})
