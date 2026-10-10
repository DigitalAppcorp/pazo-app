import test from 'node:test'
import assert from 'node:assert/strict'
import {A3_CLEANUP_ORDER,reviewA3Cleanup} from './privateCleanupPlan.ts'

const valid = ()=>({
 requestProcessing:true,exactReviewerLeaseValid:true,writesFrozen:true,
 mediaRemovedAtOrigin:true,mediaUrlsNoLongerAvailable:true,
 heldModerationClaims:0,pendingCommunityTransfers:0,
 unresolvedThirdPartyReports:0,legacyEmbeddedComments:0,
 outsideProviderMedia:0,thirdPartySnapshotVerified:true,
 feedThreadsRedacted:true,communityThreadsRedacted:true,
 rescueSightingsReconciled:true,ownedCommunitiesArchived:true,thirdPartyIntegrityVerified:true,
})

test('cleanup order refuses to delete pets before their children and threads',()=>{
 assert.deepEqual(A3_CLEANUP_ORDER,[
  'redact_preserved_threads','remove_owned_replies_and_reactions',
  'delete_unretained_owned_posts','archive_owned_communities',
  'remove_private_documents_and_care','remove_pet_dependencies',
  'remove_owned_pets','remove_account_profile_and_links',
  'verify_others_and_zero_personal_data',
 ])
 const initial=reviewA3Cleanup(valid())
 assert.equal(initial.readyForReview,true)
 assert.equal(initial.nextStage,'redact_preserved_threads')
 assert.equal(initial.destructiveExecutionAllowed,false)
})

test('each completed step advances one ordered stage without granting execution',()=>{
 for(let n=0;n<A3_CLEANUP_ORDER.length;n++){
   const result=reviewA3Cleanup(valid(),A3_CLEANUP_ORDER.slice(0,n))
   assert.equal(result.nextStage,A3_CLEANUP_ORDER[n])
   assert.equal(result.readyForReview,true)
   assert.equal(result.destructiveExecutionAllowed,false)
 }
 const finished=reviewA3Cleanup(valid(),A3_CLEANUP_ORDER)
 assert.equal(finished.nextStage,null)
 assert.equal(finished.readyForReview,false)
 assert.equal(finished.destructiveExecutionAllowed,false)
})

test('each common safety proof fails closed before redaction',()=>{
 const template=valid()
 const deferred=new Set(['feedThreadsRedacted','communityThreadsRedacted',
   'ownedCommunitiesArchived','rescueSightingsReconciled'])
 for(const key of Object.keys(template)){
   if(deferred.has(key))continue
   const value=template[key]===true?false:1
   const result=reviewA3Cleanup({...template,[key]:value})
   assert.ok(result.missing.includes(key),key)
   assert.equal(result.nextStage,null,key)
 }
 for(const input of [null,[],undefined,{},'ready']){
   const result=reviewA3Cleanup(input)
   assert.equal(result.readyForReview,false)
   assert.equal(result.destructiveExecutionAllowed,false)
 }
})

test('deferred stage proofs are required immediately after the affected stage',()=>{
 const checks=[
   ['feedThreadsRedacted',1],
   ['communityThreadsRedacted',1],
   ['ownedCommunitiesArchived',4],
   ['rescueSightingsReconciled',5],
 ]
 for(const [key,complete] of checks){
   const evidence={...valid(),[key]:false}
   assert.ok(!reviewA3Cleanup(evidence,A3_CLEANUP_ORDER.slice(0,complete-1)).missing.includes(key),
    key+' cannot be required before its own stage')
   const later=reviewA3Cleanup(evidence,A3_CLEANUP_ORDER.slice(0,complete))
   assert.ok(later.missing.includes(key),key)
   assert.equal(later.nextStage,null,key)
 }
})

test('refuse forged and out-of-order checkpoints',()=>{
 for(const list of [
   ['remove_owned_pets'],
   [A3_CLEANUP_ORDER[0],A3_CLEANUP_ORDER[3]],
   ['invalid_step'],
 ]){
   const result=reviewA3Cleanup(valid(),list)
   assert.equal(result.readyForReview,false)
   assert.equal(result.nextStage,null)
   assert.ok(result.missing.some(s=>s.includes('checkpoint')||s==='unknown_stage'))
 }
})

test('fresh counters must be non-negative safe exact zero, not truthiness',()=>{
 for(const broken of [null,undefined,NaN,Infinity,-1,0.1,'0',true]){
   const result=reviewA3Cleanup({...valid(),heldModerationClaims:broken})
   assert.ok(result.missing.includes('heldModerationClaims'))
 }
})
