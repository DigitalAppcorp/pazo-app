// F16 OFFLINE ONLY — financial deletion review. NOT an account-deletion action.
// The input must come from a server-only security-definer RPC, NOT the browser.
// Zero financial rows does not certify F14 account deletion/Storage/Auth cleanup.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const KEYS=['has_unresolved_global_financial_events','intent_count','owner_id',
  'payment_count','reversal_count']
const decision=(reason)=>Object.freeze({
  mayDeleteAuthUser:false,mayPurgeFinancialRecords:false,
  financialReviewRequired:true,entitlement:false,reason,
})
export function createF16FinancialDeletionReview({loadPrivateExposure}={}){
 if(typeof loadPrivateExposure!=='function')
  throw Error('f16_private_deletion_reader_required')
 return Object.freeze({
  async inspect(ownerId){
   if(typeof ownerId!=='string'||!UUID.test(ownerId))
    return decision('invalid_owner_id')
   let row
   try {row=await loadPrivateExposure(ownerId)}
   catch {return decision('private_financial_exposure_unavailable')}
   if(!row||typeof row!=='object'||Array.isArray(row)||
     JSON.stringify(Object.keys(row).sort())!==JSON.stringify(KEYS)||
     row.owner_id!==ownerId||
     typeof row.has_unresolved_global_financial_events!=='boolean'||
     ![row.intent_count,row.payment_count,row.reversal_count].every(
       n=>Number.isSafeInteger(n)&&n>=0))
    return decision('private_financial_exposure_untrusted')
   if(row.has_unresolved_global_financial_events)
    return decision('unresolved_provider_events_require_finance_review')
   if(row.intent_count>0||row.payment_count>0||row.reversal_count>0)
    return decision('linked_financial_records_require_retention_review')
   // Only a negative finding for this one data slice; F14 SOP and legal
   // review can still block deletion. Never return an authorization flag.
   return Object.freeze({
    ...decision('no_linked_f16_records_found_f14_review_still_required'),
    financialReviewRequired:false,
   })
  },
 })
}
