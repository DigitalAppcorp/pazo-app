import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoPaypalLiveSaleEvidenceReader}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoPaypalLiveSaleEvidenceReader.mjs'

const PLAN='P-1234567890ABCDEFGHIJKL'
const SUB='I-TESTSUB-20261017'
const SALE='SALE-LIVE-TEST-001'
const EVENT='WH-LIVE-TEST-001'
const OWNER='11111111-1111-4111-8111-111111111111'
const LEASE='22222222-2222-4222-8222-222222222222'
const HEX='a'.repeat(64)
const plan={id:PLAN,status:'ACTIVE',quantity_supported:false,billing_cycles:[{
  tenure_type:'REGULAR',sequence:1,total_cycles:0,
  frequency:{interval_unit:'MONTH',interval_count:1},
  pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}},
}],payment_preferences:{auto_bill_outstanding:false}}
const sale={id:SALE,state:'completed',billing_agreement_id:SUB,
  amount:{currency:'USD',total:'2.99'}}
const sub={id:SUB,plan_id:PLAN,status:'ACTIVE',quantity:'1',plan_overridden:false}
const verified={sourceEnvironment:'live',webhookSignatureVerified:true,leaseOwned:true,
  eventId:EVENT,eventType:'PAYMENT.SALE.COMPLETED',
  saleId:SALE,subscriptionId:SUB,ownerId:OWNER,
  offerTermsSha256:HEX,ownerIntentVerified:true,acceptedOfferVerified:true,
  expectedPlanId:PLAN}
const fixture=(changes={})=>{
 const calls=[]
 const resources=[sale,sub,plan]
 const read=()=>structuredClone({...verified,...changes.claim})
 const fetchImpl=async(url,opts)=>{
   calls.push({url,method:opts.method,redirect:opts.redirect})
   const found=resources.find((v,i)=>url.endsWith(
     ['/v1/payments/sale/'+SALE,'/v1/billing/subscriptions/'+SUB,'/v1/billing/plans/'+PLAN][i]
   ))
   const value=changes.responses?.[calls.length-1]??found
   return {ok:value!==null,status:value===null?404:200,
     headers:{get:()=> 'application/json'},
     text:async()=>JSON.stringify(value)}
 }
 return {calls,read,fetchImpl,make:()=>createPazoPaypalLiveSaleEvidenceReader({
   enabled:changes.enabled??true,expectedPlanId:PLAN,
   readClaimedVerifiedEvent:read,
   getMerchantLiveToken:async()=> 'synthetic-not-a-live-token',
   fetchImpl
 })}
}
const args={saleId:SALE,eventId:EVENT,leaseToken:LEASE}
test('F16 live evidence: default disabled issues zero requests',async()=>{
 let called=false
 const read=createPazoPaypalLiveSaleEvidenceReader({
   readClaimedVerifiedEvent:()=>{called=true},fetchImpl:()=>{called=true},
 })
 const result=await read(args)
 assert.equal(result.phase,'BLOCKED')
 assert.equal(result.mayGrantBenefits,false)
 assert.equal(called,false)
})
test('F16 live evidence: 3 independent authorized GETs yield review candidate only',async()=>{
 const env=fixture(),result=await env.make()(args)
 assert.equal(result.phase,'REVIEW_REQUIRED')
 assert.equal(result.merchantSaleCandidate,true)
 assert.equal(result.ownerId,OWNER)
 assert.equal(result.providerStatus,'ACTIVE')
 assert.equal(result.paidThrough,null)
 for(const k of ['mayGrantBenefits','mayCreatePaidPeriod','mayCheckout','mayRecordPayment'])
  assert.equal(result[k],false)
 assert.equal(env.calls.length,3)
 assert.deepEqual(env.calls.map(c=>c.method),['GET','GET','GET'])
 assert.deepEqual(env.calls.map(c=>c.redirect),['error','error','error'])
 assert.ok(env.calls.every(c=>c.url.startsWith('https://api-m.paypal.com/')))
})
test('F16 live evidence: cancellation retains merchant candidate without inventing paid date',async()=>{
 const env=fixture({responses:[sale,{...sub,status:'CANCELLED'},plan]})
 const result=await env.make()(args)
 assert.equal(result.phase,'REVIEW_REQUIRED')
 assert.equal(result.periodEnd,null)
 assert.equal(result.paidThrough,null)
})
test('F16 live evidence: webhook, owner, consent and environment are hard requirements',async()=>{
 for(const claim of [
  {sourceEnvironment:'sandbox'},{webhookSignatureVerified:false},
  {leaseOwned:false},{ownerIntentVerified:false},{acceptedOfferVerified:false},
  {eventType:'BILLING.SUBSCRIPTION.ACTIVATED'},{ownerId:'not-a-uuid'},
  {offerTermsSha256:'bad'},{saleId:'SALE-FORGED'},{subscriptionId:'I-DIFFERENT'},
  {expectedPlanId:'P-OTHER'}, {eventId:'OTHER'},
 ]) {
  const env=fixture({claim})
  const result=await env.make()(args)
  assert.equal(result.phase,'BLOCKED')
  assert.equal(env.calls.length,0)
 }
})
test('F16 live evidence: modified amount, subscription, plan or trial are blocked',async()=>{
 const variations=[
  [{...sale,amount:{currency:'USD',total:'2.98'}},sub,plan],
  [{...sale,amount:{currency:'EUR',total:'2.99'}},sub,plan],
  [{...sale,billing_agreement_id:'I-FORGED'},sub,plan],
  [sale,{...sub,plan_id:'P-ANOTHER'},plan],
  [sale,{...sub,plan_overridden:true},plan],
  [sale,{...sub,quantity:'2'},plan],
  [sale,{...sub,status:'SUSPENDED'},plan],
  [sale,sub,{...plan,status:'INACTIVE'}],
  [sale,sub,{...plan,billing_cycles:[
   {...plan.billing_cycles[0],tenure_type:'TRIAL'},plan.billing_cycles[0]]}],
 ]
 for(const responses of variations){
  const env=fixture({responses}), result=await env.make()(args)
  assert.equal(result.phase,'BLOCKED')
  assert.equal(result.mayRecordPayment,false)
  assert.equal(result.mayGrantBenefits,false)
 }
})
test('F16 live evidence: 404, unexpected JSON, failure/timeout never authorizes benefits',async()=>{
 const bad=fixture({responses:[null,sub,plan]})
 const result=await bad.make()(args)
 assert.equal(result.phase,'BLOCKED')
 assert.equal(bad.calls.length,1)
 const throwing=createPazoPaypalLiveSaleEvidenceReader({
  enabled:true,expectedPlanId:PLAN,
  readClaimedVerifiedEvent:async()=>verified,
  getMerchantLiveToken:async()=> 'synthetic-not-a-live-token',
  fetchImpl:async()=>{throw Error('synthetic')}
 })
 const failed=await throwing(args)
 assert.equal(failed.phase,'BLOCKED')
 assert.equal(failed.mayGrantBenefits,false)
})
