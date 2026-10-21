import test from 'node:test'
import assert from 'node:assert/strict'
import {createF16P05SandboxBillingSnapshotReader} from '../../../../supabase/functions/f16-paypal-webhook/p05PaypalSandboxBillingSnapshotReader.mjs'
import {assessF16P05BillingFacts} from '../../../../supabase/functions/f16-paypal-webhook/p05BillingEvidenceLab.mjs'
import {assessF16P05CycleAttributionRisks} from '../../../../supabase/functions/f16-paypal-webhook/p05CycleAttributionRisksLab.mjs'

const SUB='I-PAZO-F16-PLAN01'
const PLAN='P-14V25407JP6850922NLHMDKI'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const INTENT='intent-p05-reader-001',SALE='SALE-P05-READ-01'
const money=value=>({currency_code:'USD',value})
const subscription=()=>({
 id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE',
 plan_overridden:false,quantity:'1',start_time:'2026-10-01T19:00:00Z',
 subscriber:{email_address:'buyer@example.com',name:{given_name:'PRIVATE'}},
 links:[{href:'https://some.private.url',rel:'approve'}],
 billing_info:{
  outstanding_balance:money('2.99'),failed_payments_count:2,
  last_payment:{time:'2026-10-13T19:00:00Z',amount:money('2.99')},
  next_billing_time:'2026-11-01T19:00:00Z',
  last_failed_payment:{time:'2026-10-10T19:00:00Z',
   amount:money('2.99'),reason_code:'PAYMENT_DENIED',
   next_payment_retry_time:'2026-10-15T19:00:00Z',
   subscriber:{email_address:'buyer@example.com'}},
  cycle_executions:[{tenure_type:'REGULAR',sequence:1,cycles_completed:1,
   internal_notes:'never return'}],
 },
})
const plan=()=>({
 id:PLAN,status:'ACTIVE',name:'PAZO Amigo',
 billing_cycles:[{
  tenure_type:'REGULAR',sequence:1,
  frequency:{interval_unit:'MONTH',interval_count:1},
  pricing_scheme:{fixed_price:money('2.99')},
 }],
 payment_preferences:{auto_bill_outstanding:true,setup_fee:money('0.00')},
 internal_notes:'never return',
})
function setup({sub=subscription(),billingPlan=plan(),token=true,subscriptionOk=true,planOk=true}={}){
 const calls=[]
 const fetchImpl=async(url,opts)=>{
  calls.push({url,method:opts.method,redirect:opts.redirect})
  if(url==='https://api-m.sandbox.paypal.com/v1/oauth2/token')
   return {ok:true,json:async()=>({token_type:'Bearer',
    access_token:token?'mock-private-paypal-oauth-token':'x'})}
  if(url==='https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+SUB)
   return {ok:subscriptionOk,json:async()=>sub}
  if(url==='https://api-m.sandbox.paypal.com/v1/billing/plans/'+PLAN)
   return {ok:planOk,json:async()=>billingPlan}
  throw Error('untrusted_network_destination')
 }
 const reader=createF16P05SandboxBillingSnapshotReader({
  clientId:'f16-private-clientid',clientSecret:'f16-private-secret',
  fetchImpl,
 })
 return {reader,calls}
}
const history=[{id:SALE,status:'COMPLETED',time:'2026-10-13T19:00:00Z',
 amount_with_breakdown:{gross_amount:money('2.99')}}]
function evaluate(s){
 const facts=assessF16P05BillingFacts({
  environment:'sandbox',merchantScopedByPayPalApi:s.merchantScopedByPayPalApi,
  planScopedByPayPalApi:s.planScopedByPayPalApi,
  lookupSubscriptionId:s.lookupSubscriptionId,
  subscription:s.subscription,plan:s.plan,transactions:history,
  intent:{id:INTENT,state:'bound',provider:'paypal',planId:PLAN,
   verifiedOwnerBinding:true,ownerId:OWNER,externalSubscriptionId:SUB},
  originalSale:{id:SALE,subscriptionId:SUB,verifiedByMerchantApi:true,
   state:'completed',grossMinorUnits:299,currency:'USD',
   completedAt:'2026-10-13T19:00:00Z'},
 })
 return {facts,risk:assessF16P05CycleAttributionRisks({
  billingFacts:facts,subscription:s.subscription,plan:s.plan,transactions:history,
 })}
}
test('P05 PayPal reader GETs only OAuth, subscription and plan, sanitizes financial snapshot',async()=>{
 const x=setup()
 const result=await x.reader.read(SUB)
 assert.equal(x.calls.length,3)
 assert.deepEqual(x.calls.map(c=>new URL(c.url).pathname),[
  '/v1/oauth2/token','/v1/billing/subscriptions/'+SUB,
  '/v1/billing/plans/'+PLAN,
 ])
 assert.deepEqual(x.calls.map(c=>c.method),['POST','GET','GET'])
 assert.equal(x.calls.every(c=>c.redirect==='error'),true)
 assert.equal(result.lookupSubscriptionId,SUB)
 assert.equal(result.subscription.plan_overridden,false)
 assert.equal(result.subscription.quantity,'1')
 assert.equal(result.subscription.billing_info.last_failed_payment.next_payment_retry_time,
  '2026-10-15T19:00:00Z')
 assert.equal(result.plan.billing_cycles[0].frequency.interval_unit,'MONTH')
 const string=JSON.stringify(result)
 for(const secret of ['buyer@example.com','PRIVATE',
   'mock-private-paypal-oauth-token','never return','private.url'])
  assert.equal(string.includes(secret),false)
 const {facts,risk}=evaluate(result)
 assert.equal(facts.factsConsistent,true)
 assert.equal(facts.entitlement,false)
 assert.equal(facts.paidThrough,null)
 assert.equal(risk.signals.paymentRetryScheduled,true)
 assert.equal(risk.signals.failedPaymentsCount,2)
 assert.equal(risk.signals.outstandingBalanceMinor,299)
 assert.equal(risk.mayGrantBenefits,false)
 assert.equal(risk.paidThrough,null)
})
test('P05 actual subscription plan override, missing override flag or quantity mismatch cannot pass billing fact gate',async()=>{
 for(const mutate of [
  s=>s.plan_overridden=true,
  s=>delete s.plan_overridden,
  s=>s.quantity='2',
 ]){
  const sub=subscription();mutate(sub)
  const result=await setup({sub}).reader.read(SUB)
  const {facts,risk}=evaluate(result)
  assert.equal(facts.factsConsistent,false)
  assert.equal(risk.mayGrantBenefits,false)
  assert.equal(risk.paidThrough,null)
 }
})
test('P05 missing optional subscription financial fields remain UNKNOWN not synthetic zero',async()=>{
 const sub=subscription()
 delete sub.start_time
 delete sub.billing_info.next_billing_time
 delete sub.billing_info.last_failed_payment
 delete sub.billing_info.outstanding_balance
 const result=await setup({sub}).reader.read(SUB)
 assert.equal(result.subscription.start_time,undefined)
 assert.equal(result.subscription.billing_info.next_billing_time,undefined)
 assert.equal(result.subscription.billing_info.outstanding_balance,undefined)
 const {facts,risk}=evaluate(result)
 assert.equal(facts.factsConsistent,true)
 assert.equal(risk.signals.outstandingBalanceMinor,null)
 assert.equal(risk.signals.paymentRetryScheduled,null)
 assert.equal(risk.mayGrantBenefits,false)
})
test('P05 invalid provider override or mismatched plan identity fails closed before P05 facts',async()=>{
 for(const params of [
  {sub:{...subscription(),id:'I-OTHER-USER'}},
  {sub:{...subscription(),plan_id:'P-OTHER-PLAN'}},
  {billingPlan:{...plan(),id:'P-OTHER-PLAN'}},
  {subscriptionOk:false},{planOk:false},{token:false},
 ]){
  const x=setup(params)
  await assert.rejects(x.reader.read(SUB),/f16_billing_snapshot_/)
 }
})
test('P05 unsafe account IDs cannot trigger merchant network, no other endpoints accepted',async()=>{
 const x=setup()
 for(const invalid of ['../user','https://evil.example','I-USER?email=x','','I-x/a']){
  await assert.rejects(x.reader.read(invalid),/f16_invalid_billing_subscription_id/)
 }
 assert.equal(x.calls.length,0)
})
test('P05 abnormal billing data is held, not coerced to clean paid cycles',async()=>{
 const sub=subscription()
 sub.billing_info.outstanding_balance={currency_code:'EUR',value:'2.99'}
 sub.billing_info.last_failed_payment.next_payment_retry_time='2026-10-99T19:00:00Z'
 const snapshot=await setup({sub}).reader.read(SUB)
 assert.equal(snapshot.subscription.billing_info.outstanding_balance,null)
 assert.equal(snapshot.subscription.billing_info.last_failed_payment.next_payment_retry_time,null)
 const {facts,risk}=evaluate(snapshot)
 assert.equal(facts.factsConsistent,true)
 assert.equal(risk.reason,'cycle_link_unverified')
 assert.equal(risk.entitlement,false)
})
