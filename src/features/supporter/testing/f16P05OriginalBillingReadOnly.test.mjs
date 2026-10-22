import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeF16P05ExistingBilling as summarize} from '../../../../supabase/functions/f16-paypal-webhook/p05OriginalBillingSummary.mjs'
import {createF16P05SandboxBillingSnapshotReader} from '../../../../supabase/functions/f16-paypal-webhook/p05PaypalSandboxBillingSnapshotReader.mjs'

const state=()=>({environment:'sandbox',recoveryPhase:'bound_verified',phase:'buyer_cancelled',
 subscriptionId:'I-VALIDTEST123',intentId:'private-intent-fixture',plan:'P-14V25407JP6850922NLHMDKI'})
const money=value=>({currency_code:'USD',value})
const snapshot=()=>{
 const s=state()
 return {merchantScopedByPayPalApi:true,planScopedByPayPalApi:true,
  lookupSubscriptionId:s.subscriptionId,
  subscription:{id:s.subscriptionId,plan_id:s.plan,custom_id:s.intentId,status:'CANCELLED',
   plan_overridden:false,quantity:'1',start_time:'2026-10-15T03:20:33Z',
   billing_info:{outstanding_balance:money('0.00'),failed_payments_count:0,
    last_payment:{time:'2026-10-15T03:20:33.000Z',amount:money('2.99')},
    cycle_executions:[{tenure_type:'REGULAR',sequence:1,cycles_completed:1}]}},
  plan:{id:s.plan,status:'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',
   frequency:{interval_unit:'MONTH',interval_count:1},
   pricing_scheme:{fixed_price:money('2.99')}}],
   payment_preferences:{setup_fee:money('0.00')}}}
}
test('realistic cancelled monthly snapshot is evidence, NEVER period proof',()=>{
 const r=summarize({state:state(),snapshot:snapshot()})
 assert.equal(r.phase,'READ_ONLY_SNAPSHOT')
 assert.equal(r.currentPlanTermsVerified,true)
 assert.equal(r.lastPayment.time,'2026-10-15T03:20:33.000Z')
 assert.equal(r.cycleExecutions[0].cyclesCompleted,1)
 assert.equal(r.cycleVerified,false)
 assert.equal(r.paidThrough,null)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.dbWrites,0)
 assert.equal(r.networkPaymentWrites,0)
})
test('missing override, missing balance and fee stay unknown',()=>{
 const s=snapshot();delete s.subscription.plan_overridden;delete s.subscription.billing_info.outstanding_balance;delete s.plan.payment_preferences.setup_fee
 const r=summarize({state:state(),snapshot:s})
 assert.equal(r.phase,'READ_ONLY_SNAPSHOT')
 assert.equal(r.planOverridden,null)
 assert.equal(r.outstandingBalance,null)
 assert.equal(r.setupFee,null)
 assert.equal(r.currentPlanTermsVerified,false)
})
test('reject different intent, plan, subscription or uncancelled subscription',()=>{
 for(const modify of [
  x=>x.subscription.custom_id='another-intent',
  x=>x.plan.id='other-plan',
  x=>x.subscription.id='I-DIFFERENT',
  x=>x.subscription.status='ACTIVE',
 ]){
  const s=snapshot();modify(s)
  assert.equal(summarize({state:state(),snapshot:s}).phase,'BLOCKED')
 }
})
test('projection excludes all private refs, payer fields and tokens',()=>{
 const s=snapshot();s.subscription.payer_email='private@example.com';s.secret='private-secret-6789'
 const result=JSON.stringify(summarize({state:state(),snapshot:s}))
 for(const value of ['private-intent-fixture','I-VALIDTEST123','P-14V25407JP6850922NLHMDKI','private@example.com','private-secret-6789'])
  assert.equal(result.includes(value),false)
})
test('reader accepts PayPal .000Z timestamps and only OAuth + two GETs',async()=>{
 const s=snapshot(),urls=[],host='https://api-m.sandbox.paypal.com'
 const rawSub={...s.subscription,subscriber:{email_address:'private@example.com'}}
 const rawPlan=s.plan
 const reader=createF16P05SandboxBillingSnapshotReader({clientId:'dummy-sandbox-client',
  clientSecret:'dummy-sandbox-secret',fetchImpl:async(url,opts)=>{
   urls.push({url,method:opts.method})
   if(url===host+'/v1/oauth2/token')return {ok:true,json:async()=>({token_type:'Bearer',access_token:'dummy-private-token'})}
   if(url===host+'/v1/billing/subscriptions/'+s.subscription.id)return {ok:true,json:async()=>rawSub}
   if(url===host+'/v1/billing/plans/'+s.plan.id)return {ok:true,json:async()=>rawPlan}
   throw Error('wrong_destination')
  }})
 const result=await reader.read(s.subscription.id)
 assert.deepEqual(urls.map(x=>x.method),['POST','GET','GET'])
 assert.equal(result.subscription.billing_info.last_payment.time,'2026-10-15T03:20:33.000Z')
 assert.equal(JSON.stringify(result).includes('private@example.com'),false)
 const output=summarize({state:state(),snapshot:result})
 assert.equal(output.phase,'READ_ONLY_SNAPSHOT')
 assert.equal(output.paidThrough,null)
})
