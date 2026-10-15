// PAZO F16-P05 — proposed sale-to-cycle mapping audit, OFFLINE ONLY.
// Not a source of PayPal truth or a grant/revoke/paid-through mechanism.
// PO approved delinquency policy; proof, exact cycle anchor and hosted activation remain pending.
const ID=/^[A-Za-z0-9._-]{3,128}$/
const CYCLE=/^[A-Za-z0-9._:-]{3,128}$/
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
const time=s=>typeof s==='string'&&UTC.test(s)&&
 Number.isFinite(Date.parse(s))&&
 new Date(Date.parse(s)).toISOString().replace(/\.000Z$/,'Z')===s
const KINDS=new Set(['regular','retry','outstanding_capture','unknown'])
const deny=(reason,details={})=>Object.freeze({
 reason,
 needsManualReview:true,
 cycleAttributionConfirmed:false,
 mayCreatePaidPeriod:false,
 mayGrantBenefits:false,
 mayCountCommemorativeMonth:false,
 mayRevokeBenefits:false,
 mayChangeBilling:false,
 entitlement:false,
 paidThrough:null,
 periodStart:null,
 periodEnd:null,
 ...details,
})
export function auditF16P05ProposedCycleMapping({
 billingFacts,riskAssessment,proposedMappings,observedSales,
}={}) {
 // Inputs must originate in private service adapters, never from browsers.
 // These boolean preconditions are NOT authorization, because the return
 // contract intentionally refuses all benefits regardless of contents.
 if(billingFacts?.factsConsistent!==true||
  billingFacts.coverageReady!==false||
  billingFacts.needsCycleAttribution!==true||
  riskAssessment?.cycleVerified!==false||
  riskAssessment.mayGrantBenefits!==false||
  riskAssessment.needsCycleAttribution!==true)
  return deny('prior_merchant_or_cycle_review_incomplete')
 if(!Array.isArray(proposedMappings)||proposedMappings.length>100||
  !Array.isArray(observedSales)||observedSales.length>100)
  return deny('missing_or_unbounded_cycle_evidence')
 const salesById=new Map()
 for(const sale of observedSales){
  if(!sale||typeof sale!=='object'||Array.isArray(sale)||
   Object.keys(sale).sort().join('|')!=='amountMinor|saleId|state'||
   !ID.test(sale.saleId||'')||
   !Number.isSafeInteger(sale.amountMinor)||sale.amountMinor<=0||
   !['completed','pending','failed','refunded','unknown'].includes(sale.state))
   return deny('malformed_private_sale_evidence')
  if(salesById.has(sale.saleId))
   return deny('duplicate_sale_in_evidence')
  salesById.set(sale.saleId,sale)
 }
 const saleClaims=new Set(),cycleClaims=new Set(),periods=[]
 let unresolved=0,recovered=0,complete=0
 for(const m of proposedMappings){
  if(!m||typeof m!=='object'||Array.isArray(m)||
   Object.keys(m).sort().join('|')!=='allocationKind|cycleKey|end|originProof|saleId|start'||
   !CYCLE.test(m.cycleKey||'')||!ID.test(m.saleId||'')||
   !KINDS.has(m.allocationKind)||
   !['provider_cycle_reference','contractual_schedule_only','unproven'].includes(m.originProof)||
   !time(m.start)||!time(m.end)||Date.parse(m.start)>=Date.parse(m.end))
   return deny('invalid_or_unproven_period_reference')
  if(saleClaims.has(m.saleId))return deny('same_sale_claimed_by_multiple_cycles')
  if(cycleClaims.has(m.cycleKey))return deny('same_cycle_claimed_by_multiple_sales')
  saleClaims.add(m.saleId);cycleClaims.add(m.cycleKey)
  const sale=salesById.get(m.saleId)
  if(!sale||sale.state!=='completed'||sale.amountMinor!==299)
   unresolved++
  if(m.allocationKind!=='regular')recovered++
  if(m.originProof!=='provider_cycle_reference')unresolved++
  periods.push([Date.parse(m.start),Date.parse(m.end)])
  complete++
 }
 // The candidate contains independent cycle evidence only. It is not a
 // record of paid time; overlapping proposals are ambiguous even if a
 // sale happens to have the correct price.
 periods.sort((a,b)=>a[0]-b[0])
 let latestEnd=Number.NEGATIVE_INFINITY
 for(const [start,end] of periods){
  // Use the maximum previous end, not only the immediately preceding
  // interval. A long parent period can overlap multiple shorter periods.
  if(start<latestEnd)
   return deny('overlapping_candidate_cycle_intervals')
  latestEnd=Math.max(latestEnd,end)
 }
 if(!complete)return deny('no_proposed_cycle_evidence')
 if(unresolved)return deny('sale_or_cycle_origin_evidence_missing',{
  candidateCount:complete,uncertainCount:unresolved,
 })
 if(recovered)return deny('recovered_payment_requires_verified_original_cycle',{
  candidateCount:complete,nonregularCount:recovered,
 })
 if(observedSales.length>complete)
  return deny('unmapped_sales_require_review',{
   candidateCount:complete,unmappedSaleCount:observedSales.length-complete,
  })
 // Even entirely consistent proposals do NOT establish merchant settlement
 // allocation. Commercial policy is PO-approved; authoritative cycle
 // provenance, calendar anchor and deployment gate remain unverified.
 return deny('cycle_proposals_consistent_not_authorized',{
  candidateCount:complete,
 })
}
