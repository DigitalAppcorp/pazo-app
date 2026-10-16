// P29 prospective Sale identity bridge, offline synthetic only.
// Claimed signed event + independent merchant Sale GET must agree.
// Even agreement cannot establish refunds, contractual period, or paid status.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const blocked=reason=>Object.freeze({step:'f16_p29_sale_identity_preflight',phase:'REVIEW_REQUIRED',
 reason,sourceAttestedByThisCode:false,cycleVerified:false,refundsCleared:false,
 disputesCleared:false,mayRecordPayment:false,mayCreatePaidPeriod:false,
 mayGrantBenefits:false,paidThrough:null})
export function createP29SaleIdentityPreflight({readClaimedMerchantEvent,readMerchantSale}={}){
 return async ({eventId,claimToken}={})=>{
  if(typeof readClaimedMerchantEvent!=='function'||typeof readMerchantSale!=='function')
   return blocked('merchant_readers_unavailable')
  if(typeof eventId!=='string'||!REF.test(eventId)||
   typeof claimToken!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claimToken))
   return blocked('invalid_claim')
  try{
   const event=await readClaimedMerchantEvent({eventId,claimToken})
   if(event?.id!==eventId||event?.event_type!=='PAYMENT.SALE.COMPLETED'||
    !REF.test(event?.resource?.id||'')||
    !/^I-[A-Za-z0-9_-]{3,70}$/.test(event?.resource?.billing_agreement_id||'')||
    event?.resource?.amount?.currency!=='USD'||event?.resource?.amount?.total!=='2.99')
    return blocked('merchant_event_invalid')
   const sale=await readMerchantSale({saleId:event.resource.id,eventId,claimToken})
   if(sale?.id!==event.resource.id||
    sale?.billing_agreement_id!==event.resource.billing_agreement_id||
    !['completed','COMPLETED'].includes(sale?.state)||
    sale?.amount?.currency!=='USD'||sale?.amount?.total!=='2.99')
    return blocked('sale_identity_mismatch')
   return blocked('sale_identity_matches_review_only')
  }catch{return blocked('merchant_evidence_unavailable')}
 }
}
