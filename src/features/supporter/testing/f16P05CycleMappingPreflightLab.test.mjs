import test from 'node:test'
import assert from 'node:assert/strict'
import {auditF16P05ProposedCycleMapping} from '../../../../supabase/functions/f16-paypal-webhook/p05CycleMappingPreflightLab.mjs'

const facts={factsConsistent:true,coverageReady:false,needsCycleAttribution:true}
const risks={cycleVerified:false,mayGrantBenefits:false,needsCycleAttribution:true}
const sale=id=>({saleId:id,amountMinor:299,state:'completed'})
const cycle=(key,id,start,end,kind='regular',proof='provider_cycle_reference')=>({
 cycleKey:key,saleId:id,start,end,allocationKind:kind,originProof:proof,
})
const original=()=>({
 billingFacts:facts,riskAssessment:risks,
 observedSales:[sale('SALE-MONTH-A'),sale('SALE-MONTH-B')],
 proposedMappings:[
  cycle('I-PAZO:2026-09','SALE-MONTH-A','2026-09-01T00:00:00Z','2026-10-01T00:00:00Z'),
  cycle('I-PAZO:2026-10','SALE-MONTH-B','2026-10-01T00:00:00Z','2026-11-01T00:00:00Z'),
 ],
})
const check=(mutate)=>{const x=original();mutate?.(x);return auditF16P05ProposedCycleMapping(x)}
const safe=x=>{
 assert.equal(x.needsManualReview,true)
 assert.equal(x.cycleAttributionConfirmed,false)
 assert.equal(x.mayCreatePaidPeriod,false)
 assert.equal(x.mayGrantBenefits,false)
 assert.equal(x.mayCountCommemorativeMonth,false)
 assert.equal(x.mayRevokeBenefits,false)
 assert.equal(x.mayChangeBilling,false)
 assert.equal(x.entitlement,false)
 assert.equal(x.paidThrough,null)
 assert.equal(x.periodStart,null)
 assert.equal(x.periodEnd,null)
 assert.equal(JSON.stringify(x).includes('SALE-MONTH'),false)
 assert.equal(JSON.stringify(x).includes('I-PAZO'),false)
}
test('P05 even distinct, contiguous, fully evidenced proposals do not authorize coverage',()=>{
 const x=check();safe(x)
 assert.equal(x.reason,'cycle_proposals_consistent_not_authorized')
 assert.equal(x.candidateCount,2)
})
test('P05 reusing sale across periods is rejected regardless of valid dates',()=>{
 const x=check(p=>p.proposedMappings[1].saleId='SALE-MONTH-A')
 safe(x);assert.equal(x.reason,'same_sale_claimed_by_multiple_cycles')
})
test('P05 two separate sales assigned to one period are never two months',()=>{
 const x=check(p=>p.proposedMappings[1].cycleKey=p.proposedMappings[0].cycleKey)
 safe(x);assert.equal(x.reason,'same_cycle_claimed_by_multiple_sales')
})
test('P05 a recovered payment from prior cycle stays under manual review',()=>{
 for(const kind of ['retry','outstanding_capture','unknown']){
  const x=check(p=>p.proposedMappings[1].allocationKind=kind)
  safe(x);assert.equal(x.reason,'recovered_payment_requires_verified_original_cycle')
  assert.equal(x.nonregularCount,1)
 }
})
test('P05 monthly calendar boundaries are not guessed from payment timestamps',()=>{
 const x=check(p=>{
  p.proposedMappings[0].start='2026-01-31T00:00:00Z'
  p.proposedMappings[0].end='2026-02-28T00:00:00Z'
  p.proposedMappings[1].start='2026-02-28T00:00:00Z'
  p.proposedMappings[1].end='2026-03-31T00:00:00Z'
 })
 safe(x)
 assert.equal(x.reason,'cycle_proposals_consistent_not_authorized')
})
test('P05 overlapping and nested proposals rejected even with distinct sale IDs',()=>{
 for(const periods of [
  [['2026-09-01T00:00:00Z','2026-10-10T00:00:00Z'],
   ['2026-10-01T00:00:00Z','2026-11-01T00:00:00Z']],
  [['2026-09-01T00:00:00Z','2026-12-01T00:00:00Z'],
   ['2026-10-01T00:00:00Z','2026-11-01T00:00:00Z']],
 ]){
  const x=check(p=>{
   for(let i=0;i<2;i++){
    p.proposedMappings[i].start=periods[i][0]
    p.proposedMappings[i].end=periods[i][1]
   }
  })
  safe(x);assert.equal(x.reason,'overlapping_candidate_cycle_intervals')
 }
})
test('P05 refund, pending, missing sale or wrong amount cannot settle a cycle',()=>{
 for(const mutation of [
  p=>p.observedSales[0].state='refunded',
  p=>p.observedSales[0].state='pending',
  p=>p.observedSales[0].amountMinor=598,
  p=>p.observedSales.shift(),
 ]){
  const x=check(mutation)
  safe(x);assert.equal(x.reason,'sale_or_cycle_origin_evidence_missing')
 }
})
test('P05 a missing merchant-linked cycle origin cannot be compensated by dates',()=>{
 for(const origin of ['contractual_schedule_only','unproven']){
  const x=check(p=>p.proposedMappings[0].originProof=origin)
  safe(x);assert.equal(x.reason,'sale_or_cycle_origin_evidence_missing')
 }
})
test('P05 extra payments in the window cannot silently accrue free months',()=>{
 const x=check(p=>p.observedSales.push(sale('SALE-UNMAPPED-C')))
 safe(x);assert.equal(x.reason,'unmapped_sales_require_review')
 assert.equal(x.unmappedSaleCount,1)
})
test('P05 repeated, malformed and excessively large provider results fail closed',()=>{
 for(const mutate of [
  p=>p.observedSales.push({...p.observedSales[0]}),
  p=>p.proposedMappings[0].cycleKey='../../user-data',
  p=>p.proposedMappings[0].end='2026-02-30T00:00:00Z',
  p=>p.proposedMappings[0].end=p.proposedMappings[0].start,
  p=>p.proposedMappings[0].originProof='browser_verified',
  p=>p.observedSales[0].payerEmail='payer@example.com',
  p=>p.proposedMappings[0].ownerEmail='payer@example.com',
  p=>p.proposedMappings=Array.from({length:101},(_,i)=>({...p.proposedMappings[0],cycleKey:'X-'+i})),
  p=>p.observedSales=Array.from({length:101},(_,i)=>sale('SALE-'+i)),
 ]){
  const x=check(mutate)
  safe(x);assert.notEqual(x.reason,'cycle_proposals_consistent_not_authorized')
  assert.equal(JSON.stringify(x).includes('payer@example.com'),false)
 }
})
test('P05 without fully private reconciled prior evidence never accepts mapping',()=>{
 for(const mutate of [
  p=>p.billingFacts=null,
  p=>p.billingFacts={...facts,factsConsistent:false},
  p=>p.billingFacts={...facts,coverageReady:true},
  p=>p.riskAssessment={...risks,cycleVerified:true},
  p=>p.riskAssessment={...risks,mayGrantBenefits:true},
  p=>p.riskAssessment=undefined,
 ]){
  const x=check(mutate)
  safe(x);assert.equal(x.reason,'prior_merchant_or_cycle_review_incomplete')
 }
})
test('P05 cannot grant benefits across a matrix of recovered and missing origin states',()=>{
 let n=0
 for(const state of ['completed','pending','failed','refunded','unknown'])
  for(const kind of ['regular','retry','outstanding_capture','unknown'])
   for(const origin of ['provider_cycle_reference','contractual_schedule_only','unproven'])
    for(const amountMinor of [299,598]){
     const x=check(p=>{
      p.observedSales[1].state=state
      p.observedSales[1].amountMinor=amountMinor
      p.proposedMappings[1].allocationKind=kind
      p.proposedMappings[1].originProof=origin
     })
     safe(x)
     n++
    }
 assert.equal(n,120)
})
