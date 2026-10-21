import test from 'node:test'
import assert from 'node:assert/strict'
import {auditF16P05ProspectiveEvidence as audit} from '../../../../supabase/functions/f16-paypal-webhook/p05ProspectiveEvidenceContractLab.mjs'

const plan='P-14V25407JP6850922NLHMDKI'
const contract=()=>({
 schemaVersion:1,environment:'sandbox',subscriptionId:'I-PROSPECTIVE123',
 intentId:'intent-private-123',planId:plan,source:'MERCHANT_PLAN_AND_SUBSCRIPTION_GET',
 capturedAt:'2026-10-15T02:00:00Z',monthlyPriceMinor:299,currency:'USD',
 quantity:1,planOverridden:false,setupFeeMinor:0,billingFrequency:'MONTH_1',
 billingStartTime:'2026-10-15T02:03:31Z',
})
const activation=()=>({
 subscriptionId:'I-PROSPECTIVE123',intentId:'intent-private-123',planId:plan,
 source:'SIGNED_ACTIVATION_EVENT_AND_MERCHANT_GET',eventId:'WH-ACTIVATE123',
 eventType:'BILLING.SUBSCRIPTION.ACTIVATED',capturedAt:'2026-10-15T03:20:38Z',
 eventCreatedAt:'2026-10-15T03:20:37Z',
 nextBillingTime:'2026-11-14T10:00:00Z',
})
const sale=(id='SALE-ABC123')=>({
 subscriptionId:'I-PROSPECTIVE123',saleId:id,webhookEventId:'WH-SALE123',
 time:'2026-10-15T03:20:33Z',amountMinor:299,currency:'USD',
 status:'COMPLETED',source:'MERCHANT_GET_AND_SIGNED_SALE_EVENT',
})
const cycle=(id='SALE-ABC123',key='I-PRIVATE:2026-10')=>({
 saleId:id,cycleKey:key,start:'2026-10-15T10:00:00Z',
 end:'2026-11-14T10:00:00Z',allocationKind:'regular',
 originProof:'provider_cycle_reference',
})
const financial=()=>({refunds:'clear',disputes:'clear',
 transactionsWindowComplete:true,historicalCoverageAttested:true})
const fixture=()=>({contract:contract(),activation:activation(),
 sales:[sale()],proposedCycles:[cycle()],financialReview:financial()})
const safe=result=>{
 assert.equal(result.cycleAttributionConfirmed,false)
 assert.equal(result.cycleVerified,false)
 assert.equal(result.mayRecordPayment,false)
 assert.equal(result.mayCreatePaidPeriod,false)
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.mayCountCommemorativeMonth,false)
 assert.equal(result.mayChangeBilling,false)
 assert.equal(result.periodStart,null)
 assert.equal(result.periodEnd,null)
 assert.equal(result.paidThrough,null)
 assert.equal(result.dbWrites,0)
 assert.equal(result.networkPaymentWrites,0)
 assert.equal(result.globalFinancialCoverage,false)
 const s=JSON.stringify(result)
 for(const item of ['I-PROSPECTIVE123','intent-private-123','SALE-ABC123','WH-ACTIVATE123',
  'WH-SALE123','2026-11-14T10:00:00Z','P-14V25407JP6850922NLHMDKI'])
  assert.equal(s.includes(item),false,'no private refs/dates in result')
}
const run=fn=>{const f=fixture();fn?.(f);const r=audit(f);safe(r);return r}
test('even a fully consistent asserted chain is candidate ONLY, never paid period',()=>{
 const r=run()
 assert.equal(r.phase,'CANDIDATE_ONLY')
 assert.equal(r.sourceValidationRequired,true)
 assert.equal(r.capturedHistoricalNextBillingDate,true)
 assert.equal(r.candidateCount,1)
})
test('missing original contract, wrong version and foreign production data fail closed',()=>{
 for(const fn of [
  f=>delete f.contract,
  f=>f.contract.schemaVersion=2,
  f=>f.contract.environment='live',
  f=>f.contract.subscriptionId='I-FOREIGN',
  f=>f.contract.source='BROWSER_POST',
  f=>f.contract.billingFrequency='DAY_30',
 ])assert.equal(run(fn).phase,'REVIEW_REQUIRED')
})
test('contract requires explicit zero setup fee, plan/price match, no override',()=>{
 for(const fn of [
  f=>f.contract.setupFeeMinor=null,
  f=>f.contract.setupFeeMinor=10,
  f=>f.contract.planOverridden=true,
  f=>f.contract.monthlyPriceMinor=598,
  f=>f.contract.quantity=2,
 ])assert.equal(run(fn).phase,'REVIEW_REQUIRED')
 assert.equal(run(f=>f.contract.setupFeeMinor=null).reason,'setup_fee_unverified_not_zero')
})
test('rejects foreign activation, wrong event, missing/malformed billing calendar',()=>{
 for(const fn of [
  f=>f.activation.intentId='intent-foreign',
  f=>f.activation.subscriptionId='I-FOREIGN',
  f=>f.activation.eventType='BILLING.SUBSCRIPTION.CANCELLED',
  f=>f.activation.source='SELF_REPORTED',
  f=>f.activation.eventCreatedAt='2026-10-16T03:20:37Z',
  f=>f.activation.nextBillingTime='2026-02-30T10:00:00Z',
 ])assert.equal(run(fn).phase,'REVIEW_REQUIRED')
})
test('missing next date remains candidate (not proof); never infer billing end',()=>{
 const r=run(f=>f.activation.nextBillingTime=null)
 assert.equal(r.phase,'CANDIDATE_ONLY')
 assert.equal(r.capturedHistoricalNextBillingDate,false)
})
test('no sale, no proposed cycle, or too many rows stay review',()=>{
 for(const fn of [
  f=>f.sales=[],
  f=>f.proposedCycles=[],
  f=>f.sales=Array.from({length:25},(_,i)=>sale('SALE-'+i)),
 ])assert.equal(run(fn).phase,'REVIEW_REQUIRED')
})
test('rejects wrong sale state, amount, source, subscription or duplicates',()=>{
 for(const fn of [
  f=>f.sales[0].status='PENDING',
  f=>f.sales[0].amountMinor=598,
  f=>f.sales[0].source='BROWSER',
  f=>f.sales[0].subscriptionId='I-OTHER',
  f=>f.sales.push({...f.sales[0]}),
 ])assert.equal(run(fn).phase,'REVIEW_REQUIRED')
})
test('rejects duplicate cycle key and multiple cycles for one sale',()=>{
 let r=run(f=>{
  f.sales.push(sale('SALE-DEF123'))
  f.proposedCycles.push(cycle('SALE-DEF123','I-PRIVATE:2026-10'))
 })
 assert.equal(r.reason,'duplicate_cycle_key')
 r=run(f=>f.proposedCycles.push(cycle('SALE-ABC123','I-PRIVATE:2026-11')))
 assert.equal(r.reason,'sale_claimed_by_multiple_cycles')
})
test('rejects cycles assigned to non-merchant sales and unallocated merchant sales',()=>{
 assert.equal(run(f=>f.proposedCycles[0].saleId='SALE-NOT-FOUND').reason,
  'cycle_sale_not_in_merchant_evidence')
 assert.equal(run(f=>f.sales.push(sale('SALE-OTHER123'))).reason,
  'unallocated_sales_require_review')
})
test('rejects overlapping and nested proposed periods',()=>{
 for(const p of [
  ['2026-10-31T00:00:00Z','2026-12-01T00:00:00Z'],
  ['2026-10-16T00:00:00Z','2026-11-01T00:00:00Z'],
 ]){
  const r=run(f=>{
   f.sales.push(sale('SALE-DEF123'))
   f.proposedCycles.push(cycle('SALE-DEF123','I-PRIVATE:2026-11'))
   f.proposedCycles[1].start=p[0]
   f.proposedCycles[1].end=p[1]
  })
  assert.equal(r.reason,'overlapping_cycle_candidates')
 }
})
test('contiguous proposals do not automatically extend paid coverage',()=>{
 const r=run(f=>{
  f.sales.push(sale('SALE-DEF123'))
  f.proposedCycles.push(cycle('SALE-DEF123','I-PRIVATE:2026-11'))
  f.proposedCycles[1].start=f.proposedCycles[0].end
  f.proposedCycles[1].end='2026-12-14T10:00:00Z'
 })
 assert.equal(r.phase,'CANDIDATE_ONLY')
 assert.equal(r.paidThrough,null)
})
test('late, retry, debt or unknown allocation never passes normal attribution',()=>{
 for(const k of ['retry','outstanding_capture','unknown']){
  const r=run(f=>f.proposedCycles[0].allocationKind=k)
  assert.equal(r.reason,'late_or_recovered_sale_requires_independent_original_cycle_proof')
 }
})
test('schedule-only/unproven origin is not a settlement cycle reference',()=>{
 for(const kind of ['contractual_schedule_only','unproven'])
  assert.equal(run(f=>f.proposedCycles[0].originProof=kind).reason,
   'sale_to_cycle_provider_reference_missing')
})
test('refund/dispute, incomplete financial windows and absent attestations fail',()=>{
 for(const fn of [
  f=>f.financialReview.refunds='unknown',
  f=>f.financialReview.refunds='open',
  f=>f.financialReview.disputes='open',
  f=>f.financialReview.disputes='unknown',
  f=>f.financialReview.transactionsWindowComplete=false,
  f=>f.financialReview.historicalCoverageAttested=false,
 ])assert.equal(run(fn).phase,'REVIEW_REQUIRED')
})
test('rejects PII and unexpected untrusted fields from every record',()=>{
 for(const fn of [
  f=>f.contract.payerEmail='private@example.com',
  f=>f.activation.authToken='PRIVATE',
  f=>f.sales[0].payerEmail='private@example.com',
  f=>f.proposedCycles[0].ownerId='PRIVATE',
  f=>f.financialReview.notes='PRIVATE',
 ])assert.equal(run(fn).phase,'REVIEW_REQUIRED')
})
test('calendar end-of-month and leap-day proposals remain mere candidates',()=>{
 for(const [start,end] of [
  ['2028-01-31T00:00:00Z','2028-02-29T00:00:00Z'],
  ['2027-01-31T00:00:00Z','2027-02-28T00:00:00Z'],
  ['2028-02-29T00:00:00Z','2028-03-31T00:00:00Z'],
  ['2028-03-31T00:00:00Z','2028-04-30T00:00:00Z'],
 ]){
  const r=run(f=>{f.proposedCycles[0].start=start;f.proposedCycles[0].end=end})
  assert.equal(r.phase,'CANDIDATE_ONLY')
 }
 assert.equal(run(f=>f.proposedCycles[0].end='2027-02-29T00:00:00Z').phase,'REVIEW_REQUIRED')
})
test('120 adversarial refund, sale status, and allocation combinations never grant',()=>{
 let count=0
 for(const status of ['COMPLETED','PENDING','REFUNDED','FAILED','UNKNOWN'])
  for(const amount of [299,598])
   for(const k of ['regular','retry','outstanding_capture','unknown'])
    for(const refund of ['clear','unknown','open']){
     run(f=>{f.sales[0].status=status;f.sales[0].amountMinor=amount;
      f.proposedCycles[0].allocationKind=k;f.financialReview.refunds=refund})
     count++
    }
 assert.equal(count,120)
})
