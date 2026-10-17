import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16P05HistoricalActivation as audit} from '../../../../supabase/functions/f16-paypal-webhook/f16P05HistoricalActivationEvidence.mjs'

const state=()=>({environment:'sandbox',recoveryPhase:'bound_verified',phase:'buyer_cancelled',
 subscriptionId:'I-SANDBOXTEST123',plan:'P-14V25407JP6850922NLHMDKI',intentId:'intent-private-01'})
const event=()=>({id:'WH-TEST123',event_type:'BILLING.SUBSCRIPTION.ACTIVATED',
 create_time:'2026-10-15T03:20:00Z',
 resource:{id:'I-SANDBOXTEST123',plan_id:'P-14V25407JP6850922NLHMDKI',
  custom_id:'intent-private-01',status:'ACTIVE',start_time:'2026-10-15T02:03:31Z',
  billing_info:{next_billing_time:'2026-11-15T03:20:00Z'},
  subscriber:{email_address:'secret@example.com'}}})
const run=(override={})=>audit({state:state(),event:event(),eventId:'WH-TEST123',...override})
test('provider historical date stays CANDIDATE only and never becomes paidThrough',()=>{
 const v=run()
 assert.equal(v.phase,'HISTORICAL_SCHEDULE_CANDIDATE')
 assert.equal(v.observedNextBillingTime,'2026-11-15T03:20:00Z')
 assert.equal(v.saleCycleAllocationVerified,false)
 assert.equal(v.cycleVerified,false)
 assert.equal(v.periodStart,null)
 assert.equal(v.periodEnd,null)
 assert.equal(v.paidThrough,null)
 assert.equal(v.mayGrantBenefits,false)
})
test('missing or stale next billing timestamp is inconclusive',()=>{
 const e=event();delete e.resource.billing_info
 assert.equal(run({event:e}).phase,'INCONCLUSIVE')
 const stale=event();stale.resource.billing_info.next_billing_time='2026-10-14T03:20:00Z'
 assert.equal(run({event:stale}).phase,'INCONCLUSIVE')
})
test('mismatched event, subscription, plan, intent is rejected',()=>{
 const mismatch=[
  e=>e.id='WH-OTHER',
  e=>e.event_type='PAYMENT.SALE.COMPLETED',
  e=>e.resource.id='I-OTHER',
  e=>e.resource.plan_id='P-OTHER',
  e=>e.resource.custom_id='another-private-intent',
 ]
 for(const change of mismatch){const e=event();change(e);assert.equal(run({event:e}).phase,'MISMATCH')}
})
test('prevents use with nonexistent cancelled bound subscription',()=>{
 const s=state();s.phase='buyer_approved_active'
 assert.equal(run({state:s}).phase,'BLOCKED')
})
test('projection never returns private identifiers or user data',()=>{
 const v=JSON.stringify(run())
 for(const secret of ['WH-TEST123','I-SANDBOXTEST123','P-14V25407JP6850922NLHMDKI',
  'intent-private-01','secret@example.com'])assert.equal(v.includes(secret),false)
})
