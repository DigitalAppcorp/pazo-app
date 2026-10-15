// PAZO F16 — Consumer-facing supporter release controls, OFFLINE REVIEW ONLY.
// Checks proposals/claimed evidence shape; does NOT test a live UI, user
// acceptance, PayPal, actual notices, retention compliance, or permissions.
// No branch can authorize launch, ledger, entitlement, or financial writes.
const FIELDS=Object.freeze([
 'monthlyPriceAndCurrencyVisible',
 'automaticRenewalAndFrequencyVisible',
 'benefitsClearlyDescribed',
 'freeCoreRemainsAccessible',
 'expressConsentBeforePayPal',
 'consentInitiallyUnchecked',
 'clearCancellationPolicyNearby',
 'retainableAcknowledgementDelivered',
 'sameMediumOnlineCancellationVerified',
 'annualRenewalReminderVerified',
 'advancePriceChangeNoticeVerified',
 'noticeAndTermsVersioned',
 'subscriptionOwnerVerifiedServerSide',
 'signedWebhookAndMerchantSaleVerified',
 'saleToServiceCycleVerified',
 'refundAndDisputeCoverageVerified',
 'financialRetentionAndDeletionReviewed',
 'providerBackupsAndDataDeletionReviewed',
])
const OFFER=['product','currency','amountMinor','intervalUnit','intervalCount',
 'autoRenews','isFreeCore','hasTrial','offerVersion']
const INPUT=['offer','controls']
const sameKeys=(x,k)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===k.slice().sort().join('|')
const BASE=Object.freeze({
 environment:'sandbox',step:'f16_supporter_release_readiness_offline',
 launchAuthorized:false,mayActivateCheckout:false,mayCreateSubscription:false,
 mayGrantBenefits:false,mayRecordPayment:false,cycleVerified:false,
 periodStart:null,periodEnd:null,paidThrough:null,
 networkPaymentWrites:0,dbWrites:0,needsProductOwnerGo:true,
 needsIndependentRuntimeVerification:true,needsLegalReview:true,
})
const deny=(reason,missingControls=[])=>Object.freeze({
 ...BASE,phase:'REVIEW_REQUIRED',reason,missingControls,
})
export function auditF16SupporterLaunchControls(input){
 if(!sameKeys(input,INPUT)||!sameKeys(input.offer,OFFER))
  return deny('offer_or_controls_shape_invalid')
 const offer=input.offer
 if(offer.product!=='PAZO_OPTIONAL_SUPPORTER'||offer.currency!=='USD'||
  offer.amountMinor!==299||offer.intervalUnit!=='MONTH'||
  offer.intervalCount!==1||offer.autoRenews!==true||
  offer.isFreeCore!==true||offer.hasTrial!==false||
  !/^offer-[A-Za-z0-9._-]{3,64}$/.test(offer.offerVersion||''))
  return deny('offer_terms_not_consistent_with_approved_scope')
 if(!sameKeys(input.controls,FIELDS)||
  FIELDS.some(k=>typeof input.controls[k]!=='boolean'))
  return deny('control_attestations_missing_or_malformed')
 const missing=FIELDS.filter(k=>input.controls[k]!==true)
 if(missing.length)return deny('consumer_and_financial_release_gates_open',missing)
 // Claiming every boolean does NOT independently prove an actual runtime,
 // valid statutory disclosure or verified financial allocation.
 return Object.freeze({...BASE,phase:'ALL_CONTROLS_CLAIMED_NOT_ATTESTED',
  reason:'proposed_evidence_requires_independent_runtime_legal_and_provider_audit',
  missingControls:[],
 })
}
export const F16_SUPPORTER_REQUIRED_CONTROLS=FIELDS
