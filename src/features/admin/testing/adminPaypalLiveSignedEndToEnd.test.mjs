import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalLivePostbackVerifier} from '../../../../supabase/functions/pazo-paypal-live-webhook/livePostback.mjs'
import {createPaypalLiveMerchantEvidenceReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveMerchantEvidence.mjs'
import {createPazoLiveOwnerScopeResolver,createPazoLiveVerifiedInboxAdapter} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveOwnerScope.mjs'
import {createPazoLiveWebhookIntake} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveIngress.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const sub='I-SUBSCRIPTION123'
const plan='P-ABCDEFGHIJKLMN'
const data={id:'WH-EVENT-123',event_type:'PAYMENT.SALE.COMPLETED',
 create_time:'2026-10-19T20:00:00Z',
 resource:{id:'SALE-123',billing_agreement_id:sub}}
const headers={
 'content-type':'application/json',
 'paypal-transmission-id':'TX-12345678',
 'paypal-transmission-time':'2026-10-19T20:00:00Z',
 'paypal-transmission-sig':'TEST-OPAQUE-SIGNED',
 'paypal-auth-algo':'SHA256withRSA',
 'paypal-cert-url':'https://api-m.paypal.com/v1/notifications/certs/CERT-ABCDEFG-1234'
}
function stack({wrongPlan=false,wrongOwner=false,failSignature=false}={}){
 const calls=[],rows=new Set(),seen=[]
 const fetchImpl=async(url,opts)=>{
  calls.push(url)
  let data
  if(url.endsWith('/oauth2/token'))data={token_type:'Bearer',access_token:'OPAQUE_TOKEN_123456'}
  else if(url.endsWith('/verify-webhook-signature'))data={
   verification_status:failSignature?'FAILURE':'SUCCESS'
  }
  else if(url.endsWith('/billing/subscriptions/'+sub))data={
   id:sub,plan_id:wrongPlan?'P-WRONGPLAN999':plan,
   custom_id:intent,status:'ACTIVE'
  }
  else throw Error('unexpected external endpoint')
  return {ok:true,status:200,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(data)}
 }
 const reader=createPaypalLiveMerchantEvidenceReader({
  clientId:'CLIENTABCDEFGH123',clientSecret:'SECRETABCDEFGH123',
  planId:plan,merchantGeneration:3,fetchImpl})
 const verifier=createPaypalLivePostbackVerifier({
  clientId:'CLIENTABCDEFGH123',clientSecret:'SECRETABCDEFGH123',fetchImpl})
 const scope=createPazoLiveOwnerScopeResolver({
  findBoundSubscription:async()=>({
   provider:'paypal',sourceEnvironment:'live',subscriptionId:sub,
   ownerId:wrongOwner?'another-owner':owner,intentId:intent,
   planId:plan,merchantGeneration:3,state:'bound',consentVerified:true
  }),
  readerForGeneration:async()=>reader
 })
 const inbox=createPazoLiveVerifiedInboxAdapter({
  queueVerifiedEvent:async(details)=>{
   seen.push(details)
   const k=details.merchantGeneration+':'+details.eventId
   if(rows.has(k))return 'duplicate_verified_event'
   rows.add(k)
   return 'queued'
  }
 })
 const handler=createPazoLiveWebhookIntake({
  released:true,environment:'live',webhookId:'WH-123456789012',
  verifySignature:verifier,provePazoScope:scope,inbox
 })
 return {handler,calls,seen}
}
function request(event=data){
 return new Request('https://beta.pazo.example.com',{
  method:'POST',headers,body:JSON.stringify(event)
 })
}
test('end-to-end synthetic signature + private original owner + PayPal GET + inbox queue',async()=>{
 const {handler,calls,seen}=stack()
 const response=await handler(request())
 assert.equal(response.status,202)
 assert.equal((await response.json()).code,'verified_live_event_queued')
 assert.deepEqual(calls.map(url=>url.split('/').pop()),[
  'token','verify-webhook-signature','token',sub
 ])
 assert.equal(seen.length,1)
 const {signatureEvidence,...queued}=seen[0]
 assert.equal(signatureEvidence.proofSource,'paypal_live_postback_success')
 assert.match(signatureEvidence.signedBodySha256,/^[a-f0-9]{64}$/)
 assert.equal(signatureEvidence.subscriptionId,sub)
 assert.deepEqual(queued,{
  ownerId:owner,intentId:intent,subscriptionId:sub,
  merchantGeneration:3,
  eventId:data.id,eventType:data.event_type
 })
 assert.ok(!JSON.stringify(seen).includes('OPAQUE_TOKEN'))
 const again=await handler(request())
 assert.equal(again.status,200)
 assert.equal((await again.json()).code,'duplicate_verified_live_event')
})
test('a bad signature never checks merchant GET or records an event',async()=>{
 const {handler,calls,seen}=stack({failSignature:true})
 const r=await handler(request())
 assert.equal(r.status,401)
 assert.equal(seen.length,0)
 assert.equal(calls.some(x=>x.endsWith('/billing/subscriptions/'+sub)),false)
})
test('bad merchant plan, wrong owner or unverifiable PayPal resource return non-ACK',async()=>{
 for(const config of [{wrongPlan:true},{wrongOwner:true},{}]){
  const {handler,seen}=stack(config)
  const event=Object.keys(config).length?data:
   {...data,resource:{id:data.resource.id}}
  const response=await handler(request(event))
  assert.equal(response.status,503)
  assert.equal(seen.length,0)
 }
})
test('test composition cannot bypass the production hardcode release latch',async()=>{
 const {handler}=stack()
 const r=await createPazoLiveWebhookIntake({
  released:false,environment:'live',webhookId:'WH-123456789012',
  verifySignature:async()=>true,provePazoScope:async()=>true,
  inbox:{recordIfAbsent:async()=>true}
 })(request())
 assert.equal(r.status,503)
 assert.equal((await r.json()).code,'live_ingress_not_released')
 assert.equal(typeof handler,'function')
})
