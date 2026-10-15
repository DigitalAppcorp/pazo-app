import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxSupporterAccountHandler as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p14SandboxSupporterAccountHandler.mjs'
import {createPazoCheckoutConsentStore}
 from '../../../../supabase/functions/f16-paypal-webhook/p06CheckoutConsentStore.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const OTHER='22222222-2222-4222-8222-222222222222'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-P14-SYNTHETIC'
const PLAN='P-14V25407JP6850922NLHMDKI'
const SITE='https://pazo.example'
const sample=()=>({
 ownerId:OWNER,intentId:INTENT,locale:'es',termsVersion:'pazo-supporter-p14.v1',
 termsDigest:'a'.repeat(64),exactCopy:'Términos mensuales de PAZO. '.repeat(7),
 consentedAt:'2026-10-15T08:00:00-04:00',
 priceMinor:299,currency:'USD',cadence:'MONTH_1',
})
const request=(action,more={},origin=SITE)=>new Request('https://api.test/p14',{
 method:'POST',headers:{'content-type':'application/json',
 'authorization':'Bearer SERVER_AUTH_TOKEN_TEST',...(origin?{Origin:origin}:{})},
 body:JSON.stringify({action,intentId:INTENT,...more}),
})
function harness(changes={}){
 const calls=[]
 const handler=create({
  resolveAuthenticatedOwner:async()=>{calls.push('auth')
   if(changes.authError)throw Error('SECRET')
   return changes.owner===undefined?OWNER:changes.owner},
  admit:async args=>{calls.push(['admit',args]);return changes.admit??true},
  privateIntentStore:{load:async id=>{calls.push(['load',id])
   return changes.intent===undefined?
    {id:INTENT,ownerId:OWNER,state:'bound',provider:'paypal',
     planId:PLAN,externalSubscriptionId:SUB}:changes.intent}},
  provider:{
   read:async()=>{calls.push('read');return{status:changes.status??'ACTIVE'}},
   cancel:async()=>{calls.push('cancel');return{status:'CANCELLED'}},
  },
  consentStore:{readAcknowledgementForOwner:async args=>{
   calls.push(['receipt',args])
   if(changes.receiptError)throw Error('DB_PRIVACY_SECRET')
   return changes.saved===undefined?sample():changes.saved}},
  trustedOrigins:[SITE],
 })
 return {handler,calls}
}
test('authenticated owner downloads original exact copy as no-store plain text',async()=>{
 const {handler,calls}=harness()
 const r=await handler(request('acknowledgement'))
 assert.equal(r.status,200)
 assert.equal(r.headers.get('access-control-allow-origin'),SITE)
 assert.equal(r.headers.get('cache-control'),'no-store')
 assert.equal(r.headers.get('content-type'),'text/plain; charset=utf-8')
 assert.match(r.headers.get('content-disposition'),/attachment/)
 const text=await r.text()
 assert.ok(text.includes(sample().exactCopy))
 assert.ok(text.includes('2026-10-15T12:00:00.000Z'))
 assert.match(text,/no demuestra pago/)
 assert.ok(!text.includes(OWNER)&&!text.includes(INTENT)&&!text.includes(SUB))
 assert.deepEqual(calls.map(x=>typeof x==='string'?x:x[0]),['auth','admit','receipt'])
 assert.deepEqual(calls[2][1],{ownerId:OWNER,intentId:INTENT})
})
test('already-cancelled or pending provider does not prevent consent retrieval',async()=>{
 for(const status of ['CANCELLED','APPROVAL_PENDING']){
  const {handler,calls}=harness({status,intent:null})
  assert.equal((await handler(request('acknowledgement'))).status,200)
  assert.ok(!calls.some(x=>x==='read'||x==='cancel'||Array.isArray(x)&&x[0]==='load'))
 }
})
test('existing authenticated status/cancel route remains connected to provider',async()=>{
 const h=harness()
 const status=await h.handler(request('status'))
 assert.equal(status.status,200)
 const body=await status.json()
 assert.equal(body.providerStatus,'ACTIVE');assert.equal(body.paidThrough,null)
 const canceled=await h.handler(request('cancel',{confirmCancellation:true}))
 assert.equal(canceled.status,200)
 assert.equal((await canceled.json()).code,'future_renewals_cancelled')
 assert.deepEqual(h.calls.filter(x=>x==='read'||x==='cancel'),['read','cancel'])
})
test('CORS preflight is exact-origin and allows only authorization + JSON',async()=>{
 const h=harness()
 const preflight=(site,headers='authorization,content-type')=>
  new Request('https://api.test/p14',{method:'OPTIONS',
   headers:{Origin:site,'Access-Control-Request-Method':'POST',
    'Access-Control-Request-Headers':headers}})
 const ok=await h.handler(preflight(SITE))
 assert.equal(ok.status,204)
 assert.equal(ok.headers.get('access-control-allow-origin'),SITE)
 assert.equal((await h.handler(preflight('https://evil.test'))).status,403)
 assert.equal((await h.handler(preflight(SITE,'x-admin'))).status,403)
 assert.deepEqual(h.calls,[])
})
test('foreign owner, invalid input, missing consent never leaks terms',async()=>{
 for(const x of [{owner:OTHER},{owner:null},{authError:true},{admit:false},
  {saved:null},{saved:{...sample(),ownerId:OTHER}},
  {saved:{...sample(),intentId:'intent-99999999-9999-4999-8999-999999999999'}},
  {saved:{...sample(),termsDigest:'bad'}},{receiptError:true}]){
  const h=harness(x)
  const r=await h.handler(request('acknowledgement'))
  assert.notEqual(r.status,200)
  const text=await r.text()
  assert.ok(!text.includes(sample().exactCopy))
  assert.ok(!text.includes('DB_PRIVACY_SECRET'))
 }
 for(const body of [{action:'acknowledgement',intentId:INTENT,ownerId:OTHER},
  {action:'acknowledgement',intentId:SUB},
  {action:'acknowledgement',intentId:INTENT,paidThrough:'2050-01-01'}]){
  const h=harness()
  const r=await h.handler(request(body.action,body))
  assert.equal(r.status,400);assert.deepEqual(h.calls,[])
 }
})
test('receipt RPC goes only to service role and rejects malformed owner proof',async()=>{
 const logs=[]
 const api=createPazoCheckoutConsentStore({
  projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  serviceRoleKey:'MOCK_SERVICE_KEY_1234567890000000',
  fetchImpl:async(url,opts)=>{
   logs.push({url,opts})
   return{ok:true,json:async()=>sample()}
  },
 })
 const a=await api.readAcknowledgementForOwner({ownerId:OWNER,intentId:INTENT})
 assert.equal(a.termsVersion,sample().termsVersion)
 assert.equal(logs.length,1)
 assert.ok(logs[0].url.endsWith('/rpc/f16_p14_read_owner_checkout_acknowledgement'))
 assert.deepEqual(JSON.parse(logs[0].opts.body),
  {p_owner_id:OWNER,p_intent_id:INTENT})
 assert.equal(logs[0].opts.headers.Authorization,
  'Bearer MOCK_SERVICE_KEY_1234567890000000')
 await assert.rejects(api.readAcknowledgementForOwner({ownerId:OTHER,intentId:'BAD'}))
 assert.equal(logs.length,1)
})
test('unconfigured endpoint cannot operate; unknown origin blocks before Auth',async()=>{
 assert.throws(()=>create({}),/pazo_p14_account_endpoint_not_configured/)
 const h=harness()
 const r=await h.handler(request('acknowledgement',{},'https://evil.test'))
 assert.equal(r.status,403)
 assert.deepEqual(h.calls,[])
})
