import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16P05BillingFacts} from '../../../../supabase/functions/f16-paypal-webhook/p05BillingEvidenceLab.mjs'

const PLAN='P-14V25407JP6850922NLHMDKI'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const SUB='I-PAZO-OWNER123',SALE='SALE-PAZO123'
const INTENT='intent-verified-123'
const money=v=>({currency_code:'USD',value:v})
const source=()=>({
 environment:'sandbox',merchantScopedByPayPalApi:true,
 planScopedByPayPalApi:true,lookupSubscriptionId:SUB,
 intent:{id:INTENT,ownerId:OWNER,provider:'paypal',state:'bound',
  verifiedOwnerBinding:true,planId:PLAN,externalSubscriptionId:SUB},
 subscription:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE',
  plan_overridden:false,quantity:'1',
  start_time:'2026-10-01T19:00:00Z',
  billing_info:{last_payment:{time:'2026-10-13T19:00:00Z',amount:money('2.99')},
   next_billing_time:'2026-11-01T19:00:00Z',
   outstanding_balance:money('0.00')}},
 plan:{id:PLAN,status:'ACTIVE',
  billing_cycles:[{tenure_type:'REGULAR',frequency:{interval_unit:'MONTH',interval_count:1},
   pricing_scheme:{fixed_price:money('2.99')}}]},
 transactions:[{id:SALE,status:'COMPLETED',time:'2026-10-13T19:00:00Z',
  amount_with_breakdown:{gross_amount:money('2.99')}}],
 originalSale:{id:SALE,subscriptionId:SUB,verifiedByMerchantApi:true,
  state:'completed',grossMinorUnits:299,currency:'USD',
  completedAt:'2026-10-13T19:00:00Z'},
})
function safe(r){
 assert.equal(r.entitlement,false)
 assert.equal(r.coverageReady,false)
 assert.equal(r.needsCycleAttribution,true)
 assert.equal(r.periodStart,null)
 assert.equal(r.periodEnd,null)
 assert.equal(r.paidThrough,null)
 assert.equal(r.commemorativeMonths,null)
 assert.equal(Object.hasOwn(r,'billingPeriod'),false)
 assert.equal(Object.hasOwn(r,'ownerId'),false)
 assert.equal(Object.hasOwn(r,'subscriptionId'),false)
}
const check=(patch={})=>assessF16P05BillingFacts({...source(),...patch})
test('P05 completed owner-bound monthly payment is only billing facts, never a verified period',()=>{
 const result=check()
 safe(result)
 assert.equal(result.factsConsistent,true)
 assert.equal(result.reason,'monthly_plan_and_original_payment_proven_period_still_unknown')
 assert.equal(result.signals.monthlyRegularPlan,true)
 assert.equal(result.signals.singleVerifiedSaleInWindow,true)
 assert.equal(result.signals.snapshotNextBillingPresent,true)
 assert.equal(result.signals.lastPaymentMatchesSale,true)
 assert.equal(result.signals.outstandingBalancePresent,false)
})
test('P05 cancelled subscription missing next billing date cannot erase or extend a period',()=>{
 const s=source()
 s.subscription.status='CANCELLED'
 delete s.subscription.billing_info.next_billing_time
 const result=check({subscription:s.subscription})
 safe(result)
 assert.equal(result.factsConsistent,true)
 assert.equal(result.signals.snapshotNextBillingPresent,false)
 assert.equal(result.signals.subscriptionCancelled,true)
})
test('P05 outstanding debt or catch-up payment date is not a valid paid-through boundary',()=>{
 const s=source()
 s.subscription.billing_info.last_payment.time='2026-10-14T19:00:00Z'
 s.subscription.billing_info.outstanding_balance=money('2.99')
 const result=check({subscription:s.subscription})
 safe(result)
 assert.equal(result.factsConsistent,true)
 assert.equal(result.signals.outstandingBalancePresent,true)
 assert.equal(result.signals.lastPaymentMatchesSale,false)
})
test('P05 multiple distinct completed sales in snapshot cannot generate more than one period automatically',()=>{
 const s=source()
 s.transactions.push({id:'OTHER-SALE',status:'COMPLETED',
  time:'2026-09-13T19:00:00Z',
  amount_with_breakdown:{gross_amount:money('2.99')}})
 const result=check({transactions:s.transactions})
 safe(result)
 assert.equal(result.factsConsistent,true)
})
test('P05 duplicate original sale in provider listing is ambiguous',()=>{
 const s=source()
 s.transactions.push({...s.transactions[0]})
 const result=check({transactions:s.transactions})
 safe(result)
 assert.equal(result.factsConsistent,false)
 assert.equal(result.reason,'payment_transaction_not_unique_in_window')
})
test('P05 missing, pending, refunded, wrong-currency or incorrect-amount sale fails closed',()=>{
 const s=source()
 const examples=[
  {transactions:[]},
  {transactions:[{...s.transactions[0],status:'PENDING'}]},
  {transactions:[{...s.transactions[0],status:'REFUNDED'}]},
  {transactions:[{...s.transactions[0],amount_with_breakdown:{gross_amount:money('3.00')}}]},
  {originalSale:{...s.originalSale,state:'refunded'}},
  {originalSale:{...s.originalSale,verifiedByMerchantApi:false}},
  {originalSale:{...s.originalSale,currency:'EUR'}},
  {originalSale:{...s.originalSale,subscriptionId:'I-WRONG-SUB'}},
 ]
 for(const patch of examples){
  const r=check(patch);safe(r);assert.equal(r.factsConsistent,false)
 }
})
test('P05 forged owner, wrong intent, subscription, merchant provenance rejected',()=>{
 const s=source()
 for(const patch of [
  {intent:{...s.intent,verifiedOwnerBinding:false}},
  {intent:{...s.intent,ownerId:'buyer@example.com'}},
  {intent:{...s.intent,state:'pending'}},
  {subscription:{...s.subscription,plan_id:'P-WRONG'}},
  {subscription:{...s.subscription,custom_id:'other-intent'}},
  {lookupSubscriptionId:'I-WRONG-SUB'},
  {merchantScopedByPayPalApi:false},{planScopedByPayPalApi:false},
  {environment:'live'},
 ]){
  const r=check(patch);safe(r);assert.equal(r.factsConsistent,false)
 }
})
test('P05 no trial, annual plan, extra cycle or wrong price can be assumed monthly',()=>{
 const s=source()
 for(const plan of [
  {...s.plan,billing_cycles:[{...s.plan.billing_cycles[0],
   frequency:{interval_unit:'YEAR',interval_count:1}}]},
  {...s.plan,billing_cycles:[{...s.plan.billing_cycles[0],
   frequency:{interval_unit:'MONTH',interval_count:2}}]},
  {...s.plan,billing_cycles:[s.plan.billing_cycles[0],
   {tenure_type:'TRIAL',frequency:{interval_unit:'DAY',interval_count:7}}]},
  {...s.plan,billing_cycles:[{...s.plan.billing_cycles[0],
   pricing_scheme:{fixed_price:money('0.00')}}]},
  {...s.plan,payment_preferences:{setup_fee:money('2.99')}},
 ]){
  const r=check({plan});safe(r);assert.equal(r.factsConsistent,false)
  assert.equal(r.reason,'plan_frequency_price_or_fee_mismatch'===r.reason?
   'plan_frequency_price_or_fee_mismatch':'plan_cycle_structure_unproven')
 }
})
test('P05 wrong provider dates and impossible chronological boundaries block',()=>{
 const s=source()
 for(const patch of [
  {originalSale:{...s.originalSale,completedAt:'2026-10-13'}},
  {subscription:{...s.subscription,start_time:'2026-10-15T00:00:00Z'}},
  {subscription:{...s.subscription,billing_info:{
   ...s.subscription.billing_info,next_billing_time:'2026-10-13T19:00:00Z'}}},
  {subscription:{...s.subscription,billing_info:{
   ...s.subscription.billing_info,last_payment:{time:'2026-10-13',
    amount:money('2.99')}}}},
 ]){
  const r=check(patch);safe(r);assert.equal(r.factsConsistent,false)
 }
})
test('P05 absent next/last/start dates do not invent monthly boundaries',()=>{
 const s=source()
 delete s.subscription.start_time
 delete s.subscription.billing_info.last_payment
 delete s.subscription.billing_info.next_billing_time
 const r=check({subscription:s.subscription});safe(r)
 assert.equal(r.factsConsistent,true)
 assert.equal(r.signals.snapshotNextBillingPresent,false)
 assert.equal(r.signals.lastPaymentMatchesSale,false)
})
test('P05 rejects unknown subscription states and forged email cannot leak through result',()=>{
 const s=source()
 const v=check({subscription:{...s.subscription,status:'APPROVAL_PENDING',
  subscriber:{email_address:'buyer@example.com'}}})
 safe(v)
 assert.equal(v.reason,'subscription_state_unknown')
 assert.equal(JSON.stringify(v).includes('buyer@example.com'),false)
})
