import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16PrivateLabRpcStores} from '../../../../supabase/functions/f16-paypal-webhook/privateLabRpcStores.mjs'
import {createF16PrivateProviderProofFlow} from '../../../../supabase/functions/f16-paypal-webhook/privateProviderProofFlow.mjs'
const UUID='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const TOKEN='b370f92d-bf42-4a95-a32a-0c2581920480'
const EVENT='WH-F16-READ123',SUB='I-F16-READ123',SALE='SALE-F16-READ123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const REF={provider:'paypal',eventId:EVENT,eventType:'PAYMENT.SALE.COMPLETED'}
const candidate={provider:'paypal',externalPaymentId:SALE,externalSubscriptionId:SUB,
 ownerId:UUID,grossMinorUnits:299,currency:'USD',completedAt:'2026-10-13T19:00:00Z'}
const row={provider_event_id:EVENT,event_type:REF.eventType,lease_token:TOKEN,attempt:1,
 lease_expires_at:'2099-10-14T13:00:00Z'}
const intent={id:'intent-binding-12345',owner_id:UUID,provider:'paypal',state:'bound',
 external_subscription_id:SUB,plan_id:PLAN}
const results={
 f16_lab_claim_verified_inbox:row,
 f16_lab_release_claim:true,
 f16_lab_recover_expired:1,
 f16_lab_read_bound_intent_by_subscription:intent,
 f16_lab_read_known_reversal_ids:[],
 f16_lab_commit_claimed_sale:'inserted_uncredited',
 f16_lab_commit_claimed_reversal:'reversal_recorded',
}
function setup(patch={},fail=false){
 const calls=[]
 const rpcClient={rpc:async(name,args)=>{
  calls.push({name,args})
  if(fail)throw Error('private billing customer@example.org SECRET')
  return {data:name in patch?patch[name]:results[name],error:null}
 }}
 return {stores:createF16PrivateLabRpcStores({rpcClient,labDatabase:'f14_synthetic'}),calls}
}
test('exact RPC names, typed inputs and owner projection; never legacy RPC',async()=>{
 const x=setup()
 assert.deepEqual(await x.stores.leaseStore.claim(REF),row)
 assert.deepEqual(await x.stores.loadPrivateBoundIntent(SUB),{
  id:intent.id,provider:'paypal',ownerId:UUID,externalSubscriptionId:SUB,
  planId:PLAN,state:'bound'})
 assert.deepEqual(await x.stores.loadKnownReversalIds(SUB),[])
 assert.equal(await x.stores.leaseStore.release(EVENT,TOKEN),true)
 assert.equal(await x.stores.leaseStore.recoverExpired(12),1)
 assert.equal(await x.stores.financeStore.commitClaimedSale({
  eventId:EVENT,leaseToken:TOKEN,candidate,planId:PLAN,
 }),'inserted_uncredited')
 assert.equal(await x.stores.financeStore.commitClaimedReversal({
  eventId:EVENT,leaseToken:TOKEN,candidate:{
   provider:'paypal',externalPaymentId:SALE,kind:'refunded',verifiedAt:'2026-10-14T11:16:00Z',
  },
 }),'reversal_recorded')
 assert.deepEqual(x.calls.map(c=>c.name),[
  'f16_lab_claim_verified_inbox','f16_lab_read_bound_intent_by_subscription',
  'f16_lab_read_known_reversal_ids','f16_lab_release_claim',
  'f16_lab_recover_expired','f16_lab_commit_claimed_sale',
  'f16_lab_commit_claimed_reversal'])
 assert.deepEqual(x.calls[5].args,{
  p_event_id:EVENT,p_lease_token:TOKEN,p_payment_id:SALE,
  p_subscription_id:SUB,p_owner_id:UUID,p_plan_id:PLAN,p_minor:299,
  p_currency:'USD',p_completed_at:'2026-10-13T19:00:00Z'})
 assert.equal(JSON.stringify(x.calls).includes('secret'),false)
})
test('DRAFT lab must be explicitly selected, no valid service client assumed',()=>{
 for(const conf of [{}, {labDatabase:'production',rpcClient:{rpc(){}}},
  {labDatabase:'f14_synthetic',rpcClient:{}}]){
  assert.throws(()=>createF16PrivateLabRpcStores(conf),/disposable_rpc_client_required/)
 }
})
test('null revs means UNKNOWN, not fabricated empty history',async()=>{
 const x=setup({f16_lab_read_known_reversal_ids:null})
 assert.equal(await x.stores.loadKnownReversalIds(SUB),null)
 const y=setup({f16_lab_read_known_reversal_ids:['SALE-A','SALE-B']})
 assert.deepEqual(await y.stores.loadKnownReversalIds(SUB),['SALE-A','SALE-B'])
})
test('unexpected objects including private PII are rejected before propagating',async()=>{
 for(const key of ['f16_lab_claim_verified_inbox','f16_lab_read_bound_intent_by_subscription']){
  const base=key.includes('claim')?row:intent
  const x=setup({[key]:{...base,payer_email:'forbidden@example.com'}})
  await assert.rejects(key.includes('claim')?
   x.stores.leaseStore.claim(REF):x.stores.loadPrivateBoundIntent(SUB),
   /contract_mismatch/)
 }
 for(const extra of [['SALE-A','SALE-A'],['../private'],['SALE-VALID',null],{}]){
  const x=setup({f16_lab_read_known_reversal_ids:extra})
  await assert.rejects(x.stores.loadKnownReversalIds(SUB),/contract_mismatch/)
 }
})
test('invalid reference or over-limit recovery rejects BEFORE any RPC call',async()=>{
 const x=setup()
 for(const bad of [{...REF,eventId:'../private'},{...REF,provider:'stripe'},
  {...REF,eventType:'BILLING.SUBSCRIPTION.ACTIVATED'}]){
  await assert.rejects(x.stores.leaseStore.claim(bad),/invalid_request/)
 }
 await assert.rejects(x.stores.loadPrivateBoundIntent('I-AA?x=1'),/invalid_request/)
 await assert.rejects(x.stores.loadKnownReversalIds('https://evil.com'),/invalid_request/)
 await assert.rejects(x.stores.leaseStore.release(EVENT,'wrong'),/invalid_request/)
 await assert.rejects(x.stores.leaseStore.recoverExpired(101),/invalid_request/)
 await assert.rejects(x.stores.financeStore.commitClaimedSale({
   eventId:EVENT,leaseToken:TOKEN,candidate:{...candidate,grossMinorUnits:300},
   planId:PLAN,
 }),/invalid_request/)
 await assert.rejects(x.stores.financeStore.commitClaimedReversal({
  eventId:EVENT,leaseToken:TOKEN,candidate:{
   provider:'paypal',externalPaymentId:SALE,kind:'reversed',verifiedAt:'2026-10-14T11:16:00Z',
  },
 }),/invalid_request/)
 assert.deepEqual(x.calls,[])
})
test('service errors must be sanitized, unknown finance response never marked success',async()=>{
 const x=setup({},true)
 await assert.rejects(x.stores.leaseStore.claim(REF),e=>{
  assert.equal(e.message,'f16_private_rpc_unavailable');return true})
 const y=setup({f16_lab_commit_claimed_sale:'already_processed'})
 await assert.rejects(y.stores.financeStore.commitClaimedSale({
  eventId:EVENT,leaseToken:TOKEN,candidate,planId:PLAN,
 }),/contract_mismatch/)
 for(const invalid of [undefined,{},'processed']){
  const z=setup({f16_lab_release_claim:invalid})
  await assert.rejects(z.stores.leaseStore.release(EVENT,TOKEN))
 }
})
test('expired or misattributed claims refuse provider side effects',async()=>{
 for(const wrong of [
  {...row,lease_expires_at:'2000-01-01T00:00:00Z'},
  {...row,event_type:'PAYMENT.SALE.REFUNDED'},
  {...row,attempt:'1'},
  {...row,lease_token:null},
 ]){
  const x=setup({f16_lab_claim_verified_inbox:wrong})
  await assert.rejects(x.stores.leaseStore.claim(REF),/contract_mismatch/)
 }
})
test('flow with concrete lab RPC adapters remains fail closed without authoritative reversal state',async()=>{
 const x=setup({f16_lab_read_known_reversal_ids:null})
 const flow=createF16PrivateProviderProofFlow({
  ...x.stores,
  eventReader:{readEvent:async()=>({eventId:EVENT,eventType:REF.eventType,
   externalPaymentId:SALE,externalSubscriptionId:SUB})},
  subscriptionReader:{read:async()=>({
   lookupSubscriptionId:SUB,merchantScopedByPayPalApi:true,
   subscription:{id:SUB,plan_id:PLAN,custom_id:intent.id,status:'ACTIVE'},
   transactions:[{id:SALE,status:'COMPLETED',time:'2026-10-13T19:00:00Z',
    amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}],
  })},
  originalReader:{
   readSale:async()=>({id:SALE,subscriptionId:SUB,state:'completed',
    grossMinorUnits:299,currency:'USD',verifiedByMerchantApi:true}),
   readRefund:async()=>null,readVerifiedRefundEvent:async()=>null,
  },
  verifyAuthOwner:async()=>true,
 })
 const outcome=await flow.process(REF,{
  startTime:'2026-10-01T00:00:00Z',endTime:'2026-10-30T00:00:00Z'})
 assert.equal(outcome.recorded,false)
 assert.equal(outcome.entitlement,false)
 assert.deepEqual(x.calls.map(c=>c.name),[
  'f16_lab_claim_verified_inbox','f16_lab_read_bound_intent_by_subscription',
  'f16_lab_read_known_reversal_ids','f16_lab_release_claim',
 ])
})
