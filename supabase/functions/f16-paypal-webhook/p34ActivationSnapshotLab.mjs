// F16-P34 offline correlation only: the provider's activation snapshot must bind
// to the exact subscription and a signed activation event, not just a Sale GET.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/
const isTime=x=>typeof x==='string'&&UTC.test(x)&&!Number.isNaN(Date.parse(x))&&
 new Date(x).toISOString()===(x.endsWith('.000Z')?x:x.replace(/Z$/,'.000Z'))
const deny=reason=>Object.freeze({step:'f16_p34_activation_snapshot_correlation',
 phase:'REVIEW_REQUIRED',reason,activationLinked:false,cycleVerified:false,
 mayRecordPayment:false,mayCreatePaidPeriod:false,mayGrantBenefits:false,
 periodStart:null,periodEnd:null,paidThrough:null})
export function assessP34ActivationSnapshot({saleEvent,activationEvent,subscriptionSnapshot}={}){
 const sub=saleEvent?.resource?.billing_agreement_id
 if(!REF.test(saleEvent?.resource?.id||'')||!SUB.test(sub||'')||
 saleEvent?.event_type!=='PAYMENT.SALE.COMPLETED')
 return deny('sale_event_not_verified')
 if(activationEvent?.event_type!=='BILLING.SUBSCRIPTION.ACTIVATED'||
 activationEvent?.resource?.id!==sub||
 !isTime(activationEvent?.create_time))return deny('activation_event_not_correlated')
 if(subscriptionSnapshot?.id!==sub||subscriptionSnapshot?.status!=='ACTIVE'||
 !isTime(subscriptionSnapshot?.billing_info?.next_billing_time))
 return deny('activation_merchant_snapshot_missing')
 if(Date.parse(subscriptionSnapshot.billing_info.next_billing_time)<=Date.parse(activationEvent.create_time))
 return deny('billing_boundary_not_after_activation')
 // The timestamp and record are candidates only, not independently authenticated here.
 return Object.freeze({...deny('activation_candidate_not_financial_proof'),activationLinked:true})
}
