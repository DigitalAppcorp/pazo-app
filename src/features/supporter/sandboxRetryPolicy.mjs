// PAZO F16 — deliberately conservative approval-abandonment retry policy.
// Evaluate only server-verified merchant and financial evidence; NEVER grant a
// new billing attempt merely from a 404, browser return, elapsed time or local state.
const TERMINAL=new Set(['CANCELLED','EXPIRED','MERCHANT_CONFIRMED_ABSENT'])
const validBoolean=x=>x===true
export function evaluateSandboxRetryEvidence(evidence) {
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))
  return Object.freeze({canRetry:false,code:'verification_required'})
 if(evidence.environment!=='sandbox'||evidence.ownerVerified!==true||
    evidence.oldIntentVerified!==true||evidence.planVerified!==true)
  return Object.freeze({canRetry:false,code:'merchant_binding_unverified'})
 if(evidence.currentStatus==='APPROVAL_PENDING')
  return Object.freeze({canRetry:false,code:'resume_original_approval'})
 if(['ACTIVE','APPROVED','SUSPENDED'].includes(evidence.currentStatus))
  return Object.freeze({canRetry:false,code:'existing_subscription_may_bill'})
 if(evidence.currentStatus==='RESOURCE_NOT_FOUND'||evidence.currentStatus==='404')
  return Object.freeze({canRetry:false,code:'merchant_not_found_needs_independent_reconciliation'})
 if(!TERMINAL.has(evidence.currentStatus))
  return Object.freeze({canRetry:false,code:'merchant_terminal_state_missing'})
 if(evidence.currentStatus==='MERCHANT_CONFIRMED_ABSENT' &&
    evidence.independentMerchantAuditVerified!==true)
  return Object.freeze({canRetry:false,code:'independent_merchant_audit_required'})
 if(!validBoolean(evidence.merchantTerminalVerified)||
    !validBoolean(evidence.noCollectibleSubscription)||
    !validBoolean(evidence.paymentHistoryReconciled)||
    !validBoolean(evidence.noUnresolvedPayment)||
    !validBoolean(evidence.webhookInboxReconciled)||
    !validBoolean(evidence.noActiveOwnerSubscription)||
    !validBoolean(evidence.consentOfferCurrent))
  return Object.freeze({canRetry:false,code:'financial_reconciliation_incomplete'})
 return Object.freeze({canRetry:true,code:'eligible_for_new_consent'})
}
