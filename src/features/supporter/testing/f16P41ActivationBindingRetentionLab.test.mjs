import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP41ActivationBindingRetention as assess} from '../../../../supabase/functions/f16-paypal-webhook/p41ActivationBindingRetentionLab.mjs'
const verified={
 effectiveContractEnd:'2026-10-15T10:00:00Z',asOf:'2029-10-15T10:00:00Z',
 providerTerminationVerified:true,ownerSubscriptionMatched:true,
 financialReconciliationComplete:true,
 backupPolicyReviewed:true,legalRetentionReviewed:true
}
const denied=x=>{
 assert.equal(x.mayDelete,false)
 assert.equal(x.mayReleaseRetentionHold,false)
 assert.equal(x.mayEraseBackups,false)
 assert.equal(x.mayMutateHosted,false)
}
test('three calendar years after verified contractual termination is human review only',()=>{
 const result=assess(verified)
 assert.equal(result.thresholdCandidate,'2029-10-15T10:00:00.000Z')
 assert.equal(result.eligibleForHumanReview,true)
 assert.equal(result.reason,'candidate_for_manual_retention_review_only')
 denied(result)
})
test('one second before threshold cannot qualify',()=>{
 const r=assess({...verified,asOf:'2029-10-15T09:59:59Z'})
 assert.equal(r.eligibleForHumanReview,false)
 assert.equal(r.reason,'three_calendar_years_not_elapsed')
 denied(r)
})
test('leap-day termination uses March 1 anniversary to avoid premature erasure',()=>{
 const base={...verified,effectiveContractEnd:'2028-02-29T11:20:00Z'}
 assert.equal(assess({...base,asOf:'2031-02-28T11:20:00Z'}).eligibleForHumanReview,false)
 const candidate=assess({...base,asOf:'2031-03-01T11:20:00Z'})
 assert.equal(candidate.thresholdCandidate,'2031-03-01T11:20:00.000Z')
 assert.equal(candidate.eligibleForHumanReview,true)
 denied(candidate)
})
test('missing merchant termination or ownership blocks the clock',()=>{
 for(const patch of [
  {effectiveContractEnd:null},{providerTerminationVerified:false},
  {ownerSubscriptionMatched:false},{financialReconciliationComplete:false},
  {asOf:'2030-02-30T00:00:00Z'},
  {effectiveContractEnd:'2026-10-15T10:00:00-07:00'}
 ]){
  const r=assess({...verified,...patch})
  assert.equal(r.eligibleForHumanReview,false)
  denied(r)
 }
})
test('dispute, refund, legal hold, unreviewed backups or law prevent review',()=>{
 for(const patch of [
  {disputeOpen:true},{refundPending:true},{legalHold:true},
  {backupPolicyReviewed:false},{legalRetentionReviewed:false}
 ]){
  const r=assess({...verified,...patch})
  assert.equal(r.eligibleForHumanReview,false)
  denied(r)
 }
})
test('cancellation alone is not a contract termination event',()=>{
 const r=assess({...verified,effectiveContractEnd:undefined,
   asOf:'2035-10-15T10:00:00Z'})
 assert.equal(r.thresholdCandidate,null)
 assert.equal(r.eligibleForHumanReview,false)
 denied(r)
})
