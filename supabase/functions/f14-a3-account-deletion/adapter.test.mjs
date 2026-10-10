import test from 'node:test'
import assert from 'node:assert/strict'
import {createA3ReviewPort} from './adapter.ts'
import {runA3DeletionReview} from './worker.ts'

const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const lease={token:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',version:2}
function fakeDb() {
  const calls=[];let revision=0
  const db={async rpc(name,params){
    calls.push({name,params})
    if(name==='f14_a3_worker_job_status') return {data:'reviewing',error:null}
    if(name==='f14_a3_worker_validate_lease') return {data:true,error:null}
    if(name==='f14_a3_worker_review_revision') return {data:revision,error:null}
    if(name==='f14_a3_worker_review_checkpoint') {
      if(params.p_expected_revision!==revision) return {data:null,error:null}
      return {data:++revision,error:null}
    }
    throw Error('Unexpected RPC')
  }}
  return {db,calls}
}
test('no registered backend gate check always blocks, never deletes',async()=>{
  const a=fakeDb();const p=createA3ReviewPort(a.db)
  const r=await runA3DeletionReview(id,lease,p)
  assert.equal(r.status,'blocked')
  assert.equal(r.issue,'missing_evidence')
  assert.equal(r.irreversibleAllowed,false)
  assert.ok(a.calls.every(x=>x.name.startsWith('f14_a3_worker_')))
  assert.ok(!a.calls.some(x=>/delete|storage|remove/i.test(x.name)))
})
test('registered check is server controlled and checkpoints use valid lease',async()=>{
  const a=fakeDb()
  const p=createA3ReviewPort(a.db,{
    recent_reauthentication:async()=>({passed:true}),
  })
  const r=await runA3DeletionReview(id,lease,p)
  assert.equal(r.gatesChecked,2)
  assert.equal(r.status,'blocked')
  assert.equal(r.issue,'missing_evidence')
  const checkpoints=a.calls.filter(x=>x.name==='f14_a3_worker_review_checkpoint')
  assert.equal(checkpoints.length,2)
  assert.equal(checkpoints[0].params.p_version,2)
  assert.equal(checkpoints[0].params.p_token,lease.token)
  assert.equal(checkpoints[0].params.p_expected_revision,0)
  assert.equal(checkpoints[1].params.p_expected_revision,1)
})
test('RPC failures cannot become PASS or expose private messages',async()=>{
  const db={async rpc(){return{data:null,error:{message:'Secret-user-email@example.test'}}}}
  const r=await runA3DeletionReview(id,lease,createA3ReviewPort(db))
  assert.equal(r.status,'retryable')
  assert.equal(r.irreversibleAllowed,false)
  assert.ok(!JSON.stringify(r).includes('example.test'))
})
test('invalid revisions and untrusted proof values fail closed',async()=>{
  const a=fakeDb()
  a.db.rpc=async(name,params)=>{
    if(name==='f14_a3_worker_review_revision') return {data:'1',error:null}
    return name==='f14_a3_worker_job_status'
      ? {data:'reviewing',error:null} : {data:true,error:null}
  }
  assert.equal((await runA3DeletionReview(id,lease,createA3ReviewPort(a.db))).status,'retryable')
  const b=fakeDb()
  const p=createA3ReviewPort(b.db,{
    recent_reauthentication:async()=>({passed:'yes'}),
  })
  const r=await runA3DeletionReview(id,lease,p)
  assert.equal(r.status,'blocked')
  assert.equal(r.issue,'missing_evidence')
})
