import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05SandboxClaimScopedMerchantReaders as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05SandboxClaimScopedMerchantReaders.mjs'
import {createP05OfflineMerchantClaimBridge}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineMerchantClaimBridge.mjs'
import {createP05OfflineInboxOrchestrator}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineInboxOrchestrator.mjs'

const E='WH-SCOPED-SALE-111',SUB='I-SCOPEDPAYPAL123'
const SALE='SALE-SCOPED-PROOF111',INTENT='intent-prospective88888'
const LEASE='00000000-0000-4000-8000-000000000001'
const PLAN='P-14V25407JP6850922NLHMDKI'
const OWNER='11111111-1111-4111-8111-111111111111'
const HOST='https://api-m.sandbox.paypal.com'
const now='2026-10-15T03:20:37.957Z'

const fixture=(mutate=()=>{})=>{
 const payload={
  event:{id:E,event_type:'PAYMENT.SALE.COMPLETED',create_time:now,
   resource:{id:SALE,billing_agreement_id:SUB,state:'completed',
    amount:{currency:'USD',total:'2.99'},
    payer:{payer_info:{email:'buyer@private.example'}}}},
  subscription:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'CANCELLED',
   subscriber:{email_address:'buyer@private.example',payer_id:'SECRET_PAYER'}},
  sale:{id:SALE,billing_agreement_id:SUB,state:'completed',
   amount:{currency:'USD',total:'2.99'},
   payer:{email:'buyer@private.example'}},
  token:{token_type:'Bearer',access_token:'MOCK_ACCESS_TOKEN_PRIVATE'},
  proof:{id:E,type:'PAYMENT.SALE.COMPLETED',
   verifiedAt:'2026-10-15T03:20:39+00:00',processingState:'processing'},
 }
 mutate(payload)
 const calls=[]
 const clients={
  readClaimedEvent:async args=>{
   calls.push({source:'inbox',args})
   return payload.proof
  },
  fetchImpl:async(url,opts)=>{
   calls.push({source:'paypal',url,method:opts.method,options:opts})
   assert.ok(url.startsWith(HOST+'/'))
   assert.equal(opts.redirect,'error')
   assert.ok(opts.signal)
   if(url===HOST+'/v1/oauth2/token')
    return {ok:true,json:async()=>payload.token}
   if(url===HOST+'/v1/notifications/webhooks-events/'+E)
    return {ok:true,json:async()=>payload.event}
   if(url===HOST+'/v1/billing/subscriptions/'+SUB)
    return {ok:true,json:async()=>payload.subscription}
   if(url===HOST+'/v1/payments/sale/'+SALE)
    return {ok:true,json:async()=>payload.sale}
   throw Error('unexpected mock URL')
  },
 }
 const reader=create({clientId:'SANDBOX_MERCHANT_ID_ONLY',
  clientSecret:'SANDBOX_SECRET_ONLY',...clients})
 return {reader,calls,payload}
}
const safe=(value)=>{
 const text=JSON.stringify(value)
 for(const x of ['buyer@private.example','SECRET_PAYER',
   'MOCK_ACCESS_TOKEN_PRIVATE','SANDBOX_SECRET_ONLY'])
  assert.equal(text.includes(x),false,'leaked secret or PII')
}
const claim={eventId:E,claimToken:LEASE}
test('scoped merchant reader GETs only claimed event and matching subscription',async()=>{
 const {reader,calls}=fixture()
 const event=await reader.getMerchantEvent(claim)
 const sub=await reader.getMerchantSubscription({...claim,subscriptionId:SUB})
 const original=await reader.getIndependentMerchantSale({...claim,saleId:SALE})
 safe(event);safe(sub);safe(original)
 assert.equal(event.resource.billing_agreement_id,SUB)
 assert.equal(event.resource.id,SALE)
 assert.deepEqual(sub,{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'CANCELLED'})
 assert.equal(calls.filter(x=>x.source==='inbox').length,3)
 assert.equal(calls.filter(x=>x.url?.includes('webhooks-events/')).length,3)
 assert.equal(calls.filter(x=>x.url?.includes('billing/subscriptions/')).length,1)
 const allPaypal=calls.filter(x=>x.source==='paypal')
 assert.equal(allPaypal.filter(x=>x.method==='POST').length,5)
 assert.ok(allPaypal.filter(x=>x.method==='POST').every(
  x=>x.url===HOST+'/v1/oauth2/token'))
 assert.equal(calls.filter(x=>x.url?.includes('/payments/sale/')).length,1)
 assert.deepEqual(original,{id:SALE,billing_agreement_id:SUB,state:'completed',
  amount:{currency:'USD',total:'2.99'}})
 assert.ok(allPaypal.filter(x=>x.method!=='POST').every(x=>x.method==='GET'))
})
test('unclaimed invalid references cannot reach OAuth or event GET',async()=>{
 const {reader,calls}=fixture()
 for(const request of [
  {eventId:'../evil',claimToken:LEASE},
  {eventId:E,claimToken:'guessed'},
  {eventId:'',claimToken:LEASE},
 ])await assert.rejects(reader.getMerchantEvent(request),
  /p05_claimed_event_reference_invalid/)
 assert.equal(calls.length,0)
})
test('inbox proof must match verified sale event exactly before OAuth',async()=>{
 const variations=[
  x=>x.proof=null,
  x=>x.proof.id='WH-OTHER',
  x=>x.proof.type='PAYMENT.SALE.REVERSED',
  x=>x.proof.processingState='pending',
  x=>x.proof.verifiedAt='2026-02-30T03:20:39+00:00',
 ]
 for(const mutation of variations){
  const {reader,calls}=fixture(mutation)
  await assert.rejects(reader.getMerchantEvent(claim),
   /p05_claimed_event_not_verified/)
  assert.equal(calls.filter(x=>x.source==='paypal').length,0)
 }
})
test('bad webhook GET body cannot identify a subscription',async()=>{
 for(const mutation of [
  x=>x.event.id='WH-OTHER',
  x=>x.event.event_type='PAYMENT.SALE.REFUNDED',
  x=>x.event.create_time='2026-02-30T03:20:37Z',
  x=>x.event.resource.billing_agreement_id='I-FOREIGN/sub',
  x=>x.event.resource.id=null,
  x=>x.event.resource.amount.total='5.98',
  x=>x.event.resource.state='pending',
 ]){
  const {reader}=fixture(mutation)
  await assert.rejects(reader.getMerchantEvent(claim),
   /p05_paypal_sandbox_sale_event_mismatch/)
 }
})
test('foreign subscription is refused before subscription GET',async()=>{
 const {reader,calls}=fixture()
 await assert.rejects(reader.getMerchantSubscription({
  ...claim,subscriptionId:'I-UNRELATED12345',
 }),/p05_subscription_not_in_claimed_sale/)
 assert.equal(calls.filter(x=>x.url?.includes('/billing/subscriptions/')).length,0)
})
test('valid-looking but foreign subscription response is denied and not forwarded',async()=>{
 for(const mutation of [
  x=>x.subscription.id='I-FOREIGN123',
  x=>x.subscription.plan_id='P-FOREIGN',
  x=>x.subscription.custom_id='intent-OTHER12345',
  x=>x.subscription.status='SUSPENDED',
 ]){
  const {reader}=fixture(mutation)
  await assert.rejects(reader.getMerchantSubscription({
   ...claim,subscriptionId:SUB,
  }),/p05_subscription_merchant_binding_mismatch/)
 }
})
test('input and dependency setup cannot select production, alternate host, or token',()=>{
 assert.throws(()=>create(),/p05_claimed_merchant_reader_not_configured/)
 assert.throws(()=>create({clientId:'SANDBOX_MERCHANT_ID_ONLY',
  clientSecret:'SANDBOX_SECRET_ONLY',fetchImpl:async()=>({ok:false})}),
  /p05_claimed_merchant_reader_not_configured/)
})
test('merchant OAuth errors redact raw provider errors',async()=>{
 const reader=create({
  clientId:'SANDBOX_MERCHANT_ID_ONLY',clientSecret:'SANDBOX_SECRET_ONLY',
  readClaimedEvent:async()=>({id:E,type:'PAYMENT.SALE.COMPLETED',
   processingState:'processing',verifiedAt:'2026-10-15T03:20:39Z'}),
  fetchImpl:async()=>{throw Error('SECRET bearer MOCK_ACCESS_TOKEN_PRIVATE')},
 })
 await assert.rejects(reader.getMerchantEvent(claim),
  e=>e.message==='p05_paypal_sandbox_transport_unavailable')
})
test('private inbox exception cannot leak private service identifiers',async()=>{
 const reader=create({
  clientId:'SANDBOX_MERCHANT_ID_ONLY',clientSecret:'SANDBOX_SECRET_ONLY',
  readClaimedEvent:async()=>{throw Error('buyer@private.example SECRET')},
  fetchImpl:async()=>{throw Error('this must never be called')},
 })
 await assert.rejects(reader.getMerchantEvent(claim),
  e=>e.message==='p05_claimed_event_read_unavailable')
})
test('realistic integration with offline bridge and worker is review, never credit',async()=>{
 const {reader}=fixture()
 const bridge=createP05OfflineMerchantClaimBridge({
  ...reader,
  resolveClaimedSubscription:async({eventId,claimToken,
   merchantSubscriptionId,merchantCustomIntentId})=>{
   assert.deepEqual({eventId,claimToken,
    merchantSubscriptionId,merchantCustomIntentId},{
    eventId:E,claimToken:LEASE,merchantSubscriptionId:SUB,
    merchantCustomIntentId:INTENT,
   })
   return {intentId:INTENT,ownerId:OWNER,
    subscriptionId:SUB,state:'bound',planId:PLAN}
  },
 })
 const log=[]
 const worker=createP05OfflineInboxOrchestrator({
  claimNextVerifiedEvent:async()=>({eventId:E,eventType:'PAYMENT.SALE.COMPLETED',
   verifiedAt:'2026-10-15T03:20:39Z',leaseToken:LEASE,
   leaseExpiresAt:'2026-10-15T03:25:39Z',
   processingState:'processing',attemptCount:1}),
  readClaimedEvent:async()=>({id:E,type:'PAYMENT.SALE.COMPLETED',
   verifiedAt:'2026-10-15T03:20:39Z',processingState:'processing'}),
  inspectMerchantEvidence:bridge.inspectMerchantEvidence,
  finishClaimedEvent:async x=>{log.push(x);return true},
 })
 const result=await worker.runOnce()
 assert.equal(result.phase,'REVIEW_REQUESTED')
 assert.equal(result.reason,'cycle_unproven')
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.mayRecordPayment,false)
 assert.equal(result.paidThrough,null)
 assert.deepEqual(log,[{eventId:E,claimToken:LEASE,
  outcome:'review',reasonCode:'cycle_unproven'}])
 safe(result)
})
test('30 rejected merchant combinations cannot create paid cycle',async()=>{
 let seen=0
 for(const status of ['ACTIVE','CANCELLED','SUSPENDED'])
 for(const price of ['2.99','5.99'])
 for(const custom of [INTENT,'intent-FOREIGN12345'])
 for(const state of ['completed','pending'])
 for(const verified of [true,false]){
  const {reader}=fixture(x=>{
   x.subscription.status=status
   x.event.resource.amount.total=price
   x.subscription.custom_id=custom
   x.event.resource.state=state
   if(!verified)x.proof.processingState='pending'
  })
  const bridge=createP05OfflineMerchantClaimBridge({
   ...reader,resolveClaimedSubscription:async()=>null,
  })
  const result=await bridge.inspectMerchantEvidence({
   ...claim,eventType:'PAYMENT.SALE.COMPLETED'})
  assert.notEqual(result.kind,'paid')
  assert.notEqual(result.kind,'processed')
  safe(result);seen++
 }
 assert.equal(seen,48)
})

test('P29 original SALE GET refuses foreign sale before merchant request',async()=>{
 const {reader,calls}=fixture()
 const r=await reader.getIndependentMerchantSale({...claim,saleId:'SALE-FOREIGN999'})
 assert.equal(r,null)
 assert.equal(calls.some(x=>x.url?.includes('/payments/sale/')),false)
})
test('P29 independent original SALE rejects mismatch and never leaks payer',async()=>{
 for(const alter of [
  s=>{s.id='SALE-FOREIGN'},s=>{s.billing_agreement_id='I-FOREIGN'},
  s=>{s.amount.total='5.99'},s=>{s.state='refunded'},
 ]){
  const {reader}=fixture(x=>alter(x.sale))
  const value=await reader.getIndependentMerchantSale({...claim,saleId:SALE})
  assert.equal(value,null)
 }
})
