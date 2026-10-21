import test from 'node:test'
import assert from 'node:assert/strict'
import {createP05SandboxMerchantEvidenceReader as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p05SandboxMerchantEvidenceReader.mjs'

const SID='I-SYNTHETICFIRST123',SALE='SALE-PRIVATE123'
const INTENT='intent-private123',OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
const PLAN='P-TESTPLAN12345'
const EID='WH-SALE-PRIVATE123',BAD='WH-REFUNDED123'
const authTime='2026-10-15T03:20:39Z'
const ctx=(modify=()=>{})=>{
 const intent={id:INTENT,ownerId:OWNER,state:'bound',provider:'paypal',
  subscriptionId:SID,planId:PLAN}
 const refs=[{id:EID,type:'PAYMENT.SALE.COMPLETED',
  verifiedAt:authTime,processingState:'processing'}]
 const responses={
  token:{token_type:'Bearer',access_token:'SANDBOX_MOCK_TOKEN_ONLY'},
  sub:{id:SID,plan_id:PLAN,custom_id:INTENT,
   status:'ACTIVE',subscriber:{email_address:'private@example.com'}},
  tx:{total_pages:1,total_items:1,links:[],
   transactions:[{id:SALE,status:'COMPLETED',time:'2026-10-15T03:20:33Z',
    amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}},
    payer_email:'private@example.com'}]},
  event:{id:EID,event_type:'PAYMENT.SALE.COMPLETED',
   create_time:'2026-10-15T03:20:37.957Z',resource:{
    id:SALE,billing_agreement_id:SID,state:'completed',
    amount:{currency:'USD',total:'2.99'},
    payer:{payer_info:{email:'private@example.com'}}}},
  badEvent:{id:BAD,event_type:'PAYMENT.SALE.REFUNDED',
   create_time:'2026-10-15T03:30:37Z',resource:{payer_email:'private@example.com'}},
 }
 modify({refs,responses,intent})
 const calls=[], privateReads=[]
 const fetchImpl=async(url,opts)=>{
  calls.push({url,method:opts.method,hasSecret:!!opts.headers?.Authorization})
  assert.equal(opts.redirect,'error')
  assert.ok(opts.signal)
  assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'))
  let data
  if(url.endsWith('/v1/oauth2/token')) data=responses.token
  else if(url.endsWith('/v1/billing/subscriptions/'+SID)) data=responses.sub
  else if(url.includes('/transactions?')) data=responses.tx
  else if(url.endsWith('/webhooks-events/'+EID)) data=responses.event
  else if(url.endsWith('/webhooks-events/'+BAD)) data=responses.badEvent
  else throw Error('unexpected mocked URL')
  return {ok:true,json:async()=>data}
 }
 const reader=create({
  clientId:'PAYPAL_TEST_ID',clientSecret:'PAYPAL_TEST_SECRET',
  windowStart:'2026-10-15T02:03:31Z',windowEnd:'2026-10-15T04:00:00Z',
  readTrustedBoundIntent:async args=>{privateReads.push({kind:'intent',args});return intent},
  readTrustedInboxRefs:async args=>{privateReads.push({kind:'inbox',args});return refs},
  fetchImpl,
 })
 return {reader,calls,privateReads,refs,responses}
}
const assertSafe=result=>{
 assert.equal(result.environment,'sandbox')
 assert.equal(result.mayRecordPayment,false)
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.cycleVerified,false)
 assert.equal(result.paidThrough,null)
 assert.equal(result.financialHistoryComplete,false)
 assert.equal(result.webhookJournalComplete,false)
 assert.equal(result.refundsDisputesCoverageComplete,false)
 assert.equal(result.dbWrites,0)
 assert.equal(result.networkPaymentWrites,0)
 assert.equal(JSON.stringify(result).includes('private@example.com'),false)
 assert.equal(JSON.stringify(result).includes('SANDBOX_MOCK_TOKEN_ONLY'),false)
}
const run=async modify=>{
 const c=ctx(modify)
 const result=await c.reader.inspect({intentId:INTENT,saleEventId:EID})
 assertSafe(result)
 return {...c,result}
}
test('sandbox OAuth POST + 3 HTTPS GET are read-only; only minimum projections leave reader',async()=>{
 const {result,calls,privateReads}=await run()
 assert.deepEqual(privateReads,[
  {kind:'intent',args:{intentId:INTENT}},
  {kind:'inbox',args:{intentId:INTENT,subscriptionId:SID,saleEventId:EID}},
 ])
 assert.equal(calls.length,4)
 assert.equal(calls[0].method,'POST') // OAuth only, never payment request
 assert.ok(calls.slice(1).every(c=>c.method==='GET'))
 assert.equal(result.transaction.id,SALE)
 assert.equal(result.event.resource.billing_agreement_id,SID)
 assert.equal(result.merchantWindowMetadataComplete,true)
 assert.deepEqual(result.lifecycleEventTypes,['PAYMENT.SALE.COMPLETED'])
 assert.deepEqual(Object.keys(result.subscription).sort(),
  ['custom_id','id','plan_id','status'].sort())
})
test('subscription identifier is selected internally from the bound intent',async()=>{
 const c=ctx()
 const result=await c.reader.inspect({intentId:INTENT,saleEventId:EID,
  subscriptionId:'I-FOREIGN-BROWSER123'})
 assertSafe(result)
 assert.equal(result.subscription.id,SID)
 assert.deepEqual(c.privateReads[0],{kind:'intent',args:{intentId:INTENT}})
})
test('malformed or unbound private intent blocks before any PayPal read',async()=>{
 for(const mutate of [
  x=>x.state='pending',
  x=>x.ownerId='not-a-uuid',
  x=>x.subscriptionId='malformed',
  x=>x.planId=null,
  x=>x.provider='stripe',
 ]){
  const c=ctx(({intent})=>mutate(intent))
  await assert.rejects(c.reader.inspect({intentId:INTENT,saleEventId:EID}),
   /private_bound_intent_scope_invalid/)
  assert.equal(c.calls.length,0)
  assert.equal(c.privateReads.length,1)
 }
})
test('missing pagination metadata is not treated as complete',async()=>{
 const {result}=await run(({responses})=>{
  delete responses.tx.total_items
  delete responses.tx.total_pages
  delete responses.tx.links
 })
 assert.equal(result.merchantWindowMetadataComplete,false)
})
test('next-page link, inconsistent totals or missing links block metadata-complete flag',async()=>{
 for(const mutate of [
  x=>x.links=[{rel:'next',href:'https://paypal.example.invalid'}],
  x=>x.total_items=2,
  x=>x.total_pages=2,
  x=>delete x.links,
 ]){
  const {result}=await run(({responses})=>mutate(responses.tx))
  assert.equal(result.merchantWindowMetadataComplete,false)
 }
})
test('server-owned inbox lookup is required; a browser boolean is never enough',async()=>{
 assert.throws(()=>create({clientId:'PAYPAL_TEST_ID',
  clientSecret:'PAYPAL_TEST_SECRET',windowStart:'2026-10-15T02:03:31Z',
  windowEnd:'2026-10-15T04:00:00Z'}),/not_configured/)
 for(const mutate of [
  x=>x.splice(0),
  x=>x[0].processingState='pending',
  x=>x[0].verifiedAt=null,
  x=>x[0].type='BILLING.SUBSCRIPTION.ACTIVATED',
  x=>x.push({...x[0]}),
 ]){
  const c=ctx(({refs})=>mutate(refs))
  await assert.rejects(c.reader.inspect({intentId:INTENT,saleEventId:EID}))
  assert.equal(c.calls.length,0)
 }
})
test('invalid subscription or event reference fails before any token request',async()=>{
 for(const invalid of [
  {intentId:'https://example.com',saleEventId:EID},
  {intentId:INTENT,saleEventId:'../inject'},
 ]){
  const c=ctx()
  await assert.rejects(c.reader.inspect(invalid),/server_scoped_refs_invalid/)
  assert.equal(c.calls.length,0)
 }
})
test('strict Sandbox window bounds prevent unbounded history requests',()=>{
 for(const values of [
  {windowStart:'2026-09-01T00:00:00Z',windowEnd:'2026-11-01T00:00:00Z'},
  {windowStart:'2026-10-15T04:00:00Z',windowEnd:'2026-10-15T03:00:00Z'},
  {windowStart:'2026-02-30T03:00:00Z',windowEnd:'2026-03-01T03:00:00Z'},
 ]){
  assert.throws(()=>create({
   clientId:'PAYPAL_TEST_ID',clientSecret:'PAYPAL_TEST_SECRET',
   readTrustedBoundIntent:async()=>({}),
   readTrustedInboxRefs:async()=>[],fetchImpl:async()=>({ok:false}),...values,
  }),/window_invalid/)
 }
})
test('PayPal event body must match the exact signed-inbox ID and type',async()=>{
 for(const mutate of [
  x=>x.id='WH-OTHER',
  x=>x.event_type='BILLING.SUBSCRIPTION.ACTIVATED',
  x=>x.create_time='2026-02-30T03:20:37Z',
 ]){
  const c=ctx(({responses})=>mutate(responses.event))
  await assert.rejects(c.reader.inspect({intentId:INTENT,saleEventId:EID}))
 }
})
test('sale event requires the bound subscription and exact merchant transaction',async()=>{
 for(const mutate of [
  x=>x.resource.billing_agreement_id='I-FOREIGN123',
  x=>x.resource.id='SALE-FOREIGN123',
  x=>x.resource.amount.total='5.98',
  x=>x.resource.state='pending',
 ]){
  const c=ctx(({responses})=>mutate(responses.event))
  await assert.rejects(c.reader.inspect({intentId:INTENT,saleEventId:EID}))
 }
})
test('merchant transaction mismatch, duplicate sale and non-completed state reject',async()=>{
 for(const mutate of [
  x=>x.transactions[0].status='PENDING',
  x=>x.transactions[0].amount_with_breakdown.gross_amount.currency_code='EUR',
  x=>x.transactions.push({...x.transactions[0]}),
  x=>x.transactions=[],
 ]){
  const c=ctx(({responses})=>mutate(responses.tx))
  await assert.rejects(c.reader.inspect({intentId:INTENT,saleEventId:EID}))
 }
})
test('signed refund event can be observed but NEVER certifies clear refund coverage',async()=>{
 const {result}=await run(({refs})=>{
  refs.push({id:BAD,type:'PAYMENT.SALE.REFUNDED',
   verifiedAt:authTime,processingState:'processing'})
 })
 assert.deepEqual(result.lifecycleEventTypes,
  ['PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED'])
 assert.equal(result.refundsDisputesCoverageComplete,false)
 assert.equal(result.mayGrantBenefits,false)
})
test('the reader cannot assert coverage of a full event journal from a small inbox list',async()=>{
 const {result}=await run()
 assert.equal(result.webhookJournalComplete,false)
 assert.equal(result.financialHistoryComplete,false)
})
test('wrong merchant subscription ID rejects and does not output any PII',async()=>{
 const c=ctx(({responses})=>{responses.sub.id='I-FOREIGN123'})
 await assert.rejects(c.reader.inspect({intentId:INTENT,saleEventId:EID}),
  /merchant_subscription_binding_mismatch/)
})
test('token and provider failures never emit raw provider body or secrets',async()=>{
 const c=ctx(({responses})=>{responses.token={token_type:'Bearer',
  access_token:'xx'}})
 await assert.rejects(c.reader.inspect({intentId:INTENT,saleEventId:EID}),
  /sandbox_read_only_auth_invalid/)
 assert.equal(c.calls.length,1)
})

test('external fetch errors cannot leak a secret into worker diagnostics',async()=>{
 const reader=create({
  clientId:'PAYPAL_TEST_ID',clientSecret:'PAYPAL_TEST_SECRET',
  windowStart:'2026-10-15T02:03:31Z',windowEnd:'2026-10-15T04:00:00Z',
  readTrustedBoundIntent:async()=>({id:INTENT,ownerId:OWNER,state:'bound',
   provider:'paypal',subscriptionId:SID,planId:PLAN}),
  readTrustedInboxRefs:async()=>[{id:EID,type:'PAYMENT.SALE.COMPLETED',
   verifiedAt:authTime,processingState:'processing'}],
  fetchImpl:async()=>{throw Error('private@example.com:SECRET_PAYPAL_TOKEN')},
 })
 await assert.rejects(reader.inspect({intentId:INTENT,saleEventId:EID}),
  e=>e.message==='paypal_read_only_transport_unavailable')
})
test('private intent/inbox read exceptions never disclose internal details',async()=>{
 const base={
  clientId:'PAYPAL_TEST_ID',clientSecret:'PAYPAL_TEST_SECRET',
  windowStart:'2026-10-15T02:03:31Z',windowEnd:'2026-10-15T04:00:00Z',
  readTrustedBoundIntent:async()=>({id:INTENT,ownerId:OWNER,state:'bound',
   provider:'paypal',subscriptionId:SID,planId:PLAN}),
  readTrustedInboxRefs:async()=>[{id:EID,type:'PAYMENT.SALE.COMPLETED',
   verifiedAt:authTime,processingState:'processing'}],
  fetchImpl:async()=>({ok:false}),
 }
 const first=create({...base,readTrustedBoundIntent:async()=>{
  throw Error('private@example.com:ACCOUNT_TOKEN')}})
 await assert.rejects(first.inspect({intentId:INTENT,saleEventId:EID}),
  e=>e.message==='private_bound_intent_read_unavailable')
 const second=create({...base,readTrustedInboxRefs:async()=>{
  throw Error('private@example.com:ACCOUNT_TOKEN')}})
 await assert.rejects(second.inspect({intentId:INTENT,saleEventId:EID}),
  e=>e.message==='private_signed_inbox_read_unavailable')
})
