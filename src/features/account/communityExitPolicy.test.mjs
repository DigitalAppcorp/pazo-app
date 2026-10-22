import test from 'node:test'
import assert from 'node:assert/strict'
import {decideCommunityExit,ACCOUNT_DELETION_ENABLED} from './communityExitPolicy.ts'
const f={hasDeletionRequest:true,isProcessing:false,ownerHasCommunity:true,
candidateIsAdmin:false,candidateAccepted:false,offerPending:false,offerExpired:false,hasExternalContent:true}
test('no acceptance means no automatic transfer or data destruction',()=>{
 assert.equal(decideCommunityExit(f),'blocked')
 assert.equal(decideCommunityExit({...f,isProcessing:true}),'archive_preserve_content')
})
test('unexpired transfer offer blocks archive',()=>{
 assert.equal(decideCommunityExit({...f,isProcessing:true,offerPending:true}),'wait_for_acceptance')
})
test('only consenting admin can become owner',()=>{
 assert.equal(decideCommunityExit({...f,candidateAccepted:true}),'blocked')
 assert.equal(decideCommunityExit({...f,candidateAccepted:true,candidateIsAdmin:true}),'transfer_accepted')
})
test('expired or refused offer leads to archive at processing without deleting third-party content',()=>{
 assert.equal(decideCommunityExit({...f,offerPending:true,offerExpired:true,isProcessing:true}),'archive_preserve_content')
 assert.equal(decideCommunityExit({...f,hasExternalContent:false,isProcessing:true}),'archive_preserve_content')
})
test('no request and no community cannot grant deletion',()=>{
 assert.equal(decideCommunityExit({...f,hasDeletionRequest:false,isProcessing:true}),'blocked')
 assert.equal(decideCommunityExit({...f,ownerHasCommunity:false}),'none')
 assert.equal(ACCOUNT_DELETION_ENABLED,false)
})
