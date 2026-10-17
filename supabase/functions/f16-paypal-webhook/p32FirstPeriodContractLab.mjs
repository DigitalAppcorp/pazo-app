// F16-P32: first-cycle contract interval, synthetic-only and non-authorizing.
// A date interval is NOT evidence that a payment settled.
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/
const time=x=>typeof x==='string'&&ISO.test(x)&&Number.isFinite(Date.parse(x))&&
 new Date(x).toISOString()===(x.endsWith('.000Z')?x:x.replace(/Z$/,'.000Z'))
const deny=reason=>Object.freeze({step:'f16_p32_first_period_contract_lab',phase:'REVIEW_REQUIRED',
 reason,cycleVerified:false,contractIntervalCandidate:false,periodStart:null,periodEnd:null,
 paidThrough:null,mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false})
export function assessP32FirstPeriodContract({
 activationTime,observedNextBillingTime,activationMerchantVerified=false,
 nextBillingMerchantVerified=false,regularSaleMatched=false,
 ownerIntentBound=false,originalConsentVerified=false,
 refundHistoryComplete=false,disputeHistoryComplete=false,lateOrRecovered=false
}={}){
 if(!time(activationTime)||!time(observedNextBillingTime)||
 Date.parse(observedNextBillingTime)<=Date.parse(activationTime))
 return deny('verified_contract_dates_missing_or_invalid')
 if(!activationMerchantVerified||!nextBillingMerchantVerified)
 return deny('merchant_activation_or_billing_source_unverified')
 if(!ownerIntentBound||!originalConsentVerified||!regularSaleMatched)
 return deny('contract_sale_or_owner_unproven')
 if(lateOrRecovered)return deny('recovered_payment_requires_verified_original_cycle')
 if(!refundHistoryComplete||!disputeHistoryComplete)
 return deny('reversal_history_incomplete')
 // Even verified-looking booleans are mock claims, not authenticated provider proof.
 return Object.freeze({...deny('contract_interval_candidate_not_payment_proof'),
 contractIntervalCandidate:true})
}
