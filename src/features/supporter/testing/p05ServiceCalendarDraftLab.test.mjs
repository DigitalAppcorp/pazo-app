import test from 'node:test'
import assert from 'node:assert/strict'
import {calculateP05DraftUtcWindow as window,
 assessP05DraftCalendar as audit} from './p05ServiceCalendarDraftLab.mjs'

const policy=(anchorUtc='2026-10-10T10:00:00Z')=>({
 version:1,cadence:'MONTH_1',currency:'USD',priceMinor:299,setupFeeMinor:0,
 timezone:'UTC',anchorUtc,monthEndRule:'CLAMP_RETURN_TO_ANCHOR_DAY',
 origin:'PROPOSED_PAZO_TERMS_AND_PROVIDER_ANCHOR',
})
const args=()=>({
 policy:policy(),cycleIndex:0,observedProviderNextBillingUtc:'2026-11-10T10:00:00Z',
 allocationKind:'regular',refundStatus:'clear',disputeStatus:'clear',
})
const noGrant=x=>{
 assert.equal(x.needsManualReview,true)
 assert.equal(x.cycleVerified,false)
 assert.equal(x.cycleAttributionConfirmed,false)
 assert.equal(x.periodStart,null)
 assert.equal(x.periodEnd,null)
 assert.equal(x.paidThrough,null)
 assert.equal(x.mayRecordPayment,false)
 assert.equal(x.mayCreatePaidPeriod,false)
 assert.equal(x.mayGrantBenefits,false)
 assert.equal(x.mayCountCommemorativeMonth,false)
 assert.equal(x.mayChangeBilling,false)
 assert.equal(x.dbWrites,0)
 assert.equal(x.networkPaymentWrites,0)
 assert.equal(x.financialHistoryComplete,false)
 assert.equal(JSON.stringify(x).includes('2026-11-10T10:00:00Z'),false)
}
const check=fn=>{const a=args();fn?.(a);const x=audit(a);noGrant(x);return x}
test('approved model candidate only, even if provider schedule matches exact draft',()=>{
 const x=check()
 assert.equal(x.phase,'CALENDAR_CANDIDATE_ONLY')
 assert.equal(x.scheduleRelation,'match')
 assert.equal(x.verifiedSaleToCycleAllocation,false)
 assert.equal(x.requiresMerchantSaleAndCycleAttestation,true)
 assert.equal(x.requiresIndependentContractAcceptance,true)
})
test('UTC monthly anniversary is calendar-month not +30 days',()=>{
 const p=policy()
 assert.deepEqual(window(p,0),{
  start:'2026-10-10T10:00:00Z',end:'2026-11-10T10:00:00Z'})
 assert.deepEqual(window(p,1),{
  start:'2026-11-10T10:00:00Z',end:'2026-12-10T10:00:00Z'})
})
test('31 Jan keeps the original 31 anchor after February instead of drifting',()=>{
 const p=policy('2027-01-31T12:00:00Z')
 assert.deepEqual(window(p,0),{start:'2027-01-31T12:00:00Z',
  end:'2027-02-28T12:00:00Z'})
 assert.deepEqual(window(p,1),{start:'2027-02-28T12:00:00Z',
  end:'2027-03-31T12:00:00Z'})
 assert.deepEqual(window(p,2),{start:'2027-03-31T12:00:00Z',
  end:'2027-04-30T12:00:00Z'})
})
test('Leap year and 29th-30th month days use clamp and re-anchor',()=>{
 const cases=[
  ['2028-01-31T09:00:00Z','2028-02-29T09:00:00Z','2028-03-31T09:00:00Z'],
  ['2028-01-30T09:00:00Z','2028-02-29T09:00:00Z','2028-03-30T09:00:00Z'],
  ['2027-01-29T09:00:00Z','2027-02-28T09:00:00Z','2027-03-29T09:00:00Z'],
  ['2028-02-29T09:00:00Z','2028-03-29T09:00:00Z','2028-04-29T09:00:00Z'],
 ]
 for(const [anchor,end,second] of cases){
  const p=policy(anchor)
  assert.equal(window(p,0)?.end,end)
  assert.equal(window(p,1)?.end,second)
 }
})
test('March 8 local DST does not shift UTC clock in this proposed UTC policy',()=>{
 const p=policy('2026-02-08T10:00:00Z')
 assert.equal(window(p,0)?.end,'2026-03-08T10:00:00Z')
 assert.equal(window(p,1)?.end,'2026-04-08T10:00:00Z')
})
test('provider schedule mismatch detected rather than overriding PayPal or creating an extra month',()=>{
 const x=check(a=>{
  a.policy=policy('2026-10-15T02:03:31Z')
  a.observedProviderNextBillingUtc='2026-11-14T10:00:00Z'
 })
 assert.equal(x.phase,'REVIEW_REQUIRED')
 assert.equal(x.reason,'provider_billing_schedule_differs_from_draft')
 assert.equal(x.scheduleRelation,'mismatch')
})
test('provider date missing or invalid does not turn into paid date',()=>{
 const missing=check(a=>a.observedProviderNextBillingUtc=null)
 assert.equal(missing.reason,'provider_billing_schedule_not_observed')
 for(const value of ['2026-02-30T10:00:00Z','2026-11-10T10:00:00+00:00',
  '',undefined,'2026-11-10T25:00:00Z']){
  const x=check(a=>a.observedProviderNextBillingUtc=value)
  assert.equal(x.reason,'provider_next_billing_timestamp_invalid')
 }
})
test('retry, recovered debts and unknown payment allocation need historical proof',()=>{
 for(const kind of ['retry','outstanding_capture','unknown']){
  const x=check(a=>a.allocationKind=kind)
  assert.equal(x.reason,'late_or_unknown_payment_requires_original_cycle_evidence')
 }
})
test('refunds and disputes unresolved block a calendar candidate',()=>{
 for(const status of ['unknown','open']){
  assert.equal(check(a=>a.refundStatus=status).reason,
   'financial_reversal_or_unknown_requires_review')
  assert.equal(check(a=>a.disputeStatus=status).reason,
   'financial_reversal_or_unknown_requires_review')
 }
})
test('rejects unapproved timezone, cadence, pricing, fees, timezone rules',()=>{
 const mutations=[
  a=>a.policy.timezone='America/Los_Angeles',
  a=>a.policy.cadence='DAY_30',
  a=>a.policy.priceMinor=598,
  a=>a.policy.setupFeeMinor=null,
  a=>a.policy.monthEndRule='ADD_30_DAYS',
  a=>a.policy.origin='PAYPAL_GUARANTEED',
  a=>a.policy.billingAnchorSource='browser',
  a=>a.policy.version=2,
 ]
 for(const fn of mutations){
  const x=check(fn)
  assert.equal(x.reason,'draft_terms_missing_or_unsupported')
 }
})
test('invalid Gregorian days are rejected and no rollover silently accepted',()=>{
 for(const timestamp of ['2027-02-29T10:00:00Z','2028-02-30T10:00:00Z',
  '2026-04-31T10:00:00Z','2026-10-32T10:00:00Z',
  '2026-10-10T10:00:00.000Z']){
  assert.equal(window(policy(timestamp),0),null)
 }
})
test('cycle ordinal guard and late-year limits fail closed',()=>{
 const p=policy()
 for(const index of [-1,240,1.5,'1',null,NaN])
  assert.equal(window(p,index),null)
 const future=policy('2100-12-31T10:00:00Z')
 assert.equal(window(future,0),null)
})
test('monthly windows contiguous and strictly forward over 100 cycles',()=>{
 const p=policy('2028-01-31T18:31:20Z')
 let prev=null
 for(let i=0;i<100;i++){
  const c=window(p,i)
  assert.ok(c)
  assert.ok(Date.parse(c.start)<Date.parse(c.end))
  if(prev)assert.equal(prev.end,c.start)
  prev=c
 }
})
test('every payment state and refund/dispute matrix never grants benefits',()=>{
 let count=0
 for(const kind of ['regular','retry','outstanding_capture','unknown'])
  for(const refundStatus of ['clear','open','unknown'])
   for(const disputeStatus of ['clear','open','unknown'])
    for(const date of ['2026-11-10T10:00:00Z',null,'2026-11-09T10:00:00Z']){
     check(a=>Object.assign(a,{allocationKind:kind,refundStatus,disputeStatus,
      observedProviderNextBillingUtc:date}))
     count++
    }
 assert.equal(count,108)
})
