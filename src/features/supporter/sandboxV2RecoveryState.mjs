// PAZO F16 — read-only, owner-scoped checkout recovery presentation policy.
// An existing PayPal subscription ID is not evidence of an approved or paid cycle.
// This classifier NEVER authorizes a second subscription or credits benefits.
const STATUSES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
export function classifySandboxV2Recovery({
 accountState,providerStatus=null,providerCode=null,providerError=null,
}={}){
 const base={mayStartNewCheckout:false,mayRecordPayment:false,
  mayGrantBenefits:false,paidThrough:null,canResumeOriginal:false}
 if(accountState==='pending')
  return Object.freeze({...base,phase:'creation_unconfirmed'})
 if(accountState!=='bound')
  return Object.freeze({...base,phase:'no_confirmed_subscription'})
 if(providerError==='paypal_subscription_not_found')
  return Object.freeze({...base,phase:'merchant_missing_needs_reconciliation'})
 if(providerError)
  return Object.freeze({...base,phase:'merchant_read_unavailable'})
 if(!STATUSES.has(providerStatus))
  return Object.freeze({...base,phase:'merchant_status_unverified'})
 if(providerStatus==='APPROVAL_PENDING'){
  const canResume=providerCode==='approval_can_resume'
  return Object.freeze({...base,phase:canResume?'approval_resumable':'approval_link_unavailable',
   canResumeOriginal:canResume})
 }
 if(providerStatus==='APPROVED'||providerStatus==='ACTIVE')
  return Object.freeze({...base,phase:'approval_not_payment'})
 if(providerStatus==='SUSPENDED')
  return Object.freeze({...base,phase:'existing_subscription_may_bill'})
 return Object.freeze({...base,phase:'terminal_needs_financial_reconciliation'})
}
