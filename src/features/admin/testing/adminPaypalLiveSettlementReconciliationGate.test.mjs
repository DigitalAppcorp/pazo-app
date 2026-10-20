import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveSettlementReconciliationGate}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveSettlementReconciliationGate.mjs'
import {createPazoLiveVerifiedSettlementWriter}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveVerifiedSettlementWriter.mjs'

const queueEventId='WH-VALID-123456'
const ownerId='12345678-1234-4234-8234-123456789abc'
const subscriptionId='I-SUBSCRIPTION123456'
const saleId='SALE-123456789'
const intentId='intent-23456789-1234-4234-8234-123456789abc'
const start='2026-11-01T00:00:00.000Z',end='2026-12-01T00:00:00.000Z'
const event=Object.freeze({
 claimed:true,eventId:queueEventId,signatureVerified:true,
 sourceEnvironment:'live',provider:'paypal',
 eventType:'PAYMENT.SALE.COMPLETED',subscriptionId,saleId,
 merchantGeneration:7,searchStart:start,searchEnd:end
})
const binding=Object.freeze({
 provider:'paypal',sourceEnvironment:'live',ownerId,intentId,
 subscriptionId,merchantGeneration:7,ownerVerified:true,
 merchantGenerationVerified:true
})
const providerSale=Object.freeze({
 verified:true,sourceEnvironment:'live',
 merchantGeneration:7,subscriptionId,saleId,
 amountMinor:299,currency:'USD',paidAt:start,
 servicePeriodVerified:false,paidThrough:null
})
const period=Object.freeze({
 cycleKey:'CYCLE-2026-11',serviceStart:start,serviceEnd:end,
 providerPeriodVerified:true
})
function setup(over={}){
 const counts={claims:0,binds:0,provider:0,periods:0,writes:0}
 const writer=createPazoLiveVerifiedSettlementWriter({rpc:async()=>{
  counts.writes++
  return 'recorded'
 }})
 const gate=createPazoLiveSettlementReconciliationGate({
  released:true,
  claimVerifiedEvent:async()=>{counts.claims++;return event},
  findOriginalBinding:async()=>{counts.binds++;return binding},
  readerForGeneration:async()=>{
   counts.provider++
   return {readCompletedSale:async()=>providerSale}
  },
  proveOriginalServicePeriod:async()=>{
   counts.periods++
   return period
  },
  writer,...over
 })
 return {counts,gate}
}
test('unreleased coordinator rejects an event before reading queue or PayPal',async()=>{
 let calls=0
 const gate=createPazoLiveSettlementReconciliationGate({
  claimVerifiedEvent:async()=>{calls++}
 })
 const r=await gate({queueEventId})
 assert.equal(r.code,'live_reconciler_not_released')
 assert.equal(calls,0)
})
test('only claimed original merchant event with independently proven paid period records one sale',async()=>{
 const {gate,counts}=setup()
 const r=await gate({queueEventId})
 assert.equal(r.state,'RECORDED')
 assert.equal(r.entitlementGranted,false)
 assert.equal(r.paymentRecorded,true)
 assert.deepEqual(counts,{claims:1,binds:1,provider:1,periods:1,writes:1})
})
test('PayPal UTC timestamp without milliseconds remains valid; dates without provider proof do not',async()=>{
 const {gate,counts}=setup({
  readerForGeneration:async()=>({
   readCompletedSale:async()=>({...providerSale,paidAt:'2026-11-01T00:00:00Z'})
  })
 })
 const r=await gate({queueEventId})
 assert.equal(r.state,'RECORDED')
 assert.equal(counts.writes,1)
 for(const wrong of ['2026-11-01T00:00:00-05:00','2026-13-01T00:00:00Z']){
  const {gate:badGate,counts:badCounts}=setup({
   readerForGeneration:async()=>({
    readCompletedSale:async()=>({...providerSale,paidAt:wrong})
   })
  })
  const denied=await badGate({queueEventId})
  assert.equal(denied.code,'provider_completed_sale_not_proven')
  assert.equal(badCounts.writes,0)
 }
})
test('missing or invalid signed event never reads binding or payment provider',async()=>{
 const variations=[
  {...event,claimed:false},{...event,signatureVerified:false},
  {...event,merchantGeneration:8},{...event,eventType:'PAYMENT.SALE.REFUNDED'}
 ]
 for(const v of variations){
  // All event state stays internal; untrusted callers supply ONLY queue ID.
  const {gate,counts}=setup({claimVerifiedEvent:async()=>v})
  const r=await gate({queueEventId})
  if(v.merchantGeneration===8){
   assert.equal(r.state,'REVIEW_REQUIRED')
   assert.equal(counts.writes,0)
  }else{
   assert.equal(r.code,'verified_event_claim_not_proven')
   assert.equal(counts.binds,0)
   assert.equal(counts.writes,0)
  }
 }
})
test('provider payment without independent period cannot create a paid period',async()=>{
 const {gate,counts}=setup({
  proveOriginalServicePeriod:async()=>({...period,providerPeriodVerified:false})
 })
 const r=await gate({queueEventId})
 assert.equal(r.code,'independent_service_period_unverified')
 assert.equal(counts.writes,0)
})
test('unsigned original binding, wrong merchant and invalid PayPal amount block persistence',async()=>{
 const cases=[
  {findOriginalBinding:async()=>({...binding,merchantGeneration:8})},
  {findOriginalBinding:async()=>({...binding,ownerVerified:false})},
  {readerForGeneration:async()=>({
   readCompletedSale:async()=>({...providerSale,amountMinor:300})
  })}
 ]
 for(const x of cases){
  const {gate,counts}=setup(x)
  const r=await gate({queueEventId})
  assert.equal(r.state,'REVIEW_REQUIRED')
  assert.equal(r.entitlementGranted,false)
  assert.equal(counts.writes,0)
 }
})
test('original service period must be <=32 days and ISO rather than computed from billing cadence',async()=>{
 const {gate,counts}=setup({
  proveOriginalServicePeriod:async()=>({...period,serviceEnd:'2027-01-15T00:00:00.000Z'})
 })
 const r=await gate({queueEventId})
 assert.equal(r.code,'independent_service_period_unverified')
 assert.equal(counts.writes,0)
})
test('ambiguous writer error requires reconciliation, not a blind duplicate write',async()=>{
 const {gate}=setup({writer:{recordVerifiedSale:async()=>{
  throw Error('private_ledger_failure_456')
 }}})
 const r=await gate({queueEventId})
 assert.equal(r.code,'verified_ledger_write_outcome_unknown')
 assert.equal(JSON.stringify(r).includes('private_ledger_failure_456'),false)
})
