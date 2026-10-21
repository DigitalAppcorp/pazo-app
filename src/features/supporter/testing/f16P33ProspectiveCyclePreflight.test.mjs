import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP33ProspectiveCycle as check} from '../../../../supabase/functions/f16-paypal-webhook/p33ProspectiveCyclePreflight.mjs'
const evidence={saleReview:{reason:'no_complete_reversal_history_or_contract',saleReason:'sale_identity_matches_review_only',mayRecordPayment:false},contractReview:{originalConsentVerified:true,ownerBindingVerified:true,leaseVerified:true,mayRecordPayment:false},obligationReview:{phase:'FIRST_OBLIGATION_RESERVED_FOR_REVIEW',mayRecordPayment:false},ledgerReview:{reason:'candidate_not_financially_attested',mayRecordPayment:false}}
const contractDates={activationTime:'2026-10-15T10:00:00Z',observedNextBillingTime:'2026-11-14T10:00:00Z',activationMerchantVerified:true,nextBillingMerchantVerified:true,regularSaleMatched:true,ownerIntentBound:true,originalConsentVerified:true,refundHistoryComplete:true,disputeHistoryComplete:true}
test('conjunction plus plausible period remains in review with no payments',()=>{
 const x=check({evidence,contractDates})
 assert.equal(x.periodCandidateOnly,true)
 assert.deepEqual(x.blockers,['merchant_settlement_and_reversals_unattested'])
 assert.equal(x.cycleVerified,false);assert.equal(x.mayRecordPayment,false)
 assert.equal(x.mayGrantBenefits,false);assert.equal(x.paidThrough,null)
})
test('bad period or missing contract creates distinct blockers',()=>{
 const x=check({evidence:{...evidence,contractReview:null},contractDates:{...contractDates,observedNextBillingTime:null}})
 assert.deepEqual(x.blockers,['financial_evidence_not_correlated','contract_interval_unproven','merchant_settlement_and_reversals_unattested'])
 assert.equal(x.mayCreatePaidPeriod,false)
})
