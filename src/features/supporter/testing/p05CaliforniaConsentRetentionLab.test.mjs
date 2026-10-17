import test from 'node:test'
import assert from 'node:assert/strict'
import {calculateF16CaliforniaConsentMinimum as minimum,
 auditF16CaliforniaConsentRetention as audit}
 from './p05CaliforniaConsentRetentionLab.mjs'
const context=()=>({acceptedAt:'2026-10-15T02:00:00Z',
 terminatedAt:'2026-11-15T02:00:00Z',
 californiaRenewalLawApplies:true,now:'2029-10-15T02:00:00Z',
 legalHold:false,taxAndAccountingReviewComplete:true,
 privacyAndDeletionReviewComplete:true,contractTerminationVerified:true})
const run=mutate=>{const x=context();mutate?.(x);const r=audit(x)
 assert.equal(r.recordMayBeDeleted,false)
 assert.equal(r.erasureAuthorized,false)
 assert.equal(r.financialDeletionAuthorized,false)
 assert.equal(r.privacyGateApproved,false)
 assert.equal(r.retentionPolicyEffective,false)
 assert.equal(r.paymentsEnabled,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.dbWrites,0)
 assert.equal(r.networkPaymentWrites,0)
 assert.equal(r.retentionExpiryIsAutomaticDeletion,false)
 for(const privateField of ['2029-10-15T02:00:00Z',
  '2026-10-15T02:00:00Z','2026-11-15T02:00:00Z'])
 assert.equal(JSON.stringify(r).includes(privateField),false)
 return r}
test('statutory baseline is consent+3 calendar years, when longer than termination+1',()=>{
 const m=minimum({acceptedAt:'2026-10-15T02:00:00Z',
  terminatedAt:'2026-11-15T02:00:00Z',californiaRenewalLawApplies:true})
 assert.deepEqual(m,{contractOpen:false,
  minimumUntil:'2029-10-15T02:00:00.000Z',
  reason:'minimum_statutory_window_calculated_only'})
})
test('late termination means retain for at least one year after termination',()=>{
 const m=minimum({acceptedAt:'2026-10-15T02:00:00Z',
  terminatedAt:'2030-06-15T02:00:00Z',californiaRenewalLawApplies:true})
 assert.equal(m.minimumUntil,'2031-06-15T02:00:00.000Z')
})
test('active contract is not eligible for erasure even after 3 years',()=>{
 const m=minimum({acceptedAt:'2026-10-15T02:00:00Z',
  terminatedAt:null,californiaRenewalLawApplies:true})
 assert.equal(m.contractOpen,true)
 assert.equal(m.minimumUntil,null)
 assert.equal(run(d=>d.terminatedAt=null).reason,
  'contract_end_unknown_or_still_active')
})
test('anniversary arithmetic supports leap-day without 365*3 drift',()=>{
 const m=minimum({acceptedAt:'2028-02-29T10:11:12Z',
  terminatedAt:'2028-03-01T11:00:00Z',californiaRenewalLawApplies:true})
 assert.equal(m.minimumUntil,'2031-02-28T10:11:12.000Z')
})
test('not before the longer statutory window',()=>{
 assert.equal(run(d=>d.now='2029-10-15T01:59:59Z').reason,
  'california_minimum_retention_window_open')
 assert.equal(run().phase,'ELIGIBILITY_REVIEW_CANDIDATE_ONLY')
 assert.equal(run(d=>d.terminatedAt='2030-06-15T02:00:00Z').reason,
  'california_minimum_retention_window_open')
})
test('legal hold always blocks, irrespective of elapsed statutory minimum',()=>{
 assert.equal(run(d=>d.legalHold=true).reason,
  'legal_or_dispute_hold_active')
})
test('tax review and privacy review are independent; both required',()=>{
 assert.equal(run(d=>d.taxAndAccountingReviewComplete=false).reason,
  'other_retention_or_privacy_review_incomplete')
 assert.equal(run(d=>d.privacyAndDeletionReviewComplete=false).reason,
  'other_retention_or_privacy_review_incomplete')
})
test('contract termination must be independently verified',()=>{
 assert.equal(run(d=>d.contractTerminationVerified=false).reason,
  'contract_termination_not_attested')
})
test('unknown applicability and malformed dates fail closed',()=>{
 assert.equal(run(d=>d.californiaRenewalLawApplies=null).reason,
  'statutory_applicability_unverified')
 for(const mutate of [
  d=>d.terminatedAt='2026-01-01T02:00:00Z',
  d=>d.acceptedAt='2026-02-30T02:00:00Z',
  d=>d.terminatedAt='2026-02-29T02:00:00Z',
  d=>d.terminatedAt=undefined,
 ])assert.equal(run(mutate).reason,'retention_determination_invalid')
 assert.equal(run(d=>d.now='2026-02-30T00:00:00Z').reason,
  'review_flags_or_clock_invalid')
})
test('no automatic delete even when all user-provided attestation flags say true',()=>{
 const r=run()
 assert.equal(r.phase,'ELIGIBILITY_REVIEW_CANDIDATE_ONLY')
 assert.equal(r.independentLegalReviewRequired,true)
 assert.equal(r.actualErasurePlanRequired,true)
 assert.equal(r.recordMayBeDeleted,false)
})
test('extraneous sensitive information never passes validation',()=>{
 assert.equal(run(d=>d.payerEmail='private@example.com').reason,
  'retention_evidence_shape_invalid')
})
test('96 combinations never return permission to delete',()=>{
 let n=0
 for(const legalHold of [false,true])
 for(const tax of [false,true])
 for(const privacy of [false,true])
 for(const terminates of [true,false])
 for(const applies of [true,false])
 for(const now of ['2027-02-01T00:00:00Z','2030-01-01T00:00:00Z','2032-01-01T00:00:00Z']){
  run(d=>Object.assign(d,{legalHold,
   taxAndAccountingReviewComplete:tax,privacyAndDeletionReviewComplete:privacy,
   contractTerminationVerified:terminates,
   californiaRenewalLawApplies:applies,now}))
  n++
 }
 assert.equal(n,96)
})
