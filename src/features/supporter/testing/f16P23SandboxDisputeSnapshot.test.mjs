import test from 'node:test'
import assert from 'node:assert/strict'
import {createP23SandboxDisputeSnapshot as create}
 from '../../../../supabase/functions/f16-paypal-webhook/p23SandboxDisputeSnapshot.mjs'
const EVENT='WH-P23-DISPUTE001'
const CLAIM='11111111-1111-4111-8111-111111111111'
const SALE='SALEP23001'
const item=()=>({id:EVENT,event_type:'PAYMENT.SALE.COMPLETED',
 resource:{id:SALE,state:'completed'}})
function fixture(changes=()=>{}){
 const state={sale:item(),list:{items:[],links:[]},deny:false}
 changes(state)
 const requests=[]
 const reader=create({scope:'OFFLINE_SYNTHETIC_TEST_ONLY',
  clientId:'SYNTHETIC_CLIENT_ID',clientSecret:'SYNTHETIC_CLIENT_SECRET',
  getClaimedMerchantEvent:async args=>{requests.push(['claim',args]);return state.sale},
  fetchImpl:async(url,opts)=>{
   requests.push([opts.method,url])
   assert.ok(url.startsWith('https://api-m.sandbox.paypal.com/'))
   assert.equal(opts.redirect,'error')
   if(state.deny)return{ok:false}
   if(url.endsWith('/v1/oauth2/token'))return{ok:true,json:async()=>({
     token_type:'Bearer',access_token:'synthetic-access-token'})}
   assert.equal(opts.method,'GET')
   const u=new URL(url)
   assert.equal(u.pathname,'/v1/customer/disputes')
   assert.equal(u.searchParams.get('disputed_transaction_id'),SALE)
   assert.equal(u.searchParams.get('page'),'1')
   assert.equal(u.searchParams.get('page_size'),'50')
   return{ok:true,json:async()=>state.list}
  },
 })
 return{reader,requests}
}
function safe(r){
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.disputesCleared,false)
 assert.equal(r.refundsCleared,false)
 assert.equal(r.paidThrough,null)
 assert.equal(r.financialHistoryComplete,false)
 assert.ok(!JSON.stringify(r).includes(SALE))
 assert.ok(!JSON.stringify(r).includes(EVENT))
}
test('P23 disabled dispute reader produces zero calls',async()=>{
 let called=false
 const w=create({getClaimedMerchantEvent:async()=>{called=true}})
 const r=await w.inspect({eventId:EVENT,claimToken:CLAIM})
 safe(r);assert.equal(r.reason,'reader_disabled');assert.equal(called,false)
})
test('P23 explicit synthetic dispute GET with empty response is not proof',async()=>{
 const f=fixture()
 const r=await f.reader.inspect({eventId:EVENT,claimToken:CLAIM})
 safe(r);assert.equal(r.phase,'DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY')
 assert.deepEqual(f.requests.map(x=>x[0]),['claim','POST','GET'])
})
test('P23 any observed dispute must block entitlement',async()=>{
 const f=fixture(s=>s.list.items=[{
  dispute_id:'PP-D-001',status:'UNDER_REVIEW',
  buyer_email:'private@example.invalid'}])
 const r=await f.reader.inspect({eventId:EVENT,claimToken:CLAIM})
 safe(r);assert.equal(r.reason,'dispute_requires_independent_review')
 assert.ok(!JSON.stringify(r).includes('private@example.invalid'))
})
test('P23 pagination/unknown response or denied scope fails closed',async()=>{
 for(const change of [
  s=>s.list.links=[{rel:'next',href:'https://api-m.sandbox.paypal.com/next'}],
  s=>s.list.items=Array.from({length:50},(_,i)=>({dispute_id:'PP-D-'+i})),
  s=>s.list={items:[],links:null},
  s=>s.deny=true,
 ]){
  const f=fixture(change)
  const r=await f.reader.inspect({eventId:EVENT,claimToken:CLAIM})
  safe(r);assert.equal(r.phase,'REVIEW_REQUIRED')
 }
})
test('P23 arbitrary transaction ID never reaches merchant before claimed event',async()=>{
 for(const change of [s=>s.sale.resource.id='SALE-A/invalid',
  s=>s.sale.event_type='PAYMENT.SALE.REVERSED']){
  const f=fixture(change)
  const r=await f.reader.inspect({eventId:EVENT,claimToken:CLAIM})
  safe(r);assert.equal(r.reason,'claim_sale_unverified')
  assert.deepEqual(f.requests.map(x=>x[0]),['claim'])
 }
})
