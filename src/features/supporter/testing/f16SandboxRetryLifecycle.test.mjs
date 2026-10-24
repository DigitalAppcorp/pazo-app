import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {evaluateSandboxRetryEvidence} from '../sandboxRetryPolicy.mjs'
import {createPazoSandboxV2RetryConsentStore} from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2RetryConsentStore.mjs'
const ID='11111111-1111-4111-8111-111111111111'
const REQUEST='22222222-2222-4222-8222-222222222222'
const INTENT='intent-33333333-3333-4333-8333-333333333333'
const HASH='f'.repeat(64)
const TERMS='pazo-supporter-sandbox.benefits-v2'
const PLAN='P-14V25407JP6850922NLHMDKI'
const healthy=Object.freeze({environment:'sandbox',ownerVerified:true,
 oldIntentVerified:true,planVerified:true,currentStatus:'CANCELLED',
 merchantTerminalVerified:true,noCollectibleSubscription:true,
 paymentHistoryReconciled:true,noUnresolvedPayment:true,
 webhookInboxReconciled:true,noActiveOwnerSubscription:true,
 consentOfferCurrent:true})
test('F16 retry policy denies a naked PayPal 404, browser abandonment and unpaid redirect',()=>{
 for(const status of ['404','RESOURCE_NOT_FOUND','APPROVAL_PENDING','ACTIVE','APPROVED','SUSPENDED','CREATED',undefined]){
  const r=evaluateSandboxRetryEvidence({...healthy,currentStatus:status})
  assert.equal(r.canRetry,false,String(status))
 }
 assert.equal(evaluateSandboxRetryEvidence({}).canRetry,false)
 assert.equal(evaluateSandboxRetryEvidence(null).canRetry,false)
})
test('F16 merchant-confirmed terminal and all independent financial checks are mandatory',()=>{
 assert.deepEqual(evaluateSandboxRetryEvidence(healthy),{canRetry:true,code:'eligible_for_new_consent'})
 assert.equal(evaluateSandboxRetryEvidence({...healthy,currentStatus:'EXPIRED'}).canRetry,true)
 for(const field of ['ownerVerified','oldIntentVerified','planVerified',
  'merchantTerminalVerified','noCollectibleSubscription','paymentHistoryReconciled',
  'noUnresolvedPayment','webhookInboxReconciled','noActiveOwnerSubscription','consentOfferCurrent']){
  assert.equal(evaluateSandboxRetryEvidence({...healthy,[field]:false}).canRetry,false,field)
  assert.equal(evaluateSandboxRetryEvidence({...healthy,[field]:undefined}).canRetry,false,field)
 }
 assert.equal(evaluateSandboxRetryEvidence({...healthy,currentStatus:'MERCHANT_CONFIRMED_ABSENT'}).canRetry,false)
 assert.equal(evaluateSandboxRetryEvidence({...healthy,currentStatus:'MERCHANT_CONFIRMED_ABSENT',independentMerchantAuditVerified:true}).canRetry,true)
})
function mockStore({eligible=false,record,claim=true}={}){
 const calls=[]
 const store=createPazoSandboxV2RetryConsentStore({
  projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  serviceRoleKey:'a'.repeat(30),
  offerStore:{readOffer:async({locale})=>({locale,version:TERMS})},
  fetchImpl:async(url,opts)=>{
   const name=url.split('/').at(-1)
   const args=JSON.parse(opts.body)
   calls.push({name,args,method:opts.method})
   const value=name==='f16_qa_v2_retry_eligibility'?eligible:
     name==='f16_qa_v2_retry_claim_provider_create'?claim:
     name==='f16_qa_v2_retry_begin_checkout'?(record??{
       ownerId:ID,requestKey:REQUEST,intentId:INTENT,planId:PLAN,
       locale:'es',termsVersion:TERMS,termsDigest:HASH,
       state:'pending',createdAt:'2026-10-18T00:00:00Z',
     }):null
   return {ok:true,json:async()=>value}
  }
 })
 return {store,calls}
}
test('F16 retry adapter uses private owner-scoped eligibility and exact consent fields',async()=>{
 const {store,calls}=mockStore({eligible:true})
 assert.equal(await store.isEligible({ownerId:ID}),true)
 const result=await store.beginForOwner({ownerId:ID,requestKey:REQUEST,locale:'es',
  termsVersion:TERMS,termsDigest:HASH,affirmativeConsent:true})
 assert.equal(result.intentId,INTENT)
 assert.equal(result.state,'pending')
 assert.equal(await store.claimProviderCreate({ownerId:ID,requestKey:REQUEST,intentId:INTENT}),true)
 assert.deepEqual(calls.map(c=>c.name),[
  'f16_qa_v2_retry_eligibility','f16_qa_v2_retry_begin_checkout',
  'f16_qa_v2_retry_claim_provider_create'])
 assert.equal(calls[1].args.p_owner_id,ID)
 assert.equal(calls[1].args.p_request_key,REQUEST)
 assert.equal(calls[1].args.p_terms_digest,HASH)
 assert.equal(calls[1].args.p_affirmative,true)
 assert.ok(calls.every(c=>c.method==='POST'))
 assert.ok(calls.every(c=>!JSON.stringify(c.args).includes('clientSecret')))
})
test('F16 retry adapter fails closed on changed owner, missing new consent and provider-claim refusal',async()=>{
 const {store,calls}=mockStore({record:{ownerId:ID,requestKey:REQUEST,
  intentId:INTENT,planId:PLAN,locale:'en',termsVersion:TERMS,termsDigest:HASH,
  state:'pending',createdAt:'2026-10-18T00:00:00Z'},claim:false})
 await assert.rejects(()=>store.beginForOwner({ownerId:ID,requestKey:REQUEST,
  locale:'es',termsVersion:TERMS,termsDigest:HASH,affirmativeConsent:true}))
 assert.equal(await store.claimProviderCreate({ownerId:ID,requestKey:REQUEST,intentId:INTENT}),false)
 await assert.rejects(()=>store.beginForOwner({ownerId:ID,requestKey:REQUEST,
  locale:'es',termsVersion:TERMS,termsDigest:HASH,affirmativeConsent:false}))
 await assert.rejects(()=>store.isEligible({ownerId:'arbitrary'}))
 assert.equal(calls.length,2,'Invalid consent never reaches private SQL RPC')
})
test('F16 retry is owner-scoped and requires a private merchant grant, original P06 and V2 remain intact',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const sql=readFileSync(new URL('../../../../supabase/migrations/20261018132808_f16_sandbox_v2_append_only_checkout_retries.sql',import.meta.url),'utf8')
 const migrationNames=[
  'f16_sandbox_qa_v2_retry_grants','f16_sandbox_qa_v2_retry_attempts',
  'f16_qa_v2_retry_eligibility','f16_qa_v2_retry_begin_checkout',
  'f16_qa_v2_retry_claim_provider_create',
 ]
 for(const name of migrationNames)assert.ok(sql.includes(name),name)
 assert.ok(edge.includes('const QA_V2_RETRY_RELEASE_APPROVED = true'))
 assert.ok(edge.includes("reply(503,'sandbox_retry_not_released')"))
 assert.ok(edge.indexOf("if(!QA_V2_RETRY_RELEASE_APPROVED)")<edge.indexOf('runtime.retryCheckout.begin'))
 assert.ok(edge.includes("data.action==='retry_status'"))
 assert.ok(edge.includes("data.action==='retry_begin'"))
 assert.ok(edge.includes("runtime.retryConsentStore.isEligible({ownerId:qaOwner})"))
 assert.ok(edge.includes("runtime.retryCheckout.begin({request,consent:data.consent})"))
 for(const forbidden of [
  /DELETE\s+FROM\s+supporter_private\./i,
  /UPDATE\s+supporter_private\.paypal_subscription_intents/i,
  /DROP\s+TABLE/i,
  /ALTER\s+TABLE\s+supporter_private\.f16_sandbox_qa_v2_checkout_attempts/i,
  /GRANT\s+(INSERT|UPDATE|DELETE)\s+ON\s+supporter_private/i,
 ])assert.ok(!forbidden.test(sql),String(forbidden))
 assert.ok(sql.includes("grant_id uuid NOT NULL UNIQUE"))
 assert.ok(sql.includes('approved_at IS NOT NULL'))
 assert.ok(sql.includes("One v2 attempt per owner")===false)
 assert.ok(sql.includes('merchant_scope_verified'))
 assert.ok(sql.includes('no_collectible_subscription'))
 assert.ok(sql.includes('webhook_inbox_reconciled'))
 assert.ok(sql.includes('pg_advisory_xact_lock'))
 assert.ok(sql.includes('provider_create_claimed_at IS NULL'))
 assert.ok(sql.includes('FORCE ROW LEVEL SECURITY'))
 assert.ok(sql.includes('REVOKE ALL ON'))
 assert.ok(edge.includes('QA_V2_RETRY_RELEASE_APPROVED = true'))
})
