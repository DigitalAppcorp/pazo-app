import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPaypalLiveSubscriptionProvider,publicBetaOrigin,validLiveApprovalUrl} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveSubscriptionProvider.mjs'
import {createPazoLiveVerifiedCheckout} from '../../../../supabase/functions/pazo-paypal-live-checkout/liveCheckoutCandidate.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const key='23456789-1234-4234-8234-123456789abc'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const plan='P-1234567890ABCDE'
const sub='I-SUBSCRIPTION123'
const origin='https://pazo.example.com'
const approval='https://www.paypal.com/webapps/billing/subscriptions?ba_token=TEST_TOKEN'
const consent={requestKey:key,locale:'es',termsVersion:'pazo-supporter-live.offer-v1',
 termsDigest:'a'.repeat(64),affirmativeConsent:true}
const record={ownerId:owner,requestKey:key,intentId:intent,planId:plan,
 sourceEnvironment:'live',merchantGeneration:2,termsVersion:consent.termsVersion,
 termsDigest:consent.termsDigest,locale:'es',state:'pending',
 createdAt:'2026-10-19T18:00:00Z'}
function mock(overrides={}){
 let created=0,claimed=0,bound=0,consented=0
 const dependencies={
  releaseReady:true,planId:plan,merchantGeneration:2,
  resolveAuthenticatedOwner:async()=>owner,
  admit:async()=>true,
  consentStore:{
   beginForOwner:async()=>{consented++;return record},
   claimProviderCreate:async()=>{claimed++;return true}
  },
  subscriptionProvider:{
   createSubscription:async()=>{created++;return {
    subscriptionId:sub,status:'APPROVAL_PENDING',entitlement:false,approvalUrl:approval}},
   readSubscription:async()=>({id:sub,plan_id:plan,custom_id:intent,
    status:'APPROVAL_PENDING'})
  },
  intentStore:{bindVerified:async()=>{bound++;return {
    state:'bound',result:'new_binding',entitlement:false}}},
  ...overrides
 }
 return {dependencies,metrics:()=>({created,claimed,bound,consented})}
}
const request=()=>new Request('https://pazo.example.com/api/checkout',{method:'POST'})
test('Live checkout OFF by default and server entrypoint carries irreversible hard gate',async()=>{
 const c=mock()
 const result=await createPazoLiveVerifiedCheckout({...c.dependencies,releaseReady:false})
  .begin({request:request(),consent})
 assert.equal(result.phase,'BLOCKED');assert.equal(result.entitlement,false)
 assert.equal(c.metrics().consented,0)
 const src=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-checkout/index.ts',import.meta.url),'utf8')
 assert.match(src,/const LIVE_CHECKOUT_RELEASED=false/)
})
test('Only one durable consent claim can lead to one pending remote subscription',async()=>{
 const c=mock()
 const result=await createPazoLiveVerifiedCheckout(c.dependencies)
  .begin({request:request(),consent})
 assert.equal(result.phase,'APPROVAL_PENDING')
 assert.equal(result.approvalUrl,approval)
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.paymentVerified,false)
 assert.deepEqual(c.metrics(),{created:1,claimed:1,bound:1,consented:1})
})
test('Lost claim, existing subscription, another merchant or unconfirmed binding block BEFORE repeat',async()=>{
 for(const change of [
  {consentStore:{beginForOwner:async()=>record,claimProviderCreate:async()=>false}},
  {consentStore:{beginForOwner:async()=>({...record,state:'bound'}),
   claimProviderCreate:async()=>true}},
  {consentStore:{beginForOwner:async()=>({...record,sourceEnvironment:'sandbox'}),
   claimProviderCreate:async()=>true}},
  {consentStore:{beginForOwner:async()=>({...record,merchantGeneration:99}),
   claimProviderCreate:async()=>true}},
  {consentStore:{beginForOwner:async()=>({...record,termsDigest:'b'.repeat(64)}),
   claimProviderCreate:async()=>true}},
 ]){
  const c=mock(change)
  const r=await createPazoLiveVerifiedCheckout(c.dependencies)
   .begin({request:request(),consent})
  assert.equal(r.phase,'BLOCKED')
  assert.equal(c.metrics().created,0)
 }
})
test('Remote mismatch or SQL binding failure cannot return an approval link or grant payment',async()=>{
 for(const change of [
  {subscriptionProvider:{createSubscription:async()=>({subscriptionId:sub,status:'APPROVAL_PENDING',entitlement:false,approvalUrl:approval}),
   readSubscription:async()=>({id:sub,plan_id:'P-INVALID',custom_id:intent,status:'APPROVAL_PENDING'})}},
  {subscriptionProvider:{createSubscription:async()=>{throw Error('SECRET')},
   readSubscription:async()=>null}},
  {intentStore:{bindVerified:async()=>{throw Error('SECRET')}}}
 ]){
  const result=await createPazoLiveVerifiedCheckout(mock(change).dependencies)
   .begin({request:request(),consent})
  assert.equal(result.phase,'BLOCKED')
  assert.equal('approvalUrl' in result,false)
  assert.ok(!JSON.stringify(result).includes('SECRET'))
 }
})
test('User cannot alter plan, offer version, permission, owner or price through consent',async()=>{
 for(const invalid of [
  {...consent,affirmativeConsent:false},
  {...consent,termsVersion:'pazo-supporter-sandbox.benefits-v2'},
  {...consent,termsDigest:'bad'},
  {...consent,ownerId:owner},
  {...consent,priceMinor:299},
  {...consent,requestKey:'bad'},
 ]){
  const c=mock()
  const r=await createPazoLiveVerifiedCheckout(c.dependencies)
   .begin({request:request(),consent:invalid})
  assert.equal(r.phase,'BLOCKED')
  assert.equal(c.metrics().consented,0)
 }
})
test('Provider uses Live API only, PayPal-Request-Id and strict HTTPS beta/approval routes',async()=>{
 const calls=[]
 const fetchImpl=async(url,options)=>{
  calls.push({url,options})
  const data=url.endsWith('/token')?{token_type:'Bearer',access_token:'opaque_token_12345'}:
   url.endsWith('/subscriptions')?{id:sub,status:'APPROVAL_PENDING',
    links:[{rel:'approve',href:approval}]}:
   {id:sub,plan_id:plan,custom_id:intent,status:'APPROVAL_PENDING'}
  return {ok:true,status:200,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(data)}
 }
 const p=createPaypalLiveSubscriptionProvider({
  clientId:'CLIENTABCDEFG12',clientSecret:'SECRETABCDEFG12',
  planId:plan,origin,fetchImpl
 })
 const created=await p.createSubscription({intentId:intent,requestKey:key})
 assert.equal(created.subscriptionId,sub)
 assert.equal(created.entitlement,false)
 const remote=await p.readSubscription(sub)
 assert.equal(remote.custom_id,intent)
 assert.deepEqual(calls.map(x=>x.options.method),['POST','POST','POST','GET'])
 assert.ok(calls.every(x=>x.url.startsWith('https://api-m.paypal.com/')))
 const body=JSON.parse(calls[1].options.body)
 assert.equal(body.plan_id,plan)
 assert.equal(body.custom_id,intent)
 assert.equal(body.application_context.return_url,origin+'/paypal/return')
 assert.equal(calls[1].options.headers['PayPal-Request-Id'],key)
 assert.ok(!JSON.stringify(created).includes('opaque_token_12345'))
})
test('No localhost, Sandbox PayPal redirect, imposter host, HTTP or extra URL parameters',()=>{
 for(const s of ['http://localhost:5173','https://localhost',
  'https://evil.local','http://pazo.example.com','https://pazo.example.com/path'])
  assert.equal(publicBetaOrigin(s),false)
 assert.equal(publicBetaOrigin(origin),true)
 for(const s of ['http://www.paypal.com/webapps/billing/subscriptions?ba_token=X',
  'https://www.paypal.com.evil.invalid/webapps/billing/subscriptions?ba_token=X',
  'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=X',
  'https://www.paypal.com/webapps/billing/subscriptions?ba_token=X&next=https://evil.invalid'])
  assert.equal(validLiveApprovalUrl(s),false)
 assert.equal(validLiveApprovalUrl(approval),true)
})
