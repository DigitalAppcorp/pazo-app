import test from 'node:test'
import assert from 'node:assert/strict'
import {
  A3_SOCIAL_COUNTS, parseA3SocialCounts, assessA3SocialPreservation,
} from './socialDependencyReview.ts'

const inventory=()=>({
  ...Object.fromEntries(A3_SOCIAL_COUNTS.map(key=>[key,0])),
  social_cleanup_verified:false,destructive_execution_allowed:false,
})
const evidence=()=>({
  writesFrozen:true,physicalMediaRemovedAndVerified:true,
  feedRepliesPreserved:true,communityRepliesPreserved:true,
  otherCommunityPostsPreserved:true,communitiesArchived:true,
  legacyEmbeddedCommentsReconciled:true,moderationHoldsReconciled:true,
  thirdPartyCountsVerifiedAfter:true,
})

test('all verified conditions permit REVIEW but never erasure',()=>{
  const result=assessA3SocialPreservation(inventory(),evidence())
  assert.deepEqual(result,{reviewable:true,blockers:[],destructiveExecutionAllowed:false})
})

test('every applicable server proof fails closed',()=>{
  // A preservation receipt is only required when its associated content
  // exists; exercise all such gates with real positive aggregate counts.
  const involved={...inventory(),
    third_party_feed_replies_to_preserve:1,
    third_party_community_replies_to_preserve:1,
    third_party_community_posts_to_preserve:1,
    owned_communities:1,
  }
  for(const key of Object.keys(evidence())){
    const result=assessA3SocialPreservation(involved,{...evidence(),[key]:false})
    assert.equal(result.reviewable,false,key)
    assert.equal(result.destructiveExecutionAllowed,false,key)
    assert.ok(result.blockers.length>0,key)
  }
})

test('third-party replies under author-owned posts require preservation proof',()=>{
  for(const [countKey,evidenceKey,expected] of [
    ['third_party_feed_replies_to_preserve','feedRepliesPreserved','feed_replies_at_risk'],
    ['third_party_community_replies_to_preserve','communityRepliesPreserved','community_replies_at_risk'],
    ['third_party_community_posts_to_preserve','otherCommunityPostsPreserved','other_community_posts_at_risk'],
  ]){
    const counts={...inventory(),[countKey]:3}
    const result=assessA3SocialPreservation(counts,{...evidence(),[evidenceKey]:false})
    assert.ok(result.blockers.includes(expected),countKey)
    assert.equal(result.reviewable,false)
  }
})

test('owned communities must be archived, not cascaded onto other authors',()=>{
  const result=assessA3SocialPreservation(
    {...inventory(),owned_communities:2},
    {...evidence(),communitiesArchived:false},
  )
  assert.ok(result.blockers.includes('communities_not_archived'))
})

test('physical Storage and held moderation claims always block review',()=>{
  const objects=assessA3SocialPreservation(
    {...inventory(),owned_storage_objects:1},evidence())
  assert.ok(objects.blockers.includes('media_still_owned'))
  const held=assessA3SocialPreservation(
    {...inventory(),held_moderation_claims:1},evidence())
  assert.ok(held.blockers.includes('moderation_hold'))
})

test('unknown, incomplete and forged inventory fails closed',()=>{
  for(const input of [null,[],{},'okay',7,
    {...inventory(),owned_pets:-1},
    {...inventory(),owned_pets:'1'},
    {...inventory(),owned_pets:1.5},
    {...inventory(),owned_pets:NaN},
    {...inventory(),social_cleanup_verified:true},
    {...inventory(),destructive_execution_allowed:true},
  ]){
    assert.equal(parseA3SocialCounts(input),null)
    const result=assessA3SocialPreservation(input,evidence())
    assert.deepEqual(result,{reviewable:false,blockers:['invalid_inventory'],destructiveExecutionAllowed:false})
  }
  assert.equal(assessA3SocialPreservation(inventory(),null).reviewable,false)
})

test('absence of evidence for different users is never a zero-count presumption',()=>{
  const input={...inventory()}
  delete input.third_party_feed_replies_to_preserve
  assert.equal(assessA3SocialPreservation(input,evidence()).reviewable,false)
  assert.equal(assessA3SocialPreservation(inventory(),{}).reviewable,false)
})
