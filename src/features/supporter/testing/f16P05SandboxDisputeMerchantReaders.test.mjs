import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05SandboxDisputeMerchantReaders as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05SandboxDisputeMerchantReaders.mjs'
import {createP05OfflineDisputeScopeResolver as createScope}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineDisputeScopeResolver.mjs'
const E='WH-DISPUTE-READ123',D='PP-D-SYNTHETIC321',SALE='SALE-PAZO-123'
const TYPES=['CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED',
 'CUSTOMER.DISPUTE.RESOLVED'],HOST='https://api-m.sandbox.paypal.com'
function fixture(){
 const data={
  token:{token_type:'Bearer',access_token:'MOCK_SECRET_ACCESS_TOKEN'},
  event:{id:E,event_type:TYPES[0],
   resource:{dispute_id:D,buyer_email:'payer@private.example',
    messages:[{content:'SECRET_PRIVATE_DOC'}]}},
  dispute:{dispute_id:D,disputed_transactions:[{
   seller_transaction_id:SALE,
   gross_amount:{currency_code:'USD',value:'2.99'},
   buyer:{email:'payer@private.example'}}],
   messages:[{content:'SECRET_PRIVATE_DOC'}],buyer:{name:'Private'}},
 }
 const calls=[]
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,options})
  assert.ok(url.startsWith(HOST+'/'))
  assert.equal(options.redirect,'error')
  assert.ok(options.signal)
  if(url===HOST+'/v1/oauth2/token')return{ok:true,json:async()=>data.token}
  if(url===HOST+'/v1/notifications/webhooks-events/'+E)return{
   ok:true,json:async()=>data.event}
  if(url===HOST+'/v1/customer/disputes/'+D)return{
   ok:true,json:async()=>data.dispute}
  throw Error('mock URL unknown')
 }
 const client=create({clientId:'SYNTHETIC_CLIENT_TEST',
  clientSecret:'SYNTHETIC_SECRET_TEST',fetchImpl})
 return{data,calls,client}
}
const safe=x=>{
 const s=JSON.stringify(x)
 for(const term of ['payer@private.example','SECRET_PRIVATE_DOC',
  'MOCK_SECRET_ACCESS_TOKEN','SYNTHETIC_SECRET_TEST','Private'])
  assert.equal(s.includes(term),false,term+' leaked')
}
test('OAuth+two exact GETs, minimum non-PII event and dispute projection',async()=>{
 const {client,calls}=fixture()
 const e=await client.getPayPalWebhookEvent({eventId:E})
 const d=await client.getPayPalDisputeDetails({disputeId:D})
 safe(e);safe(d)
 assert.deepEqual(e,{id:E,event_type:TYPES[0],resource:{dispute_id:D}})
 assert.deepEqual(d,{dispute_id:D,disputed_transactions:[
  {seller_transaction_id:SALE,gross_amount:{currency_code:'USD',value:'2.99'}}]})
 const posts=calls.filter(x=>x.method==='POST')
 assert.equal(posts.length,2)
 assert.ok(posts.every(x=>x.url===HOST+'/v1/oauth2/token'))
 const gets=calls.filter(x=>x.method==='GET')
 assert.deepEqual(gets.map(x=>x.url),[
  HOST+'/v1/notifications/webhooks-events/'+E,
  HOST+'/v1/customer/disputes/'+D,
 ])
})
test('invalid event/dispute IDs reject before any network',async()=>{
 const {client,calls}=fixture()
 for(const value of ['../private',null,'https://evil.com', '']) {
  await assert.rejects(client.getPayPalWebhookEvent({eventId:value}),
   /p05_dispute_merchant_event_invalid/)
  await assert.rejects(client.getPayPalDisputeDetails({disputeId:value}),
   /p05_dispute_merchant_dispute_invalid/)
 }
 assert.equal(calls.length,0)
})
test('all PayPal dispute lifecycle kinds recognized in refetch',async()=>{
 for(const type of TYPES){
  const {client,data}=fixture()
  data.event.event_type=type
  const r=await client.getPayPalWebhookEvent({eventId:E})
  assert.equal(r.event_type,type);safe(r)
 }
})
test('mismatched event or dispute GET fails without private payload',async()=>{
 for(const mutate of [
  d=>d.event.id='WH-FOREIGN',
  d=>d.event.event_type='PAYMENT.SALE.COMPLETED',
  d=>d.event.resource.dispute_id='../../secret',
 ]){const f=fixture();mutate(f.data)
  await assert.rejects(f.client.getPayPalWebhookEvent({eventId:E}),
   /p05_dispute_merchant_event_mismatch/)
 }
 for(const mutate of [
  d=>d.dispute.dispute_id='PP-D-FOREIGN',
  d=>d.dispute.disputed_transactions=null,
  d=>d.dispute.disputed_transactions=Array(13).fill({seller_transaction_id:SALE}),
 ]){const f=fixture();mutate(f.data)
  await assert.rejects(f.client.getPayPalDisputeDetails({disputeId:D}),
   /p05_dispute_merchant_details_mismatch/)
 }
})
test('missing seller ID never produces PAZO ownership',async()=>{
 const f=fixture();delete f.data.dispute.disputed_transactions[0].seller_transaction_id
 const scope=createScope({
  ...f.client,readPrivatePazoPaymentBySaleId:async()=>{throw Error('should not read')},
  readPrivateBoundIntentBySubscription:async()=>{throw Error('should not read')},
 })
 assert.equal(await scope.assessTrustedDisputeScope({
  eventId:E,eventType:TYPES[0]}),'unknown')
})
test('transport and internal failures sanitize private provider messages',async()=>{
 const base={clientId:'SYNTHETIC_CLIENT_TEST',clientSecret:'SYNTHETIC_SECRET_TEST'}
 const client=create({...base,fetchImpl:async()=>{throw Error('SECRET_PRIVATE_DOC')}})
 await assert.rejects(client.getPayPalWebhookEvent({eventId:E}),
  e=>e.message==='p05_dispute_merchant_transport_unavailable')
 const invalid=create({...base,fetchImpl:async()=>({ok:true,
  json:async()=>{throw Error('payer@private.example')}})})
 await assert.rejects(invalid.getPayPalWebhookEvent({eventId:E}),
  e=>e.message==='p05_dispute_merchant_invalid_json')
})
test('bad token and config never allow a dispute GET',async()=>{
 assert.throws(()=>create({clientId:'a',clientSecret:'bad',
  fetchImpl:async()=>null}),/p05_dispute_merchant_not_configured/)
 const f=fixture();f.data.token.access_token='a'
 await assert.rejects(f.client.getPayPalDisputeDetails({disputeId:D}),
  /p05_dispute_merchant_auth_invalid/)
 assert.equal(f.calls.filter(x=>x.method==='GET').length,0)
})
test('read-only merchant adapter joins private scope only with an existing payment',async()=>{
 const f=fixture()
 const payment={externalPaymentId:SALE,externalSubscriptionId:'I-PAZOPRIVATE123',
  ownerId:'11111111-1111-4111-8111-111111111111',
  planId:'P-14V25407JP6850922NLHMDKI',currency:'USD',
  grossMinorUnits:299,entryState:'uncredited'}
 let ledgerPresent=false,ownerReads=0
 const scope=createScope({
  ...f.client,
  readPrivatePazoPaymentBySaleId:async({sellerTransactionId})=>{
   assert.equal(sellerTransactionId,SALE)
   return ledgerPresent?payment:null
  },
  readPrivateBoundIntentBySubscription:async({subscriptionId,expectedOwnerId})=>{
   assert.equal(expectedOwnerId,payment.ownerId)
   ownerReads++
   assert.equal(subscriptionId,payment.externalSubscriptionId)
   return {subscriptionId,ownerId:payment.ownerId,
    planId:payment.planId,intentId:'intent-pazo-private12345',
    state:'bound',provider:'paypal'}
  },
 })
 assert.equal(await scope.assessTrustedDisputeScope({
  eventId:E,eventType:TYPES[0]}),'unknown')
 assert.equal(ownerReads,0)
 ledgerPresent=true
 assert.equal(await scope.assessTrustedDisputeScope({
  eventId:E,eventType:TYPES[0]}),'confirmed_pazo')
 assert.equal(ownerReads,1)
})
