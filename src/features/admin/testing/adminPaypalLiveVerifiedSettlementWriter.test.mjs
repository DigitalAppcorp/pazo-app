import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveVerifiedSettlementWriter}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveVerifiedSettlementWriter.mjs'

const binding=Object.freeze({
 provider:'paypal',sourceEnvironment:'live',
 ownerVerified:true,merchantGenerationVerified:true,
 ownerId:'12345678-1234-4234-8234-123456789abc',
 intentId:'intent-23456789-1234-4234-8234-123456789abc',
 subscriptionId:'I-SUBSCRIPTION123456',merchantGeneration:7
})
const sale=Object.freeze({
 provider:'paypal',sourceEnvironment:'live',merchantVerified:true,
 signatureVerified:true,subscriptionVerified:true,
 subscriptionId:binding.subscriptionId,merchantGeneration:7,
 saleId:'SALE-123456789',eventId:'WH-123456789',
 eventType:'PAYMENT.SALE.COMPLETED',state:'COMPLETED',
 amountMinor:299,currency:'USD'
})
const period=Object.freeze({
 cycleKey:'CYCLE-2026-11',
 serviceStart:'2026-11-01T00:00:00.000Z',
 serviceEnd:'2026-12-01T00:00:00.000Z',
 providerPeriodVerified:true
})
test('verified paid cycle writes to installed service-only ledger without granting benefits',async()=>{
 const calls=[]
 const writer=createPazoLiveVerifiedSettlementWriter({
  rpc:async(name,body)=>{calls.push({name,body});return 'recorded'}
 })
 const result=await writer.recordVerifiedSale({binding,receipt:sale,period})
 assert.equal(result.state,'RECORDED')
 assert.equal(result.entitlementGranted,false)
 assert.equal(result.paymentRecorded,true)
 assert.deepEqual(calls.map(x=>x.name),['recordSale'])
 assert.equal(calls[0].body.p_event_id,sale.eventId)
 assert.equal(calls[0].body.p_amount_minor,299)
 assert.equal(calls[0].body.p_end,period.serviceEnd)
})
test('same signed sale is idempotent, no second membership credit',async()=>{
 let attempts=0
 const writer=createPazoLiveVerifiedSettlementWriter({
  rpc:async()=>{attempts++;return 'already_recorded'}
 })
 const r=await writer.recordVerifiedSale({binding,receipt:sale,period})
 assert.equal(r.state,'ALREADY_RECORDED')
 assert.equal(r.entitlementGranted,false)
 assert.equal(r.paymentRecorded,false)
 assert.equal(attempts,1)
})
test('refund and reversal map exactly to installed hold enums, never a new period',async()=>{
 const calls=[]
 const writer=createPazoLiveVerifiedSettlementWriter({
  rpc:async(name,body)=>{calls.push({name,body});return 'recorded'}
 })
 for(const [eventType,kind] of [
  ['PAYMENT.SALE.REFUNDED','refunded'],
  ['PAYMENT.SALE.REVERSED','reversed']
 ]){
  const result=await writer.recordVerifiedReversal({
   binding,receipt:{...sale,eventType,holdId:'HOLD-12345678'}
  })
  assert.equal(result.state,'RECORDED')
  assert.equal(result.paymentRecorded,false)
  assert.equal(result.entitlementGranted,false)
  assert.equal(calls[calls.length-1].body.p_kind,kind)
 }
 assert.deepEqual(calls.map(x=>x.name),['recordRefund','recordRefund'])
})
test('invalid original merchant, amount or period cannot reach database write',async()=>{
 let calls=0
 const writer=createPazoLiveVerifiedSettlementWriter({
  rpc:async()=>{calls++;throw Error('never reached')}
 })
 const inputs=[
  {binding:{...binding,ownerVerified:false},receipt:sale,period},
  {binding,receipt:{...sale,amountMinor:300},period},
  {binding,receipt:sale,period:{...period,providerPeriodVerified:false}}
 ]
 for(const x of inputs){
  const r=await writer.recordVerifiedSale(x)
  assert.equal(r.state,'REVIEW_REQUIRED')
  assert.equal(r.entitlementGranted,false)
 }
 const reversal=await writer.recordVerifiedReversal({
  binding,receipt:{...sale,eventType:'PAYMENT.SALE.REFUNDED',holdId:'HOLD-12345678',
   signatureVerified:false}
 })
 assert.equal(reversal.state,'REVIEW_REQUIRED')
 assert.equal(calls,0)
})
test('database error and unexpected status are recoverable review states, not success',async()=>{
 const unavailable=createPazoLiveVerifiedSettlementWriter({rpc:async()=>{
  throw Error('secret_service_role_key_private')
 }})
 const a=await unavailable.recordVerifiedSale({binding,receipt:sale,period})
 assert.equal(a.code,'ledger_write_outcome_unknown')
 assert.equal(JSON.stringify(a).includes('secret_service_role_key_private'),false)
 const conflict=createPazoLiveVerifiedSettlementWriter({rpc:async()=> 'sale_id_conflict'})
 const b=await conflict.recordVerifiedSale({binding,receipt:sale,period})
 assert.equal(b.code,'ledger_reconciliation_required')
 assert.equal(b.paymentRecorded,false)
})
