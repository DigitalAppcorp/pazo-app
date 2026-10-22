import test from 'node:test'
import assert from 'node:assert/strict'
import {parseDeletionReceipt,mayCancelDeletion,DELETION_EXECUTOR_ENABLED} from './deletionRequestState.ts'
test('strict response guard only accepts known statuses with dates',()=>{
 assert.deepEqual(parseDeletionReceipt({status:'requested',requested_at:'2026-10-10T00:00:00Z'}),{status:'requested',requested_at:'2026-10-10T00:00:00Z'})
 for(const value of [null,[],{},'requested',{status:'queued',requested_at:'2026-10-10T00:00:00Z'},
  {status:'requested',requested_at:'not-a-date'}, {status:'requested',requested_at:null}])
  assert.equal(parseDeletionReceipt(value),null)
})
test('pending only can be cancelled; no destructive executor exists',()=>{
 assert.equal(DELETION_EXECUTOR_ENABLED,false)
 assert.equal(mayCancelDeletion('requested'),true)
 for(const s of ['cancelled','processing','completed',null])assert.equal(mayCancelDeletion(s),false)
})
