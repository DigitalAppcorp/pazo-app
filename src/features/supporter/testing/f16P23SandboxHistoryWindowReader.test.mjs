import test from 'node:test'
import assert from 'node:assert/strict'
import {createP23SandboxHistoryWindowReader as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p23SandboxHistoryWindowReader.mjs'
const EVENT='WH-P23-TEST001',TOKEN='11111111-1111-4111-8111-111111111111'
const SUB='I-P23-BOUND001',INTENT='intent-77777777-7777-4777-8777-777777777777'
const SALE='SALE-P23-01',PLAN='P-14V25407JP6850922NLHMDKI'
const event=()=>({id:EVENT,event_type:'PAYMENT.SALE.COMPLETED',
 resource:{id:SALE,billing_agreement_id:SUB,
  state:'completed',amount:{currency:'USD',total:'2.99'}}})
const subscription=()=>({id:SUB,plan_id:PLAN,custom_id:INTENT,status:'ACTIVE'})
const contract=()=>({intentId:INTENT,subscriptionId:SUB,
 acceptedAt:'2026-06-01T00:00:00Z',startAt:'2026-06-01T00:00:00Z',
 endAt:'2026-08-01T00:00:00Z'})
const transaction=(id,time='2026-06-14T00:00:00Z',status='COMPLETED')=>({
 id,time,status,amount_with_breakdown:{
  gross_amount:{currency_code:'USD',value:'2.99'}},
 payer_email:'private@example.invalid'})
function factory(mutate=()=>{}){
 const calls=[]
 const state={event:event(),sub:subscription(),contract:contract(),
  first:transaction(SALE),other:null,
  pageExtra:{},failRead:false}
 mutate(state)
 let seenPages=0
 const reader=create({
  scope:'OFFLINE_SYNTHETIC_TEST_ONLY',
  clientId:'SYNTHETIC_CLIENT_ID',
  clientSecret:'SYNTHETIC_CLIENT_SECRET',
  getClaimedMerchantEvent:async a=>{calls.push(['event',a]);return state.event},
  getClaimedMerchantSubscription:async a=>{calls.push(['sub',a]);return state.sub},
  readTrustedContractWindow:async a=>{calls.push(['contract',a]);return state.contract},
  fetchImpl:async (url,opts)=>{
   calls.push(['fetch',url,opts.method])
   assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'))
   assert.equal(opts.redirect,'error')
   assert.ok(opts.signal)
   if(url.endsWith('/v1/oauth2/token')){
    assert.equal(opts.method,'POST')
    return{ok:true,json:async()=>({
     token_type:'Bearer',access_token:'synthetic-access-token'})}
   }
   assert.equal(opts.method,'GET')
   assert.ok(url.includes('/v1/billing/subscriptions/'+SUB+'/transactions?'))
   if(state.failRead)return{ok:false,json:async()=>({})}
   const u=new URL(url)
   const start=u.searchParams.get('start_time')
   const end=u.searchParams.get('end_time')
   assert.ok(new Date(end)>new Date(start))
   assert.ok(new Date(end)-new Date(start)<=30*86400000)
   const rows=seenPages++===0?[state.first,...(state.other?[state.other]:[])]:[]
   return{ok:true,json:async()=>({
    total_pages:rows.length?1:0,total_items:rows.length,
    transactions:rows,links:[],...state.pageExtra,
   })}
  },
 })
 return{reader,calls,state}
}
const expectSafe=r=>{
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.fullFinancialHistoryVerified,false)
 assert.equal(r.refundsDisputesCoverageComplete,false)
 assert.equal(r.cycleVerified,false)
 assert.equal(r.paidThrough,null)
 for(const v of [EVENT,TOKEN,SUB,INTENT,SALE,
  'private@example.invalid','synthetic-access-token'])
  assert.ok(!JSON.stringify(r).includes(v))
}
test('P23 disabled state refuses without network or merchant callbacks',async()=>{
 let touches=0
 const w=create({getClaimedMerchantEvent:()=>{touches++}})
 const r=await w.inspect({eventId:EVENT,claimToken:TOKEN})
 expectSafe(r);assert.equal(r.phase,'REVIEW_REQUIRED')
 assert.equal(r.reason,'reader_disabled');assert.equal(touches,0)
})
test('P23 contiguous bounded GET windows with one sale stay review-only',async()=>{
 const f=factory()
 const r=await f.reader.inspect({eventId:EVENT,claimToken:TOKEN})
 expectSafe(r)
 assert.equal(r.phase,'WINDOWS_CHECKED_REVIEW_ONLY')
 assert.equal(r.windowCount,3)
 assert.equal(r.transactionCount,1)
 assert.equal(r.otherTransactionCount,0)
 const paths=f.calls.filter(x=>x[0]==='fetch')
 assert.equal(paths.filter(x=>x[2]==='GET').length,3)
 assert.equal(paths.filter(x=>x[2]==='POST').length,1)
 assert.deepEqual(f.calls.slice(0,3).map(x=>x[0]),['event','sub','contract'])
})
test('P23 incomplete or next-page data fails closed',async()=>{
 for(const extras of [
  {total_pages:2},{total_items:200},{links:[{rel:'next',href:'https://example.invalid'}]},
 ]){
  const f=factory(s=>{s.pageExtra=extras})
  const r=await f.reader.inspect({eventId:EVENT,claimToken:TOKEN})
  expectSafe(r)
  assert.equal(r.reason,'transaction_pagination_or_window_incomplete')
 }
})
test('P23 duplicate transactions, wrong dates and missing sale fail closed',async()=>{
 const bad=[
  s=>s.other=transaction(SALE),
  s=>s.first.time='2026-12-01T00:00:00Z',
  s=>s.first.id='SALE-OTHER-01',
 ]
 const reasons=['transaction_duplicate_or_time_untrusted',
  'transaction_duplicate_or_time_untrusted',
  'signed_sale_not_unique_in_complete_windows']
 for(let i=0;i<bad.length;i++){
  const f=factory(bad[i]),r=await f.reader.inspect({eventId:EVENT,claimToken:TOKEN})
  expectSafe(r);assert.equal(r.reason,reasons[i])
 }
})
test('P23 refund-like noncompleted status never treated as paid',async()=>{
 for(const status of ['REFUNDED','PARTIALLY_REFUNDED','PENDING']){
  const f=factory(s=>s.first.status=status)
  const r=await f.reader.inspect({eventId:EVENT,claimToken:TOKEN})
  expectSafe(r)
  assert.equal(r.reason,'non_regular_or_reversed_transaction_in_window')
 }
})
test('P23 bad lease/contract and future/unbounded history refuse before OAuth',async()=>{
 const fixtures=[
  s=>s.contract.acceptedAt='2026-09-01T00:00:00Z',
  s=>s.contract.endAt='2028-02-01T00:00:00Z',
  s=>s.sub.custom_id='intent-OTHER-FOREIGN-123456',
  s=>s.event.resource.billing_agreement_id='I-FOREIGN-123',
 ]
 for(const change of fixtures){
  const f=factory(change)
  const r=await f.reader.inspect({eventId:EVENT,claimToken:TOKEN})
  expectSafe(r)
  assert.equal(r.phase,'REVIEW_REQUIRED')
  assert.equal(f.calls.some(x=>x[0]==='fetch'),false)
 }
})
test('P23 service downtime and missing credentials fail closed',async()=>{
 assert.throws(()=>create({scope:'OFFLINE_SYNTHETIC_TEST_ONLY'}),
  /p23_synthetic_reader_not_configured/)
 const f=factory(s=>s.failRead=true)
 const r=await f.reader.inspect({eventId:EVENT,claimToken:TOKEN})
 expectSafe(r);assert.equal(r.reason,'merchant_transaction_window_unavailable')
})
