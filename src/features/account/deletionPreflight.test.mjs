import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateAccountDeletionReadiness,ACCOUNT_DELETION_EXECUTION_ENABLED} from './deletionPreflight.ts'
function empty(){return {
 owned_pets:0,owned_feed_posts:0,owned_communities:0,owned_community_posts:0,
 external_community_posts:0,external_community_comments:0,external_comments_on_own_community_posts:0,external_community_memberships:0,
 external_feed_comments:0,pet_documents:0,storage_objects:0,moderation_records:0,
}}
test('third-party content and memberships block a community-owner deletion',()=>{
 const report=evaluateAccountDeletionReadiness({...empty(),owned_communities:1,external_community_posts:1,external_community_memberships:2})
 assert.equal(report.status,'blocked_third_party')
 assert.ok(report.blockers.includes('external_community_posts'))
 assert.ok(report.blockers.includes('external_community_memberships'))
})
test('third-party comments on feed posts prohibit blind cascade',()=>{
 const report=evaluateAccountDeletionReadiness({...empty(),owned_feed_posts:2,external_feed_comments:6})
 assert.equal(report.status,'blocked_third_party')
 assert.ok(report.blockers.includes('external_feed_comments'))
})
test('private documents and owned storage require explicit staged cleanup',()=>{
 const report=evaluateAccountDeletionReadiness({...empty(),owned_pets:1,pet_documents:1,storage_objects:3})
 assert.equal(report.status,'cleanup_required')
 assert.ok(report.blockers.includes('pet_documents'))
 assert.ok(report.blockers.includes('storage_objects'))
})
test('no assets is not permission to delete Auth user',()=>{
 const report=evaluateAccountDeletionReadiness(empty())
 assert.equal(ACCOUNT_DELETION_EXECUTION_ENABLED,false)
 assert.deepEqual(report,{status:'awaiting_executor',blockers:['execution_disabled']})
})
test('malformed counts cannot drive deletion readiness',()=>{
 for (const n of [-1,NaN,Infinity,2.3,'2',null]){
  assert.throws(()=>evaluateAccountDeletionReadiness({...empty(),storage_objects:n}))
 }
})

test('after a community transfers, other users comments on departing owner posts are STILL blockers',()=>{
 const result=evaluateAccountDeletionReadiness({...empty(),
   owned_communities:0,owned_community_posts:1,external_comments_on_own_community_posts:2})
 assert.equal(result.status,'blocked_third_party')
 assert.ok(result.blockers.includes('external_comments_on_own_community_posts'))
})
