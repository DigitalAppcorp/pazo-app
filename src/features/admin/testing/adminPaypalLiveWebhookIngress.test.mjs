import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPaypalLivePostbackVerifier,requireLiveCertUrl} from '../../../../supabase/functions/pazo-paypal-live-webhook/livePostback.mjs'
import {createPazoLiveWebhookIntake} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveIngress.mjs'
const cert='https://api-m.paypal.com/v1/notifications/certs/CERT-ABCDEFG-1234'
const headers={
 'content-type':'application/json','paypal-transmission-id':'TRANSMIT-123',
 'paypal-transmission-time':'2026-10-19T20:00:00Z',
 'paypal-transmission-sig':'SGR123456','paypal-auth-algo':'SHA256withRSA',
 'paypal-cert-url':cert,
}
const event={id:'WH-EVENT-123',event_type:'PAYMENT.SALE.COMPLETED',
 resource:{id:'SALE12345',custom_id:'ATTACKER_UNTRUSTED'}}
const request=(body=JSON.stringify(event),more={})=>new Request('https://pazo.example.com/',{
 method:'POST',headers:{...headers,...more},body
})
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const subscription='I-LIVE-SUBSCRIPTION123'
const configured=()=>({released:true,environment:'live',webhookId:'WH-123456789012',
 verifySignature:async()=>true,
 provePazoScope:async()=>({confirmed:true,sourceEnvironment:'live',
   ownerIntentVerified:true,planVerified:true,merchantGeneration:1,
   ownerId:owner,intentId:intent,subscriptionId:subscription}),
 inbox:{recordIfAbsent:async()=>true}})
test('Live ingress fails closed by default and the deployed entrypoint has a hard OFF latch',async()=>{
 let called=false
 const fn=createPazoLiveWebhookIntake({...configured(),released:false,
 verifySignature:async()=>{called=true;return true}})
 const r=await fn(request())
 assert.equal(r.status,503);assert.equal(called,false)
 const source=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-webhook/index.ts',import.meta.url),'utf8')
 assert.match(source,/const LIVE_WEBHOOK_RELEASED=false/)
 assert.doesNotMatch(source,/Deno\.env\.get\(.+LIVE_WEBHOOK_RELEASED/)
})
test('PayPal Live certificate URL must be fixed official host and cert path',()=>{
 assert.equal(requireLiveCertUrl(cert),true)
 for(const url of [
  'http://api-m.paypal.com/v1/notifications/certs/CERT-ABCDEFG-1234',
  'https://api-m.paypal.com.attacker.invalid/v1/notifications/certs/CERT-ABCDEFG-1234',
  'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-ABCDEFG-1234',
  'https://api-m.paypal.com/evil','https://api-m.paypal.com/v1/notifications/certs/CERT-ABCDE?x=1',
 ])assert.equal(requireLiveCertUrl(url),false)
})
test('Live signature verification POSTs only OAuth and postback to LIVE fixed host',async()=>{
 const calls=[]
 const fetchImpl=async(url,opts)=>{
  calls.push({url,opts})
  return {ok:true,status:200,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(url.endsWith('/token')?
    {token_type:'Bearer',access_token:'opaque_token_1234'}:
    {verification_status:'SUCCESS'})}
 }
 const verifier=createPaypalLivePostbackVerifier({
  clientId:'CLIENTABC12345',clientSecret:'SECRETABC12345',fetchImpl})
 const raw=new TextEncoder().encode(JSON.stringify(event))
 const r=await verifier({environment:'live',headers:new Headers(headers),
  rawBody:raw,webhookId:'WH-123456789012'})
 assert.equal(r,true)
 assert.equal(calls.length,2)
 assert.deepEqual(calls.map(x=>x.url),[
  'https://api-m.paypal.com/v1/oauth2/token',
  'https://api-m.paypal.com/v1/notifications/verify-webhook-signature'])
 const posted=JSON.parse(calls[1].opts.body)
 assert.deepEqual(posted.webhook_event,event)
 assert.equal(posted.webhook_id,'WH-123456789012')
 assert.ok(!JSON.stringify({r}).includes('opaque_token_1234'))
 await assert.rejects(()=>verifier({environment:'sandbox',headers:new Headers(headers),
  rawBody:raw,webhookId:'WH-123456789012'}),/live_only/)
})
test('Only independently verified LIVE owner-scoped events can enter a durable inbox',async()=>{
 const records=[]
 const handler=createPazoLiveWebhookIntake({...configured(),
  inbox:{recordIfAbsent:async(x)=>{records.push(x);return true}}})
 const r=await handler(request())
 assert.equal(r.status,202)
 assert.equal(records.length,1)
 assert.deepEqual(records[0],{provider:'paypal',sourceEnvironment:'live',
  merchantGeneration:1,ownerId:owner,intentId:intent,
  subscriptionId:subscription,eventId:event.id,eventType:event.event_type})
 assert.ok(!JSON.stringify(records).includes('ATTACKER_UNTRUSTED'))
 const d=await createPazoLiveWebhookIntake({...configured(),
  inbox:{recordIfAbsent:async()=>false}})(request())
 assert.equal(d.status,200)
 assert.equal((await d.json()).code,'duplicate_verified_live_event')
})
test('No signature, missing original owner, wrong merchant, or absent DB never ACKs a payment',async()=>{
 const cases=[
  {verifySignature:async()=>false},
  {verifySignature:async()=>{throw Error('SECRET_PAYPAL')}},
  {provePazoScope:async()=>({confirmed:true,sourceEnvironment:'sandbox',
    ownerIntentVerified:true,planVerified:true,merchantGeneration:1})},
  {provePazoScope:async()=>({confirmed:true,sourceEnvironment:'live',
    ownerIntentVerified:false,planVerified:true,merchantGeneration:1})},
  {provePazoScope:async()=>({confirmed:true,sourceEnvironment:'live',
    ownerIntentVerified:true,planVerified:true,merchantGeneration:1,
    ownerId:'not-a-uuid',intentId:intent,subscriptionId:subscription})},
  {provePazoScope:async()=>({confirmed:true,sourceEnvironment:'live',
    ownerIntentVerified:true,planVerified:true,merchantGeneration:1,
    ownerId:owner,intentId:'unverified-intent',subscriptionId:subscription})},
  {provePazoScope:async()=>{throw Error('PRIVATE_OWNER')}},
  {inbox:{recordIfAbsent:async()=>{throw Error('PRIVATE_LEDGER')}}},
  {inbox:{recordIfAbsent:async()=>null}},
 ]
 for(const change of cases){
  const response=await createPazoLiveWebhookIntake({...configured(),...change})(request())
  assert.ok([401,503].includes(response.status))
  assert.ok(!JSON.stringify(await response.json()).includes('PRIVATE'))
 }
})
test('Reject malformed, untrusted headers, oversized events before paying for signature verification',async()=>{
 let count=0
 const h=createPazoLiveWebhookIntake({...configured(),
  verifySignature:async()=>{count++;return true}})
 for(const r of [
  request('not-json'),
  request('{'+' '.repeat(65538)+'}'),
  request(JSON.stringify(event),{'paypal-cert-url':'https://evil.invalid/test'}),
  request(JSON.stringify(event),{'paypal-auth-algo':'unknown'}),
  request('[]'),
 ]){
  const result=await h(r)
  assert.ok([400,401,413].includes(result.status))
 }
 assert.equal(count,0)
})
test('Unknown signed events do not persist or authorize payments',async()=>{
 let saved=false
 const h=createPazoLiveWebhookIntake({...configured(),inbox:{
  recordIfAbsent:async()=>{saved=true;return true}}})
 const result=await h(request(JSON.stringify({...event,event_type:'UNKNOWN.EVENT'})))
 assert.equal(result.status,200)
 assert.equal(saved,false)
})
