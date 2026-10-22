import test from 'node:test'
import assert from 'node:assert/strict'
import {parseOwnershipOffer} from './communityOwnershipState.ts'
const valid={status:'pending',candidate_user_id:'2158592e-627e-4ff1-af17-82db400a487d',expires_at:'2026-10-18T04:00:00Z'}
test('ownership offer must identify an actual targeted admin candidate and expiration',()=>{
 assert.deepEqual(parseOwnershipOffer(valid),{status:'pending',candidateUserId:valid.candidate_user_id,expiresAt:valid.expires_at})
 for(const bad of [null,{},[],{...valid,status:'accepted'}, {...valid,candidate_user_id:'other'}, {...valid,expires_at:'never'}]){
  assert.equal(parseOwnershipOffer(bad),null)
 }
})
