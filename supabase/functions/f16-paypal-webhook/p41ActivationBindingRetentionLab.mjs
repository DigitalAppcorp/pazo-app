// PAZO F16-P41 — PROVISIONAL retention clock for a private activation binding.
// Offline / synthetic review only. The PO approved the 3-year policy as a
// product criterion SUBJECT to legal/backup review, not automatic deletion.
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/
function validInstant(value){
 if(typeof value!=='string'||!UTC.test(value))return false
 const ms=Date.parse(value)
 if(!Number.isFinite(ms))return false
 const normalized=new Date(ms).toISOString()
 const expected=value.endsWith('Z')&&!value.includes('.')?
  value.slice(0,-1)+'.000Z':value
 const year=Number(value.slice(0,4))
 return year>=2000&&year<=2100&&normalized===expected
}
function threeCalendarYearsFrom(instant){
 const start=new Date(instant)
 // Date.UTC normalizes a Feb 29 anniversary to Mar 1 in a nonleap year,
 // conservatively avoiding a premature deletion on Feb 28.
 return new Date(Date.UTC(start.getUTCFullYear()+3,start.getUTCMonth(),
  start.getUTCDate(),start.getUTCHours(),start.getUTCMinutes(),
  start.getUTCSeconds(),start.getUTCMilliseconds())).toISOString()
}
const deny=reason=>Object.freeze({
 step:'f16_p41_activation_binding_retention_lab',phase:'REVIEW_REQUIRED',reason,
 thresholdCandidate:null,eligibleForHumanReview:false,
 mayDelete:false,mayReleaseRetentionHold:false,mayEraseBackups:false,
 mayMutateHosted:false
})
export function assessP41ActivationBindingRetention({
 effectiveContractEnd,asOf,providerTerminationVerified=false,
 ownerSubscriptionMatched=false,financialReconciliationComplete=false,
 disputeOpen=false,refundPending=false,legalHold=false,
 backupPolicyReviewed=false,legalRetentionReviewed=false
}={}){
 if(!validInstant(effectiveContractEnd)||!validInstant(asOf))
  return deny('effective_termination_or_asof_missing')
 if(!providerTerminationVerified||!ownerSubscriptionMatched)
  return deny('contract_end_or_owner_unverified')
 if(disputeOpen||refundPending||legalHold)
  return deny('financial_or_legal_hold_active')
 if(!financialReconciliationComplete)
  return deny('financial_reconciliation_incomplete')
 const threshold=threeCalendarYearsFrom(effectiveContractEnd)
 if(Date.parse(asOf)<Date.parse(threshold))
  return Object.freeze({...deny('three_calendar_years_not_elapsed'),
   thresholdCandidate:threshold})
 if(!backupPolicyReviewed||!legalRetentionReviewed)
  return Object.freeze({...deny('legal_or_backup_review_outstanding'),
   thresholdCandidate:threshold})
 // Even apparent eligibility is not authorization to delete or change DB.
 return Object.freeze({...deny('candidate_for_manual_retention_review_only'),
  thresholdCandidate:threshold,eligibleForHumanReview:true})
}
