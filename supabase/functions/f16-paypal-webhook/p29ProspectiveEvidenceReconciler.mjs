// P29 offline-only evidence reconciliation. Never derives entitlement or money.
import {createP29SaleIdentityPreflight} from './p29SaleIdentityPreflight.mjs'
import {assessP24RefundLineage} from './p24RefundLineageLab.mjs'
const report=(reason,saleReason,refundPhase)=>Object.freeze({
 step:'f16_p29_prospective_evidence_reconciliation',phase:'REVIEW_REQUIRED',reason,
 saleReason,refundPhase,disputesCoverageComplete:false,refundsCoverageComplete:false,
 providerHistoryComplete:false,cycleVerified:false,evidenceAttested:false,
 mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,
 periodStart:null,periodEnd:null,paidThrough:null
})
export function createP29ProspectiveEvidenceReconciler({
 readClaimedMerchantEvent,readMerchantSale,readRefundEvidence,readDisputeSnapshot
}={}){
 const checkSale=createP29SaleIdentityPreflight({readClaimedMerchantEvent,readMerchantSale})
 return async claim=>{
  const sale=await checkSale(claim)
  if(sale.reason!=='sale_identity_matches_review_only')
   return report('sale_not_merchant_correlated',sale.reason,null)
  if(typeof readRefundEvidence!=='function'||typeof readDisputeSnapshot!=='function')
   return report('reversal_readers_missing',sale.reason,null)
  try{
   // These callbacks are simulations only, not independently authenticated proof.
   const refundEvidence=await readRefundEvidence(claim)
   const refund=assessP24RefundLineage(refundEvidence)
   const dispute=await readDisputeSnapshot(claim)
   if(!dispute||dispute.disputesCleared!==false||dispute.mayRecordPayment!==false)
    return report('dispute_snapshot_untrusted',sale.reason,refund.phase)
   return report('no_complete_reversal_history_or_contract',sale.reason,refund.phase)
  }catch{return report('reversal_sources_unavailable',sale.reason,null)}
 }
}
