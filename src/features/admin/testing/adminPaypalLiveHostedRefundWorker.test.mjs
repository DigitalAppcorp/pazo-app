import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveHostedRefundWorker}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveHostedRefundWorker.mjs'

const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const ownerId='12345678-1234-4234-8234-123456789abc'
const intentId='intent-23456789-1234-4234-8234-123456789abc'
const sub='I-SUBSCRIPTION123456'
const plan='P-ABCDEFGHIJKLMNOP'
const saleId='SALE-123456789'
const eventId='WH-REFUND-123456'
const start='2026-10-01T00:00:00.000Z'
const end='2026-10-30T00:00:00.000Z'
const event={claimed:true,sourceEnvironment:'live',provider:'paypal',
 signatureVerified:true,eventId,subscriptionId:sub,saleId,
 merchantGeneration:7,eventType:'PAYMENT.SALE.REFUNDED',
 searchStart:start,searchEnd:end}
const binding={provider:'paypal',sourceEnvironment:'live',ownerId,
 intentId,subscriptionId:sub,merchantGeneration:7,
 planId:plan,state:'bound',consentVerified:true}
const original={recorded:true,sourceEnvironment:'live',ownerId,intentId,
 subscriptionId:sub,merchantGeneration:7,saleId,amountMinor:299,currency:'USD'}
const env={
 SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY_SERVICE_ROLE_1234567890'
}
const originalVault=()=>({generation:7,environment:'live',provider:'paypal',
 sourceEnvironment:'live',credentialSource:'vault',
 planId:plan,webhookId:'WH-ABCDEFGH123456789',
 merchantFingerprint:'a'.repeat(64),clientId:'CLIENT_ABCDEFGH123456789',
 clientSecret:'SECRET_ABCDEFGH123456789',isRetired:false})
function setup({claimedEvent=event,getEnv=name=>env[name],vaultEntry=originalVault()}={}){
 const calls=[]
 const fetchImpl=async (uri,opts)=>{
  calls.push({uri,method:opts.method,body:opts.body})
  let data
  if(uri.endsWith('/pazo_f16_live_service_vault_read'))data=vaultEntry
  else if(uri.endsWith('/pazo_f16_live_service_binding_read'))data=binding
  else if(uri.endsWith('/pazo_f16_live_service_recorded_sale_read'))data=original
  else if(uri.endsWith('/v1/oauth2/token'))data={
   token_type:'Bearer',access_token:'OPAQUE_TOKEN_12345'
  }
  else if(uri.endsWith('/v1/billing/subscriptions/'+sub))data={
   id:sub,plan_id:plan,custom_id:intentId,status:'ACTIVE'
  }
  else if(uri.includes('/v1/billing/subscriptions/'+sub+'/transactions?'))data={
   transactions:[{id:saleId,status:'REFUNDED',
    time:'2026-10-15T00:00:00.000Z',
    amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}],
   total_pages:1,total_items:1
  }
  else if(uri.endsWith('/pazo_f16_live_service_verified_refund_record'))data='recorded'
  else throw Error('unrecognized mocked external endpoint')
  return new Response(JSON.stringify(data),{
   status:200,headers:{'content-type':'application/json'}
  })
 }
 return {calls,worker:createPazoLiveHostedRefundWorker({
  released:true,getEnv,fetchImpl,
  claimVerifiedEvent:async()=>claimedEvent
 })}
}
test('worker stays inert without separate release; no env or PayPal calls',async()=>{
 let accesses=0
 const worker=createPazoLiveHostedRefundWorker({
  getEnv:()=>{accesses++;return 'private'},
  claimVerifiedEvent:async()=>{accesses++;throw Error('unexpected')}
 })
 const r=await worker({queueEventId:eventId})
 assert.equal(r.code,'live_refund_worker_not_released')
 assert.equal(accesses,0)
})
test('end-to-end server adapters match original owner merchant and record only verified full refund',async()=>{
 const {calls,worker}=setup()
 const r=await worker({queueEventId:eventId})
 assert.equal(r.state,'RECORDED')
 assert.equal(r.refundRecorded,true)
 assert.equal(r.entitlementGranted,false)
 assert.equal(r.paymentRecorded,false)
 assert.equal(calls.some(x=>x.uri.endsWith('/pazo_f16_live_service_vault_read')),true)
 assert.equal(calls.every(x=>['POST','GET'].includes(x.method)),true)
 const last=calls.at(-1)
 assert.equal(last.uri,url+'/rest/v1/rpc/pazo_f16_live_service_verified_refund_record')
 const payload=JSON.parse(last.body)
 assert.equal(payload.p_owner,ownerId)
 assert.equal(payload.p_sale_id,saleId)
 assert.equal(payload.p_hold_id,eventId)
 assert.equal(payload.p_kind,'refunded')
 assert.equal(JSON.stringify(r).includes(originalVault().clientSecret),false)
})
test('wrong merchant generation and unavailable generation secret cannot reach payment writer',async()=>{
 const wrong=setup({claimedEvent:{...event,merchantGeneration:8}})
 const r=await wrong.worker({queueEventId:eventId})
 assert.equal(r.state,'REVIEW_REQUIRED')
 assert.ok(!wrong.calls.some(x=>x.uri.endsWith('verified_refund_record')))
 const unavailable=setup({vaultEntry:{...originalVault(),generation:8}})
 const rr=await unavailable.worker({queueEventId:eventId})
 assert.equal(rr.state,'REVIEW_REQUIRED')
 assert.ok(!unavailable.calls.some(x=>x.uri.endsWith('verified_refund_record')))
})
test('invalid setup fails closed without accessing payment provider',async()=>{
 const worker=createPazoLiveHostedRefundWorker({
  released:true,getEnv:()=>undefined,claimVerifiedEvent:async()=>event
 })
 const r=await worker({queueEventId:eventId})
 assert.equal(r.code,'live_refund_worker_not_configured')
})
