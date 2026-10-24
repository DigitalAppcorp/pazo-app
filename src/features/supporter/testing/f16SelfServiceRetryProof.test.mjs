import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoSandboxV2RetryMerchantProof}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2RetryMerchantProof.mjs'
const PLAN='P-14V25407JP6850922NLHMDKI'
const OWNER='11111111-1111-4111-8111-111111111111'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const SUB='I-SELF-SERVICE-QA778'
const HOST='https://api-m.sandbox.paypal.com'
const NOW=Date.parse('2026-10-19T09:00:00Z')
const CREATED='2026-10-19T08:00:00Z'
const candidate={eventId:'WH-CREATED-777',eventType:'BILLING.SUBSCRIPTION.CREATED',verifiedAt:'2026-10-19T08:00:03Z'}
function fixture({merchant='404',inv='original_not_in_current_merchant_inventory',events=[],candidateOk=true,transactionRows=[],repeat='same'}={}){
 let getCount=0
 let providerEvents=events.length ?events:[
  {id:candidate.eventId,event_type:'BILLING.SUBSCRIPTION.CREATED',
   resource:{id:SUB,custom_id:INTENT,plan_id:PLAN}}
 ]
 const calls=[]
 const fetchImpl=async(url,opts)=>{
  calls.push([url,opts.method])
  assert.ok(url.startsWith(HOST+'/'))
  if(url.endsWith('/v1/oauth2/token'))
   return {ok:true,json:async()=>({token_type:'Bearer',access_token:'MOCK_TEST_TOKEN_123456'})}
  if(url.includes('/v1/notifications/webhooks-events?'))
   return {ok:true,json:async()=>({events:providerEvents,links:[]})}
  if(url.endsWith('/v1/billing/subscriptions/'+SUB)){
   getCount++
   if(merchant==='404'||repeat==='404'&&getCount===2)
    return {ok:false,status:404}
   return {ok:true,json:async()=>({
    id:SUB,plan_id:PLAN,custom_id:INTENT,
    status:merchant})}
  }
  if(url.includes('/v1/billing/subscriptions/'+SUB+'/transactions?'))
   return {ok:true,json:async()=>({transactions:transactionRows,total_items:transactionRows.length,total_pages:1,links:[]})}
  throw Error('unexpected URL')
 }
 let audit=0
 const proof=createPazoSandboxV2RetryMerchantProof({
  clientId:'TEST_SANDBOX_CLIENT_ID',clientSecret:'TEST_SANDBOX_CLIENT_SECRET',
  fetchImpl,now:()=>NOW,
  inventoryRead:{inspect:async()=>({code:inv,merchantInventoryEnumerated:true})},
  createdCandidateStore:{readForOwnerMulti:async()=>candidateOk?candidate:null},
  createdEventAudit:{inspect:async()=>{audit++;return {correlated:candidateOk}}}
 })
 return {proof,calls,audit:()=>audit}
}
const args={ownerId:OWNER,intentId:INTENT,subscriptionId:SUB,consentedAt:CREATED}
test('404 plus signed CREATED, fully enumerated merchant absence and clean events yields ONLY a retry digest',async()=>{
 const h=fixture()
 const r=await h.proof.verify(args)
 assert.equal(r.resolution,'MERCHANT_CONFIRMED_ABSENT')
 assert.match(r.evidenceDigest,/^[0-9a-f]{64}$/)
 assert.equal(r.checkedAt,'2026-10-19T09:00:00.000Z')
 assert.equal(h.audit(),1)
 assert.equal(h.calls.filter(([u])=>u.endsWith('/v1/billing/subscriptions/'+SUB)).length,2)
 assert.ok(!JSON.stringify(r).includes(SUB))
 assert.ok(!JSON.stringify(r).includes(OWNER))
})
test('CANCELLED with zero transactions and verified events permits retry; payment or activation blocks',async()=>{
 const terminal=fixture({merchant:'CANCELLED'})
 assert.equal((await terminal.proof.verify(args)).resolution,'CANCELLED')
 const withSale=fixture({merchant:'CANCELLED',transactionRows:[{id:'PAY-1'}]})
 await assert.rejects(withSale.proof.verify(args))
 const withActivation=fixture({events:[
  {id:candidate.eventId,event_type:'BILLING.SUBSCRIPTION.CREATED',resource:{id:SUB}},
  {id:'X-ACT',event_type:'BILLING.SUBSCRIPTION.ACTIVATED',resource:{id:SUB}}
 ]})
 await assert.rejects(withActivation.proof.verify(args))
 const withBilling=fixture({events:[
  {id:candidate.eventId,event_type:'BILLING.SUBSCRIPTION.CREATED',resource:{id:SUB}},
  {id:'PAY-1',event_type:'PAYMENT.SALE.COMPLETED',resource:{billing_agreement_id:SUB}}
 ]})
 await assert.rejects(withBilling.proof.verify(args))
})
test('a bare 404, missing signed audit, incomplete inventory or missing payment event association cannot authorize retry',async()=>{
 for(const options of [
  {candidateOk:false},{inv:'unfiltered_inventory_collection_unverified'},
  {events:[{id:'ONLY-UNRELATED',event_type:'BILLING.SUBSCRIPTION.CREATED',resource:{id:'I-OTHER'}}]},
  {events:[{id:candidate.eventId,event_type:'BILLING.SUBSCRIPTION.CREATED',resource:{id:SUB}},
   {id:'PAY-1',event_type:'PAYMENT.SALE.COMPLETED',resource:{id:'X-OTHER'}}]},
  {repeat:'404',merchant:'CANCELLED'},
  {merchant:'ACTIVE'},
 ]){
  const h=fixture(options)
  await assert.rejects(h.proof.verify(args),JSON.stringify(options))
 }
})
test('no incomplete timeframe, unsafe identity, or missing provider event details',async()=>{
 const h=fixture()
 await assert.rejects(h.proof.verify({...args,consentedAt:'2026-09-01T08:00:00Z'}))
 await assert.rejects(h.proof.verify({...args,subscriptionId:'I-/strange'}))
 await assert.rejects(h.proof.verify({...args,intentId:'intent-wrong'}))
 await assert.rejects(fixture({events:[{id:candidate.eventId,event_type:'BILLING.SUBSCRIPTION.CREATED',resource:{id:SUB,custom_id:'wrong'}}]}).proof.verify(args))
})
test('automatic retry grant is service-only and never rewrites historical subscriptions',()=>{
 const sql=readFileSync(new URL('../../../../supabase/migrations/20261019134346_f16_sandbox_v2_automatic_reconciled_retry.sql',import.meta.url),'utf8')
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const parent=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const child=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 assert.ok(sql.includes('f16_qa_v2_issue_reconciled_retry'))
 assert.ok(sql.includes("p_resolution NOT IN ('CANCELLED','EXPIRED','MERCHANT_CONFIRMED_ABSENT')"))
 assert.ok(sql.includes("FROM supporter_private.f16_sandbox_qa_paid_periods p"))
 assert.ok(sql.includes("FROM supporter_private.paypal_payment_entries p"))
 assert.ok(sql.includes("FROM supporter_private.paypal_verified_activation_bindings b"))
 assert.ok(sql.includes("pg_advisory_xact_lock"))
 assert.ok(sql.includes("approved_at"))
 assert.ok(sql.includes("TO service_role"))
 assert.ok(sql.includes("FROM PUBLIC,anon,authenticated,service_role"))
 assert.ok(!sql.includes('DELETE FROM supporter_private'))
 assert.ok(!sql.includes('UPDATE supporter_private'))
 assert.ok(edge.includes("data.action==='recover_retry'"))
 assert.ok(edge.includes("retryMerchantProof.verify"))
 assert.ok(edge.includes("retryConsentStore.approveReconciled"))
 assert.ok(edge.includes("recovery_check_merchant_evidence"))
 assert.ok(edge.includes("code:'reconciled_retry_ready'"))
 assert.ok(!edge.includes("code:'paid_verified_from_retry'"))
 assert.ok(parent.includes("qaPayAction==='retry_ready'"))
 assert.ok(parent.includes('<SandboxCheckoutQaPanel lang={lang} inline'))
 assert.ok(child.includes("action:'recover_retry'"))
 assert.ok(child.includes("onResumeStatus?.('retry_ready')"))
})

test('returning from unapproved PayPal login cancels exact pending resource before a NEW consent',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const start=edge.indexOf("if(data.action==='recover_retry')")
 const end=edge.indexOf("// Recover only the original PayPal approval",start)
 assert.ok(start>0&&end>start)
 const scoped=edge.slice(start,end)
 assert.ok(scoped.includes("merchant.status==='APPROVAL_PENDING'"))
 assert.ok(scoped.includes('runtime.canAbandonPending(qaOwner,account.intentId)'))
 assert.ok(scoped.includes('runtime.cancellation.cancelPending({'))
 assert.ok(scoped.includes("cancelled.status!=='CANCELLED'"))
 assert.ok(scoped.includes("else if(!['CANCELLED','EXPIRED'].includes(merchant.status))"),
   'Do not reject the stale pre-cancel merchant state after confirmed CANCELLED')
 assert.ok(scoped.includes('runtime.retryMerchantProof.verify({'))
 assert.ok(scoped.includes('runtime.retryConsentStore.approveReconciled({'))
 assert.ok(scoped.includes("phase:'RETRY_READY'"))
 assert.ok(scoped.includes('mayGrantBenefits:false'))
 assert.ok(!scoped.includes("code:'approval_can_resume'"),
   'Never redirect to a potentially stale BA approval token after abandonment')
 assert.ok(!scoped.includes('runtime.retryCheckout.begin('),
   'A new checkout requires a separate affirmative purchase click')
 assert.ok(!scoped.includes('recordPayment('))
})
