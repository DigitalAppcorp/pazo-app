// F16 prospective billing evidence inventory: OFFLINE gate, never authorizes payment.
const FIELDS=['publishedTerms','ownerAcceptance','providerSaleVerified','contractCycleVerified','refundCoverageVerified','disputeCoverageVerified','idempotentLedgerVerified','workerAuthorized']
export function evaluateF16ProspectiveBillingGate(evidence={}){
 const blockers=FIELDS.filter(k=>evidence?.[k]!==true)
 return Object.freeze({
  step:'f16_prospective_billing_preflight',phase:blockers.length?'BLOCKED':'REVIEW_REQUIRED',
  blockers:Object.freeze(blockers),allEvidenceClaimsPresent:blockers.length===0,
  // Even all true are caller claims, not authenticated evidence or a PO release.
  evidenceAttested:false,productionAuthorized:false,
  mayRecordPayment:false,mayGrantBenefits:false,mayCreatePaidPeriod:false,
  paidThrough:null,periodStart:null,periodEnd:null
 })
}
