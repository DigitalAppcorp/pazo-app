import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxOrphanMerchantReader as reader,
 createPazoSandboxOrphanRecoveryProbe as probe}
 from '../../../../supabase/functions/f16-paypal-webhook/p09SandboxOrphanMerchantProbe.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const OTHER='22222222-2222-4222-8222-222222222222'
const KEY='33333333-3333-4333-8333-333333333333'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-SYNTHETIC-PAZO-123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const HOST='https://api-m.sandbox.paypal.com'
const CLAIM='2026-10-15T12:00:00Z'
const REQ=new Request('https://example.test/recovery',{method:'POST'})
function provider(overrides={}){
 const calls=[]
 const fetchImpl=async(url,init)=>{
  calls.push({url,init})
  assert.ok(url.startsWith(HOST+'/'))
  assert.equal(init.redirect,'error')
  if(url===HOST+'/v1/oauth2/token')return{
   ok:true,json:async()=>({token_type:'Bearer',access_token:'MOCK_SANDBOX_OAUTH'})}
  if(url.startsWith(HOST+'/v1/billing/subscriptions?'))return{
   ok:true,json:async()=>overrides.list??{
    subscriptions:[{id:SUB}],links:[]}}
  if(url.startsWith(HOST+'/v1/billing/subscriptions/'))return{
   ok:true,json:async()=>overrides.details??{
    id:SUB,plan_id:PLAN,custom_id:INTENT,
    status:'APPROVAL_PENDING',subscriber:{email_address:'private@test.invalid'},
    links:[{href:'https://secret.invalid'}]}}
  throw Error('unknown URL')
 }
 return{api:reader({clientId:'mock-client-12345',clientSecret:'mock-secret-12345',
  fetchImpl}),calls}
}
const record=()=>({ownerId:OWNER,requestKey:KEY,intentId:INTENT,
 planId:PLAN,state:'pending',subscriptionId:null,providerCreateClaimed:true,
 providerCreateClaimedAt:CLAIM})
function harness(x={}){
 const calls=[]
 const api=probe({
  resolveAuthenticatedOwner:async()=>{calls.push('auth');return x.owner??OWNER},
  admit:async()=>{calls.push('admit');return x.admit??true},
  consentStore:{readRecoveryForOwner:async v=>{calls.push(['private',v]);
   return x.saved===undefined?record():x.saved}},
  merchantReader:{examine:async args=>{
   calls.push(['merchant',args])
   if(x.merchantError)throw Error('SECRET_PAYPAL_ERROR')
   return{x:x.extra,outcome:x.outcome??'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY'}}},
  now:()=>Date.parse('2026-10-15T12:10:00Z'),
 })
 return{api,calls}
}
function safe(x){
 for(const k of ['paidThrough','mayRecordPayment','mayGrantBenefits',
  'mayCreateSubscription','mayBindSubscription','mayEnableLive','mayResubscribe']){
  assert.equal(x[k],k==='paidThrough'?null:false)
 }
 const output=JSON.stringify(x)
 for(const v of [OWNER,KEY,SUB,INTENT,'private@test.invalid','SECRET_PAYPAL_ERROR'])
  assert.equal(output.includes(v),false)
 return x
}
test('single matching custom_id is only a review candidate, never binding',async()=>{
 const p=provider()
 const r=await p.api.examine({intentId:INTENT,claimedAt:CLAIM})
 assert.equal(r.outcome,'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY')
 assert.equal(JSON.stringify(r).includes(SUB),false)
 assert.equal(JSON.stringify(r).includes('private@test.invalid'),false)
 assert.equal(p.calls.filter(x=>x.url.endsWith('/'+SUB)).length,1)
 assert.equal(p.calls.some(x=>x.init.method==='POST'&&
  !x.url.endsWith('/token')),false)
 const search=p.calls[1].url
 const url=new URL(search)
 assert.equal(url.searchParams.get('plan_ids'),PLAN)
 assert.equal(url.searchParams.get('page_size'),'10')
 assert.equal(url.searchParams.get('page'),'1')
 assert.ok(url.searchParams.get('created_after').startsWith('2026-10-15T11:59'))
 assert.ok(url.searchParams.get('created_before').startsWith('2026-10-15T12:10'))
})
test('empty list or foreign custom_id cannot prove subscription absent',async()=>{
 for(const options of [
  {list:{subscriptions:[],links:[]}},
  {details:{id:SUB,plan_id:PLAN,status:'APPROVAL_PENDING',
   custom_id:'intent-99999999-9999-4999-8999-999999999999'}},
 ]){
  const p=provider(options)
  assert.equal((await p.api.examine({intentId:INTENT,claimedAt:CLAIM})).outcome,
   'NO_CANDIDATE_PROVEN')
 }
})
test('next page, full page, malformed id, conflicting plan fail closed',async()=>{
 for(const [config,expected] of [
  [{list:{subscriptions:[{id:SUB}],links:[{rel:'next'}]}},
   'INCOMPLETE_MERCHANT_SCAN'],
  [{list:{subscriptions:Array.from({length:10},(_,i)=>({
    id:'I-SYNTH-'+i}))}},'INCOMPLETE_MERCHANT_SCAN'],
  [{list:{subscriptions:[{id:SUB},{id:SUB}]}},
   'AMBIGUOUS_MERCHANT_LIST'],
  [{list:{subscriptions:[{id:'https://evil.test'}]}},
   'AMBIGUOUS_MERCHANT_LIST'],
  [{details:{id:SUB,plan_id:'P-FOREIGN',custom_id:INTENT,
    status:'ACTIVE'}},'MERCHANT_PLAN_MISMATCH'],
  [{details:{id:SUB,plan_id:PLAN,custom_id:INTENT,
    status:'UNKNOWN'}},'MERCHANT_DETAILS_INCOMPLETE'],
 ]){
  const p=provider(config)
  assert.equal((await p.api.examine({intentId:INTENT,claimedAt:CLAIM})).outcome,
   expected)
 }
})
test('malformed provider scope does not call PayPal',async()=>{
 const p=provider()
 for(const args of [
  {intentId:'bad',claimedAt:CLAIM},
  {intentId:INTENT,claimedAt:'bad'},
  {intentId:INTENT,claimedAt:'not a date'},
 ])await assert.rejects(p.api.examine(args),/orphan_probe_scope_invalid/)
 assert.equal(p.calls.length,0)
})
test('orphan probe checks auth, private pending claim and time before merchant',async()=>{
 for(const x of [
  {owner:OTHER,saved:record()},{saved:null},
  {saved:{...record(),ownerId:OTHER}},
  {saved:{...record(),state:'bound',subscriptionId:SUB}},
  {saved:{...record(),providerCreateClaimed:false,
    providerCreateClaimedAt:null}},
  {saved:{...record(),providerCreateClaimedAt:null}},
  {admit:false},{merchantError:true},
 ]){
  const h=harness(x)
  const r=safe(await h.api.inspect({request:REQ,requestKey:KEY}))
  assert.equal(r.phase,'BLOCKED')
  if(!x.merchantError)assert.equal(h.calls.some(y=>Array.isArray(y)&&
   y[0]==='merchant'),false)
 }
})
test('probe exposes status only and no merchant identifiers to client',async()=>{
 const h=harness()
 const result=safe(await h.api.inspect({request:REQ,requestKey:KEY}))
 assert.equal(result.phase,'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY')
 assert.deepEqual(h.calls[2][1],{ownerId:OWNER,requestKey:KEY})
 assert.deepEqual(h.calls[3][1],{intentId:INTENT,claimedAt:CLAIM})
})
test('unsupported request and dependencies fail closed',async()=>{
 const h=harness()
 const r=safe(await h.api.inspect({request:REQ,requestKey:'bad'}))
 assert.equal(r.phase,'BLOCKED');assert.equal(h.calls.length,0)
 assert.throws(()=>probe({}),/orphan_probe_not_configured/)
 assert.throws(()=>reader({}),/orphan_reader_not_configured/)
})
