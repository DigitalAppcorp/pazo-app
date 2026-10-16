import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28OperatorMerchantRead as create} from '../../../../supabase/functions/f16-paypal-webhook/p28OperatorMerchantReadGate.mjs'
const key='x'.repeat(48)
const data={eventId:'WH-P28-001',claimToken:'22222222-2222-4222-8222-222222222222'}
const request=(token=key,body=data)=>new Request('https://example.invalid/admin',{method:'POST',headers:{
 authorization:'Bearer '+token,'content-type':'application/json'
},body:JSON.stringify(body)})
const deps=()=>{let calls=0;return {get calls(){return calls},readLeasedEvent:async()=>{calls++;return {
 id:data.eventId,type:'PAYMENT.SALE.COMPLETED',processingState:'processing',liveLease:true,prospective:true}},
 merchantReader:{getMerchantEvent:async()=>{calls++;return {id:data.eventId,resource:{billing_agreement_id:'I-P28-ONE'}}},
 getMerchantSubscription:async()=>{calls++;return {id:'I-P28-ONE',custom_id:'intent-77777777-7777-4777-8777-777777777777',plan_id:'P-14V25407JP6850922NLHMDKI'}}}}}
const safe=async(res)=>{const body=await res.json();assert.equal(body.mayRecordPayment,false);assert.equal(body.mayGrantBenefits,false)
 assert.equal(body.paidThrough,null);assert.ok(!JSON.stringify(body).includes(data.eventId))}
test('disabled endpoint authenticates before any work',async()=>{
 const d=deps(),h=create({...d,operatorKey:key})
 assert.equal((await h(request('wrong'))).status,401)
 assert.equal((await h(request())).status,503)
 assert.equal(d.calls,0)
})
test('missing trusted claim adapter fails closed',async()=>{
 const d=deps(),h=create({enabled:true,operatorKey:key,merchantReader:d.merchantReader})
 assert.equal((await h(request())).status,503);assert.equal(d.calls,0)
})
test('read-only correlation emits no identifiers',async()=>{
 const d=deps(),h=create({...d,enabled:true,operatorKey:key})
 const res=await h(request());assert.equal(res.status,200);await safe(res)
 assert.equal(d.calls,3)
})
test('invalid lease, foreign sale, bad parameters refuse',async()=>{
 const d=deps()
 for(const props of [
  {...d,readLeasedEvent:async()=>({...await d.readLeasedEvent(),liveLease:false})},
  {...d,merchantReader:{...d.merchantReader,getMerchantEvent:async()=>({id:'FOREIGN'})}},
 ]){
  const r=await create({...props,operatorKey:key,enabled:true})(request())
  assert.equal(r.status,409);await safe(r)
 }
 const r=await create({...d,operatorKey:key,enabled:true})(request(key,{...data,url:'https://evil.invalid'}))
 assert.equal(r.status,400);await safe(r)
})

test('merchant subscription lacking intended plan or custom intent never passes',async()=>{
 const standard=deps()
 for(const sub of [
  {id:'I-P28-ONE',plan_id:'P-FOREIGN',custom_id:'intent-77777777-7777-4777-8777-777777777777'},
  {id:'I-P28-ONE',plan_id:'P-14V25407JP6850922NLHMDKI'},
  {id:'I-P28-ONE',plan_id:'P-14V25407JP6850922NLHMDKI',custom_id:'intent-bad'}
 ]){
  const r=await create({...standard,enabled:true,operatorKey:key,
    merchantReader:{...standard.merchantReader,getMerchantSubscription:async()=>sub}
  })(request())
  assert.equal(r.status,409);await safe(r)
 }
})
