import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16P05SourceCorrelationInspector as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05SourceSaleCorrelationLab.mjs'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const INTENT='intent-test-capture-001'
const SUB='I-PROVIDERTEST123'
const EVENT='WH-SALE-TEST123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const SALE='SALE-TEST123'
const make=()=>({
 intent:{ownerId:OWNER,id:INTENT,subscriptionId:SUB,planId:PLAN,
  state:'bound',provider:'paypal'},
 inbox:{id:EVENT,type:'PAYMENT.SALE.COMPLETED',verifiedAt:'2026-10-15T03:20:39Z',
  processingState:'pending'},
 event:{id:EVENT,event_type:'PAYMENT.SALE.COMPLETED',
  create_time:'2026-10-15T03:20:36Z',resource:{
   id:SALE,billing_agreement_id:SUB,state:'completed',
   amount:{currency:'USD',total:'2.99'},
   payer:{payer_info:{email:'secret@private.example'}}}},
 sub:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE',
  subscriber:{email_address:'secret@private.example'}},
 transactions:{transactions:[{id:SALE,status:'COMPLETED',
  time:'2026-10-15T03:20:33Z',amount_with_breakdown:{
   gross_amount:{currency_code:'USD',value:'2.99'}},
  payer_email:'secret@private.example'}]},
})
const safe=x=>{
 for(const k of ['sourceAttributionVerifiedByThisCode','providerSignatureVerifiedByThisCode',
  'originalRegularCycleProven','cycleVerified','paymentRecorded',
  'mayRecordPayment','mayCreatePaidPeriod','mayGrantBenefits','mayEnableCheckout',
  'financialHistoryComplete'])assert.equal(x[k],false,k)
 for(const k of ['paidThrough','periodStart','periodEnd'])assert.equal(x[k],null,k)
 assert.equal(x.dbWrites,0)
 assert.equal(x.networkPaymentWrites,0)
 const s=JSON.stringify(x)
 for(const secret of [OWNER,INTENT,SUB,EVENT,PLAN,SALE,'secret@private.example',
  '2026-10-15T03:20:33Z'])assert.equal(s.includes(secret),false)
}
const fixture=mutate=>{
 const d=make();mutate?.(d)
 const calls=[]
 const inspector=create({
  resolveOwnerFromVerifiedSession:async ctx=>{calls.push('auth');return ctx?.valid?OWNER:null},
  readBoundIntent:async args=>{calls.push('intent');assert.deepEqual(args,{ownerId:OWNER,intentId:INTENT});return d.intent},
  readSignedInboxEvent:async args=>{calls.push('inbox');assert.deepEqual(args,{eventId:EVENT,eventType:'PAYMENT.SALE.COMPLETED'});return d.inbox},
  getMerchantWebhookEvent:async args=>{calls.push('event');assert.deepEqual(args,{eventId:EVENT});return d.event},
  getMerchantSubscription:async args=>{calls.push('sub');assert.deepEqual(args,{subscriptionId:SUB});return d.sub},
  listMerchantTransactions:async args=>{calls.push('tx');assert.deepEqual(args,{subscriptionId:SUB});return d.transactions},
 })
 return {inspector,calls}
}
const run=async mutate=>{
 const {inspector,calls}=fixture(mutate)
 const r=await inspector.inspect({requestContext:{valid:true,ownerId:'untrusted'},
  intentId:INTENT,saleEventId:EVENT})
 safe(r)
 return {r,calls}
}
test('real PayPal v1 shape, including PII, creates correlation candidate not paid cycle',async()=>{
 const {r,calls}=await run()
 assert.equal(r.phase,'SALE_CORRELATION_CANDIDATE_ONLY')
 assert.equal(r.saleEventTransactionRefsMatched,true)
 assert.equal(r.originalRegularCycleProven,false)
 assert.equal(r.requiresHistoricalCycleEvidence,true)
 assert.equal(r.requiresRefundDisputeAndHistoryCoverage,true)
 assert.deepEqual(calls,['auth','intent','inbox','event','sub','tx'])
})
test('missing or invalid Auth halts before querying private data',async()=>{
 const {inspector,calls}=fixture()
 const r=await inspector.inspect({requestContext:{valid:false,ownerId:OWNER},
  intentId:INTENT,saleEventId:EVENT})
 safe(r);assert.equal(r.reason,'verified_session_owner_unavailable')
 assert.deepEqual(calls,['auth'])
})
test('owner mismatches, unbound intents and unknown plan fail closed before payment reads',async()=>{
 for(const change of [
  d=>d.intent.ownerId='b1f87879-c8a1-41ca-b43b-c088c0f26a2b',
  d=>d.intent.state='pending',
  d=>d.intent.subscriptionId='INVALID-SUBSCRIPTION',
  d=>d.intent.provider='stripe',
  d=>d.intent.planId='',
 ]){const {r,calls}=await run(change)
  assert.equal(r.reason,'private_bound_intent_not_proven')
  assert.deepEqual(calls,['auth','intent'])
 }
})
test('inbox must identify the signed sale event, not an activation, stranger or quarantine',async()=>{
 for(const mutate of [
  d=>d.inbox.id='WH-OTHER',
  d=>d.inbox.type='BILLING.SUBSCRIPTION.ACTIVATED',
  d=>d.inbox.verifiedAt=null,
  d=>d.inbox.processingState='quarantined',
 ]){const {r,calls}=await run(mutate)
 assert.equal(r.reason,'signed_inbox_event_not_proven')
 assert.deepEqual(calls,['auth','intent','inbox'])
 }
})
test('PayPal event ID and type are independently matched to inbox',async()=>{
 for(const mutate of [
  d=>d.event.id='WH-OTHER',
  d=>d.event.event_type='BILLING.SUBSCRIPTION.ACTIVATED',
 ])assert.equal((await run(mutate)).r.reason,'merchant_webhook_event_id_or_type_mismatch')
})
test('PayPal subscription GET uses bound ID, plan and custom_id',async()=>{
 for(const mutate of [
  d=>d.sub.id='I-OTHER',
  d=>d.sub.plan_id='P-OTHER',
  d=>d.sub.custom_id='intent-other',
  d=>d.sub.status='SUSPENDED',
 ])assert.equal((await run(mutate)).r.reason,'merchant_subscription_binding_mismatch')
})
test('PayPal sale resource must match subscription and completed amount',async()=>{
 for(const mutate of [
  d=>d.event.resource.id='',
  d=>d.event.resource.billing_agreement_id='I-OTHER',
  d=>d.event.resource.state='pending',
  d=>d.event.resource.amount={currency:'EUR',total:'2.99'},
  d=>d.event.resource.amount={currency:'USD',total:'5.98'},
  d=>delete d.event.resource,
 ])assert.equal((await run(mutate)).r.reason,'merchant_sale_event_resource_mismatch')
})
test('merchant transaction must contain exactly one matching sale',async()=>{
 for(const mutate of [
  d=>d.transactions.transactions=[],
  d=>d.transactions.transactions[0].id='SALE-OTHER',
  d=>d.transactions.transactions.push({...d.transactions.transactions[0]}),
 ])assert.equal((await run(mutate)).r.phase,'REVIEW_REQUIRED')
})
test('merchant transaction amount and state independently required',async()=>{
 for(const mutate of [
  d=>d.transactions.transactions[0].status='PENDING',
  d=>d.transactions.transactions[0].status='REFUNDED',
  d=>d.transactions.transactions[0].amount_with_breakdown.gross_amount.value='5.98',
  d=>d.transactions.transactions[0].amount_with_breakdown.gross_amount.currency_code='EUR',
  d=>d.transactions.transactions[0].time='2026-02-30T00:00:00Z',
 ])assert.equal((await run(mutate)).r.reason,'merchant_sale_amount_state_or_time_invalid')
})
test('missing results, merchant unavailable and private errors never leak',async()=>{
 const {r}=await run(d=>d.transactions=null)
 assert.equal(r.reason,'merchant_transaction_window_missing_or_unbounded')
 const {inspector}=fixture()
 const bad=create({
  resolveOwnerFromVerifiedSession:async()=>OWNER,
  readBoundIntent:async()=>make().intent,
  readSignedInboxEvent:async()=>make().inbox,
  getMerchantWebhookEvent:async()=>{throw Error('secret@private.example TOKEN')},
  getMerchantSubscription:async()=>make().sub,
  listMerchantTransactions:async()=>make().transactions,
 })
 const x=await bad.inspect({requestContext:{valid:true},intentId:INTENT,saleEventId:EVENT})
 safe(x);assert.equal(x.reason,'read_only_source_adapter_unavailable')
 assert.ok(inspector)
})
test('event timestamp malformed is rejected without inferring arbitrary billing periods',async()=>{
 assert.equal((await run(d=>d.event.create_time='2026-02-30T03:00:00Z')).r.reason,
  'merchant_event_timestamp_invalid')
 assert.equal((await run(d=>delete d.event.create_time)).r.phase,
  'SALE_CORRELATION_CANDIDATE_ONLY')
})
test('three independent identifiers must match; match is still not cycle proof',async()=>{
 const {r}=await run()
 assert.equal(r.saleEventTransactionRefsMatched,true)
 assert.equal(r.originalRegularCycleProven,false)
 assert.equal(r.cycleVerified,false)
 assert.equal(r.mayGrantBenefits,false)
})
test('adapter contract requires all 6 trusted readers',()=>{
 assert.throws(()=>create(),/unconfigured_offline_read_adapters/)
})
test('48 combinations of state and source attributes never record or grant',async()=>{
 let n=0
 for(const status of ['COMPLETED','PENDING','REFUNDED'])
  for(const state of ['completed','pending'])
   for(const currency of ['USD','EUR'])
    for(const binding of [SUB,'I-OTHER'])
     for(const eventType of ['PAYMENT.SALE.COMPLETED','BILLING.SUBSCRIPTION.ACTIVATED']){
      const {r}=await run(d=>{
       d.transactions.transactions[0].status=status
       d.event.resource.state=state
       d.event.resource.amount.currency=currency
       d.event.resource.billing_agreement_id=binding
       d.event.event_type=eventType
      })
      assert.equal(r.mayGrantBenefits,false)
      n++
     }
 assert.equal(n,48)
})
