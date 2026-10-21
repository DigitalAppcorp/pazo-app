// F16 OFFLINE ONLY: independently verified Sandbox refund/reversal evidence.
// Never infer the original SALE ID from an unverified webhook resource.
// The operator must compose these inputs using server-to-PayPal merchant reads,
// not client JSON, and must still re-check private inbox before any SQL write.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
const reject=reason=>Object.freeze({candidateForTombstone:false,entitlement:false,reason})
function validUtc(text){
 if(typeof text!=='string'||!ISO.test(text))return false
 const millis=Date.parse(text)
 return Number.isFinite(millis)&&
   new Date(millis).toISOString().replace(/\.000Z$/,'Z')===text
}
export function assessPaypalSandboxReversalEvidence({
 environment,inbox,event,independentlyVerifiedReversal,
 independentlyVerifiedOriginalSale,merchantScopedByPayPalApi,
}={}){
 if(environment!=='sandbox')return reject('not_sandbox')
 if(inbox?.ready!==true||inbox.entitlement!==false||
    inbox.handling!=='reversal_requires_independent_original_payment_proof')
  return reject('missing_verified_pending_inbox')
 const type=event?.eventType
 if(type!=='PAYMENT.SALE.REFUNDED'&&type!=='PAYMENT.SALE.REVERSED')
  return reject('not_a_reversal_event')
 if(typeof event.eventId!=='string'||!REF.test(event.eventId))
  return reject('invalid_provider_event')
 if(merchantScopedByPayPalApi!==true)
  return reject('merchant_proof_unavailable')
 const r=independentlyVerifiedReversal
 const sale=independentlyVerifiedOriginalSale
 // This must be a lookup of the ORIGINAL payment/sale, not the refund ID,
 // webhook event ID, an amount-only match or a posted browser identifier.
 if(!r||r.eventId!==event.eventId||r.eventType!==type||
    r.verifiedByMerchantApi!==true||!REF.test(r.originalSaleId||'')||
    !SUB.test(r.subscriptionId||'')||!validUtc(r.verifiedAt))
  return reject('reversal_source_unverified')
 if(!sale||sale.verifiedByMerchantApi!==true||
    sale.id!==r.originalSaleId||!REF.test(sale.id||'')||
    sale.subscriptionId!==r.subscriptionId||sale.planId!==PLAN||
    sale.grossMinorUnits!==299||sale.currency!=='USD')
  return reject('original_sale_not_correlated')
 const permitted=type==='PAYMENT.SALE.REFUNDED'?
  ['REFUNDED','PARTIALLY_REFUNDED']:['REVERSED']
 if(!permitted.includes(r.status))
  return reject('reversal_state_not_confirmed')
 // Conservative: partial refund blocks full supporter credit until independent
 // policy/legal gate defines partial coverage. No paid-through calculation.
 const kind=r.status==='PARTIALLY_REFUNDED'?'partially_refunded':
  r.status==='REFUNDED'?'refunded':'reversed'
 return Object.freeze({
  candidateForTombstone:true,
  entitlement:false,
  reason:'merchant_verified_reversal_candidate_only',
  candidate:Object.freeze({
   provider:'paypal',externalPaymentId:sale.id,kind,
   verifiedAt:r.verifiedAt,
  }),
 })
}
