// PAZO F16-P05 — PURE OFFLINE UTC service-calendar DRAFT.
// This is calendar arithmetic for proposed terms, not PayPal settlement
// evidence, NOT a paid period, and must never be used as an entitlement grant.
const UTC=/^(20[2-9][0-9]|2100)-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/
const fields=(o,names)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===names.slice().sort().join('|')
const parse=v=>{
 if(typeof v!=='string'||!UTC.test(v))return null
 const d=new Date(v)
 return Number.isFinite(d.getTime())&&d.toISOString().replace(/\.000Z$/,'Z')===v?d:null
}
const names=['version','cadence','currency','priceMinor','setupFeeMinor','timezone',
 'anchorUtc','monthEndRule','origin']
function validatePolicy(p){
 if(!fields(p,names)||p.version!==1||p.cadence!=='MONTH_1'||
  p.currency!=='USD'||p.priceMinor!==299||p.setupFeeMinor!==0||
  p.timezone!=='UTC'||p.monthEndRule!=='CLAMP_RETURN_TO_ANCHOR_DAY'||
  p.origin!=='PROPOSED_PAzo_TERMS_AND_PROVIDER_ANCHOR')return false
 return parse(p.anchorUtc)!==null
}
function boundary(anchor,index){
 const origin=new Date(anchor)
 // Always derive from original anchor (31-Jan -> 28/29-Feb -> 31-Mar).
 const first=new Date(Date.UTC(origin.getUTCFullYear(),
  origin.getUTCMonth()+index,1))
 const y=first.getUTCFullYear(),m=first.getUTCMonth()
 if(y<2020||y>2100)return null
 const last=new Date(Date.UTC(y,m+1,0)).getUTCDate()
 return new Date(Date.UTC(y,m,
  Math.min(origin.getUTCDate(),last),
  origin.getUTCHours(),origin.getUTCMinutes(),origin.getUTCSeconds()))
  .toISOString().replace(/\.000Z$/,'Z')
}
// Exposed for unit tests and prospective policy review ONLY.
// Outputs are NOT suitable for actual membership periods.
export function calculateP05DraftUtcWindow(policy,cycleIndex){
 if(!validatePolicy(policy)||!Number.isInteger(cycleIndex)||cycleIndex<0||
  cycleIndex>239)return null
 const start=boundary(policy.anchorUtc,cycleIndex)
 const end=boundary(policy.anchorUtc,cycleIndex+1)
 if(!start||!end||Date.parse(start)>=Date.parse(end))return null
 return Object.freeze({start,end})
}
const base=Object.freeze({
 environment:'sandbox',step:'f16_p05_draft_service_calendar',
 needsManualReview:true,cycleVerified:false,cycleAttributionConfirmed:false,
 periodStart:null,periodEnd:null,paidThrough:null,
 mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,
 mayCountCommemorativeMonth:false,mayChangeBilling:false,
 financialHistoryComplete:false,dbWrites:0,networkPaymentWrites:0,
})
const review=(reason,extra={})=>Object.freeze({...base,phase:'REVIEW_REQUIRED',reason,...extra})
export function assessP05DraftCalendar({
 policy,cycleIndex,observedProviderNextBillingUtc,
 allocationKind,refundStatus,disputeStatus,
}={}){
 if(!validatePolicy(policy))return review('draft_terms_missing_or_unsupported')
 const window=calculateP05DraftUtcWindow(policy,cycleIndex)
 if(!window)return review('cycle_index_or_calendar_invalid')
 if(!(observedProviderNextBillingUtc===null||
  parse(observedProviderNextBillingUtc)!==null))
  return review('provider_next_billing_timestamp_invalid')
 if(!['regular','retry','outstanding_capture','unknown'].includes(allocationKind))
  return review('allocation_class_invalid')
 if(!['clear','open','unknown'].includes(refundStatus)||
  !['clear','open','unknown'].includes(disputeStatus))
  return review('refund_or_dispute_class_invalid')
 if(allocationKind!=='regular')return review('late_or_unknown_payment_requires_original_cycle_evidence')
 if(refundStatus!=='clear'||disputeStatus!=='clear')
  return review('financial_reversal_or_unknown_requires_review')
 if(observedProviderNextBillingUtc===null)
  return review('provider_billing_schedule_not_observed')
 if(window.end!==observedProviderNextBillingUtc)
  return review('provider_billing_schedule_differs_from_draft',{
   scheduleRelation:'mismatch',
  })
 // Even exact clock agreement is not payment allocation, merchant provenance,
 // acceptance/consumer contract evidence or authorization to grant coverage.
 return Object.freeze({...base,
  phase:'CALENDAR_CANDIDATE_ONLY',
  reason:'draft_anniversary_matches_provider_schedule_but_not_paid_cycle_proof',
  scheduleRelation:'match',
  cycleIndex,
  verifiedSaleToCycleAllocation:false,
  requiresIndependentContractAcceptance:true,
  requiresMerchantSaleAndCycleAttestation:true,
 })
}
