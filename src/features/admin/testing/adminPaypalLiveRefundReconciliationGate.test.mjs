import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveRefundReconciliationGate}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveRefundReconciliationGate.mjs'
import {createPazoLiveVerifiedSettlementWriter}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveVerifiedSettlementWriter.mjs'
const queueEventId='WH-REFUND-123456'
const ownerId='12345678-1234-4234-8234-123456789abc'
const intentId='intent-23456789-1234-4234-8234-123456789abc'
const subscriptionId='I-SUBSCRIPTION123456'
const saleId='SALE-123456789'
const start='2026-10-01T00:00:00.000Z',end='2026-10-30T00:00:00.000Z'
const event=Object.freeze({claimed:true,eventId:queueEventId,
 sourceEnvironment:'live',provider:'paypal',signatureVerified:true,
 eventType:'PAYMENT.SALE.REFUNDED',merchantGeneration:7,
 subscriptionId,saleId,searchStart:start,searchEnd:end})
const binding=Object.freeze({provider:'paypal',sourceEnvironment:'live',
 ownerId,intentId,subscriptionId,merchantGeneration:7,
 planId:'P-ABCDEFGHIJKLMNOP',state:'bound',consentVerified:true})
const recorded=Object.freeze({recorded:true,sourceEnvironment:'live',
 ownerId,intentId,subscriptionId,merchantGeneration:7,saleId,
 amountMinor:299,currency:'USD'})
const provider=Object.freeze({verified:true,sourceEnvironment:'live',
 intentId,subscriptionId,merchantGeneration:7,saleId,
 status:'REFUNDED',refundKind:'refunded',amountMinor:299,currency:'USD',
 holdReviewRequired:false})
function setup(overrides={}){
 const calls={event:0,binding:0,sale:0,provider:0,write:0}
 const writer=createPazoLiveVerifiedSettlementWriter({
  rpc:async(name,payload)=>{
   calls.write++
   assert.equal(name,'recordRefund')
   assert.equal(payload.p_hold_id,queueEventId)
   assert.equal(payload.p_kind,'refunded')
   assert.equal(payload.p_sale_id,saleId)
   assert.equal(payload.p_generation,7)
   return 'recorded'
  }
 })
 return {
  calls,
  gate:createPazoLiveRefundReconciliationGate({
   released:true,
   claimVerifiedEvent:async()=>{calls.event++;return event},
   findOriginalBinding:async()=>{calls.binding++;return binding},
   findRecordedSale:async()=>{calls.sale++;return recorded},
   readerForGeneration:async()=>{
    calls.provider++
    return {readRefundEvidence:async()=>provider}
   },
   writer,...overrides
  })
 }
}
test('release defaults OFF and never reaches provider or ledger',async()=>{
 let calls=0
 const gate=createPazoLiveRefundReconciliationGate({
  claimVerifiedEvent:async()=>{calls++}
 })
 assert.equal((await gate({queueEventId})).code,'live_refund_reconciler_not_released')
 assert.equal(calls,0)
})
test('full PayPal refund is independently proven and stored under original merchant and signed event',async()=>{
 const {gate,calls}=setup()
 const result=await gate({queueEventId})
 assert.equal(result.state,'RECORDED')
 assert.equal(result.refundRecorded,true)
 assert.equal(result.entitlementGranted,false)
 assert.equal(result.paymentRecorded,false)
 assert.deepEqual(calls,{event:1,binding:1,sale:1,provider:1,write:1})
})
test('duplicate verified event stays idempotent and does not produce extra benefits',async()=>{
 const writer=createPazoLiveVerifiedSettlementWriter({rpc:async()=>'already_recorded'})
 const {gate}=setup({writer})
 const r=await gate({queueEventId})
 assert.equal(r.state,'ALREADY_RECORDED')
 assert.equal(r.refundRecorded,false)
 assert.equal(r.entitlementGranted,false)
})
test('signed refund without provider proof cannot produce a financial hold',async()=>{
 for(const e of [
  {...event,signatureVerified:false},{...event,claimed:false},
  {...event,sourceEnvironment:'sandbox'},{...event,eventId:'WH-OTHER'},
  {...event,merchantGeneration:8}
 ]){
  const {gate,calls}=setup({claimVerifiedEvent:async()=>e})
  const r=await gate({queueEventId})
  assert.equal(r.state,'REVIEW_REQUIRED')
  assert.equal(calls.write,0)
 }
})
test('binding, recorded original sale and provider must all agree on merchant generation',async()=>{
 const cases=[
  {findOriginalBinding:async()=>({...binding,merchantGeneration:8})},
  {findOriginalBinding:async()=>({...binding,consentVerified:false})},
  {findRecordedSale:async()=>({...recorded,recorded:false})},
  {findRecordedSale:async()=>({...recorded,ownerId:'11111111-1111-4111-8111-111111111111'})},
  {readerForGeneration:async()=>({readRefundEvidence:async()=>({...provider,merchantGeneration:8})})},
  {readerForGeneration:async()=>({readRefundEvidence:async()=>({...provider,amountMinor:300})})}
 ]
 for(const item of cases){
  const {gate,calls}=setup(item)
  const result=await gate({queueEventId})
  assert.equal(result.state,'REVIEW_REQUIRED')
  assert.equal(result.refundRecorded,false)
  assert.equal(calls.write,0)
 }
})
test('partial refund, unknown refund or reversed sale never masquerades as full refund',async()=>{
 const cases=[
  {readRefundEvidence:async()=>({...provider,status:'PARTIALLY_REFUNDED',
   refundKind:'partially_refunded',holdReviewRequired:true})},
  {readRefundEvidence:async()=>({...provider,status:'PENDING'})},
  {readRefundEvidence:async()=>({...provider,refundKind:'partially_refunded'})}
 ]
 for(const x of cases){
  const {gate,calls}=setup({readerForGeneration:async()=>x})
  const result=await gate({queueEventId})
  assert.equal(result.state,'REVIEW_REQUIRED')
  assert.equal(result.entitlementGranted,false)
  assert.equal(calls.write,0)
 }
 const reversed=setup({claimVerifiedEvent:async()=>({
  ...event,eventType:'PAYMENT.SALE.REVERSED'})})
 const result=await reversed.gate({queueEventId})
 assert.equal(result.code,'reversal_requires_separate_original_merchant_proof')
 assert.equal(reversed.calls.write,0)
})
test('untrusted or impossible transaction window cannot issue original merchant requests',async()=>{
 for(const change of [
  {searchStart:'2026-02-30T00:00:00.000Z'},
  {searchEnd:'2027-01-01T00:00:00.000Z'},
  {searchEnd:start}
 ]){
  const {gate,calls}=setup({claimVerifiedEvent:async()=>({...event,...change})})
  assert.equal((await gate({queueEventId})).code,'refund_audited_search_window_invalid')
  assert.equal(calls.provider,0)
  assert.equal(calls.write,0)
 }
})
test('failed SQL persistence is not retried or exposed to callers',async()=>{
 const gate=setup({writer:{recordVerifiedReversal:async()=>{
  throw Error('private_credentials_should_never_be_returned')
 }}}).gate
 const result=await gate({queueEventId})
 assert.equal(result.code,'verified_refund_write_outcome_unknown')
 assert.equal(JSON.stringify(result).includes('private_credentials_should_never_be_returned'),false)
})
