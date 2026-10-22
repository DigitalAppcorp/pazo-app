// F16-P05 — PayPal Subscriptions v1 documented FIELD CAPABILITY gate.
// Pure OFFLINE diagnostic, not a merchant attestation or paid-period authorizer.
// Source-of-truth: PayPal subscription, billing-cycle and transaction definitions.
const CAPABILITIES=Object.freeze({
 'SUBSCRIPTION_GET':Object.freeze({
  'start_time':'subscription_start_only',
  'billing_info.next_billing_time':'future_charge_schedule_only',
  'billing_info.cycle_executions':'counter_only',
  'billing_info.last_payment':'last_payment_summary_only',
  'billing_info.outstanding_balance':'debt_snapshot_only',
 }),
 'PLAN_GET':Object.freeze({
  'billing_cycles[].frequency':'recurrence_frequency_only',
  'billing_cycles[].pricing_scheme':'current_or_versioned_price_only',
 }),
 'TRANSACTIONS_GET':Object.freeze({
  'transactions[].id':'payment_identity_only',
  'transactions[].time':'payment_processing_timestamp_only',
  'transactions[].status':'payment_status_only',
 }),
 'SALE_WEBHOOK_GET':Object.freeze({
  'resource.id':'sale_webhook_identity_only',
  'resource.billing_agreement_id':'subscription_relation_only',
 }),
 'ACTIVATION_WEBHOOK_GET':Object.freeze({
  'resource.billing_info.next_billing_time':'historic_future_charge_schedule_only',
  'resource.start_time':'historic_subscription_start_only',
 }),
})
const out=(phase,reason,extra={})=>Object.freeze({
 phase,reason,environment:'sandbox',step:'f16_p05_provider_field_capabilities_lab',
 cycleVerified:false,cycleAttributionConfirmed:false,mayRecordPayment:false,
 mayCreatePaidPeriod:false,mayGrantBenefits:false,mayCountCommemorativeMonth:false,
 paidThrough:null,periodStart:null,periodEnd:null,
 financialHistoryComplete:false,dbWrites:0,networkPaymentWrites:0,...extra,
})
const exact=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===allowed.slice().sort().join('|')
const inputKeys=['source','field','claimedUse']
const allowedUses=new Set(['payment_identity','recurrence','billing_schedule','cycle_interval','sale_cycle_allocation','paid_through'])
export function auditF16P05ProviderFieldClaims({claims}={}){
 if(!Array.isArray(claims)||claims.length===0||claims.length>32)
  return out('REVIEW_REQUIRED','claims_missing_or_unbounded')
 const observed=new Set(),capabilities=new Set()
 let unsupported=0,overclaims=0
 for(const claim of claims){
  if(!exact(claim,inputKeys)||typeof claim.source!=='string'||
   typeof claim.field!=='string'||!allowedUses.has(claim.claimedUse))
   return out('REVIEW_REQUIRED','claim_shape_invalid_or_private_data')
  const cap=CAPABILITIES[claim.source]?.[claim.field]
  if(!cap)return out('REVIEW_REQUIRED','unknown_provider_field_or_source')
  const key=claim.source+'\u0000'+claim.field
  if(observed.has(key))return out('REVIEW_REQUIRED','duplicate_field_claim')
  observed.add(key);capabilities.add(cap)
  // No enumerated Subscriptions v1 field directly attests a service interval,
  // payment-to-cycle allocation, or paidThrough. Asserted labels NEVER override.
  if(['cycle_interval','sale_cycle_allocation','paid_through'].includes(claim.claimedUse)){
   overclaims++;continue
  }
  const valid=claim.claimedUse==='payment_identity'?
   ['payment_identity_only','sale_webhook_identity_only','subscription_relation_only',
    'payment_status_only','payment_processing_timestamp_only'].includes(cap):
   claim.claimedUse==='recurrence'?cap==='recurrence_frequency_only':
   claim.claimedUse==='billing_schedule'?
    ['future_charge_schedule_only','historic_future_charge_schedule_only'].includes(cap):
   false
  if(!valid)unsupported++
 }
 if(overclaims)return out('REVIEW_REQUIRED','paypal_field_overclaimed_as_paid_cycle_proof',{
  unsupportedClaimCount:overclaims,capabilityCount:capabilities.size,
 })
 if(unsupported)return out('REVIEW_REQUIRED','field_claimed_use_not_supported',{
  unsupportedClaimCount:unsupported,capabilityCount:capabilities.size,
 })
 return out('SOURCE_CAPABILITY_REVIEWED','provider_fields_supported_only_for_nonperiod_facts',{
  capabilityCount:capabilities.size,verifiedPaidCycleSource:false,
  requiresIndependentContractAndAllocationEvidence:true,
 })
}
