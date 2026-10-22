import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveLeasedSettlementWriter} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveVerifiedSettlementWriter.mjs'
const binding={provider:'paypal',sourceEnvironment:'live',ownerVerified:true,merchantGenerationVerified:true,
 ownerId:'12345678-1234-4234-8234-123456789abc',intentId:'intent-23456789-1234-4234-8234-123456789abc',
 subscriptionId:'I-LEASED-SUBSCRIPTION',merchantGeneration:7}
const receipt={provider:'paypal',sourceEnvironment:'live',merchantVerified:true,signatureVerified:true,
 subscriptionVerified:true,subscriptionId:binding.subscriptionId,merchantGeneration:7,saleId:'SALE-LEASED-123',
 eventId:'WH-LEASED-123',eventType:'PAYMENT.SALE.COMPLETED',state:'COMPLETED',amountMinor:299,currency:'USD'}
const period={providerPeriodVerified:true,cycleKey:'CYCLE-LEASED-123',
 serviceStart:'2026-10-01T00:00:00.000Z',serviceEnd:'2026-11-01T00:00:00.000Z'}
const lease={...binding,claimed:true,eventId:receipt.eventId,leaseToken:'34567890-1234-4234-8234-123456789abc'}
test('payment and acknowledgement are a single durable operation; replay cannot grant again',async()=>{
 const calls=[]
 const w=createPazoLiveLeasedSettlementWriter({rpc:async(name,body)=>{
  calls.push({name,body});return calls.length===1?'recorded':'already_recorded'
 }})
 const input={binding,receipt,period,lease}
 const first=await w.recordVerifiedSale(input),replay=await w.recordVerifiedSale(input)
 assert.equal(first.paymentRecorded,true);assert.equal(first.leaseReleased,true)
 assert.equal(replay.paymentRecorded,false);assert.equal(replay.state,'ALREADY_RECORDED')
 assert.ok(calls.every(c=>c.name==='leasedSale'&&c.body.p_lease===lease.leaseToken))
 assert.ok(calls.every(c=>!('signatureVerified' in c.body)))
})
test('cross-owner, wrong event/generation or missing lease never writes',async()=>{
 let calls=0
 const w=createPazoLiveLeasedSettlementWriter({rpc:async()=>{calls++;return 'recorded'}})
 for(const bad of [null,{...lease,ownerId:'other'},{...lease,eventId:'other'},
  {...lease,merchantGeneration:8},{...lease,claimed:false},{...lease,leaseToken:'invalid'}]){
  const r=await w.recordVerifiedSale({binding,receipt,period,lease:bad})
  assert.equal(r.paymentRecorded,false);assert.equal(r.leaseReleased,false)
 }
 assert.equal(calls,0)
})
test('uncertain HTTP write does not retry or acknowledge; persisted SQL resolves it',async()=>{
 let calls=0
 const w=createPazoLiveLeasedSettlementWriter({rpc:async()=>{calls++;throw Error('PRIVATE')}})
 const r=await w.recordVerifiedSale({binding,receipt,period,lease})
 assert.equal(r.outcomeUnknown,true);assert.equal(r.leaseReleased,false);assert.equal(calls,1)
 assert.ok(!JSON.stringify(r).includes('PRIVATE'))
})
test('full reversal uses the same leased transaction; partial refund cannot reach it',async()=>{
 const calls=[]
 const w=createPazoLiveLeasedSettlementWriter({rpc:async(n,p)=>{calls.push({n,p});return 'recorded'}})
 const reversed={...receipt,eventType:'PAYMENT.SALE.REVERSED',refundKind:'reversed',holdId:'HOLD-LEASED-123',
  originalSaleVerified:true,providerReversalVerified:true}
 const r=await w.recordVerifiedReversal({binding,receipt:reversed,lease})
 assert.equal(r.refundRecorded,true);assert.equal(r.paymentRecorded,false);assert.equal(r.leaseReleased,true)
 await w.recordVerifiedReversal({binding,receipt:{...reversed,refundKind:'partially_refunded'},lease})
 assert.equal(calls.length,1);assert.equal(calls[0].n,'leasedRefund')
})
