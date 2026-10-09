import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectHostedClaimEvidence } from './hostedClaimEvidence.mjs'

const ids={claim:'11111111-1111-4111-8111-111111111111',target:'44444444-4444-4444-8444-444444444444',report:'33333333-3333-4333-8333-333333333333',object:'22222222-2222-4222-8222-222222222222',owner:'55555555-5555-4555-8555-555555555555'}
const path=`${ids.owner}/66666666-6666-4666-8666-666666666666/77777777-7777-4777-8777-777777777777.webp`
const updated='2026-10-09T06:00:00.000Z'
const version='88888888-8888-4888-8888-888888888888'
const fingerprint='abcdefabcdefabcdefabcdefabcdefab'
const url=`https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/post-photos/${path}`
function sample(){
 const value = {
  reservation:{claim_id:ids.claim,target_kind:'feed_post',target_id:ids.target,report_id:ids.report,bucket:'post-photos',storage_object_id:ids.object,status:'held',expires_at:'2026-10-09T07:00:00.000Z',
   snapshot:{kind:'feed_post',target_id:ids.target,report_id:ids.report,bucket:'post-photos',path,source_url:url,owner_id:ids.owner,storage_object_id:ids.object,object_version:version,object_updated_at:updated,metadata_fingerprint:fingerprint}},
  restriction:{target_kind:'feed_post',target_id:ids.target,report_id:ids.report,media_status:'pending_review'},
  report:{id:ids.report,target_kind:'feed_post',target_id:ids.target,status:'removed'},
  storageObject:{id:ids.object,bucket_id:'post-photos',name:path,version,updated_at:updated,metadata_fingerprint:fingerprint,is_delete_marker:false,archived_at:null},
  references:{url_reference_count:1,community_path_count:0},
  databaseNow:'2026-10-09T06:01:00.000Z'
 }
 // The live f14_media_probe always contains both nullable relationship keys.
 value.reservation.snapshot.pet_id='66666666-6666-4666-8666-666666666666'
 value.reservation.snapshot.community_id=null
 value.currentSourceSnapshot={...value.reservation.snapshot}
 return value
}
function patch(section, changes){const x=sample();x[section]={...x[section],...changes};return x}
function bad(name,x,reason){test(name,()=>{const r=inspectHostedClaimEvidence(x);assert.equal(r.status,'manual_review');assert.equal(r.reason,reason);assert.equal(Object.hasOwn(r,'selector'),false)})}
test('hosted row field names produce exact selector but NEVER authorization',()=>{
 const r=inspectHostedClaimEvidence(sample())
 assert.equal(r.status,'candidate_only')
 assert.deepEqual(r.selector,{bucket:'post-photos',path,versionId:version})
 assert.equal(r.mayDelete,false)
 assert.equal(r.originAbsentVerified,false)
 assert.equal(r.cdnAbsentVerified,false)
})
bad('snapshot absent',patch('reservation',{snapshot:null}),'missing_claim_snapshot')
bad('report absent',{...sample(),report:undefined},'missing_database_evidence')
bad('fresh source re-probe required',{...sample(),currentSourceSnapshot:null},'missing_database_evidence')
bad('changed source URL after held claim',patch('currentSourceSnapshot',{source_url:'https://elsewhere.invalid/x'}),'current_source_snapshot_drift')
bad('changed source owner after claim',patch('currentSourceSnapshot',{owner_id:ids.report}),'current_source_snapshot_drift')
bad('changed pet association after claim',patch('currentSourceSnapshot',{pet_id:ids.object}),'current_source_snapshot_drift')
bad('changed current source version after claim',patch('currentSourceSnapshot',{object_version:ids.report}),'current_source_snapshot_drift')

bad('report source mismatch',patch('report',{target_id:ids.object}),'database_identity_drift')
bad('restriction source mismatch',patch('restriction',{report_id:ids.object}),'database_identity_drift')
bad('pending report not removable',patch('report',{status:'pending'}),'not_pending_verified_moderation')
bad('media restriction changed',patch('restriction',{media_status:'none'}),'not_pending_verified_moderation')
bad('claim invalidated',patch('reservation',{status:'invalidated'}),'not_pending_verified_moderation')
bad('shared URL count',patch('references',{url_reference_count:2}),'nonexclusive_or_unverified_references')
bad('missing independent reference count',patch('references',{url_reference_count:null}),'nonexclusive_or_unverified_references')
bad('live object changed',patch('storageObject',{id:ids.report}),'current_storage_identity_drift')
bad('live version changed',patch('storageObject',{version:ids.report}),'storage_version_or_identity_drift')
bad('metadata changed',patch('storageObject',{metadata_fingerprint:'00000000000000000000000000000000'}),'object_metadata_or_state_drift')
bad('archived object',patch('storageObject',{archived_at:'2026-10-09T06:00:01Z'}),'object_metadata_or_state_drift')
bad('expired claim',patch('reservation',{expires_at:updated}),'claim_expired_or_clock_untrusted')
bad('clock absent',{...sample(),databaseNow:undefined},'claim_expired_or_clock_untrusted')
test('snapshot identity and canonical source must agree',()=>{
 const x=sample();x.reservation.snapshot.report_id=ids.target
 assert.equal(inspectHostedClaimEvidence(x).reason,'database_identity_drift')
 const y=sample();y.reservation.snapshot.source_url += '?stale=1'
 assert.equal(inspectHostedClaimEvidence(y).reason,'canonical_source_url_mismatch')
 const z=sample();z.reservation.snapshot.path='../file.png'
 assert.equal(inspectHostedClaimEvidence(z).reason,'invalid_claim_identity')
})
test('community requires matching bucket, kind, and unique path reference',()=>{
 const x=sample(),bucket='community-post-photos'
 x.reservation.target_kind='community_post'
 x.reservation.bucket=bucket
 x.reservation.snapshot.kind='community_post'
 x.reservation.snapshot.bucket=bucket
 x.reservation.snapshot.source_url=`https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/${bucket}/${path}`
 x.restriction.target_kind='community_post'
 x.report.target_kind='community_post'
 x.storageObject.bucket_id=bucket
 x.references.community_path_count=1
 x.currentSourceSnapshot={...x.reservation.snapshot}
 assert.equal(inspectHostedClaimEvidence(x).status,'candidate_only')
 x.references.community_path_count=0
 assert.equal(inspectHostedClaimEvidence(x).reason,'nonexclusive_or_unverified_references')
})
