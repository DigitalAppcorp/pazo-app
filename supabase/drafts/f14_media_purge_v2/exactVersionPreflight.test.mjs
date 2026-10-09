import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectExactVersionPreflight } from './exactVersionPreflight.mjs'

const ids = {
  claim: '11111111-1111-4111-8111-111111111111',
  object: '22222222-2222-4222-8222-222222222222',
  report: '33333333-3333-4333-8333-333333333333',
  target: '44444444-4444-4444-8444-444444444444',
}
const path = ids.claim + '/55555555-5555-4555-8555-555555555555/66666666-6666-4666-8666-666666666666.webp'
const time = '2026-10-09T06:00:00.000Z'
const fingerprint = '11111111111111111111111111111111'
function sample() {
  return {
    candidate: { status: 'candidate_only', bucket: 'post-photos', path,
      objectId: ids.object, targetId: ids.target, objectUpdatedAt: time },
    claim: { status: 'held', claimId: ids.claim, reportId: ids.report,
      targetId: ids.target, kind: 'feed_post', reportStatus: 'removed',
      mediaStatus: 'pending_review', exclusiveReferenceProof: true,
      bucket: 'post-photos', path, objectId: ids.object,
      version: '77777777-7777-4777-8777-777777777777',
      updatedAt: time, metadataFingerprint: fingerprint, expiresAt: '2026-10-09T07:00:00.000Z' },
    live: { bucket: 'post-photos', path, objectId: ids.object,
      version: '77777777-7777-4777-8777-777777777777',
      updatedAt: time, metadataFingerprint: fingerprint,
      isDeleteMarker: false, archivedAt: null },
    now: '2026-10-09T06:01:00.000Z',
  }
}
const patch = (x, field, modifications) => ({ ...x, [field]: { ...x[field], ...modifications } })
const blocked = (label, x, reason) => test(label, () => {
  const result = inspectExactVersionPreflight(x)
  assert.equal(result.status, 'manual_review')
  assert.equal(result.reason, reason)
  assert.equal(Object.hasOwn(result, 'selector'), false)
})
test('match yields documentation-based exact-version selector, never deletion approval', () => {
  const r=inspectExactVersionPreflight(sample())
  assert.equal(r.status, 'candidate_only')
  assert.equal(r.selector.versionId, sample().live.version)
  assert.deepEqual(Object.keys(r.selector).sort(), ['bucket','path','versionId'])
  assert.equal(r.mayDelete, false)
  assert.equal(r.originAbsentVerified, false)
  assert.equal(r.cdnAbsentVerified, false)
  assert.equal(Object.isFrozen(r.selector),true)
})
blocked('missing claim fails closed', {...sample(), claim:null},'missing_server_evidence')
blocked('client or reused candidate rejected',patch(sample(),'candidate',{status:'approved'}),'unverified_candidate')
blocked('wrong bucket rejected',patch(sample(),'candidate',{bucket:'pet-documents'}),'unverified_candidate')
blocked('legacy manual avatar task cannot become delete eligible',patch(sample(),'claim',{kind:'pet_profile'}),'claim_not_exact_or_unconfirmed')
blocked('report must be withdrawn',patch(sample(),'claim',{reportStatus:'pending'}),'claim_not_exact_or_unconfirmed')
blocked('media must still be awaiting review',patch(sample(),'claim',{mediaStatus:'purged'}),'claim_not_exact_or_unconfirmed')
blocked('shared-reference uncertainty blocks deletion',patch(sample(),'claim',{exclusiveReferenceProof:false}),'claim_not_exact_or_unconfirmed')
blocked('wrong report UUID blocks claim',patch(sample(),'claim',{reportId:'unverified'}),'claim_not_exact_or_unconfirmed')
blocked('changed snapshot path blocks claim',patch(sample(),'claim',{path:'different/file.png'}),'claim_not_exact_or_unconfirmed')
blocked('claim expired blocks selector',patch(sample(),'claim',{expiresAt:'2026-10-09T06:00:00Z'}),'claim_expired_or_clock_untrusted')
blocked('clock cannot be inferred from user', {...sample(), now:'unknown'},'claim_expired_or_clock_untrusted')
blocked('object id drift refuses any version',patch(sample(),'live',{objectId:ids.report}),'storage_version_or_identity_drift')
blocked('overwritten version blocks target selector',patch(sample(),'live',{version:'88888888-8888-4888-8888-888888888888'}),'storage_version_or_identity_drift')
blocked('version not verified fails closed',patch(sample(),'claim',{version:''}),'storage_version_or_identity_drift')
blocked('path moved to another bucket fails',patch(sample(),'live',{bucket:'pet-avatars'}),'storage_version_or_identity_drift')
blocked('updatedAt drift blocks version selector',patch(sample(),'live',{updatedAt:'2026-10-09T06:00:01Z'}),'object_metadata_or_state_drift')
blocked('metadata drift blocks selector',patch(sample(),'live',{metadataFingerprint:'22222222222222222222222222222222'}),'object_metadata_or_state_drift')
blocked('delete marker does not become valid target',patch(sample(),'live',{isDeleteMarker:true}),'object_metadata_or_state_drift')
blocked('archived object rejected as a live target',patch(sample(),'live',{archivedAt:'2026-10-09T06:00:01Z'}),'object_metadata_or_state_drift')
