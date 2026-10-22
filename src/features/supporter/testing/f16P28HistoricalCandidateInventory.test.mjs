import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28HistoricalCandidateInventory as create} from '../../../../supabase/functions/f16-paypal-webhook/p28HistoricalCandidateInventory.mjs'
const key='x'.repeat(48)
const payload={eventId:'WH-PAZO-123',requestId:'22222222-2222-4222-8222-222222222222'}
const req=(auth='Bearer '+key,body=payload)=>new Request('https://example.invalid/historical',{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(body)})
test('disabled historical inventory never accesses DB',async()=>{
 let called=0;const h=create({operatorKey:key,readCandidate:async()=>{called++}})
 const r=await h(req());assert.equal(r.status,503);assert.equal(called,0)
})
test('historical candidate read is exact-ID, auth-first and strictly redacted',async()=>{
 let called=0
 const h=create({enabled:true,operatorKey:key,readCandidate:async p=>{called++;return {
  id:p.eventId,processingState:'pending',ownerId:'private',saleId:'PAYMENT-SECRET',amount:299
 }}})
 for(const auth of ['','Bearer wrong','Basic '+key]){
  assert.equal((await h(req(auth))).status,401)
 }
 assert.equal(called,0)
 assert.equal((await h(req('Bearer '+key,{...payload,limit:999}))).status,400)
 assert.equal((await h(req('Bearer '+key,{...payload,eventId:'*'}))).status,400)
 assert.equal(called,0)
 const r=await h(req());assert.equal(r.status,200)
 const body=await r.json()
 assert.equal(body.code,'historical_candidate_review_required')
 assert.equal(body.reviewOnly,true)
 assert.equal(body.mayRecordPayment,false)
 assert.equal(body.mayGrantBenefits,false)
 assert.equal(body.paidThrough,null)
 assert.equal(called,1)
 for(const sensitive of ['private','PAYMENT-SECRET','WH-PAZO-123','299'])
  assert.equal(JSON.stringify(body).includes(sensitive),false)
})
test('missing candidate and missing reader fail closed',async()=>{
 assert.equal((await create({enabled:true,operatorKey:key})(req())).status,503)
 assert.equal((await create({enabled:true,operatorKey:key,readCandidate:async()=>null})(req())).status,404)
})
