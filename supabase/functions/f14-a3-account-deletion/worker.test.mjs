import test from 'node:test'
import assert from 'node:assert/strict'
import { A3_REVIEW_GATES, runA3DeletionReview } from './worker.ts'

const jobId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const claim={token:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',version:1}
function fixture() {
  let revision=0
  const events=[]
  let leaseValid=true
  const port={
    async readJob(){ return {status:'reviewing'} },
    async leaseIsCurrent(){ return leaseValid },
    async readRevision(){ return revision },
    async inspectGate(){ return {passed:true} },
    async saveCheckpoint(checkpoint){
      if(checkpoint.expectedRevision!==revision) return null
      revision++
      events.push({gate:checkpoint.gate,outcome:checkpoint.outcome,issue:checkpoint.issue})
      return revision
    },
  }
  return {port,events,getRevision:()=>revision,expire:()=>leaseValid=false}
}
test('all green evidence ends in review, never deletion',async()=>{
  const f=fixture()
  const r=await runA3DeletionReview(jobId,claim,f.port)
  assert.equal(r.status,'review_required')
  assert.equal(r.gatesChecked,A3_REVIEW_GATES.length)
  assert.equal(r.irreversibleAllowed,false)
  assert.equal(f.events.length,A3_REVIEW_GATES.length)
  assert.ok(f.events.every(x=>x.outcome==='passed'))
})
test('missing evidence halts immediately and never executes later gates',async()=>{
  const f=fixture(); const called=[]
  f.port.inspectGate=async(_id,gate)=>{
    called.push(gate)
    return {passed:false,issue:'unverified_media'}
  }
  const r=await runA3DeletionReview(jobId,claim,f.port)
  assert.deepEqual(called,['recent_reauthentication'])
  assert.equal(r.status,'blocked')
  assert.equal(r.issue,'unverified_media')
  assert.equal(f.events.length,1)
})
test('invalid inputs and non-reviewing jobs fail closed',async()=>{
  const f=fixture()
  for(const id of ['','abc','null',jobId+'x']){
    assert.equal((await runA3DeletionReview(id,claim,f.port)).issue,'invalid_request')
  }
  assert.equal((await runA3DeletionReview(jobId,{...claim,version:0},f.port)).issue,'invalid_request')
  f.port.readJob=async()=>({status:'requested'})
  assert.equal((await runA3DeletionReview(jobId,claim,f.port)).issue,'job_not_reviewing')
  assert.equal(f.events.length,0)
})
test('expired lease detected after async inspection, no checkpoint saved',async()=>{
  const f=fixture()
  f.port.inspectGate=async()=>{f.expire();return {passed:true}}
  const r=await runA3DeletionReview(jobId,claim,f.port)
  assert.equal(r.issue,'lease_invalid')
  assert.equal(f.events.length,0)
})
test('inspection exceptions sanitized, one retryable checkpoint',async()=>{
  const f=fixture()
  f.port.inspectGate=async()=>{throw Error('sensitive email and private path')}
  const r=await runA3DeletionReview(jobId,claim,f.port)
  assert.equal(r.status,'retryable')
  assert.equal(r.issue,'inspection_failed')
  assert.deepEqual(f.events,[{gate:'recent_reauthentication',outcome:'error',issue:'inspection_failed'}])
  assert.equal(JSON.stringify(r).includes('sensitive'),false)
})
test('CAS conflicts stop safely; failure cannot be interpreted as pass',async()=>{
  const f=fixture()
  f.port.saveCheckpoint=async()=>null
  const r=await runA3DeletionReview(jobId,claim,f.port)
  assert.equal(r.status,'retryable')
  assert.equal(r.issue,'checkpoint_conflict')
  assert.equal(r.gatesChecked,0)
  assert.equal(r.irreversibleAllowed,false)
})
test('retries re-check every gate instead of trusting old success records',async()=>{
  const f=fixture()
  const first=await runA3DeletionReview(jobId,claim,f.port)
  assert.equal(first.status,'review_required')
  f.port.inspectGate=async()=>({passed:false,issue:'unsafe_dependency'})
  const second=await runA3DeletionReview(jobId,claim,f.port)
  assert.equal(second.status,'blocked')
  assert.equal(second.gatesChecked,1)
  assert.equal(f.getRevision(),A3_REVIEW_GATES.length+1)
})
test('lease check and persistence failures never complete a review',async()=>{
  const f=fixture(); f.expire()
  assert.equal((await runA3DeletionReview(jobId,claim,f.port)).issue,'lease_invalid')
  const g=fixture(); g.port.readRevision=async()=>{throw Error('DB offline')}
  assert.equal((await runA3DeletionReview(jobId,claim,g.port)).status,'retryable')
  assert.equal(g.events.length,0)
})
