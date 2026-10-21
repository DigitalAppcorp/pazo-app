// P31 offline evidence conjunction. Inputs are untrusted mock evaluations.
// Never produces an authorization to charge, book revenue or grant benefits.
const fail=reason=>Object.freeze({step:'f16_p31_evidence_conjunction',phase:'REVIEW_REQUIRED',reason,
 mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,
 financialCoverageVerified:false,paidThrough:null,periodStart:null,periodEnd:null})
export function evaluateP31EvidenceConjunction({saleReview,contractReview,obligationReview,ledgerReview}={}){
 if(saleReview?.reason!=='no_complete_reversal_history_or_contract'||
 saleReview?.saleReason!=='sale_identity_matches_review_only'||
 saleReview?.mayRecordPayment!==false)return fail('sale_reconciliation_missing')
 if(!contractReview||contractReview.originalConsentVerified!==true||
 contractReview.ownerBindingVerified!==true||contractReview.leaseVerified!==true||
 contractReview.mayRecordPayment!==false)return fail('contract_or_claim_unproven')
 if(!obligationReview||!['FIRST_OBLIGATION_RESERVED_FOR_REVIEW','FIRST_OBLIGATION_ALREADY_RESERVED'].includes(obligationReview.phase)||
 obligationReview.mayRecordPayment!==false)return fail('obligation_reservation_missing')
 if(ledgerReview?.reason!=='candidate_not_financially_attested'||
 ledgerReview?.mayRecordPayment!==false)return fail('ledger_candidate_conflict')
 return fail('merchant_history_and_period_still_unproven')
}
