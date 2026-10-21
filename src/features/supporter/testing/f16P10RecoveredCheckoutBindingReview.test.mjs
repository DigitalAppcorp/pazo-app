import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoRecoveredCheckoutBindingReview as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p10RecoveredCheckoutBindingReview.mjs'
import {createPazoSandboxOrphanMerchantReader}
 from '../../../../supabase/functions/f16-paypal-webhook/p09SandboxOrphanMerchantProbe.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const OTHER='22222222-2222-4222-8222-222222222222'
const KEY='33333333-3333-4333-8333-333333333333'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-PAZO-P10-SYNTHETIC'
const PLAN='P-14V25407JP6850922NLHMDKI'
const CLAIM='2026-10-15T12:00:00.000Z'
const request=new Request('https://pazo.invalid/internal/recover',{method:'POST'})
const record=()=>({ownerId:OWNER,requestKey:KEY,intentId:INTENT,planId:PLAN,
 state:'pending',subscriptionId:null,providerCreateClaimed:true,
 providerCreateClaimedAt:CLAIM})
function harness(overrides={}){
 const calls=[]
 const api=create({
  resolveAuthenticatedOwner:async()=>{calls.push('auth');return overrides.owner===undefined?OWNER:overrides.owner},
  admit:async()=>{calls.push('admit');return overrides.admit??true},
  consentStore:{
   readRecoveryForOwner:async args=>{calls.push(['private',args])
    return overrides.row===undefined?record():overrides.row},
   bindRecoveredForOwner:async args=>{calls.push(['bind',args])
    if(overrides.bindError)throw Error('PRIVATE_KEY')
    return overrides.bindResult??'new_binding'},
  },
  merchantReader:{examinePrivate:async args=>{calls.push(['list',args])
   if(overrides.listError)throw Error('PAYPAL_TOKEN')
   return overrides.match===undefined?
    {outcome:'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY',subscriptionId:SUB}:overrides.match}},
  subscriptionReader:{readSubscription:async id=>{calls.push(['get',id])
   if(overrides.getError)throw Error('PAYER_EMAIL')
   return overrides.sub===undefined?
    {id:SUB,plan_id:PLAN,custom_id:INTENT,status:'APPROVAL_PENDING'}:overrides.sub}},
  verifyIndependentRelease:async args=>{calls.push(['release',args])
   if(overrides.releaseError)throw Error('PRIVATE_OPERATOR')
   return overrides.release===undefined?false:overrides.release},
  now:()=>Date.parse('2026-10-15T12:03:00Z'),
 })
 return{api,calls}
}
function safe(result){
 assert.equal(result.environment,'sandbox')
 assert.equal(result.entitlement,false);assert.equal(result.paidThrough,null)
 for(const k of ['mayRecordPayment','mayGrantBenefits','mayCreateSubscription',
  'mayResubscribe','mayEnableLive'])assert.equal(result[k],false)
 for(const secret of [OWNER,OTHER,KEY,INTENT,SUB,'PAYER_EMAIL','PAYPAL_TOKEN'])
  assert.ok(!JSON.stringify(result).includes(secret))
 return result
}
test('no operator release, no binding even with valid list and GET',async()=>{
 const h=harness()
 const r=safe(await h.api.inspect({request,requestKey:KEY}))
 assert.equal(r.reason,'independent_release_not_approved')
 assert.deepEqual(h.calls.map(x=>typeof x==='string'?x:x[0]),
  ['auth','admit','private','list','get','release'])
})
test('controlled synthetic release permits ONLY identity bind after second GET',async()=>{
 const h=harness({release:true})
 const r=safe(await h.api.inspect({request,requestKey:KEY}))
 assert.equal(r.phase,'BOUND_IDENTITY_ONLY')
 assert.equal(r.reason,'financial_reconciliation_required')
 assert.deepEqual(h.calls.map(x=>typeof x==='string'?x:x[0]),
  ['auth','admit','private','list','get','release','bind'])
 assert.deepEqual(h.calls[6][1],{ownerId:OWNER,requestKey:KEY,intentId:INTENT,subscriptionId:SUB})
})
test('foreign/authless/private wrong state and stale claims block before list',async()=>{
 for(const x of [
  {owner:null},{owner:OTHER},{admit:false},{row:null},
  {row:{...record(),ownerId:OTHER}},
  {row:{...record(),state:'bound',subscriptionId:SUB}},
  {row:{...record(),providerCreateClaimed:false}},
  {row:{...record(),providerCreateClaimedAt:'2026-10-10T12:00:00.000Z'}},
  {row:{...record(),providerCreateClaimedAt:'bad'}},
 ]){
  const h=harness(x)
  assert.equal(safe(await h.api.inspect({request,requestKey:KEY})).phase,'BLOCKED')
  assert.ok(!h.calls.some(k=>Array.isArray(k)&&k[0]==='list'))
 }
})
test('list ambiguity, cancelled status, cross-intent and PayPal outage block',async()=>{
 for(const x of [
  {listError:true},{getError:true},{releaseError:true},
  {match:{outcome:'NO_CANDIDATE_PROVEN'}},
  {match:{outcome:'DUPLICATE_MATCHING_INTENTS'}},
  {match:{outcome:'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY',subscriptionId:'I-WRONG'},
    sub:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'APPROVAL_PENDING'}},
  {sub:{id:SUB,plan_id:'P-OTHER',custom_id:INTENT,status:'APPROVAL_PENDING'}},
  {sub:{id:SUB,plan_id:PLAN,custom_id:'intent-other',status:'APPROVAL_PENDING'}},
  {sub:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE'}},
  {sub:{id:SUB,plan_id:PLAN,custom_id:INTENT,status:'CANCELLED'}},
 ]){
  const h=harness({...x,release:true})
  assert.equal(safe(await h.api.inspect({request,requestKey:KEY})).phase,'BLOCKED')
  assert.ok(!h.calls.some(k=>Array.isArray(k)&&k[0]==='bind'))
 }
})
test('invalid input never invokes auth and rejected SQL write reports blocked',async()=>{
 const h=harness({release:true,bindError:true})
 assert.equal(safe(await h.api.inspect({request:{},requestKey:KEY})).phase,'BLOCKED')
 assert.deepEqual(h.calls,[])
 assert.equal(safe(await h.api.inspect({request,requestKey:KEY})).reason,
  'atomic_recovery_bind_unconfirmed')
})
test('private merchant list yields candidate internally without leaking it publicly',async()=>{
 let calls=0
 const provider=createPazoSandboxOrphanMerchantReader({
  clientId:'MOCK_CLIENT_P10',clientSecret:'MOCK_SECRET_P10',
  fetchImpl:async(url,opts)=>{
   calls++
   assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'))
   if(url.endsWith('/v1/oauth2/token'))
    return{ok:true,json:async()=>({token_type:'Bearer',access_token:'MOCK_TOKEN_123'})}
   if(url.includes('/v1/billing/subscriptions?'))
    return{ok:true,json:async()=>({subscriptions:[{id:SUB}],links:[]})}
   return{ok:true,json:async()=>({id:SUB,plan_id:PLAN,custom_id:INTENT,
    status:'APPROVAL_PENDING',subscriber:{email_address:'secret@invalid.test'}})}
  },
 })
 const publicScan=await provider.examine({intentId:INTENT,claimedAt:CLAIM})
 assert.deepEqual(publicScan,{outcome:'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY'})
 const privateScan=await provider.examinePrivate({intentId:INTENT,claimedAt:CLAIM})
 assert.deepEqual(privateScan,{outcome:'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY',
  subscriptionId:SUB})
 assert.equal(calls,6)
})
test('missing verification dependency is rejected at construction',()=>{
 assert.throws(()=>create({}),/pazo_recovery_binding_review_not_configured/)
})
