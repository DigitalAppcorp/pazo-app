import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16PrivateProviderProofFlow} from '../../../../supabase/functions/f16-paypal-webhook/privateProviderProofFlow.mjs'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const TOKEN='b370f92d-bf42-4a95-a32a-0c2581920480'
const PLAN='P-14V25407JP6850922NLHMDKI',SUB='I-PAZO-OWNER123'
const PAYMENT='SALE-PAZO123',SALE='WH-SALE-PAZO123',REFUND='WH-REFUND-PAZO123'
const WINDOW={startTime:'2026-10-01T00:00:00Z',endTime:'2026-10-31T00:00:00Z'}
const subscription={id:SUB,plan_id:PLAN,custom_id:'intent-correlation-123',status:'CANCELLED'}
const intent={id:'intent-correlation-123',provider:'paypal',ownerId:OWNER,
  externalSubscriptionId:SUB,planId:PLAN,state:'bound'}
const original={id:PAYMENT,subscriptionId:SUB,state:'completed',grossMinorUnits:299,
 currency:'USD',completedAt:'2026-10-13T19:00:00Z',verifiedByMerchantApi:true}
const refund={id:'REFUND-ORIG123',originalSaleId:PAYMENT,refundMinorUnits:299,
 currency:'USD',state:'completed',verifiedAt:'2026-10-14T11:16:00Z',verifiedByMerchantApi:true}
const saleRef={provider:'paypal',eventId:SALE,eventType:'PAYMENT.SALE.COMPLETED'}
const refundRef={provider:'paypal',eventId:REFUND,eventType:'PAYMENT.SALE.REFUNDED'}
function setup(overrides={}){
 const calls=[]
 const event=(ref)=>({eventId:ref.eventId,eventType:ref.eventType,
  externalPaymentId:ref.eventType===saleRef.eventType?PAYMENT:null,
  externalSubscriptionId:ref.eventType===saleRef.eventType?SUB:null,
  requiresReversalReview:ref.eventType===refundRef.eventType,...overrides.event})
 const reader={readEvent:async id=>{calls.push('event');if(overrides.eventThrows)throw Error('provider private outage');return event({eventId:id,eventType:overrides.kind??saleRef.eventType})}}
 const subscriptionReader={read:async()=>{calls.push('transactions');return {
  lookupSubscriptionId:SUB,merchantScopedByPayPalApi:true,
  subscription:{...subscription,...overrides.subscription},
  transactions:[{id:PAYMENT,status:overrides.txStatus??'COMPLETED',
   time:'2026-10-13T19:00:00Z',
   amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}],
  ...overrides.observed,
 }}}
 const originalReader={
  readSale:async()=>{calls.push('original');if(overrides.originalThrows)throw Error('outage')
    return {...original,...overrides.original}},
  readVerifiedRefundEvent:async id=>{calls.push('refund_event');
    return {eventId:id,eventType:refundRef.eventType,refundId:refund.id,...overrides.refundEvent}},
  readRefund:async()=>{calls.push('refund');return {...refund,...overrides.refund}},
 }
 const leaseStore={
  claim:async ref=>{calls.push('claim');if(overrides.claimThrows)throw Error('no db');
   return overrides.claim===undefined?{
    provider_event_id:ref.eventId,event_type:ref.eventType,
    lease_token:TOKEN,attempt:1,lease_expires_at:'2099-10-14T13:00:00Z',
   }:overrides.claim},
  release:async(id,token,reason)=>{calls.push('release');assert.equal(token,TOKEN);
   assert.equal(reason,'unverified_provider_state')
   if(overrides.releaseThrows)throw Error('release failed')
   return overrides.releaseSuccess!==false},
 }
 const financeStore={
  commitClaimedSale:async proof=>{calls.push('commit_sale')
   assert.equal(proof.leaseToken,TOKEN)
   assert.equal(proof.candidate.ownerId,OWNER)
   if(overrides.commitThrows)throw Error('commit response lost')
   return overrides.commitResult??'inserted_uncredited'},
  commitClaimedReversal:async proof=>{calls.push('commit_reversal')
   assert.equal(proof.leaseToken,TOKEN)
   assert.equal(proof.candidate.externalPaymentId,PAYMENT)
   assert.equal(proof.candidate.externalRefundId,refund.id)
   assert.equal(proof.candidate.externalSubscriptionId,SUB)
   assert.equal(proof.candidate.providerStatus,overrides.txStatus??'REFUNDED')
   return overrides.commitResult??(proof.candidate.providerStatus==='PARTIALLY_REFUNDED'?'refund_recorded_partial':'refund_recorded_full')},
 }
 const flow=createF16PrivateProviderProofFlow({
  leaseStore,eventReader:reader,subscriptionReader,originalReader,
  loadPrivateBoundIntent:async()=>{calls.push('intent');return overrides.intent===undefined?intent:overrides.intent},
  verifyAuthOwner:async id=>{calls.push('auth');return overrides.ownerOk!==false&&id===OWNER},
  loadKnownReversalIds:async()=>{calls.push('reversals');return overrides.reversals===undefined?[]:overrides.reversals},
  financeStore,
 })
 return {flow,calls}
}
test('sale requires verified event, private BOUND intent, Auth, merchant subscription, original SALE, transactions, ledger',async()=>{
 const x=setup()
 const result=await x.flow.process(saleRef,WINDOW)
 assert.deepEqual(result,{recorded:true,entitlement:false,reason:'inserted_uncredited'})
 assert.deepEqual(x.calls,['claim','event','transactions','intent','auth','original','reversals','commit_sale'])
})
test('unknown or already claimed references never reach PayPal or ledger',async()=>{
 const a=setup()
 for(const ref of [{...saleRef,provider:'stripe'},
  {...saleRef,eventType:'BILLING.SUBSCRIPTION.ACTIVATED'},
  {...saleRef,eventId:'../spoof'}]){
  assert.equal((await a.flow.process(ref,WINDOW)).recorded,false)
 }
 assert.deepEqual(a.calls,[])
 const b=setup({claim:null})
 assert.equal((await b.flow.process(saleRef,WINDOW)).recorded,false)
 assert.deepEqual(b.calls,['claim'])
 const c=setup({claimThrows:true})
 assert.equal((await c.flow.process(saleRef,WINDOW)).recorded,false)
 assert.deepEqual(c.calls,['claim'])
})
test('owner absence and wrong intent cannot reach merchant original or SQL commit',async()=>{
 for(const change of [{ownerOk:false},
  {intent:{...intent,state:'pending'}},
  {intent:{...intent,ownerId:'8b134f73-5ee3-49a2-9a36-3e1592e5af81'}},
  {subscription:{custom_id:'intent-spoof'}},
  {observed:{merchantScopedByPayPalApi:false}},
 ]){
  const x=setup(change)
  assert.equal((await x.flow.process(saleRef,WINDOW)).recorded,false)
  assert.equal(x.calls.includes('commit_sale'),false)
  assert.equal(x.calls.at(-1),'release')
 }
})
test('sale canceled subscription can remain historic candidate only when original completed; stale/refunded sale blocked',async()=>{
 for(const change of [{original:{state:'refunded'}},{txStatus:'REFUNDED'},
  {original:{subscriptionId:'I-OTHER-SUB'}},
  {original:{grossMinorUnits:300}},{reversals:[PAYMENT]},
  {reversals:null},{observed:{transactions:[]}},
 ]){
  const x=setup(change)
  const result=await x.flow.process(saleRef,WINDOW)
  assert.equal(result.recorded,false)
  assert.equal(x.calls.includes('commit_sale'),false)
  assert.equal(x.calls.at(-1),'release')
 }
})
test('refund must re-read independent refund event, original refund, original sale and history',async()=>{
 const x=setup({kind:refundRef.eventType,txStatus:'REFUNDED'})
 const result=await x.flow.process(refundRef,WINDOW)
 assert.deepEqual(result,{recorded:true,entitlement:false,reason:'refund_recorded_full'})
 assert.deepEqual(x.calls,['claim','event','refund_event','refund','original',
  'transactions','intent','auth','commit_reversal'])
})
test('partial refund is an evidence-only ledger candidate after separate refund ID proof',async()=>{
 const x=setup({kind:refundRef.eventType,txStatus:'PARTIALLY_REFUNDED',
   refund:{refundMinorUnits:100}})
 const result=await x.flow.process(refundRef,WINDOW)
 assert.deepEqual(result,{recorded:true,entitlement:false,
   reason:'refund_recorded_partial'})
 assert.equal(x.calls.includes('commit_reversal'),true)
 assert.equal(x.calls.at(-1),'commit_reversal')
})
test('refund original mismatch, pending refund, history ambiguity and event spoof fail closed',async()=>{
 for(const change of [
  {refund:{originalSaleId:'DIFFERENT'}},
  {refund:{state:'pending'}},
  {refund:{refundMinorUnits:0}},
  {refund:{refundMinorUnits:300}},
  {txStatus:'COMPLETED'},
  {refundEvent:{eventId:'WH-DIFFERENT'}},
  {original:{grossMinorUnits:300}},
  {ownerOk:false},
 ]){
  const x=setup({kind:refundRef.eventType,txStatus:'REFUNDED',...change})
  assert.equal((await x.flow.process(refundRef,WINDOW)).recorded,false)
  assert.equal(x.calls.includes('commit_reversal'),false)
  assert.equal(x.calls.at(-1),'release')
 }
})
test('REVERSED without independent original provider dispute evidence is not a supported write',async()=>{
 const x=setup()
 const outcome=await x.flow.process({...refundRef,eventType:'PAYMENT.SALE.REVERSED'},WINDOW)
 assert.equal(outcome.recorded,false)
 assert.deepEqual(x.calls,[])
})
test('provider timeout and ambiguous DB ACK never imply success; release failure requires recovery',async()=>{
 for(const change of [{eventThrows:true},{originalThrows:true},{commitThrows:true},
  {commitResult:'already_processed'}]){
  const x=setup(change)
  assert.equal((await x.flow.process(saleRef,WINDOW)).recorded,false)
  assert.equal(x.calls.at(-1),'release')
 }
 const x=setup({commitThrows:true,releaseSuccess:false})
 await assert.rejects(x.flow.process(saleRef,WINDOW),/private_lease_recovery_required/)
 assert.deepEqual(x.calls.slice(-2),['commit_sale','release'])
})
test('mismatched database lease cannot be treated as provider proof',async()=>{
 const x=setup({claim:{provider_event_id:SALE,event_type:saleRef.eventType,
  lease_token:'not-a-uuid',attempt:1}})
 await assert.rejects(x.flow.process(saleRef,WINDOW),/inconsistent_claim_requires_private_recovery/)
 assert.deepEqual(x.calls,['claim'])
})
test('requires every injected server-only component',()=>{
 assert.throws(()=>createF16PrivateProviderProofFlow(),/not_configured/)
})

test('expired lease refuses ALL PayPal requests before authorization or writes',async()=>{
 const x=setup({claim:{provider_event_id:SALE,event_type:saleRef.eventType,
   lease_token:TOKEN,attempt:1,lease_expires_at:'2026-01-01T00:00:00Z'}})
 await assert.rejects(x.flow.process(saleRef,WINDOW),/inconsistent_claim_requires_private_recovery/)
 assert.deepEqual(x.calls,['claim'])
})
test('caller cannot replace PayPal subscription ID via transaction-window metadata',async()=>{
 const x=setup()
 const result=await x.flow.process(saleRef,{...WINDOW,subscriptionId:'I-FAKE'})
 assert.equal(result.recorded,true)
 assert.deepEqual(x.calls,['claim','event','transactions','intent','auth','original','reversals','commit_sale'])
})
