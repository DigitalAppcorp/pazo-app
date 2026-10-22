import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05ServerOnlyDisputeLedgerReaders as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05ServerOnlyDisputeLedgerReaders.mjs'
import {createP05OfflineDisputeScopeResolver as createScope}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineDisputeScopeResolver.mjs'
const HOST='https://mrybvqdebbgcayuvgkkr.supabase.co'
const KEY='SYNTHETIC_PRIVATE_SERVICE_ROLE_TOKEN_TEST'
const SALE='SALE-PAZO-123',SUB='I-PAZOPRIVATE123'
const OWNER='11111111-1111-4111-8111-111111111111'
const INTENT='intent-pazo-private12345'
const PLAN='P-14V25407JP6850922NLHMDKI'
function fixture(mutate=()=>{}){
 const values={
  payment:{externalPaymentId:SALE,externalSubscriptionId:SUB,
   ownerId:OWNER,planId:PLAN,currency:'USD',grossMinorUnits:299,
   entryState:'uncredited',payer_email:'private@buyer.invalid'},
  intent:{intentId:INTENT,subscriptionId:SUB,ownerId:OWNER,planId:PLAN,
   provider:'paypal',state:'bound',buyer_name:'Private Buyer'},
 }
 mutate(values)
 const calls=[]
 const client=create({
  projectUrl:HOST,serviceRoleKey:KEY,
  fetchImpl:async(url,opts)=>{
   calls.push({url,opts})
   assert.equal(opts.method,'POST')
   assert.equal(opts.redirect,'error')
   assert.ok(opts.signal)
   assert.equal(opts.headers.apikey,KEY)
   assert.equal(opts.headers.Authorization,'Bearer '+KEY)
   if(url===HOST+'/rest/v1/rpc/f16_p05_draft_read_pazo_payment_by_sale')
    return {ok:true,json:async()=>values.payment}
   if(url===HOST+'/rest/v1/rpc/f16_p05_draft_read_bound_intent_for_sale')
    return {ok:true,json:async()=>values.intent}
   throw Error('unexpected URL: '+url)
  },
 })
 return {values,calls,client}
}
const safe=x=>{
 const s=JSON.stringify(x)
 for(const term of ['private@buyer.invalid','Private Buyer',KEY,
  'payer_email','buyer_name'])assert.equal(s.includes(term),false)
}
test('exact sale and owner-bound intent return only minimal evidence',async()=>{
 const {client,calls}=fixture()
 const p=await client.readPrivatePazoPaymentBySaleId({
  sellerTransactionId:SALE})
 const i=await client.readPrivateBoundIntentBySubscription({
  subscriptionId:SUB,expectedOwnerId:OWNER})
 safe(p);safe(i)
 assert.deepEqual(p,{externalPaymentId:SALE,externalSubscriptionId:SUB,
  ownerId:OWNER,planId:PLAN,currency:'USD',grossMinorUnits:299,
  entryState:'uncredited'})
 assert.deepEqual(i,{intentId:INTENT,subscriptionId:SUB,
  ownerId:OWNER,planId:PLAN,provider:'paypal',state:'bound'})
 assert.equal(calls.length,2)
 assert.deepEqual(JSON.parse(calls[0].opts.body),
  {p_seller_transaction_id:SALE})
 assert.deepEqual(JSON.parse(calls[1].opts.body),
  {p_subscription_id:SUB,p_expected_owner_id:OWNER})
 assert.ok(calls.every(x=>x.url.startsWith(HOST+'/rest/v1/rpc/')))
})
test('no payment entry or bound owner returns null, not outside PAZO',async()=>{
 const {client}=fixture(x=>{x.payment=null;x.intent=null})
 assert.equal(await client.readPrivatePazoPaymentBySaleId({
  sellerTransactionId:SALE}),null)
 assert.equal(await client.readPrivateBoundIntentBySubscription({
  subscriptionId:SUB,expectedOwnerId:OWNER}),null)
})
test('malformed sale/sub/owner cannot call private Supabase API',async()=>{
 const {client,calls}=fixture()
 for(const bad of ['','../malicious','https://bad.example',null]){
  await assert.rejects(client.readPrivatePazoPaymentBySaleId({
   sellerTransactionId:bad}),/p05_private_dispute_sale_ref_invalid/)
  await assert.rejects(client.readPrivateBoundIntentBySubscription({
   subscriptionId:bad,expectedOwnerId:OWNER}),
   /p05_private_dispute_intent_scope_invalid/)
 }
 await assert.rejects(client.readPrivateBoundIntentBySubscription({
  subscriptionId:SUB,expectedOwnerId:null}),
  /p05_private_dispute_intent_scope_invalid/)
 assert.equal(calls.length,0)
})
test('cross-user and cross-sale response fabrication is never trusted',async()=>{
 for(const mutate of [
  x=>x.payment.externalPaymentId='SALE-FOREIGN123',
  x=>x.payment.externalSubscriptionId='I-MALICIOUS/SUB',
  x=>x.payment.ownerId='not-an-owner',
  x=>x.payment.planId='P-NOT-PAZO',
  x=>x.payment.grossMinorUnits=598,
  x=>x.payment.currency='EUR',
  x=>x.payment.entryState='paid',
 ]){
  const {client}=fixture(mutate)
  await assert.rejects(client.readPrivatePazoPaymentBySaleId({
   sellerTransactionId:SALE}),/p05_private_dispute_sale_binding_invalid/)
 }
 for(const mutate of [
  x=>x.intent.subscriptionId='I-FOREIGN111',
  x=>x.intent.ownerId='22222222-2222-4222-8222-222222222222',
  x=>x.intent.intentId='bad',
  x=>x.intent.state='pending',
  x=>x.intent.provider='another',
 ]){
  const {client}=fixture(mutate)
  await assert.rejects(client.readPrivateBoundIntentBySubscription({
   subscriptionId:SUB,expectedOwnerId:OWNER}),
   /p05_private_dispute_intent_binding_invalid/)
 }
})
test('network errors and invalid JSON cannot reveal secrets or raw provider data',async()=>{
 for(const impl of [
  async()=>{throw Error('PRIVATE PAYER '+KEY)},
  async()=>({ok:false,json:async()=>({email:'private@buyer.invalid'})}),
 ]){
  const client=create({projectUrl:HOST,serviceRoleKey:KEY,fetchImpl:impl})
  await assert.rejects(client.readPrivatePazoPaymentBySaleId({
   sellerTransactionId:SALE}),
   e=>e.message==='p05_private_dispute_rpc_unavailable')
 }
 const broken=create({projectUrl:HOST,serviceRoleKey:KEY,
  fetchImpl:async()=>({ok:true,json:async()=>{
   throw Error('PRIVATE '+KEY)}})})
 await assert.rejects(broken.readPrivatePazoPaymentBySaleId({
  sellerTransactionId:SALE}),
  e=>e.message==='p05_private_dispute_rpc_invalid_json')
})
test('server-only adapter cannot target a different project or use a weak key',()=>{
 for(const config of [
  {projectUrl:'https://evil.invalid',serviceRoleKey:KEY},
  {projectUrl:HOST,serviceRoleKey:'bad'},
  {projectUrl:HOST,serviceRoleKey:'key with spaces and invalid secrets'},
 ]){
  assert.throws(()=>create({...config,fetchImpl:async()=>null}),
   /p05_private_dispute_rpc_not_configured/)
 }
})
test('service reader + mocked authenticated PayPal chain returns only owner category',async()=>{
 const {client,values}=fixture()
 const rawEventId='WH-DISPUTE-001',disputeId='PP-D-SYNTHETIC321'
 const scope=createScope({
  getPayPalWebhookEvent:async()=>({
   id:rawEventId,event_type:'CUSTOMER.DISPUTE.CREATED',
   resource:{dispute_id:disputeId}}),
  getPayPalDisputeDetails:async()=>({
   dispute_id:disputeId,disputed_transactions:[
    {seller_transaction_id:SALE,gross_amount:{
     currency_code:'USD',value:'2.99'}}]}),
  ...client,
 })
 const first=await scope.assessTrustedDisputeScope({
  eventId:rawEventId,eventType:'CUSTOMER.DISPUTE.CREATED'})
 assert.equal(first,'confirmed_pazo')
 values.payment=null
 const second=await scope.assessTrustedDisputeScope({
  eventId:rawEventId,eventType:'CUSTOMER.DISPUTE.CREATED'})
 assert.equal(second,'unknown')
 assert.equal(JSON.stringify(first).includes(OWNER),false)
})
