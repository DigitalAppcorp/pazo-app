import test from 'node:test'
import assert from 'node:assert/strict'
import {
  F14_TRIAL_SCOPE, trialRequestAllowed, trialTargetAllowed, assertTrialStorageIdentity
} from './trialScope.ts'

test('trial allows exactly one report target and the expected bucket', () => {
  assert.equal(trialRequestAllowed(F14_TRIAL_SCOPE.kind, F14_TRIAL_SCOPE.id), true)
  assert.equal(trialTargetAllowed(F14_TRIAL_SCOPE), true)
  for (const candidate of [
    {kind:'community_post',id:F14_TRIAL_SCOPE.id,bucket:'post-photos'},
    {kind:'feed_post',id:'ffffffff-ffff-4fff-8fff-ffffffffffff',bucket:'post-photos'},
    {kind:'feed_post',id:F14_TRIAL_SCOPE.id,bucket:'pet-avatars'},
    {kind:'feed_post',id:F14_TRIAL_SCOPE.id,bucket:'community-post-photos'},
  ]) assert.equal(trialTargetAllowed(candidate), false)
  assert.equal(trialRequestAllowed(undefined,F14_TRIAL_SCOPE.id), false)
  assert.equal(trialRequestAllowed('feed_post',undefined), false)
})

test('trial requires the immutable original Storage object id', () => {
  assert.doesNotThrow(() => assertTrialStorageIdentity({
    data:{id:F14_TRIAL_SCOPE.storageObjectId,name:'fixture.png'},error:null
  }))
  for (const response of [
    null, undefined, {}, [], {data:null,error:{status:404}},
    {data:{},error:null}, {data:{name:'fixture.png'},error:null},
    {data:{id:'00000000-0000-4000-8000-000000000000'},error:null},
    {data:{id:F14_TRIAL_SCOPE.storageObjectId},error:{status:403}},
  ]) assert.throws(()=>assertTrialStorageIdentity(response),/trial_storage_identity_unverified/)
})
