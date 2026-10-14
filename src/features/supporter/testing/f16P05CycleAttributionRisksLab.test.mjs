import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16P05CycleAttributionRisks} from '../../../../supabase/functions/f16-paypal-webhook/p05CycleAttributionRisksLab.mjs'
import {assessF16P05BillingFacts} from '../../../../supabase/functions/f16-paypal-webhook/p05BillingEvidenceLab.mjs'

const PLAN='P-14V25407JP6850922NLHMDKI'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const SUB='I-PAZO-P05-RISK123',SALE='SALE-PAZO-P05-RISK123'
const INTENT='intent-p05-risk-123'
const money=value=>({currency_code:'USD',value})
const source=()=>({
 environment:'sandbox',merchantScopedByPayPalApi:true,
 planScopedByPayPalApi:true,lookupSubscriptionId:SUB,
 intent:{id:INTENT,ownerId:OWNER,provider:'paypal',state:'bound',
  verifiedOwnerBinding:true,planId:PLAN,externalSubscriptionId:SUB},
 subscription:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE',
  start_time:'2026-10-01T19:00:00Z',
  billing_info:{last_payment:{time:'2026-10-13T19:00:00Z',amount:money('2.99')},
   next_billing_time:'2026-11-01T19:00:00Z',
   outstanding_balance:money('0.00'),failed_payments_count:0,
   cycle_executions:[{tenure_type:'REGULAR',cycles_completed:1}]}},
 plan:{id:PLAN,status:'ACTIVE',
  billing_cycles:[{tenure_type:'REGULAR',frequency:{interval_unit:'MONTH',interval_count:1},
   pricing_scheme:{fixed_price:money('2.99')}}],
  payment_preferences:{auto_bill_outstanding:true}},
 transactions:[{id:SALE,status:'COMPLETED',time:'2026-10-13T19:00:00Z',
  amount_with_breakdown:{gross_amount:money('2.99')}}],
 originalSale:{id:SALE,subscriptionId:SUB,verifiedByMerchantApi:true,
  state:'completed',grossMinorUnits:299,currency:'USD',
  completedAt:'2026-10-13T19:00:00Z'},
})
function examine(fix) {
 const s=source()
 fix?.(s)
 return assessF16P05CycleAttributionRisks({
  billingFacts:assessF16P05BillingFacts(s),
  subscription:s.subscription,plan:s.plan,transactions:s.transactions})
}
function safe(x){
 assert.equal(x.needsCycleAttribution,true)
 assert.equal(x.cycleVerified,false)
 assert.equal(x.mayCreatePaidPeriod,false)
 assert.equal(x.mayGrantBenefits,false)
 assert.equal(x.mayCountCommemorativeMonth,false)
 assert.equal(x.mayChangeBilling,false)
 assert.equal(x.entitlement,false)
 assert.equal(x.paidThrough,null)
 assert.equal(x.periodStart,null)
 assert.equal(x.periodEnd,null)
 assert.equal(JSON.stringify(x).includes('buyer@example.com'),false)
}
test('P05 even no current debt and a verified PayPal sale cannot settle a named cycle',()=>{
 const x=examine()
 safe(x)
 assert.equal(x.reason,'snapshot_cannot_assign_original_sale_to_cycle')
 assert.equal(x.signals.outstandingBalanceMinor,0)
 assert.equal(x.signals.failedPaymentsCount,0)
 assert.equal(x.signals.autoBillOutstanding,true)
 assert.equal(x.signals.billingExecutionsObserved,1)
 assert.equal(x.signals.paymentWindowComplete,false)
 assert.equal(x.signals.multipleCycleSettlementPossible,true)
})
test('P05 overdue and recovered payments must not be converted into another paid month',()=>{
 const x=examine(s=>{
  s.subscription.billing_info.outstanding_balance=money('2.99')
  s.subscription.billing_info.failed_payments_count=2
  s.subscription.billing_info.next_payment_retry_time='2026-10-18T00:00:00Z'
 })
 safe(x)
 assert.equal(x.reason,'debt_retry_or_unknown_history_requires_cycle_evidence')
 assert.equal(x.signals.outstandingBalanceMinor,299)
 assert.equal(x.signals.failedPaymentsCount,2)
 assert.equal(x.signals.paymentRetryScheduled,true)
 assert.equal(x.signals.multipleCycleSettlementPossible,true)
})
test('P05 missing debt/retry counts are UNKNOWN, not known-zero',()=>{
 const x=examine(s=>{
  delete s.subscription.billing_info.outstanding_balance
  delete s.subscription.billing_info.failed_payments_count
  delete s.plan.payment_preferences.auto_bill_outstanding
 })
 safe(x)
 assert.equal(x.signals.outstandingBalanceMinor,null)
 assert.equal(x.signals.failedPaymentsCount,null)
 assert.equal(x.signals.autoBillOutstanding,null)
 assert.equal(x.reason,'debt_retry_or_unknown_history_requires_cycle_evidence')
})
test('P05 subscriber cancellation and zero current debt never prove coverage end',()=>{
 const x=examine(s=>{
  s.subscription.status='CANCELLED'
  delete s.subscription.billing_info.next_billing_time
 })
 safe(x)
 assert.equal(x.signals.outstandingBalanceMinor,0)
 assert.equal(x.signals.multipleCycleSettlementPossible,true)
})
test('P05 a price-equal second payment must not imply a second successful cycle',()=>{
 const x=examine(s=>{
  s.transactions.push({id:'SALE-SECOND-PAZO',status:'COMPLETED',
   time:'2026-10-14T19:00:00Z',
   amount_with_breakdown:{gross_amount:money('2.99')}})
 })
 safe(x)
 assert.equal(x.signals.multipleCycleSettlementPossible,true)
 assert.equal(x.signals.paymentWindowComplete,false)
})
test('P05 invalid failed payment or negative balance evidence is quarantined, no private leaks',()=>{
 const examples=[
  s=>s.subscription.billing_info.outstanding_balance=money('-2.99'),
  s=>s.subscription.billing_info.outstanding_balance={currency_code:'EUR',value:'2.99'},
  s=>s.subscription.billing_info.failed_payments_count=-1,
  s=>s.subscription.billing_info.failed_payments_count='0',
  s=>s.subscription.billing_info.next_payment_retry_time='2026-99-99',
  s=>s.subscription.billing_info.last_failed_payment={
   amount:money('2.99'),time:'yesterday',payer_email:'buyer@example.com'},
  s=>s.subscription.billing_info.cycle_executions=[{tenure_type:'TRIAL',cycles_completed:-3}],
  s=>s.plan.payment_preferences.auto_bill_outstanding='false',
 ]
 for(const fix of examples){
  const x=examine(fix)
  safe(x)
  assert.equal(x.reason,'cycle_link_unverified')
  assert.equal(x.signals.outstandingBalanceMinor,null)
 }
})
test('P05 forged Auth binding cannot be lifted by a plausible PayPal debt snapshot',()=>{
 const x=examine(s=>s.intent.verifiedOwnerBinding=false)
 safe(x)
 assert.equal(x.reason,'cycle_link_unverified')
})
test('P05 snapshots with no execution data or zero failures never prove full lifetime history',()=>{
 const x=examine(s=>{
  delete s.subscription.billing_info.cycle_executions
 })
 safe(x)
 assert.equal(x.signals.billingExecutionsObserved,null)
 assert.equal(x.signals.paymentWindowComplete,false)
})
test('P05 no operational output under combinations of debt, retry, plan, cancellation',()=>{
 let n=0
 for(const outstanding of [undefined,'0.00','2.99'])
  for(const failures of [undefined,0,1,2])
   for(const autoBill of [undefined,true,false])
    for(const cancelled of [false,true]){
     const x=examine(s=>{
      if(outstanding===undefined)delete s.subscription.billing_info.outstanding_balance
      else s.subscription.billing_info.outstanding_balance=money(outstanding)
      if(failures===undefined)delete s.subscription.billing_info.failed_payments_count
      else s.subscription.billing_info.failed_payments_count=failures
      if(autoBill===undefined)delete s.plan.payment_preferences.auto_bill_outstanding
      else s.plan.payment_preferences.auto_bill_outstanding=autoBill
      if(cancelled){
       s.subscription.status='CANCELLED'
       delete s.subscription.billing_info.next_billing_time
      }
     })
     safe(x)
     n++
    }
 assert.equal(n,72)
})
