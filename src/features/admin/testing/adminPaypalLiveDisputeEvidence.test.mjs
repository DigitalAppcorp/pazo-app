import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveDisputeEvidenceReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveDisputeEvidence.mjs'
import {createPaypalLiveMerchantEvidenceReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveMerchantEvidence.mjs'
import {createPazoLiveDurableDisputeWorker} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveDurableDisputeWorker.mjs'
const saleId='9AB12345678901234',originalPaymentAt='2026-10-01T12:00:00.000Z'
const path='/v1/customer/disputes?disputed_transaction_id='+saleId+'&page_size=50'
const now=()=>Date.parse('2026-10-21T00:00:00Z')
const detail=(over={})=>({dispute_id:'PP-D-1234567',create_time:'2026-10-02T00:00:00Z',
 update_time:'2026-10-03T00:00:00Z',status:'OPEN',dispute_amount:{currency_code:'USD',value:'2.99'},
 disputed_transactions:[{seller_transaction_id:saleId,create_time:originalPaymentAt,
  gross_amount:{currency_code:'USD',value:'2.99'},transaction_status:'COMPLETED'}],
 buyer:{email:'PRIVATE_PAYER'},messages:[{text:'PRIVATE_MESSAGE'}],...over})
function fixture(rows=[detail()],over={}){
 const calls=[]
 const read=createPazoLiveDisputeEvidenceReader({now,getJson:async url=>{
  calls.push(url)
  if(url===path)return {items:rows.map(d=>({dispute_id:d.dispute_id})),links:[]}
  const found=rows.find(d=>url==='/v1/customer/disputes/'+d.dispute_id)
  if(!found)throw Error('not_found');return found
 },...over})
 return {calls,read:args=>read({saleId,originalPaymentAt,...args})}
}
test('completed original-sale dispute coverage is minimal, empty is clear evidence, no PII escapes',async()=>{
 const empty=fixture([]);const e=await empty.read()
 assert.equal(e.coverageComplete,true);assert.deepEqual(e.cases,[]);assert.deepEqual(empty.calls,[path])
 const {read}=fixture();const r=await read()
 assert.equal(r.cases[0].decision,'hold');assert.equal(r.cases[0].disputedMinor,299)
 assert.ok(!JSON.stringify(r).includes('PRIVATE_'));assert.equal(r.originalPaymentAt,originalPaymentAt)
})
test('only a resolved merchant win or customer cancellation with retained funds clears a full dispute',async()=>{
 for(const outcome of ['RESOLVED_SELLER_FAVOUR','CANCELED_BY_BUYER']){
  const r=await fixture([detail({status:'RESOLVED',dispute_outcome:{outcome_code:outcome,amount_refunded:{currency_code:'USD',value:'0.0'}}})]).read()
  assert.equal(r.cases[0].decision,'clear')
 }
 const lost=await fixture([detail({status:'RESOLVED',dispute_outcome:{outcome_code:'RESOLVED_BUYER_FAVOUR'}})]).read()
 assert.equal(lost.cases[0].decision,'hold')
 for(const outcome of ['RESOLVED_WITH_PAYOUT','NONE','ACCEPTED','DENIED']){
  assert.equal((await fixture([detail({status:'RESOLVED',dispute_outcome:{outcome_code:outcome}})]).read()).cases[0].decision,'review')
 }
})
test('partial disputes, partial returned funds and non-completed transaction never clear full coverage',async()=>{
 for(const d of [detail({dispute_amount:{currency_code:'USD',value:'1.00'}}),
  detail({status:'RESOLVED',dispute_outcome:{outcome_code:'RESOLVED_SELLER_FAVOUR',amount_refunded:{currency_code:'USD',value:'0.01'}}}),
  detail({status:'RESOLVED',dispute_outcome:{outcome_code:'CANCELED_BY_BUYER'},
   disputed_transactions:[{...detail().disputed_transactions[0],transaction_status:'REFUNDED'}]})]){
  assert.equal((await fixture([d]).read()).cases[0].decision,'review')
 }
})
test('wrong seller transaction, currency, amount, timing and missing details fail without clearance',async()=>{
 for(const d of [detail({disputed_transactions:[{...detail().disputed_transactions[0],seller_transaction_id:'UNRELATED'}]}),
  detail({disputed_transactions:[]}),detail({disputed_transactions:[{...detail().disputed_transactions[0],create_time:'2026-09-01T00:00:00Z'}]}),
  detail({dispute_amount:{currency_code:'EUR',value:'2.99'}}),detail({dispute_amount:{currency_code:'USD',value:'3.00'}}),
  detail({update_time:'2026-11-01T00:00:00Z'}),detail({status:'UNRECOGNIZED'}),detail({create_time:'2026-02-30T00:00:00Z'})]){
  await assert.rejects(fixture([d]).read(),/live_dispute_evidence_unavailable/)
 }
})
test('every page must finish on fixed host/filter; duplicates, loops and foreign next links fail closed',async()=>{
 const next='https://api-m.paypal.com'+path+'&page=2';const calls=[]
 const read=createPazoLiveDisputeEvidenceReader({now,getJson:async url=>{
  calls.push(url);if(url===path)return {items:[],links:[{rel:'next',href:next,method:'GET'}]}
  if(url===new URL(next).pathname+new URL(next).search)return {items:[{dispute_id:'PP-D-1234567'}]}
  return detail()
 }})
 assert.equal((await read({saleId,originalPaymentAt})).cases.length,1);assert.equal(calls.length,3)
 for(const href of ['https://evil.test'+path,next.replace(saleId,'UNRELATED'),next.replace('page=2','page=0')]){
  const bad=fixture([],{getJson:async()=>({items:[],links:[{rel:'next',href,method:'GET'}]})})
  await assert.rejects(bad.read(),/live_dispute_evidence_unavailable/)
 }
 await assert.rejects(fixture([detail(),detail()]).read(),/live_dispute_evidence_unavailable/)
})
test('a disappeared known case is explicitly read; 404/permissions failure is never absence or release',async()=>{
 const calls=[];const known=detail({status:'RESOLVED',dispute_outcome:{outcome_code:'CANCELED_BY_BUYER'}})
 const f=fixture([],{getJson:async url=>{calls.push(url);return url===path?{items:[]}:known}})
 assert.equal((await f.read({knownDisputeIds:['PP-D-1234567']})).cases[0].decision,'clear')
 assert.equal(calls[1],'/v1/customer/disputes/PP-D-1234567')
 await assert.rejects(fixture([]).read({knownDisputeIds:['PP-D-1234567']}),/not_found/)
 await assert.rejects(fixture([],{getJson:async()=>{throw Error('permission_unavailable')}}).read(),/permission_unavailable/)
})
test('hosted merchant reader uses original OAuth and GET only, preserving exact sale binding before disputes',async()=>{
 const calls=[],planId='P-1234567890ABCDEF',subscriptionId='I-ORIGINAL-123',intentId='intent-12345678-1234-4234-8234-123456789abc'
 const r=createPaypalLiveMerchantEvidenceReader({merchantGeneration:1,planId,clientId:'SYNTHETIC_CLIENT_123',clientSecret:'SYNTHETIC_SECRET_123',fetchImpl:async(url,o)=>{
  calls.push({url,method:o.method});let body
  if(url.endsWith('/token'))body={token_type:'Bearer',access_token:'SYNTHETIC_OAUTH_123'}
  else if(url.includes('/transactions?'))body={total_pages:1,total_items:1,transactions:[{id:saleId,status:'COMPLETED',time:originalPaymentAt,amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}]}
  else if(url.includes('/v1/customer/disputes'))body={items:[]}
  else body={id:subscriptionId,plan_id:planId,custom_id:intentId,status:'ACTIVE'}
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}})
 }})
 const evidence=await r.readSaleDisputes({subscriptionId,intentId,saleId,expectedGeneration:1,startTime:'2026-10-01T00:00:00Z',endTime:'2026-10-02T00:00:00Z'})
 assert.equal(evidence.coverageComplete,true)
 assert.ok(calls.filter(c=>c.method==='POST').every(c=>c.url.endsWith('/oauth2/token')))
 assert.ok(calls.some(c=>c.url.includes('disputed_transaction_id='+saleId)))
})
test('durable monitor uses its leased original generation; provider failure records unavailable, not clear',async()=>{
 const batchLease='12345678-1234-4234-8234-123456789abc',leaseToken='22345678-1234-4234-8234-123456789abc'
 const candidate={source:'private_original_live_dispute_claim',saleId,merchantGeneration:7,
  subscriptionId:'I-ORIGINAL-123',intentId:'intent-12345678-1234-4234-8234-123456789abc',
  planId:'P-1234567890ABCDEF',originalPaymentAt,knownDisputeIds:[],leaseToken}
 for(const unavailable of [false,true]){
  const calls=[]
  const worker=createPazoLiveDurableDisputeWorker({released:true,rpc:async(name,payload)=>{
   calls.push({name,payload});return name==='disputeClaim'?candidate:'recorded'
  },historical:{findBoundSubscription:async()=>({...candidate,provider:'paypal',sourceEnvironment:'live',state:'bound',consentVerified:true}),
   readerForGeneration:async g=>{
    assert.equal(g.merchantGeneration,7);assert.equal(g.sourceEnvironment,'live')
    return {readSaleDisputes:async args=>{assert.equal(args.expectedGeneration,7);assert.equal(args.saleId,saleId)
     if(unavailable)throw Error('PRIVATE_PROVIDER_BODY');return {verified:true,coverageComplete:true,saleId,originalPaymentAt,cases:[],source:'original_generation_paypal_disputes_get'}}}
   }}})
  const result=await worker({batchLease})
  assert.equal(result.monitorOutcome,unavailable?'unavailable':'clear');assert.equal(result.paymentRecorded,false)
  assert.equal(calls[1].name,'disputeFinish');assert.equal(calls[1].payload.p_lease,leaseToken)
  assert.equal(calls[1].payload.p_evidence===null,unavailable);assert.ok(!JSON.stringify(result).includes('PRIVATE'))
 }
})
test('uncertain dispute write is not repeated and missing private lease never reads merchant credentials',async()=>{
 let reads=0,writes=0
 const c={source:'private_original_live_dispute_claim',saleId,merchantGeneration:7,subscriptionId:'I-ORIGINAL-123',
  intentId:'intent-12345678-1234-4234-8234-123456789abc',planId:'P-1234567890ABCDEF',originalPaymentAt,
  knownDisputeIds:[],leaseToken:'22345678-1234-4234-8234-123456789abc'}
 const historical={findBoundSubscription:async()=>{reads++;throw Error('unavailable')},readerForGeneration:async()=>{throw Error('should_not_read')}}
 const worker=createPazoLiveDurableDisputeWorker({released:true,historical,rpc:async name=>{
  if(name==='disputeClaim')return c;writes++;throw Error('PRIVATE_WRITE_RESPONSE')
 }})
 const result=await worker({batchLease:'12345678-1234-4234-8234-123456789abc'})
 assert.equal(result.outcomeUnknown,true);assert.equal(reads,1);assert.equal(writes,1)
 assert.ok(!JSON.stringify(result).includes('PRIVATE'))
 const missing=createPazoLiveDurableDisputeWorker({released:true,historical,rpc:async()=>null})
 assert.equal((await missing({batchLease:'12345678-1234-4234-8234-123456789abc'})).state,'NOT_CLAIMED')
 assert.equal(reads,1)
})
