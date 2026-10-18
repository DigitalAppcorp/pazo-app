import test from 'node:test'
import assert from 'node:assert/strict'
import {classifyV2MerchantRetryReadiness as classify}
 from '../f16SandboxMerchantRetryReadiness.mjs'
const base={
 environment:'sandbox',source:'privileged_server_review',
 ownerBindingVerified:true,oldIntentBindingVerified:true,
 planBindingVerified:true,merchantAppIdentityVerified:true,
 providerStatus:'CANCELLED',independentMerchantAuditVerified:true,
 nonCollectibleVerified:true,subscriptionHistoryComplete:true,
 transactionHistoryComplete:true,refundHistoryComplete:true,
 disputeHistoryComplete:true,webhookInboxReconciled:true,
 noPendingOrLatePaymentVerified:true,noActiveOwnerSubscriptionVerified:true,
 noPaidPeriodVerified:true,consentOfferCurrent:true
}
test('404 never becomes terminal even if all flags are true',()=>{
 const x=classify({...base,providerStatus:'404'})
 assert.equal(x.mayRetry,false)
 assert.equal(x.reason,'provider_404_is_not_terminal_evidence')
})
test('pending original must be resumed rather than replaced',()=>{
 assert.equal(classify({...base,providerStatus:'APPROVAL_PENDING'}).reason,
  'resume_existing_approval_only')
})
test('merchant absence without independent audit fails closed',()=>{
 const x=classify({...base,providerStatus:'MERCHANT_CONFIRMED_ABSENT',
   independentMerchantAuditVerified:false})
 assert.equal(x.mayRetry,false)
})
test('every required coverage dimension fails closed',()=>{
 for(const key of ['nonCollectibleVerified','subscriptionHistoryComplete',
 'transactionHistoryComplete','refundHistoryComplete','disputeHistoryComplete',
 'webhookInboxReconciled','noPendingOrLatePaymentVerified',
 'noActiveOwnerSubscriptionVerified','noPaidPeriodVerified','consentOfferCurrent']){
  assert.equal(classify({...base,[key]:false}).mayRetry,false,key)
  assert.equal(classify({...base,[key]:false}).reason,'historical_financial_coverage_incomplete',key)
 }
})
test('untrusted caller cannot claim merchant reconciliation',()=>{
 assert.equal(classify({...base,source:'browser'}).mayRetry,false)
 assert.equal(classify({...base,merchantAppIdentityVerified:false}).mayRetry,false)
})
test('complete read-only evidence still requires an operator grant',()=>{
 const x=classify(base)
 assert.equal(x.decision,'OPERATOR_REVIEW_REQUIRED')
 assert.equal(x.mayRetry,false)
 assert.equal(x.mayRecordPayment,false)
 assert.equal(x.mayGrantBenefits,false)
})
