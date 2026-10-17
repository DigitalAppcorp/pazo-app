// F16-P36 synthetic-only integration. Independent authenticated activation proof
// is mandatory; a sale event or subscription snapshot cannot substitute for it.
import {assessP34ActivationSnapshot} from './p34ActivationSnapshotLab.mjs'
export function createP36ActivationBillingReview({readClaimedSale,readVerifiedActivation,readBillingSnapshot}={}){
 return async ({eventId,claimToken}={})=>{
  const deny=reason=>Object.freeze({step:'f16_p36_activation_billing_review',phase:'REVIEW_REQUIRED',reason,
   activationLinked:false,authenticatedEvidence:false,cycleVerified:false,
   mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,paidThrough:null})
  if(typeof readClaimedSale!=='function'||typeof readVerifiedActivation!=='function'||typeof readBillingSnapshot!=='function')return deny('sources_missing')
  try{
   const sale=await readClaimedSale({eventId,claimToken})
   if(sale?.id!==eventId||sale?.event_type!=='PAYMENT.SALE.COMPLETED')return deny('sale_claim_unverified')
   const subscriptionId=sale.resource?.billing_agreement_id
   const activation=await readVerifiedActivation({subscriptionId,eventId,claimToken})
   // A callback's output is NOT evidence of signature authenticity until the hosted
   // privileged implementation validates the independent activation event.
   const snapshot=await readBillingSnapshot({subscriptionId,eventId,claimToken})
   const result=assessP34ActivationSnapshot({saleEvent:sale,activationEvent:activation,subscriptionSnapshot:snapshot})
   return Object.freeze({...deny(result.reason),activationLinked:result.activationLinked})
  }catch{return deny('source_unavailable')}
 }
}
