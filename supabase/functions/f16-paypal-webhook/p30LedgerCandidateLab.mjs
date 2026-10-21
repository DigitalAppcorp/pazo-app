// F16-P30 offline ledger planning: immutable candidate identity, NO database writes.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const blocked=(reason)=>Object.freeze({phase:'REVIEW_REQUIRED',reason,ledgerWrites:0,
 mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,paidThrough:null})
export function assessP30LedgerCandidate({saleId,subscriptionId,intentId,reviewReservations=[],refunds=[]}={}){
 if(!REF.test(saleId||'')||!/^I-[A-Za-z0-9_-]{3,70}$/.test(subscriptionId||'')||
 !/^intent-[A-Za-z0-9_-]{12,90}$/.test(intentId||''))
 return blocked('candidate_reference_invalid')
 if(!Array.isArray(reviewReservations)||!Array.isArray(refunds)||
 reviewReservations.length>100||refunds.length>100)return blocked('history_unbounded')
 for(const r of reviewReservations){
  if(!r||typeof r!=='object'||!REF.test(r.saleId||'')||
  typeof r.intentId!=='string'||typeof r.subscriptionId!=='string')
   return blocked('reservation_invalid')
  if(r.saleId===saleId && (r.intentId!==intentId||r.subscriptionId!==subscriptionId))
   return blocked('sale_cross_owner_conflict')
  if(r.intentId===intentId&&r.saleId!==saleId)
   return blocked('first_obligation_already_reserved')
 }
 const seen=new Set();let refundedMinor=0
 for(const r of refunds){
  if(!r||!REF.test(r.refundId||'')||seen.has(r.refundId)||
   r.saleId!==saleId||!Number.isInteger(r.amountMinor)||r.amountMinor<1||r.amountMinor>299)
   return blocked('refund_lineage_invalid')
  seen.add(r.refundId);refundedMinor+=r.amountMinor
  if(refundedMinor>299)return blocked('refund_total_exceeds_sale')
 }
 if(refundedMinor>0)return blocked('refunded_sale_requires_reconciliation')
 return blocked('candidate_not_financially_attested')
}
