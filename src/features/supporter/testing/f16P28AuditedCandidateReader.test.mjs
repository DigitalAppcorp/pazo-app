import test from 'node:test'
import assert from 'node:assert/strict'
import {createP28AuditedCandidateReader as create} from '../../../../supabase/functions/f16-paypal-webhook/p28AuditedCandidateReader.mjs'
const fp='a'.repeat(64)
const input={eventId:'WH-P28-123',requestId:'11111111-1111-4111-8111-111111111111'}
test('audit failure prevents historical read entirely',async()=>{
 let reads=0
 for(const recordAudit of [undefined,async()=>null,async()=>({persisted:false}),async()=>({persisted:true,requestId:'foreign'})]){
  const h=create({recordAudit,fingerprintEvent:async()=>fp,readCandidate:async()=>{reads++;return {id:input.eventId}}})
  assert.equal(await h(input),null)
 }
 assert.equal(reads,0)
})
test('durably acknowledged audit runs first with no event identifier',async()=>{
 const order=[]
 const h=create({fingerprintEvent:async()=>fp,recordAudit:async audit=>{
  order.push('audit');assert.deepEqual(audit,{requestId:input.requestId,eventFingerprint:fp,action:'historical_candidate_exact_read'})
  return {persisted:true,requestId:audit.requestId}
 },readCandidate:async args=>{
  order.push('read');assert.deepEqual(args,input)
  return {id:args.eventId,processingState:'pending'}
 }})
 assert.deepEqual(await h(input),{id:input.eventId,processingState:'pending'})
 assert.deepEqual(order,['audit','read'])
})
test('malformed request never invokes audit or private read',async()=>{
 let calls=0;const h=create({fingerprintEvent:async()=>fp,recordAudit:async()=>{calls++},readCandidate:async()=>{calls++}})
 assert.equal(await h({...input,eventId:'*'}),null)
 assert.equal(calls,0)
})

test('invalid HMAC fingerprint halts audit and read',async()=>{
 let called=0
 const h=create({fingerprintEvent:async()=>null,
  recordAudit:async()=>{called++},readCandidate:async()=>{called++}})
 assert.equal(await h(input),null)
 assert.equal(called,0)
})
