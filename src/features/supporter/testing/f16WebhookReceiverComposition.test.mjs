import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16SandboxWebhookReceiver} from '../../../../supabase/functions/f16-paypal-webhook/receiver.mjs'

const SETTINGS={
 PAZO_F16_PAYPAL_ENV:'sandbox',PAZO_F16_PAYPAL_WEBHOOK_ID:'6N7889790V1467139',
 PAZO_F16_PAYPAL_PLAN_ID:'P-14V25407JP6850922NLHMDKI',
 PAZO_F16_PAYPAL_CLIENT_ID:'fixture-client-xxxxxxxx',
 PAZO_F16_PAYPAL_CLIENT_SECRET:'fixture-credential-xxxxxxxx',
 SUPABASE_URL:'https://mrybvqdebbgcayuvgkkr.supabase.co',
 SUPABASE_SERVICE_ROLE_KEY:'fixture-key-xxxxxxxxxxxxxxxxxxxxxxxx',
}
const EVENT={id:'WH-TEST-01',event_type:'PAYMENT.SALE.COMPLETED',
 resource:{payer_email:'must-not-store@invalid.example'}}
const HEADERS={
 'content-type':'application/json','paypal-auth-algo':'SHA256withRSA',
 'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test123',
 'paypal-transmission-id':'TX-test01','paypal-transmission-sig':'offline-test',
 'paypal-transmission-time':'2026-10-13T21:01:00Z',
}
function make({settings=SETTINGS,verification='SUCCESS',inbox=true,dbOk=true}={}){
 const calls=[]
 const fetchImpl=async (url,options)=>{
   calls.push({url,options})
   if(url.endsWith('/rest/v1/rpc/f16_paypal_try_admit_global'))
     return {ok:true,json:async()=>true}
   if(url.endsWith('/v1/oauth2/token'))
     return {ok:true,json:async()=>({token_type:'Bearer',access_token:'mock'})}
   if(url.endsWith('/v1/notifications/verify-webhook-signature'))
     return {ok:true,json:async()=>({verification_status:verification})}
   if(url.endsWith('/rest/v1/rpc/f16_paypal_record_verified_event'))
     return {ok:dbOk,json:async()=>inbox}
   throw Error('unexpected_provider_url')
 }
 const handle=createF16SandboxWebhookReceiver({env:{get:n=>settings[n]},fetchImpl})
 const request=(body=JSON.stringify(EVENT),headers=HEADERS)=>
   new Request('https://localhost/webhook',{method:'POST',headers,body})
 return {handle,request,calls}
}
test('Sandbox signature SUCCESS persists only minimal event reference',async()=>{
 const f=make(),response=await f.handle(f.request())
 assert.equal(response.status,202)
 assert.deepEqual(f.calls.map(x=>x.url),[
  'https://mrybvqdebbgcayuvgkkr.supabase.co/rest/v1/rpc/f16_paypal_try_admit_global',
  'https://api-m.sandbox.paypal.com/v1/oauth2/token',
  'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
  'https://mrybvqdebbgcayuvgkkr.supabase.co/rest/v1/rpc/f16_paypal_record_verified_event',
 ])
 const payload=JSON.parse(f.calls[3].options.body)
 assert.deepEqual(payload,{p_provider_event_id:'WH-TEST-01',
  p_event_type:'PAYMENT.SALE.COMPLETED'})
 assert.equal(JSON.stringify(payload).includes('must-not-store'),false)
})
test('Sandbox replay is idempotent; missing durable inbox fails closed',async()=>{
 const duplicate=make({inbox:false})
 assert.equal((await duplicate.handle(duplicate.request())).status,200)
 const unavailable=make({dbOk:false})
 assert.equal((await unavailable.handle(unavailable.request())).status,503)
})
test('invalid PayPal signature never touches private Supabase RPC',async()=>{
 const f=make({verification:'FAILURE'})
 assert.equal((await f.handle(f.request())).status,401)
 assert.equal(f.calls.length,3)
})
test('missing or Live configuration refuses all network calls',async()=>{
 for(const bad of [
  {PAZO_F16_PAYPAL_ENV:'live'},{PAZO_F16_PAYPAL_ENV:undefined},{PAZO_F16_PAYPAL_WEBHOOK_ID:'WRONG'},
  {PAZO_F16_PAYPAL_PLAN_ID:'WRONG'},{SUPABASE_URL:'https://wrong.invalid'},
  {PAZO_F16_PAYPAL_CLIENT_SECRET:undefined},{SUPABASE_SERVICE_ROLE_KEY:undefined},
 ]){
  const f=make({settings:{...SETTINGS,...bad}})
  assert.equal((await f.handle(f.request())).status,503)
  assert.equal(f.calls.length,0)
 }
})
test('invalid certificate source fails before PayPal connection',async()=>{
 const f=make()
 const bad={...HEADERS,'paypal-cert-url':'https://attacker.invalid/certificate'}
 assert.equal((await f.handle(f.request(undefined,bad))).status,503)
 assert.equal(f.calls.length,0)
})
test('oversized chunked body is rejected before any provider calls',async()=>{
 const f=make(),parts=[new Uint8Array(34000),new Uint8Array(34000)]
 const stream=new ReadableStream({pull(controller){
   if(parts.length)controller.enqueue(parts.shift());else controller.close()
 }})
 const req=new Request('https://localhost/webhook',
   {method:'POST',headers:HEADERS,body:stream,duplex:'half'})
 assert.equal((await f.handle(req)).status,413)
 assert.equal(f.calls.length,0)
})

test('two PayPal-created/reactivated events require signature plus durable minimal inbox, never entitlement',async()=>{
 for(const type of ['BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.RE-ACTIVATED']){
  const event={id:'WH-TEST-'+type,event_type:type,
   resource:{payer_email:'never-store@example.invalid',customer_id:'SECRET_CUSTOMER'}}
  const f=make()
  const response=await f.handle(f.request(JSON.stringify(event)))
  assert.equal(response.status,202,'signed known lifecycle event must queue only after persistence')
  const inboxRequest=f.calls.find(x=>x.url.endsWith('/rest/v1/rpc/f16_paypal_record_verified_event'))
  assert.ok(inboxRequest,'known lifecycle event must not be silently ignored')
  const body=JSON.parse(inboxRequest.options.body)
  assert.deepEqual(body,{p_provider_event_id:event.id,p_event_type:type})
  assert.doesNotMatch(inboxRequest.options.body,/never-store|SECRET_CUSTOMER|payer_email/)
  assert.equal(f.calls.length,4,'one DB quota, OAuth, signature verification and inbox only')
  const duplicate=make({inbox:false})
  const retry=await duplicate.handle(duplicate.request(JSON.stringify(event)))
  assert.equal(retry.status,200)
  const invalid=make({verification:'FAILURE'})
  const rejected=await invalid.handle(invalid.request(JSON.stringify(event)))
  assert.equal(rejected.status,401)
  assert.equal(invalid.calls.length,3,'invalid signature never writes inbox')
 }
})
