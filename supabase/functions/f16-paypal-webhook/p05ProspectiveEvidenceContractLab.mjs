// PAZO F16-P05 — prospective, PURE OFFLINE evidence-contract preflight.
//
// This module accepts caller-supplied PROPOSALS, never attests PayPal signatures,
// proves provider billing-cycle allocation, or authorizes financial writes.
// It must never be imported into a deployed worker, RPC, or entitlement path.
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const REF=/^[A-Za-z0-9._:-]{3,128}$/
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/
const date=s=>typeof s==='string'&&UTC.test(s)&&
 Number.isFinite(Date.parse(s))&&
 (new Date(Date.parse(s)).toISOString()===s||
 new Date(Date.parse(s)).toISOString().replace(/\.000Z$/,'Z')===s)
const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===expected.slice().sort().join('|')
const same=(a,b)=>a.subscriptionId===b.subscriptionId&&
 a.intentId===b.intentId&&a.planId===b.planId
const defaults=Object.freeze({
 environment:'sandbox',step:'p05_prospective_evidence_contract_lab',
 needsManualReview:true,cycleAttributionConfirmed:false,
 mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,
 mayCountCommemorativeMonth:false,mayRevokeBenefits:false,mayChangeBilling:false,
 cycleVerified:false,periodStart:null,periodEnd:null,paidThrough:null,
 globalFinancialCoverage:false,dbWrites:0,networkPaymentWrites:0,
})
const deny=(reason,details={})=>Object.freeze({
 ...defaults,phase:'REVIEW_REQUIRED',reason,...details,
})
const contractKeys=['schemaVersion','environment','subscriptionId','intentId','planId',
 'source','capturedAt','monthlyPriceMinor','currency','quantity','planOverridden',
 'setupFeeMinor','billingFrequency','billingStartTime']
const activationKeys=['subscriptionId','intentId','planId','source','eventId',
 'eventType','capturedAt','eventCreatedAt','nextBillingTime']
const saleKeys=['subscriptionId','saleId','webhookEventId','time','amountMinor',
 'currency','status','source']
const cycleKeys=['saleId','cycleKey','start','end','allocationKind','originProof']
const financeKeys=['refunds','disputes','transactionsWindowComplete',
 'historicalCoverageAttested']
export function auditF16P05ProspectiveEvidence({
 contract,activation,sales,proposedCycles,financialReview,
}={}){
 if(!keys(contract,contractKeys)||contract.schemaVersion!==1||
  contract.environment!=='sandbox'||contract.source!=='MERCHANT_PLAN_AND_SUBSCRIPTION_GET'||
  !SUB.test(contract.subscriptionId||'')||!REF.test(contract.intentId||'')||
  !REF.test(contract.planId||'')||!date(contract.capturedAt)||
  !date(contract.billingStartTime)||
  !Number.isSafeInteger(contract.monthlyPriceMinor)||contract.monthlyPriceMinor<=0||
  contract.currency!=='USD'||contract.billingFrequency!=='MONTH_1'||
  contract.quantity!==1||typeof contract.planOverridden!=='boolean'||
  !(contract.setupFeeMinor===null||Number.isSafeInteger(contract.setupFeeMinor)))
  return deny('contract_snapshot_malformed_or_missing')
 if(contract.planOverridden||contract.monthlyPriceMinor!==299)
  return deny('subscription_override_or_price_mismatch')
 if(contract.setupFeeMinor===null)
  return deny('setup_fee_unverified_not_zero')
 if(contract.setupFeeMinor!==0)
  return deny('setup_fee_not_zero')
 if(!keys(activation,activationKeys)||!same(contract,activation)||
  activation.source!=='SIGNED_ACTIVATION_EVENT_AND_MERCHANT_GET'||
  !REF.test(activation.eventId||'')||
  activation.eventType!=='BILLING.SUBSCRIPTION.ACTIVATED'||
  !date(activation.capturedAt)||!date(activation.eventCreatedAt)||
  (activation.nextBillingTime!==null&&!date(activation.nextBillingTime)))
  return deny('activation_snapshot_missing_or_mismatched')
 if(Date.parse(activation.capturedAt)<Date.parse(activation.eventCreatedAt)||
  (activation.nextBillingTime!==null&&
    Date.parse(activation.nextBillingTime)<=Date.parse(activation.eventCreatedAt)))
  return deny('activation_timeline_invalid')
 // A later observed next-billing timestamp does NOT establish a paid period.
 if(!Array.isArray(sales)||sales.length<1||sales.length>24||
  !Array.isArray(proposedCycles)||proposedCycles.length<1||
  proposedCycles.length>24)
  return deny('missing_or_unbounded_sale_cycle_evidence')
 if(!keys(financialReview,financeKeys)||
  !['clear','open','unknown'].includes(financialReview.refunds)||
  !['clear','open','unknown'].includes(financialReview.disputes)||
  typeof financialReview.transactionsWindowComplete!=='boolean'||
  typeof financialReview.historicalCoverageAttested!=='boolean')
  return deny('financial_review_shape_invalid')
 if(financialReview.refunds!=='clear'||financialReview.disputes!=='clear')
  return deny('refund_or_dispute_status_requires_review')
 if(!financialReview.transactionsWindowComplete||
  !financialReview.historicalCoverageAttested)
  return deny('financial_history_not_attested')
 const seenSaleIds=new Set()
 for(const s of sales){
  if(!keys(s,saleKeys)||s.subscriptionId!==contract.subscriptionId||
    !REF.test(s.saleId||'')||!REF.test(s.webhookEventId||'')||
    !date(s.time)||!Number.isSafeInteger(s.amountMinor)||
    s.currency!=='USD'||s.status!=='COMPLETED'||
    s.source!=='MERCHANT_GET_AND_SIGNED_SALE_EVENT')
    return deny('sale_evidence_malformed_or_not_completed')
  if(seenSaleIds.has(s.saleId))return deny('duplicate_sale_id')
  seenSaleIds.add(s.saleId)
 }
 const seenCycles=new Set(),mappedSales=new Set(),intervals=[]
 for(const c of proposedCycles){
  if(!keys(c,cycleKeys)||!REF.test(c.cycleKey||'')||
    !REF.test(c.saleId||'')||!date(c.start)||!date(c.end)||
    Date.parse(c.start)>=Date.parse(c.end)||
    !['regular','retry','outstanding_capture','unknown'].includes(c.allocationKind)||
    !['provider_cycle_reference','contractual_schedule_only','unproven'].includes(c.originProof))
    return deny('cycle_proposal_malformed_or_unproven')
  if(seenCycles.has(c.cycleKey))return deny('duplicate_cycle_key')
  if(mappedSales.has(c.saleId))return deny('sale_claimed_by_multiple_cycles')
  if(!seenSaleIds.has(c.saleId))return deny('cycle_sale_not_in_merchant_evidence')
  seenCycles.add(c.cycleKey);mappedSales.add(c.saleId)
  intervals.push([Date.parse(c.start),Date.parse(c.end)])
 }
 intervals.sort((a,b)=>a[0]-b[0])
 for(let i=1;i<intervals.length;i++){
  if(intervals[i][0]<intervals[i-1][1])
   return deny('overlapping_cycle_candidates')
 }
 if(mappedSales.size!==seenSaleIds.size)
  return deny('unallocated_sales_require_review')
 if(sales.some(s=>s.amountMinor!==299))
  return deny('sale_amount_does_not_match_single_cycle')
 if(proposedCycles.some(c=>c.allocationKind!=='regular'))
  return deny('late_or_recovered_sale_requires_independent_original_cycle_proof')
 if(proposedCycles.some(c=>c.originProof!=='provider_cycle_reference'))
  return deny('sale_to_cycle_provider_reference_missing')
 // The provider-cycle claim is untrusted input; neither this function nor a
 // caller-owned boolean can attest its authenticity. No dates/IDs in output.
 return Object.freeze({...defaults,phase:'CANDIDATE_ONLY',
  reason:'self_reported_evidence_chain_consistent_not_provider_attested',
  candidateCount:proposedCycles.length,
  capturedHistoricalNextBillingDate:activation.nextBillingTime!==null,
  sourceValidationRequired:true,
 })
}
