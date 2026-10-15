import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP05LocalCalendarInterpretation as audit} from './p05LocalCalendarInterpretationLab.mjs'
const data=()=>({
 subscriptionStartUtc:'2026-10-15T02:03:31Z',
 saleCompletedUtc:'2026-10-15T03:20:33Z',
 activationUtc:'2026-10-15T03:20:37.957Z',
 observedNextBillingUtc:'2026-11-14T10:00:00Z',
 sourceSubscriptionCreateSetStartTime:false,
})
const safe=r=>{
 assert.equal(r.cycleVerified,false)
 assert.equal(r.cycleAttributionConfirmed,false)
 assert.equal(r.providerTimeZoneVerified,false)
 assert.equal(r.saleToCycleVerified,false)
 assert.equal(r.periodStart,null)
 assert.equal(r.periodEnd,null)
 assert.equal(r.paidThrough,null)
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayCreatePaidPeriod,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayCountCommemorativeMonth,false)
 assert.equal(r.dbWrites,0)
 assert.equal(r.networkPaymentWrites,0)
 assert.equal(r.financialHistoryComplete,false)
 assert.equal(JSON.stringify(r).includes('2026-11-14T10:00:00Z'),false)
}
const check=mutate=>{const d=data();mutate?.(d);const r=audit(d);safe(r);return r}
test('real sandbox dates align by LA calendar day 14, not UTC, but prove NO cycle',()=>{
 const r=check()
 assert.equal(r.phase,'DATE_PATTERN_CANDIDATE_ONLY')
 assert.equal(r.localFollowingMonthSameDay,true)
 assert.equal(r.utcFollowingMonthSameDay,false)
 assert.equal(r.localClockTimeMatches,false)
 assert.equal(r.timezoneOffsetChanged,true)
 assert.equal(r.sourceSubscriptionCreateSetStartTime,false)
 assert.equal(r.independentProviderBillingAnchorStillRequired,true)
})
test('a one-month equality in UTC is still not payment proof',()=>{
 const r=check(d=>d.observedNextBillingUtc='2026-11-15T10:03:31Z')
 assert.equal(r.phase,'DATE_PATTERN_CANDIDATE_ONLY')
 assert.equal(r.utcFollowingMonthSameDay,true)
 assert.equal(r.localFollowingMonthSameDay,false)
})
test('if zone calendar dates differ, do not normalize or fabricate alignment',()=>{
 const r=check(d=>d.observedNextBillingUtc='2026-11-16T10:00:00Z')
 assert.equal(r.localFollowingMonthSameDay,false)
 assert.equal(r.utcFollowingMonthSameDay,false)
})
test('future time, source start_time explicitly provided still cannot prove billing',()=>{
 const r=check(d=>d.sourceSubscriptionCreateSetStartTime=true)
 assert.equal(r.phase,'DATE_PATTERN_CANDIDATE_ONLY')
 assert.equal(r.providerTimeZoneVerified,false)
 assert.equal(r.saleToCycleVerified,false)
})
test('event chronology violations fail closed',()=>{
 for(const mutate of [
  d=>d.saleCompletedUtc='2026-10-15T00:00:00Z',
  d=>d.activationUtc='2026-10-15T01:20:00Z',
  d=>d.observedNextBillingUtc='2026-10-14T10:00:00Z',
 ])assert.equal(check(mutate).phase,'INCONCLUSIVE')
})
test('invalid Gregorian dates, other zones and extra PII cannot pass',()=>{
 for(const mutate of [
  d=>d.subscriptionStartUtc='2026-02-30T02:03:31Z',
  d=>d.observedNextBillingUtc='2026-11-14T02:00:00-08:00',
  d=>d.activationUtc='2026-10-15T25:20:37Z',
  d=>d.sourceSubscriptionCreateSetStartTime='unknown',
  d=>d.payerEmail='secret@example.com',
  d=>d.paypalZone='America/Los_Angeles',
 ])assert.equal(check(mutate).phase,'INCONCLUSIVE')
})
test('end-of-month across DST only returns date pattern, never the subscription service interval',()=>{
 const r=check(d=>{
  d.subscriptionStartUtc='2027-01-31T20:00:00Z'
  d.saleCompletedUtc='2027-01-31T20:01:00Z'
  d.activationUtc='2027-01-31T20:01:30Z'
  d.observedNextBillingUtc='2027-02-28T20:00:00Z'
 })
 assert.equal(r.phase,'DATE_PATTERN_CANDIDATE_ONLY')
 assert.equal(r.localFollowingMonthSameDay,false)
})
test('even same local clock/day without DST is only a candidate',()=>{
 const r=check(d=>{
  d.subscriptionStartUtc='2027-01-14T20:00:00Z'
  d.saleCompletedUtc='2027-01-14T20:01:00Z'
  d.activationUtc='2027-01-14T20:01:30Z'
  d.observedNextBillingUtc='2027-02-14T20:00:00Z'
 })
 assert.equal(r.localFollowingMonthSameDay,true)
 assert.equal(r.localClockTimeMatches,true)
 assert.equal(r.timezoneOffsetChanged,false)
 assert.equal(r.cycleVerified,false)
})
