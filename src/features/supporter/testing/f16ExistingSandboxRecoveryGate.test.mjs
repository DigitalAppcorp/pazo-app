import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {assessF16ExistingSandboxRecoveryGate} from '../../../../supabase/functions/f16-paypal-webhook/f16ExistingSandboxRecoveryGate.mjs'
import {bindExistingRecovery} from '../../../../scripts/f16-paypal-recover-existing-bound.mjs'
const script=fileURLToPath(new URL('../../../../scripts/f16-paypal-recover-existing-bound.mjs',import.meta.url))
const owner='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const intent='intent-00000000-0000-4000-8000-000000000001'
const subId='I-PAZO-READONLY-RECOVERY'
const planId='P-14V25407JP6850922NLHMDKI'
const now='2026-10-14T20:00:00Z'
const fixture=()=>({
 savedState:{
  environment:'sandbox',
  project:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  plan:planId,phase:'paypal_created',
  createdAt:now,authOwnerId:owner,intentId:intent,subscriptionId:subId,
 },
 authUser:{
  id:owner,email:'pazo-f16-00000000-0000-4000-8000-000000000001@example.com',
  created_at:'2026-10-14T20:00:29.000Z',
  is_anonymous:false,
 },
 privateIntent:{
  id:intent,owner_id:owner,plan_id:planId,state:'pending',
  external_subscription_id:null,
 },
 subscription:{
  id:subId,plan_id:planId,custom_id:intent,
  status:'APPROVAL_PENDING',quantity:'1',plan_overridden:false,
  links:[{rel:'approve',method:'GET',href:'https://www.sandbox.paypal.com/pay?ba_token=PRIVATE'}],
 },
 plan:{
  id:planId,status:'ACTIVE',quantity_supported:false,
  billing_cycles:[{tenure_type:'REGULAR',total_cycles:0,
   frequency:{interval_unit:'MONTH',interval_count:1},
   pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
  payment_preferences:{setup_fee:{currency_code:'USD',value:'0.0'}},
 },
})
function check(x){
 const v=assessF16ExistingSandboxRecoveryGate(x)
 assert.equal(v.environment,'sandbox')
 assert.equal(v.step,'existing_recovery_scope')
 assert.equal(v.networkWrites,0)
 assert.equal(v.mayCreateUser,false)
 assert.equal(v.mayCreateIntent,false)
 assert.equal(v.mayCreateSubscription,false)
 assert.equal(v.mayCancelSubscription,false)
 assert.equal(v.mayApproveBuyer,false)
 assert.equal(v.mayGrantBenefits,false)
 assert.equal(v.paidThrough,null)
 const json=JSON.stringify(v)
 for(const sensitive of [owner,intent,subId,'PRIVATE','@example.com'])
  assert.equal(json.includes(sensitive),false)
 return v
}
test('only one previously reserved unapproved subscription and correct QA owner can pass scope gate',()=>{
 const r=check(fixture())
 assert.equal(r.safeToReauthenticate,true)
 assert.equal(r.safeToBind,true)
 assert.equal(r.reason,'ready_only_with_explicit_po_go')
})
test('state guard blocks any new attempt or second recovery',()=>{
 for(const mutate of [
  x=>x.savedState.phase='bound_before_approval',
  x=>x.savedState.recoveryPhase='auth_recovery_requested',
  x=>x.savedState.recoveryPhase='bound_verified',
  x=>x.savedState.project='https://another-project.supabase.co',
  x=>x.savedState.environment='live',
  x=>x.savedState.plan='P-DIFFERENT',
  x=>x.savedState.createdAt='unknown',
  x=>x.savedState.authOwnerId='not-a-uuid',
  x=>x.savedState.intentId='intent-not-v4',
  x=>x.savedState.subscriptionId='https://evil.invalid',
 ]){
  const x=fixture();mutate(x)
  const r=check(x)
  assert.equal(r.safeToBind,false)
 }
})
test('only the original disposable signup identity can have its credential rotated',()=>{
 for(const mutate of [
  x=>x.authUser.id='a0d116f8-9c7a-4f4f-b1d3-a1218c054129',
  x=>x.authUser.email='real-person@example.com',
  x=>x.authUser.email='pazo-f16-something@example.com',
  x=>x.authUser.email='pazo-f16-00000000-0000-4000-8000-000000000001@gmail.com',
  x=>x.authUser.is_anonymous=true,
  x=>x.authUser.created_at='2026-10-15T20:00:29Z',
 ]){
  const x=fixture();mutate(x)
  const r=check(x)
  assert.equal(r.safeToBind,false)
  assert.equal(r.reason,'original_disposable_auth_not_proven')
 }
})
test('even correct QA Auth cannot claim incorrect merchant data or unavailable intent',()=>{
 for(const mutate of [
  x=>x.privateIntent.state='bound',
  x=>x.privateIntent.owner_id='a0d116f8-9c7a-4f4f-b1d3-a1218c054129',
  x=>x.privateIntent.external_subscription_id=subId,
  x=>x.subscription.status='ACTIVE',
  x=>x.subscription.status='CANCELLED',
  x=>x.subscription.custom_id='intent-wrong',
  x=>x.subscription.plan_overridden=true,
  x=>x.subscription.quantity='2',
  x=>x.plan.billing_cycles[0].pricing_scheme.fixed_price.value='5.00',
  x=>x.subscription.links[0].href='https://evil.invalid/pay',
 ]){
  const x=fixture();mutate(x)
  const r=check(x)
  assert.equal(r.safeToBind,false)
  assert.equal(r.reason,'pending_auth_merchant_terms_not_proven')
 }
})
test('recovery write command without specific GO stops without any credentials or network call',()=>{
 const cmd=spawnSync(process.execPath,[script,'--bind-existing'],{
  encoding:'utf8',timeout:18000,
  env:{...process.env,PAZO_F16_RECOVERY_WRITE_GO:'',
   PAZO_F16_SUPABASE_SECRET_KEY:'',
   PAYPAL_SANDBOX_CLIENT_ID:'',PAYPAL_SANDBOX_CLIENT_SECRET:''},
 })
 assert.equal(cmd.status,2)
 assert.equal(cmd.stdout,'')
 const v=JSON.parse(cmd.stderr)
 assert.equal(v.step,'existing_binding_recovery')
 assert.equal(v.reason,'f16_explicit_existing_test_write_go_required')
 assert.equal(v.createdPayPalSubscriptions,0)
 assert.equal(v.mayGrantBenefits,false)
})
test('directly imported write function also refuses without specific GO',async()=>{
 await assert.rejects(()=>bindExistingRecovery({}),{
  message:'f16_explicit_existing_test_write_go_required',
 })
})
