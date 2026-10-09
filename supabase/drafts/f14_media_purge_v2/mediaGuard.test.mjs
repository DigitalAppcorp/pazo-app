import test from 'node:test'
import assert from 'node:assert/strict'
import { assessMediaCandidate } from './mediaGuard.mjs'

const OWNER = '11111111-1111-4111-8111-111111111111'
const PET = '22222222-2222-4222-8222-222222222222'
const TARGET = '33333333-3333-4333-8333-333333333333'
const OBJECT = '44444444-4444-4444-8444-444444444444'
const COMMUNITY = '55555555-5555-4555-8555-555555555555'
const FILENAME = '66666666-6666-4666-8666-666666666666.webp'
const ORIGIN = 'https://project.supabase.co'
const root = bucket => ORIGIN + '/storage/v1/object/public/' + bucket + '/'
function sample({kind = 'feed_post', path = OWNER + '/' + PET + '/' + FILENAME} = {}) {
  const bucket = { feed_post:'post-photos', pet_profile:'pet-avatars', community_post:'community-post-photos' }[kind]
  return {
    projectUrl: ORIGIN,
    task: { kind, targetId:TARGET, bucket, owner:OWNER, pet:PET, community:COMMUNITY,
      url:root(bucket)+path, path:kind==='community_post'?path:undefined },
    proof: {reportStatus:'removed',mediaStatus:'pending_review',restrictionTargetId:TARGET,
      restrictionTargetKind:kind,petOwnedByAuthor:true,authorizedCommunityAuthor:true,
      profileRelatedMediaCount:0,exactSourceReferences:1,otherObjectReferences:0,
      verifiedStorageObject:true,objectId:OBJECT,objectUpdatedAt:'2026-10-08T12:00:00.000Z',
      storageBucket:bucket,storagePath:path},
  }
}
function patch(original, { task = {}, proof = {}, ...rest }) {
  return {...original,...rest,task:{...original.task,...task},proof:{...original.proof,...proof}}
}
function blocked(name, input, reason) {
  test(name, () => {
    const result=assessMediaCandidate(input)
    assert.equal(result.status,'manual_review')
    assert.equal(result.reason,reason)
  })
}
test('new feed owner/pet UUID filename: only a candidate, never approval to delete', () => {
  const out=assessMediaCandidate(sample())
  assert.deepEqual({status:out.status,layout:out.layout,reason:out.reason},
    {status:'candidate_only',layout:'feed_current',reason:'requires_atomic_recheck_and_separate_deletion_gate'})
  assert.equal(out.path,OWNER+'/'+PET+'/'+FILENAME)
  assert.equal(Object.hasOwn(out,'deleted'),false)
})
test('legacy feed pet-only path can be inspected when ownership/reference proven', () => {
  const path=PET+'/IMG_20261008_1845.webp'
  assert.equal(assessMediaCandidate(sample({path})).layout,'feed_legacy_pet')
})
test('community post with paired URL and path', () => {
  const path=COMMUNITY+'/'+OWNER+'/'+FILENAME
  assert.equal(assessMediaCandidate(sample({kind:'community_post',path})).layout,'community_current')
})
test('profile avatar only when no linked media', () => {
  const path=OWNER+'/'+FILENAME
  assert.equal(assessMediaCandidate(sample({kind:'pet_profile',path})).layout,'pet_avatar_current')
})
blocked('external URL never deleted',
 patch(sample(),{task:{url:'https://example.org/other-file.jpg'}}),
 'external_or_noncanonical_url')
blocked('wrong canonical bucket',
 patch(sample(),{task:{url:root('pet-documents')+OWNER+'/'+PET+'/'+FILENAME}}),
 'unexpected_public_bucket')
blocked('query-bearing URL not canonical',
 patch(sample(),{task:{url:root('post-photos')+OWNER+'/'+PET+'/'+FILENAME+'?token=secret'}}),
 'external_or_noncanonical_url')
blocked('encoded slash rejected',
 patch(sample(),{task:{url:root('post-photos')+OWNER+'%2F'+PET+'/'+FILENAME}}),
 'ambiguous_encoding')
blocked('double encoded path rejected',
 patch(sample(),{task:{url:root('post-photos')+OWNER+'%252F'+PET+'/'+FILENAME}}),
 'ambiguous_encoding')
blocked('community URL/path mismatch',
 patch(sample({kind:'community_post',path:COMMUNITY+'/'+OWNER+'/'+FILENAME}),{task:{path:'other/'+FILENAME}}),
 'url_path_metadata_mismatch')
blocked('source path different from Storage identity',
 patch(sample(),{proof:{storagePath:OWNER+'/'+PET+'/other.png'}}),
 'object_identity_mismatch')
blocked('missing object proof',
 patch(sample(),{proof:{verifiedStorageObject:false}}),
 'unverified_object_or_shared_reference')
blocked('unknown object identity',
 patch(sample(),{proof:{objectId:'not-a-uuid'}}),
 'unverified_object_or_shared_reference')
blocked('shared image cannot be deleted',
 patch(sample(),{proof:{otherObjectReferences:1}}),
 'unverified_object_or_shared_reference')
blocked('multiple source references ambiguous',
 patch(sample(),{proof:{exactSourceReferences:2}}),
 'unverified_object_or_shared_reference')
blocked('wrong author/pet ownership',
 patch(sample(),{proof:{petOwnedByAuthor:false}}),
 'unverified_pet_ownership')
blocked('unverified community author',
 patch(sample({kind:'community_post',path:COMMUNITY+'/'+OWNER+'/'+FILENAME}),{proof:{authorizedCommunityAuthor:false}}),
 'unverified_community_author')
blocked('pet with related photos requires manual review',
 patch(sample({kind:'pet_profile',path:OWNER+'/'+FILENAME}),{proof:{profileRelatedMediaCount:2}}),
 'profile_has_related_or_unverified_media')
blocked('pet without related-media proof requires manual review',
 patch(sample({kind:'pet_profile',path:OWNER+'/'+FILENAME}),{proof:{profileRelatedMediaCount:undefined}}),
 'profile_has_related_or_unverified_media')
blocked('non-removed report cannot authorize media processing',
 patch(sample(),{proof:{reportStatus:'pending'}}),
 'not_a_current_moderated_media_case')
blocked('already purged status cannot reopen deletion',
 patch(sample(),{proof:{mediaStatus:'purged'}}),
 'not_a_current_moderated_media_case')
blocked('wrong restriction target cannot authorize deletion',
 patch(sample(),{proof:{restrictionTargetId:PET}}),
 'not_a_current_moderated_media_case')
blocked('private bucket never eligible',
 patch(sample(),{task:{bucket:'pet-documents'}}),
 'invalid_target_or_bucket')
blocked('unknown path prefix cannot be guessed',
 sample({path:'random/'+FILENAME}),
 'unknown_or_ambiguous_path_layout')
blocked('legacy path must be exactly one pet folder and one safe filename',
 sample({path:PET+'/nested/IMG_20261008.webp'}),
 'unknown_or_ambiguous_path_layout')
blocked('unrecognized filename extension blocked',
 sample({path:OWNER+'/'+PET+'/x.svg'}),
 'unknown_or_ambiguous_path_layout')
blocked('unrecognized filename characters blocked',
 sample({path:OWNER+'/'+PET+'/hello world.jpg'}),
 'unknown_or_ambiguous_path_layout')
blocked('community missing stored path',
 patch(sample({kind:'community_post',path:COMMUNITY+'/'+OWNER+'/'+FILENAME}),{task:{path:undefined}}),
 'missing_community_path')
blocked('invalid timestamp evidence',
 patch(sample(),{proof:{objectUpdatedAt:'unknown'}}),
 'unverified_object_or_shared_reference')
