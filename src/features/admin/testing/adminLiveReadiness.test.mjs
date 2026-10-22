import test from 'node:test'
import assert from 'node:assert/strict'
import {parsePazoLiveReadiness,LIVE_READINESS_CHECKS} from '../liveReadiness.mjs'
const row=()=>({source:'pazo_live_admin_readiness_v1',asOf:'2026-10-21T21:00:00Z',
 phase:'engineering_pending',checkoutActive:false,mayActivate:false,mayCharge:false,
 checks:Object.fromEntries(LIVE_READINESS_CHECKS.map(k=>[k,!['releaseControlsReady','credentialsStored','providerResourcesVerified'].includes(k)])),
 blockers:['controlled_release_pending','live_credentials_pending','provider_verification_pending']})
test('a real blocked snapshot preserves separate engineering, credentials and provider states',()=>{
 assert.deepEqual(parsePazoLiveReadiness(row()),row())
 const data=row();data.checks.releaseControlsReady=true;data.blockers.shift();data.phase='credentials_pending'
 assert.deepEqual(parsePazoLiveReadiness(data),data)
 data.checks.credentialsStored=true;data.checks.providerResourcesVerified=true;data.blockers=[];data.phase='canary_pending'
 assert.deepEqual(parsePazoLiveReadiness(data),data)
})
test('browser release claims, unknown metadata and contradictory phases are not trusted',()=>{
 for(const patch of [{mayCharge:true},{mayActivate:true},{source:'browser'},
  {phase:'active'},{phase:'canary_pending'},{phase:'credentials_pending'},
  {ownerId:'private'},{clientSecret:'private'},{blockers:[]},{asOf:'invalid'}]){
  assert.equal(parsePazoLiveReadiness({...row(),...patch}),null)
 }
 for(const invalid of [null,{},[],false])assert.equal(parsePazoLiveReadiness(invalid),null)
})
test('missing, duplicate, extra or non-boolean checks and blocker codes fail closed',()=>{
 for(const patch of [{workerHealthy:null},{credentialsStored:'true'},{providerId:'private'}])
  assert.equal(parsePazoLiveReadiness({...row(),checks:{...row().checks,...patch}}),null)
 for(const blockers of [['controlled_release_pending','controlled_release_pending'],
  ['untrusted_provider_message'],['provider_verification_pending','live_credentials_pending','controlled_release_pending']])
  assert.equal(parsePazoLiveReadiness({...row(),blockers}),null)
 const data=row();delete data.checks.termsReady
 assert.equal(parsePazoLiveReadiness(data),null)
})
