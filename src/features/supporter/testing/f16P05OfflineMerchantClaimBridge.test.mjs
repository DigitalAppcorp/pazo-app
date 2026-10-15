import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05OfflineMerchantClaimBridge as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineMerchantClaimBridge.mjs'
import {createP05OfflineInboxOrchestrator as createWorker}
 from '../../../../supabase/functions/f16-paypal-webhook/p05OfflineInboxOrchestrator.mjs'
const eventId='WH-MERCHANT-CLAIM-001',claimToken='00000000-0000-4000-8000-000000000001'
const subId='I-MERCHANT-CORRELATION01',intentId='intent-privatebound12345'
const ownerId='11111111-1111-4111-8111-111111111111',planId='P-14V25407JP6850922NLHMDKI'
function mock(mutate=()=>{}){
 const event={id:eventId,event_type:'PAYMENT.SALE.COMPLETED',
  resource:{id:'SALE-ONE-SYNTHETIC',billing_agreement_id:subId,
   state:'completed',amount:{currency:'USD',total:'2.99'},
   payer_email:'private@example.invalid'}}
 const sub={id:subId,plan_id:planId,custom_id:intentId,status:'ACTIVE',
  payer_email:'private@example.invalid'}
 const bound={intentId,subscriptionId:subId,planId,state:'bound',ownerId}
 const calls=[]
 mutate({event,sub,bound})
 const bridge=create({
  getMerchantEvent:async args=>{calls.push(['event',args]);return event},
  getMerchantSubscription:async args=>{calls.push(['sub',args]);return sub},
  resolveClaimedSubscription:async args=>{calls.push(['resolve',args]);return bound},
 })
 return {bridge,calls}
}
const inspect=async bridge=>bridge.inspectMerchantEvidence({
 eventId,eventType:'PAYMENT.SALE.COMPLETED',claimToken})
const safe=r=>{
 assert.deepEqual(Object.keys(r),['kind'])
 assert.ok(!JSON.stringify(r).includes('private@example.invalid'))
 assert.ok(!JSON.stringify(r).includes(subId))
 assert.ok(!JSON.stringify(r).includes(intentId))
 assert.ok(!JSON.stringify(r).includes(ownerId))
}
test('PayPal event -> sub -> fenced private intent correlation is candidate only',async()=>{
 const {bridge,calls}=mock()
 const r=await inspect(bridge);safe(r)
 assert.equal(r.kind,'sale_correlated_candidate')
 assert.deepEqual(calls,[
  ['event',{eventId,claimToken}],
  ['sub',{subscriptionId:subId,eventId,claimToken}],
  ['resolve',{eventId,claimToken,
   merchantSubscriptionId:subId,merchantCustomIntentId:intentId}],
 ])
})
test('untrusted browser ID and invalid claim token never reach PayPal',async()=>{
 const {bridge,calls}=mock()
 for(const bad of [
  {eventId:'../../',eventType:'PAYMENT.SALE.COMPLETED',claimToken},
  {eventId,eventType:'PAYMENT.SALE.REFUNDED',claimToken},
  {eventId,eventType:'PAYMENT.SALE.COMPLETED',claimToken:'not-valid'},
 ]){const r=await bridge.inspectMerchantEvidence(bad)
 safe(r);assert.equal(r.kind,'insufficient_evidence')}
 assert.equal(calls.length,0)
})
test('merchant event mismatch and malformed amount never reach private SQL',async()=>{
 const variants=[
  x=>x.event.id='WH-FOREIGN',
  x=>x.event.event_type='PAYMENT.SALE.PENDING',
  x=>x.event.resource.billing_agreement_id='I-FOREIGN/sub',
  x=>x.event.resource.state='pending',
  x=>x.event.resource.amount.total='5.98',
  x=>x.event.resource.amount.currency='EUR',
 ]
 for(const mutate of variants){
  const {bridge,calls}=mock(mutate);const r=await inspect(bridge)
  safe(r);assert.notEqual(r.kind,'sale_correlated_candidate')
  assert.equal(calls.some(c=>c[0]==='resolve'),false)
 }
})
test('subscription GET plan, custom_id and ID must match private contract',async()=>{
 for(const mutation of [
  x=>x.sub.id='I-FOREIGNSUB123',
  x=>x.sub.plan_id='P-FOREIGN123',
  x=>x.sub.custom_id='intent-other',
  x=>x.sub.status='SUSPENDED',
 ]){
  const {bridge,calls}=mock(mutation);const r=await inspect(bridge)
  safe(r);assert.equal(r.kind,'foreign_reference')
  assert.equal(calls.some(c=>c[0]==='resolve'),false)
 }
})
test('cross-owner, cross-sub and cross-custom id are denied in the bridge',async()=>{
 for(const mutation of [
  x=>x.bound.intentId='intent-foreignbound54321',
  x=>x.bound.subscriptionId='I-FOREIGN123',
  x=>x.bound.planId='P-OTHER',
  x=>x.bound.state='pending',
  x=>x.bound.ownerId='bad-uuid',
 ]){
  const {bridge}=mock(mutation);const r=await inspect(bridge)
  safe(r);assert.equal(r.kind,'foreign_reference')
 }
})
test('missing private intent or database exception fails closed',async()=>{
 const empty=create({
  getMerchantEvent:async()=>mockEvent(),
  getMerchantSubscription:async()=>mockSubscription(),
  resolveClaimedSubscription:async()=>null,
 })
 function mockEvent(){return {id:eventId,event_type:'PAYMENT.SALE.COMPLETED',
  resource:{id:'SALE-ONE-SYNTHETIC',billing_agreement_id:subId,
   state:'completed',amount:{currency:'USD',total:'2.99'}}}}
 function mockSubscription(){return {id:subId,plan_id:planId,
  custom_id:intentId,status:'ACTIVE'}}
 assert.equal((await inspect(empty)).kind,'foreign_reference')
 const broken=create({
  getMerchantEvent:async()=>mockEvent(),
  getMerchantSubscription:async()=>mockSubscription(),
  resolveClaimedSubscription:async()=>{throw Error('private@example.invalid DB_SECRET')},
 })
 assert.equal((await inspect(broken)).kind,'read_error')
})
test('PayPal GET errors never expose secrets or falsely report matches',async()=>{
 for(const failing of ['getMerchantEvent','getMerchantSubscription']){
  const a=mock()
  const adapters={
   getMerchantEvent:async()=>({id:eventId,event_type:'PAYMENT.SALE.COMPLETED',
    resource:{id:'SALE-ONE-SYNTHETIC',billing_agreement_id:subId,
     state:'completed',amount:{currency:'USD',total:'2.99'}}}),
   getMerchantSubscription:async()=>({id:subId,plan_id:planId,
    custom_id:intentId,status:'ACTIVE'}),
   resolveClaimedSubscription:async()=>({intentId,subscriptionId:subId,
    planId,state:'bound',ownerId}),
  }
  adapters[failing]=async()=>{throw Error('private@example.invalid PAYPAL_TOKEN')}
  const r=await inspect(create(adapters));safe(r)
  assert.equal(r.kind,'retryable_outage')
  assert.ok(a)
 }
})
test('worker integration ends a clean correlation in REVIEW and no benefits',async()=>{
 const {bridge}=mock()
 const calls=[]
 const worker=createWorker({
  claimNextVerifiedEvent:async()=>({eventId,eventType:'PAYMENT.SALE.COMPLETED',
   leaseToken:claimToken,verifiedAt:'2026-10-15T03:20:39Z',
   leaseExpiresAt:'2026-10-15T03:25:39Z',
   attemptCount:1,processingState:'processing'}),
  readClaimedEvent:async()=>({id:eventId,type:'PAYMENT.SALE.COMPLETED',
   verifiedAt:'2026-10-15T03:20:39Z',processingState:'processing'}),
  inspectMerchantEvidence:bridge.inspectMerchantEvidence,
  finishClaimedEvent:async args=>{calls.push(args);return true},
 })
 const r=await worker.runOnce()
 assert.equal(r.phase,'REVIEW_REQUESTED')
 assert.equal(r.reason,'cycle_unproven')
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.paidThrough,null)
 assert.deepEqual(calls,[{eventId,claimToken,outcome:'review',
  reasonCode:'cycle_unproven'}])
})
test('adapter interface required; no backend side effects',()=>{
 assert.throws(()=>create({}),/p05_merchant_claim_bridge_unconfigured/)
})
