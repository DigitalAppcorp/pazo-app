import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {assessF16ExistingBuyerSandboxGate} from '../../../../supabase/functions/f16-paypal-webhook/f16ExistingBuyerSandboxGate.mjs'
import {runBuyerOnce,cancelBuyerExistingOnly} from '../../../../scripts/f16-sandbox-existing-buyer-e2e.mjs'
const script=fileURLToPath(new URL('../../../../scripts/f16-sandbox-existing-buyer-e2e.mjs',import.meta.url))
const id='I-ORIGINAL-PAZO-SANDBOX-QA'
const intent='intent-00000000-0000-4000-8000-000000000001'
const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const planId='P-14V25407JP6850922NLHMDKI'
const fixture=()=>({
 state:{environment:'sandbox',project:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  plan:planId,phase:'bound_before_approval',recoveryPhase:'bound_verified',
  subscriptionId:id,intentId:intent,authOwnerId:owner},
 privateIntent:{id:intent,owner_id:owner,plan_id:planId,state:'bound',
  external_subscription_id:id},
 subscription:{id,plan_id:planId,custom_id:intent,
  status:'APPROVAL_PENDING',plan_overridden:false,quantity:'1',
  links:[{rel:'approve',method:'GET',
   href:'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=PRIVATE_TOKEN'}]},
 plan:{id:planId,status:'ACTIVE',quantity_supported:false,
  billing_cycles:[{tenure_type:'REGULAR',total_cycles:0,
   frequency:{interval_unit:'MONTH',interval_count:1},
   pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
  payment_preferences:{setup_fee:{currency_code:'USD',value:'0.00'}}},
})
const check=x=>{
 const r=assessF16ExistingBuyerSandboxGate(x)
 assert.equal(r.environment,'sandbox')
 assert.equal(r.step,'existing_buyer_preflight')
 assert.equal(r.mayCreateSubscription,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.paidThrough,null)
 const s=JSON.stringify(r)
 for(const secret of [owner,intent,id,'PRIVATE_TOKEN'])
  assert.equal(s.includes(secret),false)
 return r
}
test('single existing verified Auth-bound pending subscription qualifies for READ-ONLY buyer preparation',()=>{
 const r=check(fixture())
 assert.equal(r.readyForBuyer,true)
 assert.equal(r.merchantSubscriptionBound,true)
 assert.equal(r.plan299MonthlyConsistent,true)
 assert.equal(r.subscriptionStatus,'APPROVAL_PENDING')
 assert.equal(r.approvalLinkAvailable,true)
 assert.equal(r.reason,'same_bound_sandbox_subscription_ready')
})
test('pending or forged local state cannot approve',()=>{
 for(const mutate of [
  x=>x.state.phase='paypal_created',
  x=>x.state.recoveryPhase='auth_recovery_requested',
  x=>x.state.environment='live',
  x=>x.state.project='https://evil.invalid',
  x=>x.state.plan='P-MALICIOUS',
  x=>x.state.subscriptionId='https://evil.invalid',
  x=>x.state.authOwnerId='untrusted',
  x=>x.state.intentId='intent-garbage',
 ]){
  const x=fixture();mutate(x);const r=check(x)
  assert.equal(r.readyForBuyer,false)
  assert.equal(r.reason,'original_bound_local_state_required')
 }
})
test('wrong Auth owner, plan, subscription and custom ID block buyer',()=>{
 for(const mutate of [
  x=>x.privateIntent.owner_id='a0d116f8-9c7a-4f4f-b1d3-a1218c054129',
  x=>x.privateIntent.id='intent-untrusted',
  x=>x.privateIntent.state='pending',
  x=>x.privateIntent.external_subscription_id='I-ANOTHER',
  x=>x.privateIntent.plan_id='P-MALICIOUS',
  x=>x.subscription.id='I-ANOTHER',
  x=>x.subscription.plan_id='P-MALICIOUS',
  x=>x.subscription.custom_id='intent-untrusted',
 ]){
  const x=fixture();mutate(x);const r=check(x)
  assert.equal(r.readyForBuyer,false)
  assert.equal(r.reason,'bound_intent_or_merchant_correlation_failed')
 }
})
test('amount, period, quantity, overrides and taxable plans fail closed',()=>{
 for(const mutate of [
  x=>x.plan.billing_cycles[0].pricing_scheme.fixed_price.value='4.99',
  x=>x.plan.billing_cycles[0].frequency.interval_unit='WEEK',
  x=>x.plan.payment_preferences.setup_fee.value='1.00',
  x=>x.plan.taxes={percentage:'7.25'},
  x=>x.plan.quantity_supported=true,
  x=>x.subscription.quantity='2',
  x=>delete x.subscription.quantity,
  x=>x.subscription.plan_overridden=true,
 ]){
  const x=fixture();mutate(x);const r=check(x)
  assert.equal(r.readyForBuyer,false)
  assert.equal(r.reason,'effective_terms_not_safe')
 }
})
test('buyer approval requires explicit pending status and valid private Sandbox GET link',()=>{
 for(const status of ['ACTIVE','APPROVED','CANCELLED','EXPIRED','SUSPENDED']){
  const x=fixture();x.subscription.status=status
  const r=check(x);assert.equal(r.readyForBuyer,false)
  assert.equal(r.reason,'merchant_not_approval_pending')
 }
 for(const href of ['https://evil.invalid/approve',
  'http://www.sandbox.paypal.com/approve',
  'https://www.sandbox.paypal.com.evil.invalid/approve',
  'https://evil@www.sandbox.paypal.com/approve',
  'garbage']){
  const x=fixture();x.subscription.links[0].href=href
  const r=check(x);assert.equal(r.readyForBuyer,false)
  assert.equal(r.reason,'approval_link_unavailable_or_invalid')
 }
})
test('write functions never call any network without the explicit respective operator GO',async()=>{
 await assert.rejects(()=>runBuyerOnce({}),{
  message:'f16_explicit_buyer_approval_and_cancel_go_required'})
 await assert.rejects(()=>cancelBuyerExistingOnly({}),{
  message:'f16_explicit_existing_buyer_cancel_go_required'})
 const r=spawnSync(process.execPath,[script,'--approve-and-cancel'],{
  encoding:'utf8',timeout:16000,
  env:{...process.env,PAZO_F16_BUYER_SANDBOX_GO:'',
   PAZO_F16_SUPABASE_SECRET_KEY:'',PAYPAL_SANDBOX_CLIENT_ID:'',
   PAYPAL_SANDBOX_CLIENT_SECRET:''},
 })
 assert.equal(r.status,2);assert.equal(r.stdout,'')
 const parsed=JSON.parse(r.stderr)
 assert.equal(parsed.phase,'BLOCKED')
 assert.equal(parsed.reason,'f16_explicit_buyer_approval_and_cancel_go_required')
 assert.equal(parsed.createdPayPalSubscriptions,0)
})
test('operator has no PayPal subscriptions create or capture path, only GET and cancellation',()=>{
 const source=readFileSync(script,'utf8')
 assert.equal(source.includes("'POST','/v1/billing/subscriptions'"),false)
 assert.equal(source.includes("'/capture'"),false)
 assert.equal(source.includes("createPrivateIntent:"),false)
 assert.equal(source.includes("createUser("),false)
 assert.equal(source.includes("updateUserById("),false)
 assert.ok(source.includes("/cancel"))
 assert.ok(source.includes("flag:'wx'"))
})
