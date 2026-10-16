// F16-P27 offline bridge: compose already-existing P05 merchant readers with
// P26 fail-closed assessment. No live imports, no network by default,
// no ledger, no payment or entitlement writer.
import {assessP26FirstObligationEvidence} from './p26OfflineProvenanceGate.mjs'
const safe=(phase,reason)=>Object.freeze({phase,reason,environment:'sandbox',
 sourceAttestedByThisCode:false,mayRecordPayment:false,
 mayCreatePaidPeriod:false,mayGrantBenefits:false,
 financialHistoryComplete:false,paidThrough:null,dbWrites:0,
 networkPaymentWrites:0})
export function createP27OfflineProvenanceReview({
 scope='DISABLED', merchantReader,readPrivateReviewContext,
 inspectHistory,inspectRefunds,inspectDisputes,
}={}){
 if(scope!=='OFFLINE_SYNTHETIC_TEST_ONLY')
  return Object.freeze({inspect:async()=>safe('DISABLED','scope_disabled')})
 if(!merchantReader||typeof merchantReader.getMerchantEvent!=='function'||
  typeof merchantReader.getMerchantSubscription!=='function'||
  [readPrivateReviewContext,inspectHistory,inspectRefunds,inspectDisputes]
   .some(x=>typeof x!=='function'))
  throw Error('p27_offline_dependencies_required')
 return Object.freeze({async inspect({eventId,claimToken}={}){
  try{
   // The merchantReader must independently enforce the live, private claim
   // before both GETs. No caller-supplied PayPal URLs are forwarded.
   const event=await merchantReader.getMerchantEvent({eventId,claimToken})
   if(event?.id!==eventId||
     event?.event_type!=='PAYMENT.SALE.COMPLETED'||
     !event.resource?.id||!event.resource?.billing_agreement_id)
    return safe('REVIEW_REQUIRED','merchant_event_invalid')
   const sub=await merchantReader.getMerchantSubscription({
    eventId,claimToken,subscriptionId:event.resource.billing_agreement_id})
   if(sub?.id!==event.resource.billing_agreement_id||
      !sub.custom_id)
    return safe('REVIEW_REQUIRED','merchant_subscription_invalid')
   const privateContext=await readPrivateReviewContext({
    eventId,claimToken,subscriptionId:sub.id,intentId:sub.custom_id})
   if(!privateContext||typeof privateContext!=='object')
    return safe('REVIEW_REQUIRED','private_claim_context_missing')
   // These readers are offline observations, NEVER attest global coverage.
   const [history,refunds,disputes]=await Promise.all([
    inspectHistory({eventId,claimToken}),
    inspectRefunds({eventId,claimToken,saleId:event.resource.id}),
    inspectDisputes({eventId,claimToken,saleId:event.resource.id}),
   ])
   const result=assessP26FirstObligationEvidence({
    ...privateContext,history,refunds,disputes,
    merchantSale:{
     id:event.resource.id,eventId,status:event.resource.state,
     currency:event.resource.amount?.currency,
     amountMinor:event.resource.amount?.total==='2.99'?299:null,
     subscriptionId:sub.id,
    },
    merchantSubscription:{
     id:sub.id,intentId:sub.custom_id,status:sub.status,
    },
   })
   return safe(result.phase,result.reason)
  }catch{return safe('REVIEW_REQUIRED','merchant_or_private_evidence_unavailable')}
 }})
}
