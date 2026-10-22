// PAZO F16-P24 — offline-only sale/refund lineage arithmetic.
// This code never trusts caller-supplied merchant evidence as provider proof.
// Particularly for subscription SALE refunds (legacy v1 /v1/payments/refund),
// never mistake a v2 CAPTURE refund for the original subscription sale.
// Zero refund records does NOT prove full historical refund coverage.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/
const utc=x=>typeof x==='string'&&ISO.test(x)&&
 Number.isFinite(Date.parse(x))&&
 [new Date(x).toISOString(),new Date(x).toISOString().replace(/\.000Z$/,'Z')].includes(x)
const SAFE=Object.freeze({step:'f16_p24_sale_refund_lineage_lab',
 environment:'sandbox',sourceAttestedByThisCode:false,
 refundsCoverageComplete:false,financialHistoryComplete:false,
 mayRecordPayment:false,mayGrantBenefits:false,
 mayCreatePaidPeriod:false,paidThrough:null,periodStart:null,periodEnd:null,
 dbWrites:0,networkPaymentWrites:0})
const result=(phase,reason,extra={})=>Object.freeze({...SAFE,phase,reason,...extra})
const review=reason=>result('REVIEW_REQUIRED',reason)
const keys=(obj,required)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join('|')===required.slice().sort().join('|')
const EVENT=['id','type','refundId','originalSaleId','verifiedAt']
const REFUND=['id','originalSaleId','state','amountMinor','currency','updatedAt','source']
export function assessP24RefundLineage({originalSale,signedEvents,merchantRefunds}={}){
 if(!originalSale||!keys(originalSale,['id','grossMinor','currency','completedAt'])||
  !REF.test(originalSale.id||'')||originalSale.grossMinor!==299||
  originalSale.currency!=='USD'||!utc(originalSale.completedAt))
  return review('original_sale_contract_missing')
 if(!Array.isArray(signedEvents)||!Array.isArray(merchantRefunds)||
   signedEvents.length>30||merchantRefunds.length>30)
  return review('bounded_refund_history_missing')
 if(signedEvents.length===0&&merchantRefunds.length===0)
  return result('NO_REFUND_REFS_REVIEW_ONLY',
   'no_refund_evidence_does_not_prove_completeness',{refundCount:0})
 if(signedEvents.length!==merchantRefunds.length)
  return review('refund_event_and_merchant_counts_differ')
 const events=new Map(),refunds=new Map()
 for(const event of signedEvents){
  if(!keys(event,EVENT)||!REF.test(event.id||'')||
   event.type!=='PAYMENT.SALE.REFUNDED'||
   !REF.test(event.refundId||'')||
   event.originalSaleId!==originalSale.id||!utc(event.verifiedAt)||
   events.has(event.id))
   return review('signed_refund_lineage_inconsistent')
  events.set(event.id,event)
 }
 let total=0,uncertain=false
 for(const r of merchantRefunds){
  if(!keys(r,REFUND)||!REF.test(r.id||'')||
   r.source!=='PAYPAL_SANDBOX_LEGACY_REFUND_GET'||
   r.originalSaleId!==originalSale.id||
   !['completed','pending','cancelled','failed'].includes(r.state)||
   !Number.isInteger(r.amountMinor)||r.amountMinor<1||
   r.amountMinor>originalSale.grossMinor||
   r.currency!=='USD'||!utc(r.updatedAt)||refunds.has(r.id))
   return review('merchant_refund_lineage_inconsistent')
  refunds.set(r.id,r)
  if(r.state==='completed')total+=r.amountMinor
  else uncertain=true
 }
 const linkedIds=new Set()
 for(const e of events.values()){
  if(linkedIds.has(e.refundId)||!refunds.has(e.refundId))
   return review('signed_refund_without_unique_merchant_match')
  const refund=refunds.get(e.refundId)
  if(Date.parse(refund.updatedAt)<Date.parse(originalSale.completedAt)||
    Date.parse(e.verifiedAt)<Date.parse(originalSale.completedAt))
   return review('refund_precedes_original_sale')
  linkedIds.add(e.refundId)
 }
 if(linkedIds.size!==refunds.size)
  return review('unsigned_refund_in_merchant_results')
 if(total>originalSale.grossMinor)
  return review('refund_total_exceeds_original_gross')
 if(uncertain)return review('refund_status_pending_or_failed')
 return result('REFUND_LINEAGE_REVIEW_ONLY',
  'refund_detected_no_entitlement_until_independent_reconciliation',
  {refundCount:refunds.size,completedRefundMinor:total,
   partialRefund:total<originalSale.grossMinor})
}
