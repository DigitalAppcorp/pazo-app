import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoSandboxV2CreatedEventAudit}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2CreatedEventAudit.mjs'
import {createPazoSandboxV2CreatedEventCandidateStore}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2CreatedEventCandidateStore.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const INTENT='intent-33333333-3333-4333-8333-333333333333'
const SUB='I-ORIGINAL-PRIVATE-0123'
const PLAN='P-14V25407JP6850922NLHMDKI'
const EVENT='WH-ORIGINAL-VERIFIED-TEST-1'
const TYPE='BILLING.SUBSCRIPTION.CREATED'
const credential='a'.repeat(35)
const params=Object.freeze({eventId:EVENT,eventType:TYPE,subscriptionId:SUB,
 intentId:INTENT,planId:PLAN})
const api=payload=>{
 const calls=[]
 const audit=createPazoSandboxV2CreatedEventAudit({
  clientId:'sandbox-client-123',clientSecret:'sandbox-secret-456',
  fetchImpl:async(url,init)=>{
   calls.push({url,method:init.method})
   if(url.endsWith('/oauth2/token'))
    return {ok:true,json:async()=>({token_type:'Bearer',access_token:'SECRET_TOKEN'})}
   return {ok:true,json:async()=>payload}
  }
 })
 return {audit,calls}
}
test('verified CREATED webhook is correlated only by exact merchant resource ID, no payment credit',async()=>{
 const {audit,calls}=api({id:EVENT,event_type:TYPE,resource:{id:SUB,plan_id:PLAN,custom_id:INTENT,
  subscriber:{email_address:'SENSITIVE-NOT-FOR-CLIENT@example.invalid'}}})
 const r=await audit.inspect(params)
 assert.equal(r.code,'created_event_matches_bound_subscription')
 assert.equal(r.correlated,true)
 assert.equal(r.eventReconciled,false,'CREATED remains pending until separate worker disposition')
 assert.equal(r.mayRetry,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.paidThrough,null)
 assert.deepEqual(calls.map(c=>c.method),['POST','GET'])
 assert.ok(calls[1].url.endsWith('/v1/notifications/webhooks-events/'+EVENT))
 for(const sensitive of [SUB,EVENT,INTENT,'SECRET_TOKEN','SENSITIVE-NOT-FOR-CLIENT'])
  assert.equal(JSON.stringify(r).includes(sensitive),false)
})
test('creation event with same date but different subscription is NOT a match',async()=>{
 for(const payload of [
  {id:EVENT,event_type:TYPE,resource:{id:'I-OTHER-999',plan_id:PLAN,custom_id:INTENT}},
  {id:EVENT,event_type:TYPE,resource:{id:SUB,plan_id:PLAN,custom_id:'intent-OTHER'}},
  {id:EVENT,event_type:TYPE,resource:{id:SUB,plan_id:'P-OTHER',custom_id:INTENT}},
  {id:'WH-DIFFERENT',event_type:TYPE,resource:{id:SUB}},
  {id:EVENT,event_type:'PAYMENT.SALE.COMPLETED',resource:{id:SUB}},
  {id:EVENT,event_type:TYPE,resource:null},
 ]){
  const {audit}=api(payload)
  const result=await audit.inspect(params)
  assert.equal(result.correlated,false)
  assert.equal(result.mayRetry,false)
  assert.equal(result.eventReconciled,false)
 }
})
test('CREATED event missing optional provider plan/custom ID still requires exact subscription ID',async()=>{
 const {audit}=api({id:EVENT,event_type:TYPE,resource:{id:SUB}})
 const r=await audit.inspect(params)
 assert.equal(r.correlated,true)
 assert.equal(r.eventReconciled,false)
})
test('invalid merchant reference is refused before provider fetch',async()=>{
 let calls=0
 const audit=createPazoSandboxV2CreatedEventAudit({
  clientId:'sandbox-client-123',clientSecret:'sandbox-secret-456',
  fetchImpl:async()=>{calls++;return {ok:true}}
 })
 await assert.rejects(()=>audit.inspect({...params,subscriptionId:'I-FOREIGN?'}),
  /created_audit_binding_unverified/)
 await assert.rejects(()=>audit.inspect({...params,eventType:'PAYMENT.SALE.COMPLETED'}),
  /created_audit_binding_unverified/)
 assert.equal(calls,0)
})
test('PayPal event read 404 is not terminal or absent subscription proof',async()=>{
 const audit=createPazoSandboxV2CreatedEventAudit({
  clientId:'sandbox-client-123',clientSecret:'sandbox-secret-456',
  fetchImpl:async(url)=>url.endsWith('/oauth2/token')
   ? {ok:true,json:async()=>({token_type:'Bearer',access_token:'private'})}
   : {ok:false,status:404}
 })
 await assert.rejects(()=>audit.inspect(params),/created_audit_event_not_found/)
})
test('candidate store accepts at most one server-verified, owner-scoped CREATED event',async()=>{
 const calls=[]
 const store=createPazoSandboxV2CreatedEventCandidateStore({
  projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  serviceRoleKey:credential,
  fetchImpl:async(url,init)=>{calls.push({url,init})
   return {ok:true,json:async()=>({eventId:EVENT,eventType:TYPE,verifiedAt:'2026-10-17T19:41:47+00:00'})}
  }
 })
 const x=await store.readForOwner({ownerId:OWNER,intentId:INTENT})
 assert.equal(x.eventId,EVENT)
 assert.deepEqual(JSON.parse(calls[0].init.body),{p_owner_id:OWNER,p_intent_id:INTENT})
 assert.ok(calls[0].url.endsWith('/f16_qa_v2_read_created_webhook_candidate'))
 await assert.rejects(()=>store.readForOwner({ownerId:'foreign',intentId:INTENT}))
 assert.equal(calls.length,1)
})
test('SQL inbox candidate is read-only, one-at-a-time and not a retry grant',()=>{
 const sql=readFileSync(new URL('../../../../supabase/migrations/20261018154128_f16_v2_created_webhook_candidate_readonly.sql',import.meta.url),'utf8')
 for(const x of ['BILLING.SUBSCRIPTION.CREATED',"e.processing_state='pending'",'count_candidate=1',
 'p_owner_id','p_intent_id','service_role','SECURITY DEFINER'])assert.ok(sql.includes(x),x)
 for(const forbidden of [/DELETE\s+FROM\b/i,/UPDATE\s+supporter_private\./i,
 /INSERT\s+INTO\s+supporter_private\./i,/GRANT\s+(INSERT|UPDATE|DELETE)/i])
  assert.ok(!forbidden.test(sql),String(forbidden))
})


test('Hosted audit route remains owner-only, read-only and never admits a payment or grants',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const beginning=edge.indexOf("if(data.action==='audit_created_webhook'){")
 const ending=edge.indexOf("if(data.action==='resume_approval'){",beginning)
 assert.ok(beginning>=0&&ending>beginning)
 const part=edge.slice(beginning,ending)
 for(const expected of [
  "QA_V2_CREATED_WEBHOOK_AUDIT_RELEASE_APPROVED = true",
  "runtime.canBuy(qaOwner)",
  "runtime.v2AccountStore.readForOwner({",
  "runtime.createdCandidateStore.readForOwner({",
  "runtime.createdEventAudit.inspect({",
  "eventReconciled:false","mayRetry:false","mayRecordPayment:false",
 ]){
  assert.ok((expected.includes("QA_V2_")?edge:part).includes(expected),expected)
 }
 assert.ok(!part.includes('subscriptionCreator.create('))
 assert.ok(!part.includes('retryCheckout.begin('))
 assert.ok(!part.includes('markReversal('))
 assert.ok(!part.includes('commitVerified('))
 assert.ok(ui.includes("action:'audit_created_webhook',intentId:account.intentId"))
 assert.ok(ui.includes("createdEventAudit==='matched'"))
 assert.ok(ui.includes("createdEventAudit==='missing'"))
 assert.ok(!ui.includes('window.location.assign(result.approvalUrl)'))
})
