// F16 Sandbox V2 retry: read-only reconciliation classification.
// This helper NEVER creates a retry grant, charges PayPal, or credits benefits.
// The provider/merchant identity and historical coverage must be independently
// attested by a privileged operator; browser inputs are not acceptable evidence.
const TERMINAL = new Set(['CANCELLED', 'EXPIRED', 'MERCHANT_CONFIRMED_ABSENT'])
const UNKNOWN = Object.freeze({
  decision:'REVIEW_REQUIRED', reason:'evidence_missing',
  mayRetry:false, mayRecordPayment:false, mayGrantBenefits:false
})
function blocked(reason) {
 return Object.freeze({decision:'REVIEW_REQUIRED',reason,
   mayRetry:false,mayRecordPayment:false,mayGrantBenefits:false})
}
export function classifyV2MerchantRetryReadiness(e) {
 if (!e || typeof e!=='object' || Array.isArray(e)) return UNKNOWN
 if (e.environment!=='sandbox' || e.source!=='privileged_server_review')
   return blocked('trusted_merchant_review_missing')
 if (e.ownerBindingVerified!==true || e.oldIntentBindingVerified!==true ||
     e.planBindingVerified!==true || e.merchantAppIdentityVerified!==true)
   return blocked('merchant_app_or_binding_unverified')
 if (e.providerStatus==='404' || e.providerStatus==='RESOURCE_NOT_FOUND')
   return blocked('provider_404_is_not_terminal_evidence')
 if (e.providerStatus==='APPROVAL_PENDING')
   return blocked('resume_existing_approval_only')
 if (['ACTIVE','APPROVED','SUSPENDED'].includes(e.providerStatus))
   return blocked('original_subscription_may_bill')
 if (!TERMINAL.has(e.providerStatus))
   return blocked('provider_terminal_state_unverified')
 if (e.providerStatus==='MERCHANT_CONFIRMED_ABSENT' &&
     e.independentMerchantAuditVerified!==true)
   return blocked('independent_absence_audit_missing')
 if (e.nonCollectibleVerified!==true || e.subscriptionHistoryComplete!==true ||
     e.transactionHistoryComplete!==true || e.refundHistoryComplete!==true ||
     e.disputeHistoryComplete!==true || e.webhookInboxReconciled!==true ||
     e.noPendingOrLatePaymentVerified!==true || e.noActiveOwnerSubscriptionVerified!==true ||
     e.noPaidPeriodVerified!==true || e.consentOfferCurrent!==true)
   return blocked('historical_financial_coverage_incomplete')
 // Even comprehensive evidence is NOT an operator-approved SQL retry grant.
 return Object.freeze({decision:'OPERATOR_REVIEW_REQUIRED',
   reason:'evidence_complete_requires_private_grant_and_po_release',
   mayRetry:false,mayRecordPayment:false,mayGrantBenefits:false})
}
