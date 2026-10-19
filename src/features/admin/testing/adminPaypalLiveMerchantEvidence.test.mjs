import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalLiveMerchantEvidenceReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveMerchantEvidence.mjs'
const plan='P-ABCDEFGHIJKLMN',sub='I-SUBSCRIPTION123'
const intent='intent-12345678-1234-4234-8234-123456789abc'
const sale='SALE-12345'
const start='2026-10-01T00:00:00.000Z',end='2026-10-30T00:00:00.000Z'
const transaction={id:sale,status:'COMPLETED',time:'2026-10-15T00:00:00.000Z',
 amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}},
 payer_name:{full_name:'SENSITIVE'},payer_email:'private@example.com'}
const base=({transactionChange={},responseChange={},subscriptionChange={}}={})=>{
 const calls=[]
 const reader=createPaypalLiveMerchantEvidenceReader({
  merchantGeneration:7,planId:plan,clientId:'CLIENTABCDEFGH123',
  clientSecret:'SECRETABCDEFGH123',
  fetchImpl:async(url,options)=>{
   calls.push({url,method:options.method})
   let data
   if(url.endsWith('/oauth2/token'))data={token_type:'Bearer',access_token:'OPAQUE_TOKEN_12345'}
   else if(url.includes('/transactions?'))data={
    transactions:[{...transaction,...transactionChange}],total_pages:1,total_items:1,
    ...responseChange}
   else data={id:sub,plan_id:plan,custom_id:intent,status:'ACTIVE',
    ...subscriptionChange}
   return {ok:true,status:200,headers:{get:()=> 'application/json'},
    text:async()=>JSON.stringify(data)}
  }
 })
 return {reader,calls}
}
const arg={subscriptionId:sub,intentId:intent,saleId:sale,expectedGeneration:7,startTime:start,endTime:end}
test('Live transactions require original merchant subscription GET and exact paid sale',async()=>{
 const {reader,calls}=base()
 const r=await reader.readCompletedSale(arg)
 assert.equal(r.verified,true)
 assert.equal(r.merchantGeneration,7)
 assert.equal(r.amountMinor,299)
 assert.equal(r.currency,'USD')
 assert.equal(r.servicePeriodVerified,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.paidThrough,null)
 assert.ok(!JSON.stringify(r).includes('SENSITIVE'))
 assert.ok(!JSON.stringify(r).includes('private@example.com'))
 assert.deepEqual(calls.map(x=>x.method),['POST','GET','POST','GET'])
 assert.ok(calls.every(x=>x.url.startsWith('https://api-m.paypal.com/')))
 assert.ok(calls.some(x=>x.url.includes('/transactions?start_time=')))
})
test('Wrong plan, intent or generation cannot inspect financial transactions',async()=>{
 for(const change of [
  {subscriptionChange:{custom_id:'intent-33333333-3333-4333-8333-333333333333'}},
  {subscriptionChange:{plan_id:'P-DIFFERENTPLAN99'}},
  {subscriptionChange:{status:'UNKNOWN'}}
 ]){
  const {reader,calls}=base(change)
  await assert.rejects(()=>reader.readCompletedSale(arg),/live_provider_evidence_unavailable/)
  assert.equal(calls.some(x=>x.url.includes('/transactions?')),false)
 }
 const {reader,calls}=base()
 await assert.rejects(()=>reader.readCompletedSale({...arg,expectedGeneration:8}),
  /live_provider_evidence_unavailable/)
 assert.equal(calls.length,0)
})
test('Refund, partial refund, pending, bad amount or transaction date cannot grant',async()=>{
 for(const bad of [
  {status:'REFUNDED'},{status:'PARTIALLY_REFUNDED'},{status:'PENDING'},
  {status:'FAILED'},
  {amount_with_breakdown:{gross_amount:{currency_code:'EUR',value:'2.99'}}},
  {amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'29.90'}}},
  {time:'2027-01-01T00:00:00.000Z'}
 ]){
  const {reader}=base({transactionChange:bad})
  await assert.rejects(()=>reader.readCompletedSale(arg),/live_provider_evidence_unavailable/)
 }
})
test('Truncated pagination, missing sale and duplicate ID are rejected',async()=>{
 for(const responseChange of [
  {total_pages:2},{total_items:2},{transactions:[]},{total_pages:undefined},
  {transactions:[transaction,transaction],total_items:2},
  {transactions:[{...transaction,id:'UNRELATED'}]}
 ]){
  const {reader}=base({responseChange})
  await assert.rejects(()=>reader.readCompletedSale(arg),/live_provider_evidence_unavailable/)
 }
})
test('No implicit historical scan or unbounded time windows',async()=>{
 const {reader,calls}=base()
 for(const bad of [
  {...arg,startTime:'2026-01-01T00:00:00.000Z'},
  {...arg,startTime:'2026-10-31T00:00:00.000Z'},
  {...arg,saleId:'?'},
  {...arg,endTime:'2026-10-30'},
 ]){
  await assert.rejects(()=>reader.readCompletedSale(bad),/live_provider_evidence_unavailable/)
 }
 assert.equal(calls.length,0)
})
