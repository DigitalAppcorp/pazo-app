import test from 'node:test'
import assert from 'node:assert/strict'
import {runPazoF18PrivateQaAuditOnce} from '../../../scripts/f18-paypal-qa-audit-once.mjs'
const invoker='f'.repeat(64)
const reply=data=>new Response(JSON.stringify(data),{
 status:200,headers:{'content-type':'application/json'}})
const audit={
 ok:true,code:'worker_qa_audit_read',outcome:'idle',processed:0,
 audit:{source:'original_qa_provider_audit_v1',complete:false,
  code:'qa_provider_read_subscription_get_unavailable',
  originalPlanVerified:true,providerHttpStatus:404,
  providerErrorName:'RESOURCE_NOT_FOUND',providerFailure:'http',
  eventReadable:true,signedEventMatches:true,providerDebugId:'a'.repeat(16),
  subscriptionId:'I-PRIVATE-SUBSCRIPTION',payer:'PRIVATE_NAME',credentials:'PRIVATE_SECRET',
  mayCharge:true}
}
test('no invoker: reject without calling a worker',async()=>{
 let calls=0
 const r=await runPazoF18PrivateQaAuditOnce({invoker:'',fetchImpl:async()=>{calls++}})
 assert.equal(r.code,'private_invoker_not_available');assert.equal(calls,0)
})
test('one fixed POST qa_audit, sanitized fields only, no provider CREATE/CANCEL or event reconciliation',async()=>{
 let calls=0
 const r=await runPazoF18PrivateQaAuditOnce({invoker,fetchImpl:async(url,opts)=>{
  calls++
  assert.equal(url,'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-worker')
  assert.equal(opts.method,'POST');assert.equal(opts.redirect,'error')
  assert.equal(opts.headers.authorization,'Bearer '+invoker)
  assert.deepEqual(JSON.parse(opts.body),{action:'qa_audit'})
  return reply(audit)
 }})
 assert.equal(calls,1);assert.equal(r.invocationSucceeded,true)
 assert.equal(r.evidenceComplete,false)
 assert.equal(r.providerHttpStatus,404)
 assert.equal(r.providerErrorName,'RESOURCE_NOT_FOUND')
 assert.equal(r.eventReadable,true);assert.equal(r.signedEventMatches,true)
 assert.equal(r.mayCreate,false);assert.equal(r.mayCancel,false)
 const sanitized=JSON.stringify(r)
 for(const forbidden of [invoker,'I-PRIVATE-SUBSCRIPTION','PRIVATE_NAME',
  'PRIVATE_SECRET','providerDebugId','mayCharge'])assert.ok(!sanitized.includes(forbidden))
})
test('worker disabled, malformed response and failure all fail closed without leaked data',async()=>{
 const f=async response=>runPazoF18PrivateQaAuditOnce({invoker,fetchImpl:async()=>response})
 const a=await f(reply({ok:true,code:'worker_disabled',processed:0}))
 assert.equal(a.invocationSucceeded,false)
 const b=await f(new Response('PAYPAL_PRIVATE',{status:503}))
 assert.equal(b.code,'private_worker_response_unavailable')
 assert.ok(!JSON.stringify(b).includes('PAYPAL_PRIVATE'))
 const c=await f(new Response('{PAYPAL_PRIVATE',{status:200}))
 assert.equal(c.code,'response_invalid')
 const d=await runPazoF18PrivateQaAuditOnce({invoker,fetchImpl:async()=>{throw Error('PRIVATE_TOKEN')}})
 assert.equal(d.code,'transport_unavailable')
 assert.ok(!JSON.stringify(d).includes('PRIVATE_TOKEN'))
})
test('audit returns accurate distinction between a completed provider audit and execution',async()=>{
 const r=await runPazoF18PrivateQaAuditOnce({invoker,fetchImpl:async()=>reply({
  ...audit,audit:{...audit.audit,complete:true,code:undefined,
   status:'APPROVAL_PENDING',providerHttpStatus:null,transactionsComplete:true,
   transactionCount:0,completedPayments:0}
 })})
 assert.equal(r.invocationSucceeded,true)
 assert.equal(r.evidenceComplete,true)
 assert.equal(r.providerStatus,'APPROVAL_PENDING')
 assert.equal(r.transactionCount,0)
 assert.equal(r.completedPayments,0)
 assert.equal(r.providerHttpStatus,null)
})
