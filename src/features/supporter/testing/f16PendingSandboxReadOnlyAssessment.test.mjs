import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16PendingSandboxReadOnly} from '../../../../supabase/functions/f16-paypal-webhook/f16PendingSandboxReadOnlyAssessment.mjs'

const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const subId='I-PAZO-READONLY-FORENSICS'
const intent='intent-00000000-0000-4000-8000-000000000001'
const planId='P-14V25407JP6850922NLHMDKI'
const example=()=>({
 savedState:{phase:'paypal_created',subscriptionId:subId,intentId:intent,authOwnerId:owner},
 subscription:{
  id:subId,plan_id:planId,custom_id:intent,status:'APPROVAL_PENDING',
  plan_overridden:false,quantity:'1',
  links:[{rel:'approve',method:'GET',href:'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=PRIVATE_TOKEN'}],
  payer:{email_address:'person@example.com'},
 },
 plan:{
  id:planId,status:'ACTIVE',quantity_supported:false,
  billing_cycles:[{tenure_type:'REGULAR',total_cycles:0,
   frequency:{interval_unit:'MONTH',interval_count:1},
   pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
  payment_preferences:{setup_fee:{currency_code:'USD',value:'0.00'}},
 },
 privateIntent:{id:intent,owner_id:owner,state:'pending',plan_id:planId,
  external_subscription_id:null},
 authOwnerExists:true,
})
const scan=x=>{
 const r=assessF16PendingSandboxReadOnly(x)
 assert.equal(r.environment,'sandbox')
 assert.equal(r.step,'pending_binding_diagnostic_readonly')
 assert.equal(r.networkWrites,0)
 assert.equal(r.mayBind,false)
 assert.equal(r.mayCreateSubscription,false)
 assert.equal(r.mayApproveBuyer,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.paidThrough,null)
 assert.equal(r.financialHistoryComplete,false)
 const serialized=JSON.stringify(r)
 for(const p of [owner,subId,intent,'PRIVATE_TOKEN','person@example.com']) {
  assert.equal(serialized.includes(p),false)
 }
 return r
}
test('pending subscription evidence may look consistent but never permits bind, buyer or perks',()=>{
 const r=scan(example())
 assert.equal(r.reason,'evidence_consistent_but_one_shot_test_stopped')
 assert.equal(r.subscriptionStatus,'APPROVAL_PENDING')
 assert.equal(r.couldCompletePreapprovalChecks,true)
 assert.equal(r.approvalLinkSignal,'sandbox_get')
 assert.equal(r.plan299MonthlyConsistent,true)
 assert.equal(r.planOverrideExplicitlyFalse,true)
 assert.equal(r.quantityOneExplicit,true)
 assert.equal(r.privateIntentPending,true)
})
test('missing quantity or plan_overridden is UNKNOWN, not silently accepted',()=>{
 for(const mutate of [
  x=>delete x.subscription.quantity,
  x=>x.subscription.quantity=null,
  x=>x.subscription.quantity=1,
  x=>delete x.subscription.plan_overridden,
  x=>x.subscription.plan_overridden=true,
 ]){
  const x=example();mutate(x)
  const r=scan(x)
  assert.equal(r.couldCompletePreapprovalChecks,false)
  assert.equal(r.reason,'effective_terms_unknown_or_different')
 }
})
test('no existing Auth account, wrong owner, bound intent, or mismatched plan cannot be accepted',()=>{
 for(const mutate of [
  x=>x.authOwnerExists=false,
  x=>x.privateIntent.owner_id='a0d116f8-9c7a-4f4f-b1d3-a1218c054129',
  x=>x.privateIntent.state='bound',
  x=>x.privateIntent.external_subscription_id=subId,
  x=>x.privateIntent.plan_id='P-DIFFERENT',
  x=>x.subscription.id='I-DIFFERENT',
  x=>x.subscription.plan_id='P-DIFFERENT',
  x=>x.subscription.custom_id='intent-different',
 ]){
  const x=example();mutate(x);const r=scan(x)
  assert.equal(r.couldCompletePreapprovalChecks,false)
  assert.equal(r.reason,'binding_sources_not_consistent')
 }
})
test('APPROVED, ACTIVE, CANCELLED and EXPIRED are never preapproval evidence',()=>{
 for(const status of ['APPROVED','ACTIVE','CANCELLED','EXPIRED','SUSPENDED']){
  const x=example();x.subscription.status=status
  const r=scan(x)
  assert.equal(r.reason,'subscription_not_pending')
  assert.equal(r.couldCompletePreapprovalChecks,false)
 }
})
test('read-only probe rejects unexpected plan terms without attributing coverage',()=>{
 for(const mutate of [
  x=>x.plan.quantity_supported=true,
  x=>x.plan.billing_cycles[0].total_cycles=12,
  x=>x.plan.billing_cycles[0].pricing_scheme.fixed_price.value='5.99',
  x=>x.plan.billing_cycles[0].frequency.interval_unit='DAY',
  x=>x.plan.payment_preferences.setup_fee.value='2.99',
  x=>x.plan.billing_cycles.push(x.plan.billing_cycles[0]),
 ]){
  const x=example();mutate(x)
  const r=scan(x)
  assert.equal(r.reason,'effective_terms_unknown_or_different')
  assert.equal(r.couldCompletePreapprovalChecks,false)
 }
})
test('approval URL is validated but never logged or returned',()=>{
 for(const [url,signal] of [
  ['https://evil.invalid/?ba_token=PRIVATE_TOKEN','not_safe'],
  ['garbage-url','not_safe'],
  ['http://www.sandbox.paypal.com/pay?ba_token=PRIVATE_TOKEN','not_safe'],
  ['https://www.sandbox.paypal.com@evil.invalid/pay?ba_token=PRIVATE_TOKEN','not_safe'],
 ]){
  const x=example();x.subscription.links[0].href=url
  assert.equal(scan(x).approvalLinkSignal,signal)
 }
 const x=example();delete x.subscription.links
 assert.equal(scan(x).approvalLinkSignal,'not_returned')
})
test('missing or corrupted saved private references never produces a positive result',()=>{
 for(const state of [null,{},{
  intentId:intent,authOwnerId:owner,subscriptionId:'https://evil.invalid',
 }]){
  const x=example();x.savedState=state
  const r=scan(x)
  assert.equal(r.reason,'incomplete_local_reference')
  assert.equal(r.couldCompletePreapprovalChecks,false)
 }
})
