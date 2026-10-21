import test from 'node:test'
import assert from 'node:assert/strict'
import {auditF16P05ProviderFieldClaims as audit} from '../../../../supabase/functions/f16-paypal-webhook/p05ProviderFieldCapabilitiesLab.mjs'
const sane=x=>{
 assert.equal(x.cycleVerified,false)
 assert.equal(x.cycleAttributionConfirmed,false)
 assert.equal(x.paidThrough,null)
 assert.equal(x.periodStart,null)
 assert.equal(x.periodEnd,null)
 assert.equal(x.mayCreatePaidPeriod,false)
 assert.equal(x.mayRecordPayment,false)
 assert.equal(x.mayGrantBenefits,false)
 assert.equal(x.financialHistoryComplete,false)
 assert.equal(x.dbWrites,0)
 assert.equal(x.networkPaymentWrites,0)
 assert.equal(JSON.stringify(x).includes('I-SECRET'),false)
}
const run=claims=>{const x=audit({claims});sane(x);return x}
const claim=(source,field,claimedUse)=>({source,field,claimedUse})
test('documented schedule, recurring plan and payment IDs never produce paidThrough',()=>{
 const x=run([
  claim('PLAN_GET','billing_cycles[].frequency','recurrence'),
  claim('SUBSCRIPTION_GET','billing_info.next_billing_time','billing_schedule'),
  claim('TRANSACTIONS_GET','transactions[].id','payment_identity'),
  claim('SALE_WEBHOOK_GET','resource.id','payment_identity'),
  claim('ACTIVATION_WEBHOOK_GET','resource.billing_info.next_billing_time','billing_schedule'),
 ])
 assert.equal(x.phase,'SOURCE_CAPABILITY_REVIEWED')
 assert.equal(x.verifiedPaidCycleSource,false)
 assert.equal(x.requiresIndependentContractAndAllocationEvidence,true)
 assert.equal(x.capabilityCount,5)
})
test('PayPal next billing time cannot be asserted as coverage end',()=>{
 for(const source of ['SUBSCRIPTION_GET','ACTIVATION_WEBHOOK_GET']){
  const field=source==='SUBSCRIPTION_GET'?
    'billing_info.next_billing_time':'resource.billing_info.next_billing_time'
  const r=run([claim(source,field,'cycle_interval')])
  assert.equal(r.phase,'REVIEW_REQUIRED')
  assert.equal(r.reason,'paypal_field_overclaimed_as_paid_cycle_proof')
 }
})
test('cycle_executions counter does not certify a paid interval',()=>{
 assert.equal(run([claim('SUBSCRIPTION_GET','billing_info.cycle_executions','cycle_interval')]).reason,
  'paypal_field_overclaimed_as_paid_cycle_proof')
})
test('sale webhook and merchant transaction ID do not certify cycle allocation',()=>{
 for(const input of [
  claim('SALE_WEBHOOK_GET','resource.id','sale_cycle_allocation'),
  claim('TRANSACTIONS_GET','transactions[].id','sale_cycle_allocation'),
  claim('TRANSACTIONS_GET','transactions[].time','paid_through'),
 ])assert.equal(run([input]).reason,'paypal_field_overclaimed_as_paid_cycle_proof')
})
test('unknown field including invented cycle_key fails closed',()=>{
 for(const input of [
  claim('TRANSACTIONS_GET','transactions[].cycle_key','sale_cycle_allocation'),
  claim('SUBSCRIPTION_GET','billing_info.paid_through','paid_through'),
  claim('PAYPAL_SETTLEMENT','cycle_allocation','sale_cycle_allocation'),
 ])assert.equal(run([input]).reason,'unknown_provider_field_or_source')
})
test('misusing plan frequency as payment identity fails closed',()=>{
 assert.equal(run([claim('PLAN_GET','billing_cycles[].frequency','payment_identity')]).reason,
  'field_claimed_use_not_supported')
})
test('duplicated claims are rejected',()=>{
 const c=claim('PLAN_GET','billing_cycles[].frequency','recurrence')
 assert.equal(run([c,{...c}]).reason,'duplicate_field_claim')
})
test('forbid user details, browser claims and arbitrary unknown properties',()=>{
 for(const c of [
  {...claim('SUBSCRIPTION_GET','billing_info.next_billing_time','billing_schedule'),payerEmail:'secret@example.com'},
  {...claim('SALE_WEBHOOK_GET','resource.id','payment_identity'),secret:'I-SECRET'},
  {source:'BROWSER',field:'subscriptionCycle',claimedUse:'cycle_interval'},
  {source:'PLAN_GET',field:'billing_cycles[].frequency',claimedUse:'grants'},
  null,
 ])assert.equal(run([c]).phase,'REVIEW_REQUIRED')
})
test('bounded input and zero counts are not inferred from no provider evidence',()=>{
 assert.equal(run([]).reason,'claims_missing_or_unbounded')
 const more=Array.from({length:33},()=>claim('PLAN_GET','billing_cycles[].frequency','recurrence'))
 assert.equal(run(more).reason,'claims_missing_or_unbounded')
})
test('no combination of documented assertions may grant a paid period',()=>{
 const source=[
  claim('SUBSCRIPTION_GET','billing_info.next_billing_time','billing_schedule'),
  claim('TRANSACTIONS_GET','transactions[].id','payment_identity'),
  claim('PLAN_GET','billing_cycles[].frequency','recurrence'),
 ]
 const uses=['payment_identity','recurrence','billing_schedule','cycle_interval','sale_cycle_allocation','paid_through']
 let checked=0
 for(const c of source)for(const use of uses){
  run([{...c,claimedUse:use}]);checked++
 }
 assert.equal(checked,18)
})
