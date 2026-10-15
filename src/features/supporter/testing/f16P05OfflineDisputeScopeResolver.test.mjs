import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05OfflineDisputeScopeResolver as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineDisputeScopeResolver.mjs'
import {createSafeF16WebhookHandler}
 from '../../../../supabase/functions/f16-paypal-webhook/core.mjs'
const E='WH-DISPUTE-SYNTH001',D='PP-D-FAKE-12345',SALE='SALE-PAZO-123'
const SUB='I-SYNTHETIC12345',INTENT='intent-prospective12345'
const OWNER='11111111-1111-4111-8111-111111111111',PLAN='P-14V25407JP6850922NLHMDKI'
const TYPES=['CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED',
 'CUSTOMER.DISPUTE.RESOLVED']
function fixture(type=TYPES[0]){
 const calls=[]
 const data={
  event:{id:E,event_type:type,resource:{dispute_id:D,
   buyer_email:'do-not-retain@private.example'}},
  dispute:{dispute_id:D,disputed_transactions:[{
   seller_transaction_id:SALE,
   gross_amount:{currency_code:'USD',value:'2.99'},
   buyer:{email:'do-not-retain@private.example'}}],
   messages:[{content:'PRIVATE DOCUMENT CONTENT'}]},
  payment:{externalPaymentId:SALE,externalSubscriptionId:SUB,
   ownerId:OWNER,planId:PLAN,currency:'USD',grossMinorUnits:299,
   entryState:'uncredited'},
  intent:{subscriptionId:SUB,ownerId:OWNER,planId:PLAN,
   intentId:INTENT,state:'bound',provider:'paypal'},
 }
 const callbacks={
  getPayPalWebhookEvent:async arg=>{calls.push(['event',arg]);return data.event},
  getPayPalDisputeDetails:async arg=>{calls.push(['dispute',arg]);return data.dispute},
  readPrivatePazoPaymentBySaleId:async arg=>{calls.push(['payment',arg]);return data.payment},
  readPrivateBoundIntentBySubscription:async arg=>{calls.push(['intent',arg]);return data.intent},
 }
 return {data,calls,callbacks,resolve:create(callbacks)}
}
const run=async(ctx,type=TYPES[0])=>ctx.resolve.assessTrustedDisputeScope({
 eventId:E,eventType:type})
test('all three dispute types: exact merchant seller ID and private ledger-bound owner',async()=>{
 for(const type of TYPES){
  const ctx=fixture(type)
  assert.equal(await run(ctx,type),'confirmed_pazo')
  assert.deepEqual(ctx.calls,[
   ['event',{eventId:E}],['dispute',{disputeId:D}],
   ['payment',{sellerTransactionId:SALE}],
   ['intent',{subscriptionId:SUB,expectedOwnerId:OWNER}],
  ])
  assert.equal(JSON.stringify(await run(ctx,type)).includes('private.example'),false)
 }
})
test('no ledger entry means UNKNOWN, never proof that the charge is outside PAZO',async()=>{
 const ctx=fixture();ctx.data.payment=null
 assert.equal(await run(ctx),'unknown')
 assert.equal(ctx.calls.some(x=>x[0]==='intent'),false)
})
test('webhook event mismatch or unrelated type blocks without dispute GET',async()=>{
 for(const mutation of [
  x=>x.event.id='WH-OTHER',
  x=>x.event.event_type='PAYMENT.SALE.COMPLETED',
  x=>x.event.resource.dispute_id=null,
  x=>x.event.resource.dispute_id='../other',
 ]){
  const ctx=fixture();mutation(ctx.data)
  assert.equal(await run(ctx),'unknown')
  assert.deepEqual(ctx.calls,[['event',{eventId:E}]])
 }
 for(const type of ['PAYMENT.SALE.COMPLETED','',null]){
  const ctx=fixture()
  assert.equal(await run(ctx,type),'unknown')
  assert.deepEqual(ctx.calls,[])
 }
})
test('no merchant seller ID, zero or multiple transactions blocks ledger lookups',async()=>{
 for(const mutation of [
  d=>{d.dispute.disputed_transactions=[]},
  d=>{d.dispute.disputed_transactions.push({...d.dispute.disputed_transactions[0]})},
  d=>{d.dispute.disputed_transactions[0].seller_transaction_id=undefined},
  d=>{d.dispute.disputed_transactions[0].seller_transaction_id='../foreign'},
  d=>{d.dispute.dispute_id='PP-D-FOREIGN999'},
  d=>{d.dispute.disputed_transactions[0].gross_amount.value='5.99'},
  d=>{d.dispute.disputed_transactions[0].gross_amount.currency_code='EUR'},
 ]){
  const ctx=fixture();mutation(ctx.data)
  assert.equal(await run(ctx),'unknown')
  assert.equal(ctx.calls.some(x=>x[0]==='payment'),false)
 }
})
test('foreign sale or bad ledger financial scope remains unknown',async()=>{
 for(const mutation of [
  d=>{d.payment.externalPaymentId='SALE-ANOTHER'},
  d=>{d.payment.externalSubscriptionId='I-FOREIGN/WRONG'},
  d=>{d.payment.ownerId='not-uuid'},
  d=>{d.payment.planId='P-OTHER'},
  d=>{d.payment.currency='EUR'},
  d=>{d.payment.grossMinorUnits=598},
  d=>{d.payment.entryState='credited'},
 ]){
  const ctx=fixture();mutation(ctx.data)
  assert.equal(await run(ctx),'unknown')
  assert.equal(ctx.calls.some(x=>x[0]==='intent'),false)
 }
})
test('a reversal-blocked ledger entry still identifies PAZO but never grants benefits',async()=>{
 const ctx=fixture();ctx.data.payment.entryState='blocked_reversal'
 assert.equal(await run(ctx),'confirmed_pazo')
})
test('foreign or pending intent cannot claim another user payment',async()=>{
 for(const mutation of [
  d=>{d.intent.subscriptionId='I-FOREIGN123'},
  d=>{d.intent.ownerId='22222222-2222-4222-8222-222222222222'},
  d=>{d.intent.planId='P-OTHER'},
  d=>{d.intent.intentId='wrong'},
  d=>{d.intent.state='pending'},
  d=>{d.intent.provider='other'},
  d=>{d.intent=null},
 ]){
  const ctx=fixture();mutation(ctx.data)
  assert.equal(await run(ctx),'unknown')
 }
})
test('provider and private adapter errors are redacted and fail closed',async()=>{
 for(const callback of ['getPayPalWebhookEvent','getPayPalDisputeDetails',
  'readPrivatePazoPaymentBySaleId','readPrivateBoundIntentBySubscription']){
  const ctx=fixture()
  const resolver=create({...ctx.callbacks,[callback]:async()=>{
   throw Error('PRIVATE DOCUMENT CONTENT contact@example.invalid TOKEN')},
  })
  const result=await resolver.assessTrustedDisputeScope({eventId:E,eventType:TYPES[0]})
  assert.equal(result,'unknown')
 }
})
test('frontend cannot submit sale, owner or raw payload through resolver API',async()=>{
 const ctx=fixture()
 const got=await ctx.resolve.assessTrustedDisputeScope({
  eventId:E,eventType:TYPES[0],saleId:'SALE-ANOTHER',ownerId:'FOREIGN',
  rawBody:{payer:'private@example.invalid'},
 })
 assert.equal(got,'confirmed_pazo')
 assert.deepEqual(ctx.calls[0],['event',{eventId:E}])
 assert.deepEqual(ctx.calls[2],['payment',{sellerTransactionId:SALE}])
})
test('signed intake + resolver with unknown payment returns retry 503 and no inbox writes',async()=>{
 const ctx=fixture();ctx.data.payment=null
 const queue=[]
 const handler=createSafeF16WebhookHandler({
  environment:'sandbox',webhookId:'WH-SANDBOX-TEST',
  planId:PLAN,verifySignature:async()=>true,
  inbox:{insertIfAbsent:async x=>{queue.push(x);return true}},
  disputeCaptureApproved:true,
  assessTrustedDisputeScope:ctx.resolve.assessTrustedDisputeScope,
 })
 const headers={
  'content-type':'application/json','paypal-transmission-id':'TX-TEST',
  'paypal-transmission-time':'2026-10-15T06:00:00Z',
  'paypal-transmission-sig':'TEST','paypal-auth-algo':'SHA256withRSA',
  'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test',
 }
 const request=new Request('https://localhost/f16',{method:'POST',headers,
  body:JSON.stringify({id:E,event_type:TYPES[0],
   resource:{dispute_id:D,messages:[{content:'PRIVATE DOCUMENT CONTENT'}]}})})
 const response=await handler(request)
 assert.equal(response.status,503)
 assert.deepEqual(queue,[])
})
test('positive mocked scope is ONLY a prerequisite to minimal inbox acceptance',async()=>{
 const ctx=fixture()
 const queue=[]
 const handler=createSafeF16WebhookHandler({
  environment:'sandbox',webhookId:'WH-SANDBOX-TEST',
  planId:PLAN,verifySignature:async()=>true,
  inbox:{insertIfAbsent:async x=>{queue.push(x);return true}},
  disputeCaptureApproved:true,
  assessTrustedDisputeScope:ctx.resolve.assessTrustedDisputeScope,
 })
 const headers={
  'content-type':'application/json','paypal-transmission-id':'TX-TEST',
  'paypal-transmission-time':'2026-10-15T06:00:00Z',
  'paypal-transmission-sig':'TEST','paypal-auth-algo':'SHA256withRSA',
  'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-test',
 }
 const request=new Request('https://localhost/f16',{method:'POST',headers,
  body:JSON.stringify({id:E,event_type:TYPES[0],buyer_email:'PRIVATE'})})
 const response=await handler(request)
 assert.equal(response.status,202)
 assert.deepEqual(queue,[{provider:'paypal',eventId:E,eventType:TYPES[0]}])
 assert.equal(JSON.stringify(queue).includes('PRIVATE'),false)
})
test('missing adapter capability prevents an untrusted partial implementation',()=>{
 assert.throws(()=>create({}),/p05_dispute_scope_adapters_missing/)
})
