import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateP31EvidenceConjunction as evaluate} from '../../../../supabase/functions/f16-paypal-webhook/p31EvidenceConjunctionLab.mjs'
const valid={
 saleReview:{reason:'no_complete_reversal_history_or_contract',saleReason:'sale_identity_matches_review_only',mayRecordPayment:false},
 contractReview:{originalConsentVerified:true,ownerBindingVerified:true,leaseVerified:true,mayRecordPayment:false},
 obligationReview:{phase:'FIRST_OBLIGATION_RESERVED_FOR_REVIEW',mayRecordPayment:false},
 ledgerReview:{reason:'candidate_not_financially_attested',mayRecordPayment:false}
}
test('even all synthetic reviewer claims cannot book a payment or grant access',()=>{
 const result=evaluate(valid)
 assert.equal(result.reason,'merchant_history_and_period_still_unproven')
 assert.equal(result.mayRecordPayment,false);assert.equal(result.mayGrantBenefits,false)
 assert.equal(result.mayCreatePaidPeriod,false);assert.equal(result.paidThrough,null)
})
test('missing contract, unverified sale and invalid reservation are independently blocked',()=>{
 assert.equal(evaluate({...valid,contractReview:{...valid.contractReview,ownerBindingVerified:false}}).reason,'contract_or_claim_unproven')
 assert.equal(evaluate({...valid,saleReview:{...valid.saleReview,saleReason:'merchant_mismatch'}}).reason,'sale_reconciliation_missing')
 assert.equal(evaluate({...valid,obligationReview:{...valid.obligationReview,phase:'OTHER'}}).reason,'obligation_reservation_missing')
 assert.equal(evaluate({...valid,ledgerReview:{...valid.ledgerReview,reason:'refund_conflict'}}).reason,'ledger_candidate_conflict')
})
