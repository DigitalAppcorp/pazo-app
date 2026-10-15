import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxReadOnlyCheckoutRecovery as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p08SandboxReadOnlyCheckoutRecovery.mjs'
import {createPazoCheckoutConsentStore}
 from '../../../../supabase/functions/f16-paypal-webhook/p06CheckoutConsentStore.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const OTHER='22222222-2222-4222-8222-222222222222'
const KEY='33333333-3333-4333-8333-333333333333'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-PAZO-BOUND-SANDBOX'
const PLAN='P-14V25407JP6850922NLHMDKI'
const request=new Request('https://api.example/recover',{
 headers:{Authorization:'Bearer SYNTHETIC_TOKEN'}})
const base=()=>({ownerId:OWNER,requestKey:KEY,intentId:INTENT,
 planId:PLAN,state:'bound',providerCreateClaimed:true,subscriptionId:SUB})
function harness(overrides={}){
 const calls=[]
 const api=create({
  resolveAuthenticatedOwner:async()=>{calls.push('auth')
   if(overrides.authError)throw Error('AUTH_TOKEN')
   return overrides.owner===undefined?OWNER:overrides.owner},
  admit:async x=>{calls.push(['admit',x])
   if(overrides.admitError)throw Error('LIMIT_TOKEN')
   return overrides.admit===undefined?true:overrides.admit},
  consentStore:{readRecoveryForOwner:async x=>{calls.push(['private',x])
   if(overrides.privateError)throw Error('DB_TOKEN')
   return overrides.saved===undefined?base():overrides.saved}},
  subscriptionReader:{readSubscription:async id=>{calls.push(['merchant',id])
   if(overrides.readError)throw Error('PAYER_EMAIL_TOKEN')
   return overrides.remote===undefined?
    {id,plan_id:PLAN,custom_id:INTENT,status:'APPROVAL_PENDING',
     subscriber:{email:'private@test.invalid'}}:overrides.remote}},
 })
 return{api,calls}
}
function safe(result){
 for(const [field,value] of Object.entries({
  environment:'sandbox',entitlement:false,paidThrough:null,
  mayRecordPayment:false,mayGrantBenefits:false,mayEnableLive:false,
  mayCreateSubscription:false,mayResubscribe:false,
 }))assert.equal(result[field],value,field)
 const raw=JSON.stringify(result)
 for(const secret of [OWNER,OTHER,KEY,INTENT,SUB,'PAYER_EMAIL_TOKEN',
  'private@test.invalid','AUTH_TOKEN']) assert.ok(!raw.includes(secret))
 return result
}
test('bound approval, active, and cancelled statuses are read only',async()=>{
 for(const [status,phase] of [
  ['APPROVAL_PENDING','BUYER_APPROVAL_PENDING_READ_ONLY'],
  ['ACTIVE','LINKED_FINANCIAL_RECONCILIATION_REQUIRED'],
  ['CANCELLED','RENEWALS_CANCELLED_NO_RESUBSCRIBE'],
  ['SUSPENDED','PROVIDER_STATE_REVIEW_REQUIRED'],
 ]){
  const {api,calls}=harness({remote:{
   id:SUB,plan_id:PLAN,custom_id:INTENT,status}})
  const got=safe(await api.inspect({request,requestKey:KEY}))
  assert.equal(got.phase,phase)
  assert.deepEqual(calls.map(v=>typeof v==='string'?v:v[0]),
   ['auth','admit','private','merchant'])
  assert.deepEqual(calls[2][1],{ownerId:OWNER,requestKey:KEY})
  assert.equal(calls[3][1],SUB)
  assert.equal('approvalUrl' in got,false)
 }
})
test('unclaimed/ambiguous pending never contact PayPal nor create',async()=>{
 for(const [claimed,phase] of [[true,
  'MANUAL_MERCHANT_RECONCILIATION_REQUIRED'],[false,'NO_PROVIDER_CREATE_CLAIM']]){
  const {api,calls}=harness({saved:{...base(),state:'pending',
   providerCreateClaimed:claimed,subscriptionId:null}})
  assert.equal(safe(await api.inspect({request,requestKey:KEY})).phase,phase)
  assert.ok(!calls.some(v=>Array.isArray(v)&&v[0]==='merchant'))
 }
})
test('foreign owner, malformed rows, mismatched merchant, error fail closed',async()=>{
 for(const x of [
  {owner:null},{owner:OTHER,saved:undefined},
  {saved:null},{saved:{...base(),ownerId:OTHER}},
  {saved:{...base(),state:'bound',providerCreateClaimed:false}},
  {saved:{...base(),subscriptionId:'https://evil.example'}},
  {saved:{...base(),state:'pending',subscriptionId:SUB}},
  {remote:{id:'I-OTHER',plan_id:PLAN,custom_id:INTENT,status:'ACTIVE'}},
  {remote:{id:SUB,plan_id:'P-OTHER',custom_id:INTENT,status:'ACTIVE'}},
  {remote:{id:SUB,plan_id:PLAN,custom_id:'intent-FORGED',status:'ACTIVE'}},
  {remote:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'UNKNOWN'}},
  {readError:true},{privateError:true},{authError:true},
  {admitError:true},{admit:false},
 ]){
  const {api,calls}=harness(x)
  assert.equal(safe(await api.inspect({request,requestKey:KEY})).phase,'BLOCKED')
  assert.ok(!calls.some(v=>Array.isArray(v)&&
   ['create','cancel','bind','claim'].includes(v[0])))
 }
})
test('client cannot choose owner, PayPal subscription, or arbitrary key',async()=>{
 for(const invalid of [
  {request:{headers:new Headers()},requestKey:KEY},
  {request,requestKey:'I-PAYPAL'},
  {request,requestKey:KEY,ownerId:OTHER,subscriptionId:SUB},
 ]){
  const {api,calls}=harness()
  const x=safe(await api.inspect(invalid))
  if(invalid.request instanceof Request&&invalid.requestKey===KEY){
   assert.equal(x.phase,'BUYER_APPROVAL_PENDING_READ_ONLY')
   assert.deepEqual(calls[2][1],{ownerId:OWNER,requestKey:KEY})
  }else{
   assert.equal(x.phase,'BLOCKED');assert.deepEqual(calls,[])
  }
 }
})
test('private recovery RPC uses service role and validates exact response',async()=>{
 const seen=[]
 const store=createPazoCheckoutConsentStore({
  projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  serviceRoleKey:'SYNTHETIC_SERVICE_KEY_123456789',
  fetchImpl:async(url,opts)=>{
   seen.push({url,opts})
   return{ok:true,json:async()=>base()}
  },
 })
 const got=await store.readRecoveryForOwner({ownerId:OWNER,requestKey:KEY})
 assert.equal(got.subscriptionId,SUB)
 assert.equal(seen.length,1)
 assert.ok(seen[0].url.endsWith('/rpc/f16_p08_read_checkout_recovery'))
 assert.deepEqual(JSON.parse(seen[0].opts.body),
  {p_owner_id:OWNER,p_request_key:KEY})
 assert.equal(seen[0].opts.headers.Authorization,
  'Bearer SYNTHETIC_SERVICE_KEY_123456789')
 await assert.rejects(store.readRecoveryForOwner({ownerId:OWNER,requestKey:'BAD'}))
 assert.equal(seen.length,1)
})
test('unconfigured dependency prohibits any recovery',()=>{
 assert.throws(()=>create({}),/pazo_checkout_recovery_not_configured/)
})
