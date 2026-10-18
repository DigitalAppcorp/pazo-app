import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxV2MerchantVerifier as verifier} from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2MerchantVerify.mjs'
const HOST='https://api-m.sandbox.paypal.com'
const NOW=Date.parse('2026-10-17T16:00:00.000Z')
const START='2026-10-15T03:20:37Z',END='2026-11-15T03:20:37Z'
const intentId='intent-44444444-4444-4444-8444-444444444444'
const subscriptionId='I-TESTV2-ABC123'
const ownerId='11111111-1111-4111-8111-111111111111'
const termsVersion='pazo-supporter-sandbox.benefits-v2'
const tx={id:'SALE-V2-00001',status:'COMPLETED',
 time:'2026-10-15T03:20:50Z',
 amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}
const sub={id:subscriptionId,plan_id:'P-14V25407JP6850922NLHMDKI',
 custom_id:intentId,status:'ACTIVE',start_time:START,
 billing_info:{next_billing_time:END}}
function subject({subscription=sub,transactions=[tx],sale={id:tx.id,state:'completed',
 amount:{currency:'USD',total:'2.99'},billing_agreement_id:subscriptionId},
 pages=1,items=transactions.length,links=[],now=NOW}={}){
 const urls=[],commits=[],holds=[]
 const fetchImpl=async(url,opts)=>{
  urls.push([url,opts.method])
  let data
  if(url===HOST+'/v1/oauth2/token')data={token_type:'Bearer',access_token:'synthetic-oauth-not-secret'}
  else if(url===HOST+'/v1/billing/subscriptions/'+subscriptionId)data=subscription
  else if(url.includes('/transactions?'))data={transactions,
   ...(pages===null?{}:{total_pages:pages}),
   ...(items===null?{}:{total_items:items}),links}
  else if(url===HOST+'/v1/payments/sale/'+tx.id)data=sale
  else throw Error('unexpected merchant URL '+url)
  return {ok:true,json:async()=>data}
 }
 const instance=verifier({
  clientId:'synthetic-client-id',clientSecret:'synthetic-client-secret',
  now:()=>now,fetchImpl,
  commitVerified:async data=>{
   commits.push(data)
   return {phase:'verified_first_sandbox_cycle',cycleVerified:true,periodEnd:data.serviceEnd}
  },
  markReversal:async data=>{holds.push(data);return true}
 })
 return {urls,commits,holds,verify:()=>instance.verifyFirstPaidCycle({
  ownerId,intentId,subscriptionId,termsVersion})}
}
test('completed USD 2.99 merchant sale creates exactly one verifiable first paid cycle',async()=>{
 const x=subject()
 const r=await x.verify()
 assert.equal(r.cycleVerified,true)
 assert.equal(r.mayGrantBenefits,true)
 assert.equal(r.paidThrough,'2026-11-15T03:20:37.000Z')
 assert.equal(x.commits.length,1)
 assert.equal(x.commits[0].saleId,'SALE-V2-00001')
 assert.equal(x.commits[0].ownerId,ownerId)
 assert.equal(x.commits[0].serviceStart,'2026-10-15T03:20:37.000Z')
 assert.ok(x.urls.some(([url])=>url.includes('/transactions?')))
 assert.ok(x.urls.some(([url])=>url.endsWith('/v1/payments/sale/SALE-V2-00001')))
})
test('PayPal optional pagination totals do not hide a single independently verified sale',async()=>{
 for(const opts of [{pages:null,items:null},{pages:null},{items:null}]){
  const x=subject(opts)
  const r=await x.verify()
  assert.equal(r.cycleVerified,true)
  assert.equal(x.commits.length,1)
  assert.equal(x.urls.filter(([url])=>url.includes('/v1/payments/sale/')).length,1)
 }
})
test('ambiguous or malformed transaction pagination never records paid periods',async()=>{
 for(const opts of [
  {pages:2},{pages:0},{items:99},
  {pages:null,items:null,links:[{rel:'next',href:'https://api-m.sandbox.paypal.com/next'}]},
  {pages:null,items:null,links:[{rel:'NEXT'}]},
  {pages:null,items:null,links:'invalid'},
  {pages:null,items:null,links:[null]},
 ]){
  const x=subject(opts)
  await assert.rejects(x.verify(),/incomplete_subscription_transactions/)
  assert.equal(x.commits.length,0)
 }
})
test('approval ACTIVE without a merchant paid transaction never creates perks',async()=>{
 const x=subject({transactions:[]})
 await assert.rejects(x.verify(),/incomplete_subscription_transactions/)
 assert.equal(x.commits.length,0)
})
test('wrong subscription intent, plan, or incomplete paginated history fails closed',async()=>{
 for(const diff of [
  {subscription:{...sub,custom_id:'intent-77777777-7777-4777-8777-777777777777'}},
  {subscription:{...sub,plan_id:'P-WRONG'}},
  {pages:2},
  {items:99},
  {transactions:[{...tx,status:'PENDING'}]},
  {transactions:[{...tx,amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'3.99'}}}]},
 ]){
  const x=subject(diff)
  await assert.rejects(x.verify(),/qa_v2_merchant_/)
  assert.equal(x.commits.length,0)
 }
})
test('period must be supplied by merchant and cannot be fabricated by local date',async()=>{
 for(const subscription of [
  {...sub,billing_info:{}},
  {...sub,start_time:'2026-10-15T03:20:37Z',billing_info:{next_billing_time:'2026-10-16T03:20:37Z'}},
  {...sub,start_time:'2026-09-01T03:20:37Z',billing_info:{next_billing_time:END}},
 ]){
  const x=subject({subscription})
  await assert.rejects(x.verify(),/merchant_period_dates_missing/)
  assert.equal(x.commits.length,0)
 }
})
test('independent merchant Sale GET must confirm correct completed sale and subscription',async()=>{
 for(const sale of [
  {id:tx.id,state:'pending',amount:{currency:'USD',total:'2.99'}},
  {id:tx.id,state:'completed',amount:{currency:'USD',total:'2.90'}},
  {id:tx.id,state:'completed',amount:{currency:'USD',total:'2.99'},billing_agreement_id:'I-FOREIGN'}
 ]){
  const x=subject({sale})
  await assert.rejects(x.verify(),/independent_sale_not_completed/)
  assert.equal(x.commits.length,0)
 }
})
test('merchant-confirmed refund disables previously saved Sandbox QA benefits',async()=>{
 for(const type of ['REFUNDED','PARTIALLY_REFUNDED']){
  const state=type==='REFUNDED'?'refunded':'partially_refunded'
  const x=subject({transactions:[{...tx,status:type}],
   sale:{id:tx.id,state,amount:{currency:'USD',total:'2.99'}}})
  const r=await x.verify()
  assert.equal(r.mayGrantBenefits,false)
  assert.equal(r.paidThrough,null)
  assert.equal(x.holds.length,1)
  assert.equal(x.holds[0].reason,state)
  assert.equal(x.commits.length,0)
 }
})
test('no browser-supplied invoice/amount/owner or live endpoint is used',async()=>{
 const x=subject()
 await x.verify()
 assert.equal(x.urls.every(([url])=>url.startsWith(HOST)),true)
 assert.equal(x.urls.filter(([,method])=>method==='POST').length,1)
 assert.equal(x.urls.find(([url])=>url.includes('/transactions?'))[1],'GET')
 assert.equal(x.commits.length,1)
})
