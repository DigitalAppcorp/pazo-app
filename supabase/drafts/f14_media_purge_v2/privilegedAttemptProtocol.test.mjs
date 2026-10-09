import test from 'node:test'
import assert from 'node:assert/strict'
import { beginSimulatedAttempt, stepSimulatedAttempt } from './privilegedAttemptProtocol.mjs'

const ids=Object.freeze({
 claimId:'11111111-1111-4111-8111-111111111111',
 objectId:'22222222-2222-4222-8222-222222222222',
 fenceToken:'33333333-3333-4333-8333-333333333333',
})
const selector=Object.freeze({
 bucket:'post-photos',path:'owner/pet/55555555-5555-4555-8555-555555555555.webp',
 versionId:'66666666-6666-4666-8666-666666666666',
})
const draft=()=>beginSimulatedAttempt({...ids,generation:7,selector})
const evt=(type,rest={})=>({
 type,claimId:ids.claimId,objectId:ids.objectId,fenceToken:ids.fenceToken,generation:7,
 ...rest,
})
const dispatch=()=>evt('JOURNAL_DISPATCH',{
 ledgerWriteAcknowledged:true,allPrivilegedWritersFenced:true,fenceStillOwned:true,
})
const absent=()=>evt('OBSERVE_ORIGIN',{
 bucket:selector.bucket,path:selector.path,checkedAfterDispatch:true,
 infoStatus:404,listStatus:'absent',observedObjectId:null,
})
const safe=state=>{
 assert.equal(state.mayDelete,false)
 assert.equal(state.shouldSendHttp,false)
 assert.equal(state.mayFinalizePurge,false)
 assert.equal(state.canReleaseHold,false)
 assert.equal(state.cdnAbsentVerified,false)
 assert.equal(Object.isFrozen(state),true)
}

test('a prepared state is metadata only, not deletion authority',()=>{
 const s=draft()
 assert.equal(s.phase,'prepared_unverified')
 assert.equal(s.dispatchCount,0)
 assert.equal(Object.isFrozen(s.selector),true)
 safe(s)
})

test('bad inputs and malformed identifiers never initiate an attempt',()=>{
 const a=[
 undefined,null,{}, {...ids,generation:0,selector},
 {...ids,generation:7,selector:{...selector,path:'../bad'}},
 {...ids,generation:7,selector:{...selector,path:'/bad'}},
 {...ids,generation:7,selector:{...selector,versionId:''}},
 {...ids,generation:7,selector:{...selector,bucket:'private-documents'}},
 {...ids,generation:7,selector:{...selector},claimId:'not-a-uuid'},
 ]
 for(const item of a){
  const s=beginSimulatedAttempt(item)
  assert.equal(s.phase,'manual_review')
  safe(s)
 }
})

test('writer barrier and durable ledger acknowledgement are all required',()=>{
 const prepared=draft()
 for(const field of ['ledgerWriteAcknowledged','allPrivilegedWritersFenced','fenceStillOwned']){
  const incomplete=dispatch();incomplete[field]=false
  const next=stepSimulatedAttempt(prepared,incomplete)
  assert.equal(next.phase,'prepared_unverified')
  assert.equal(next.rejection,'missing_durable_privileged_writer_fence')
  safe(next)
 }
 const dispatched=stepSimulatedAttempt(prepared,dispatch())
 assert.equal(dispatched.phase,'possibly_in_flight')
 assert.equal(dispatched.dispatchCount,1)
 safe(dispatched)
})

test('stale token, claim, object and generation cannot advance state',()=>{
 const start=draft()
 const bad=[
  {fenceToken:'99999999-9999-4999-8999-999999999999'},
  {claimId:'99999999-9999-4999-8999-999999999999'},
  {objectId:'99999999-9999-4999-8999-999999999999'},
  {generation:6},
  {generation:8},
 ]
 for(const patch of bad){
  const next=stepSimulatedAttempt(start,{...dispatch(),...patch})
  assert.equal(next.phase,'prepared_unverified')
  assert.equal(next.dispatchCount,0)
  assert.equal(next.rejection,'stale_attempt_fence')
  safe(next)
 }
})

test('duplicate dispatch is rejected, even if ledger once acknowledged',()=>{
 let s=stepSimulatedAttempt(draft(),dispatch())
 const again=stepSimulatedAttempt(s,dispatch())
 assert.equal(again.phase,'possibly_in_flight')
 assert.equal(again.dispatchCount,1)
 assert.equal(again.rejection,'unsafe_or_duplicate_transition')
 safe(again)
})

test('HTTP timeout/error leaves an unknown in-flight attempt; never retry by clock',()=>{
 for(const response of ['HTTP_TIMEOUT','HTTP_ERROR']){
  let s=stepSimulatedAttempt(draft(),dispatch())
  s=stepSimulatedAttempt(s,evt(response))
  assert.equal(s.phase,'unknown_after_dispatch')
  assert.equal(s.dispatchCount,1)
  safe(s)
  for(const op of ['JOURNAL_DISPATCH','RETRY_DELETE','RELEASE_HOLD','MARK_PURGED']){
   const attempted=stepSimulatedAttempt(s,evt(op,{
    ledgerWriteAcknowledged:true,allPrivilegedWritersFenced:true,fenceStillOwned:true,
   }))
   assert.equal(attempted.phase,'unknown_after_dispatch')
   assert.equal(attempted.rejection,'unsafe_or_duplicate_transition')
   safe(attempted)
  }
 }
})

test('even successful HTTP + absent origin never confirms CDN, purge or release',()=>{
 let s=stepSimulatedAttempt(draft(),dispatch())
 s=stepSimulatedAttempt(s,evt('HTTP_SUCCESS'))
 assert.equal(s.phase,'awaiting_origin_check')
 safe(s)
 s=stepSimulatedAttempt(s,absent())
 assert.equal(s.phase,'origin_absent_observed')
 assert.equal(s.originAbsentObserved,true)
 safe(s)
 const forbidden=stepSimulatedAttempt(s,evt('MARK_PURGED'))
 assert.equal(forbidden.phase,'origin_absent_observed')
 safe(forbidden)
})

test('unexpected observed object or unverified origin cannot unlock a hold',()=>{
 for(const override of [
  {bucket:'community-post-photos'}, {path:'other/path.webp'},
  {checkedAfterDispatch:false}, {infoStatus:200},
  {listStatus:'present'},{observedObjectId:ids.objectId},
 ]){
  let s=stepSimulatedAttempt(draft(),dispatch())
  s=stepSimulatedAttempt(s,evt('HTTP_SUCCESS'))
  s=stepSimulatedAttempt(s,{...absent(),...override})
  assert.equal(s.phase,'unknown_after_dispatch')
  safe(s)
 }
})

test('manual review is terminal; never releases path or authorizes bytes',()=>{
 let s=stepSimulatedAttempt(draft(),dispatch())
 s=stepSimulatedAttempt(s,evt('HTTP_TIMEOUT'))
 s=stepSimulatedAttempt(s,evt('REQUEST_MANUAL_REVIEW'))
 assert.equal(s.phase,'manual_review')
 safe(s)
 const replay=stepSimulatedAttempt(s,dispatch())
 assert.equal(replay.phase,'manual_review')
 safe(replay)
})

// Small deterministic model-check: enumerate all short event schedules,
// including contradictory reports, interrupted network and stale writers.
test('interleavings up to 3 events preserve no-delete, no-release safety invariant',()=>{
 const candidates=[
  dispatch(),evt('HTTP_SUCCESS'),evt('HTTP_TIMEOUT'),evt('HTTP_ERROR'),
  absent(),evt('OBSERVE_ORIGIN',{...absent(),infoStatus:200,listStatus:'present'}),
  evt('RETRY_DELETE'),evt('MARK_PURGED'),evt('RELEASE_HOLD'),
  evt('REQUEST_MANUAL_REVIEW'),{...dispatch(),generation:6},
 ]
 let checked=0
 for(const one of candidates)for(const two of candidates)for(const three of candidates){
  let state=draft()
  for(const item of [one,two,three]){
   state=stepSimulatedAttempt(state,item)
   safe(state)
  }
  assert.ok(state.dispatchCount===0 || state.dispatchCount===1 || state.dispatchCount===undefined)
  checked++
 }
 assert.equal(checked,candidates.length**3)
})
