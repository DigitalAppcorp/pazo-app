// PAZO F16-P05 — merchant event -> subscription -> private BOUND intent.
// Strictly OFFLINE pure adapter contract. Real HTTPS, verified ingress and
// privileged RPC adapters are NOT supplied by this module.
// A matching identity is NOT proof of a paid billing cycle, history or refund.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PLAN='P-14V25407JP6850922NLHMDKI'
const kind=k=>Object.freeze({kind:k})
export function createP05OfflineMerchantClaimBridge(adapters={}){
 const keys=['getMerchantEvent','getMerchantSubscription',
  'resolveClaimedSubscription']
 if(keys.some(k=>typeof adapters[k]!=='function'))
  throw Error('p05_merchant_claim_bridge_unconfigured')
 return Object.freeze({
  async inspectMerchantEvidence({eventId,eventType,claimToken}={}){
   if(!REF.test(eventId||'')||eventType!=='PAYMENT.SALE.COMPLETED'||
     !UUID.test(claimToken||''))return kind('insufficient_evidence')
   let event
   try{event=await adapters.getMerchantEvent({eventId,claimToken})}
   catch{return kind('retryable_outage')}
   if(!event||event.id!==eventId||
    event.event_type!=='PAYMENT.SALE.COMPLETED')
    return kind('foreign_reference')
   const sale=event.resource
   if(!sale||!REF.test(sale.id||'')||
    !SUB.test(sale.billing_agreement_id||'')||
    !['completed','COMPLETED'].includes(sale.state)||
    sale.amount?.currency!=='USD'||sale.amount?.total!=='2.99')
    return kind('insufficient_evidence')
   let sub
   try{
    sub=await adapters.getMerchantSubscription({
     subscriptionId:sale.billing_agreement_id,eventId,claimToken})
   }catch{return kind('retryable_outage')}
   if(!sub||sub.id!==sale.billing_agreement_id||
    sub.plan_id!==PLAN||
    !INTENT.test(sub.custom_id||'')||
    !['ACTIVE','CANCELLED'].includes(sub.status))
    return kind('foreign_reference')
   // This RPC may return an owner only during a valid event lease and after
   // checking subscriptionId AND merchant custom_id. Its SQL can't itself
   // prove that a caller truly fetched either value from PayPal.
   let bound
   try{
    bound=await adapters.resolveClaimedSubscription({
     eventId,claimToken,merchantSubscriptionId:sub.id,
     merchantCustomIntentId:sub.custom_id})
   }catch{return kind('read_error')}
   if(!bound||bound.intentId!==sub.custom_id||
    bound.subscriptionId!==sub.id||bound.planId!==PLAN||
    bound.state!=='bound'||!UUID.test(bound.ownerId||''))
    return kind('foreign_reference')
   // Correlation only; this is consumed by a mock worker and results in
   // review/cycle_unproven. It MUST NOT be promoted to paidThrough.
   return kind('sale_correlated_candidate')
  },
 })
}
