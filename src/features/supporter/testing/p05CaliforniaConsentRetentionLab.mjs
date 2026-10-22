// PAZO F16-P05 — California automatic-renewal consent retention LAB ONLY.
// CA BPC §17602(a)(6): evidence of affirmative consent at least 3 years,
// or 1 year after contract termination, whichever is longer.
// This is a minimum-retention calculator, NEVER an automatic deletion job.
// Not a legal opinion, not a tax/archive schedule and not deployed.
const UTC=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/
const parse=v=>{
 if(typeof v!=='string'||!UTC.test(v)||!Number.isFinite(Date.parse(v)))return null
 const normalized=new Date(v).toISOString()
 return normalized===v||normalized.replace(/\.000Z$/,'Z')===v?new Date(v):null
}
const exact=(v,k)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===k.slice().sort().join('|')
function addCalendarYears(start,years){
 const y=start.getUTCFullYear()+years,m=start.getUTCMonth()
 if(y>9999)return null
 const lastDay=new Date(Date.UTC(y,m+1,0)).getUTCDate()
 return new Date(Date.UTC(y,m,Math.min(start.getUTCDate(),lastDay),
  start.getUTCHours(),start.getUTCMinutes(),start.getUTCSeconds(),
  start.getUTCMilliseconds()))
}
export function calculateF16CaliforniaConsentMinimum({
 acceptedAt,terminatedAt,californiaRenewalLawApplies,
}={}){
 if(californiaRenewalLawApplies!==true)return null
 const start=parse(acceptedAt)
 const end=terminatedAt===null?null:parse(terminatedAt)
 if(!start||terminatedAt!==null&&!end||end&&+end<+start)return null
 const first=addCalendarYears(start,3)
 if(!first)return null
 if(!end)return Object.freeze({contractOpen:true,
  minimumUntil:null,reason:'termination_not_confirmed_keep_retained'})
 const oneAfter=addCalendarYears(end,1)
 const minimumUntil=+first>=+oneAfter?first:oneAfter
 return Object.freeze({contractOpen:false,
  minimumUntil:minimumUntil.toISOString(),
  reason:'minimum_statutory_window_calculated_only'})
}
const BASE=Object.freeze({environment:'sandbox',
 step:'f16_p05_california_consent_retention_preflight',
 recordMayBeDeleted:false,erasureAuthorized:false,financialDeletionAuthorized:false,
 privacyGateApproved:false,retentionPolicyEffective:false,
 paymentsEnabled:false,mayGrantBenefits:false,mayRecordPayment:false,
 dbWrites:0,networkPaymentWrites:0,retentionExpiryIsAutomaticDeletion:false})
const block=reason=>Object.freeze({...BASE,phase:'RETENTION_BLOCKED',reason})
// Dates stay in private caller memory; diagnostic output never leaks timestamps.
export function auditF16CaliforniaConsentRetention(input){
 const keys=['acceptedAt','terminatedAt','californiaRenewalLawApplies','now',
  'legalHold','taxAndAccountingReviewComplete','privacyAndDeletionReviewComplete',
  'contractTerminationVerified']
 if(!exact(input,keys))return block('retention_evidence_shape_invalid')
 const {acceptedAt,terminatedAt,now,californiaRenewalLawApplies,legalHold,
  taxAndAccountingReviewComplete,privacyAndDeletionReviewComplete,
  contractTerminationVerified}=input
 if(californiaRenewalLawApplies!==true)
  return block('statutory_applicability_unverified')
 if([legalHold,taxAndAccountingReviewComplete,privacyAndDeletionReviewComplete,
  contractTerminationVerified].some(v=>typeof v!=='boolean')||!parse(now))
  return block('review_flags_or_clock_invalid')
 if(terminatedAt===null)return block('contract_end_unknown_or_still_active')
 if(!contractTerminationVerified)return block('contract_termination_not_attested')
 const evidence=calculateF16CaliforniaConsentMinimum({
  acceptedAt,terminatedAt,californiaRenewalLawApplies})
 if(!evidence||evidence.contractOpen)
  return block('retention_determination_invalid')
 if(Date.parse(now)<Date.parse(evidence.minimumUntil))
  return block('california_minimum_retention_window_open')
 if(legalHold)return block('legal_or_dispute_hold_active')
 if(!taxAndAccountingReviewComplete||!privacyAndDeletionReviewComplete)
  return block('other_retention_or_privacy_review_incomplete')
 // No legal/financial assessment, signature, or deletion authorization happens
 // in this function. The output NEVER becomes "SAFE_TO_DELETE".
 return Object.freeze({...BASE,phase:'ELIGIBILITY_REVIEW_CANDIDATE_ONLY',
  reason:'statutory_minimum_elapsed_but_deletion_not_authorized',
  independentLegalReviewRequired:true,actualErasurePlanRequired:true})
}
