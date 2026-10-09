import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyExactVersionOutcome } from './exactVersionOutcome.mjs'

const claimId='11111111-1111-4111-8111-111111111111'
const objectId='22222222-2222-4222-8222-222222222222'
const selector={bucket:'post-photos',path:'owner/pet/fixture.webp',versionId:'77777777-7777-4777-8777-777777777777'}
function sample() {
 return {
  preflight:{status:'candidate_only',mayDelete:false,claimId,objectId,selector:{...selector}},
  attempt:{method:'version_specific',bucket:selector.bucket,path:selector.path,
   versionId:selector.versionId,objectId,claimId,transport:'completed',httpSuccess:true,storageError:null},
  origin:{bucket:selector.bucket,path:selector.path,checkedAfterAttempt:true,infoStatus:404,listStatus:'absent',observedObjectId:null},
  cdn:{httpStatus:400}
 }
}
function bad(name,parts,reason){
 test(name,()=>{
  const result=classifyExactVersionOutcome({...sample(),...parts})
  assert.equal(result.status,'manual_review')
  assert.equal(result.reason,reason)
  assert.equal(result.mayFinalizePurge,false)
  assert.equal(result.originAbsentVerified,false)
 })
}
test('HTTP success + storage origin absent still does NOT permit purged transition',()=>{
 const r=classifyExactVersionOutcome(sample())
 assert.equal(r.status,'origin_absent_observed')
 assert.equal(r.originAbsentVerified,true)
 assert.equal(r.cdnAbsentVerified,false)
 assert.equal(r.cdnObservedHttpStatus,400)
 assert.equal(r.mayFinalizePurge,false)
 assert.equal(Object.isFrozen(r.selector),true)
})
bad('missing preflight', {preflight:null},'untrusted_or_incomplete_preflight')
bad('preflight cannot be a delete authorization', {preflight:{...sample().preflight,mayDelete:true}},'untrusted_or_incomplete_preflight')
bad('missing exact request', {attempt:null},'missing_or_mismatched_exact_attempt')
bad('path-only delete request rejected',{attempt:{...sample().attempt,method:'path_only'}},'missing_or_mismatched_exact_attempt')
bad('wrong version in delete request rejected',{attempt:{...sample().attempt,versionId:'different'}},'missing_or_mismatched_exact_attempt')
bad('wrong claim ID rejected',{attempt:{...sample().attempt,claimId:objectId}},'missing_or_mismatched_exact_attempt')
bad('wrong object ID rejected',{attempt:{...sample().attempt,objectId:claimId}},'missing_or_mismatched_exact_attempt')
bad('wrong bucket rejected',{attempt:{...sample().attempt,bucket:'community-post-photos'}},'missing_or_mismatched_exact_attempt')
bad('timeout is not successful',{attempt:{...sample().attempt,transport:'timeout'}},'attempt_not_confirmed')
bad('HTTP error cannot be converted to success',{attempt:{...sample().attempt,httpSuccess:false}},'attempt_not_confirmed')
bad('storage error despite success is not enough',{attempt:{...sample().attempt,storageError:'conflict'}},'attempt_not_confirmed')
bad('origin object still present',{origin:{...sample().origin,infoStatus:200,observedObjectId:objectId}},'origin_absence_not_confirmed')
bad('origin list not checked',{origin:{...sample().origin,listStatus:'unknown'}},'origin_absence_not_confirmed')
bad('origin list still contains file',{origin:{...sample().origin,listStatus:'present'}},'origin_absence_not_confirmed')
bad('origin checked before attempt',{origin:{...sample().origin,checkedAfterAttempt:false}},'origin_absence_not_confirmed')
test('CDN 200, 404 or absent must never upgrade to global cache PASS',()=>{
 for(const httpStatus of [200,400,404,410,503,undefined]) {
  const x=sample()
  x.cdn=httpStatus===undefined?undefined:{httpStatus}
  const r=classifyExactVersionOutcome(x)
  assert.equal(r.status,'origin_absent_observed')
  assert.equal(r.mayFinalizePurge,false)
  assert.equal(r.cdnAbsentVerified,false)
 }
})
