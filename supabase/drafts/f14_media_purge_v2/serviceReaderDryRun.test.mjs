import test from 'node:test'
import assert from 'node:assert/strict'
import { assessServiceReaderDryRun } from './serviceReaderDryRun.mjs'

function fixture(){
 const id={
  claim:'11111111-1111-4111-8111-111111111111',
  post:'44444444-4444-4444-8444-444444444444',
  report:'33333333-3333-4333-8333-333333333333',
  object:'22222222-2222-4222-8222-222222222222',
  owner:'55555555-5555-4555-8555-555555555555',
  pet:'66666666-6666-4666-8666-666666666666'
 }
 const path=`${id.owner}/${id.pet}/77777777-7777-4777-8777-777777777777.webp`
 const v='88888888-8888-4888-8888-888888888888'
 const stamp='2026-10-09T06:00:00.000Z'
 const fp='abcdefabcdefabcdefabcdefabcdefab'
 const snapshot={
  kind:'feed_post',target_id:id.post,report_id:id.report,bucket:'post-photos',
  path,source_url:`https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/post-photos/${path}`,
  owner_id:id.owner,pet_id:id.pet,community_id:null,storage_object_id:id.object,
  object_version:v,object_updated_at:stamp,metadata_fingerprint:fp
 }
 return {
  status:'candidate_only',mayDelete:false,
  reservation:{claim_id:id.claim,target_kind:'feed_post',target_id:id.post,
   report_id:id.report,bucket:'post-photos',storage_object_id:id.object,
   status:'held',expires_at:'2026-10-09T07:00:00.000Z',snapshot},
  restriction:{target_kind:'feed_post',target_id:id.post,report_id:id.report,media_status:'pending_review'},
  report:{id:id.report,target_kind:'feed_post',target_id:id.post,status:'removed'},
  storageObject:{id:id.object,bucket_id:'post-photos',name:path,version:v,
   updated_at:stamp,metadata_fingerprint:fp,is_delete_marker:false,archived_at:null},
  currentSourceSnapshot:{...snapshot},
  references:{url_reference_count:1,community_path_count:0},
  databaseNow:'2026-10-09T06:01:00.000Z'
 }
}
function reject(name,mutate){
 test(name,()=>{
  const x=fixture();mutate(x)
  const r=assessServiceReaderDryRun(x)
  assert.equal(r.status,'manual_review')
  assert.equal(r.mayDelete,false)
  assert.equal(r.originAbsentVerified,false)
  assert.equal(r.cdnAbsentVerified,false)
 })
}
test('real-shape RPC evidence yields only a non-executable exact selector',()=>{
 const e=fixture(),r=assessServiceReaderDryRun(e)
 assert.equal(r.status,'candidate_only')
 assert.equal(r.reason,'requires_privileged_writer_fence_and_attempt_ledger')
 assert.deepEqual(r.selector,{
  bucket:'post-photos',path:e.reservation.snapshot.path,versionId:e.storageObject.version
 })
 assert.equal(r.mayDelete,false)
 assert.equal(r.originAbsentVerified,false)
 assert.equal(r.cdnAbsentVerified,false)
 assert.equal(Object.isFrozen(r.selector),true)
})
reject('JWT/RPC result null is not candidate',x=>{x.status='null'})
reject('RPC returns a false delete approval',x=>{x.mayDelete=true})
reject('shared reference fails closed',x=>{x.references.url_reference_count=2})
reject('expired claim fails closed',x=>{x.reservation.expires_at='2026-10-09T05:00:00.000Z'})
reject('source removed after claim fails closed',x=>{x.currentSourceSnapshot=null})
reject('post source version drifts',x=>{x.storageObject.version='00000000-0000-4000-8000-000000000000'})
reject('report decision changed',x=>{x.report.status='dismissed'})
reject('moderation restriction removed',x=>{x.restriction.media_status='none'})
reject('object owner fingerprint changed',x=>{x.storageObject.metadata_fingerprint='00000000000000000000000000000000'})
test('malformed/untrusted RPC payload never produces deletion capability',()=>{
 for(const value of [undefined,null,{},[],true,'candidate_only',{
  status:'candidate_only',mayDelete:false
 }]){
  const result=assessServiceReaderDryRun(value)
  assert.equal(result.status,'manual_review')
  assert.equal(result.mayDelete,false)
 }
})
