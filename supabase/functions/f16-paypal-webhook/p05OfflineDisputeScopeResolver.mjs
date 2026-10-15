// PAZO F16-P05 — dispute attribution by authenticated provider references.
// INACTIVE: injected server-only adapters. No OAuth calls, SQL writes or deploy.
// The caller MUST already verify webhook signature; this code refetches
// event+dispute through trusted provider GET callbacks but cannot attest them.
// An absent private ledger row is UNKNOWN, never "outside_pazo".
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const DISPUTE=/^[A-Za-z0-9-]{3,128}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TYPES=new Set(['CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED',
 'CUSTOMER.DISPUTE.RESOLVED'])
const PLAN='P-14V25407JP6850922NLHMDKI'
const good=(x,rx)=>typeof x==='string'&&rx.test(x)
const INVALID='unknown'
function validPayment(p,saleId){
 return p&&p.externalPaymentId===saleId&&good(p.externalSubscriptionId,SUB)&&
  good(p.ownerId,UUID)&&p.planId===PLAN&&p.currency==='USD'&&
  p.grossMinorUnits===299&&
  (p.entryState==='uncredited'||p.entryState==='blocked_reversal')
}
function validIntent(i,p){
 return i&&i.subscriptionId===p.externalSubscriptionId&&
  i.ownerId===p.ownerId&&i.planId===PLAN&&good(i.intentId,INTENT)&&
  i.state==='bound'&&i.provider==='paypal'
}
export function createP05OfflineDisputeScopeResolver(adapters={}){
 const required=['getPayPalWebhookEvent','getPayPalDisputeDetails',
  'readPrivatePazoPaymentBySaleId','readPrivateBoundIntentBySubscription']
 if(required.some(k=>typeof adapters[k]!=='function'))
  throw Error('p05_dispute_scope_adapters_missing')
 return Object.freeze({
  // Called by the already-signature-verified intake handler. No raw payload or
  // user-selected payment IDs are passed to this entry point.
  async assessTrustedDisputeScope({eventId,eventType}={}){
   if(!good(eventId,EVENT)||!TYPES.has(eventType))return INVALID
   let event
   try{event=await adapters.getPayPalWebhookEvent({eventId})}
   catch{return INVALID}
   if(!event||event.id!==eventId||event.event_type!==eventType||
    !good(event.resource?.dispute_id,DISPUTE))return INVALID
   const disputeId=event.resource.dispute_id
   let details
   try{details=await adapters.getPayPalDisputeDetails({disputeId})}
   catch{return INVALID}
   if(!details||details.dispute_id!==disputeId||
    !Array.isArray(details.disputed_transactions)||
    details.disputed_transactions.length!==1)return INVALID
   const tx=details.disputed_transactions[0]
   if(!tx||!good(tx.seller_transaction_id,SALE)||
    (tx.gross_amount!==undefined&&
     (tx.gross_amount?.currency_code!=='USD'||
      tx.gross_amount?.value!=='2.99')))return INVALID
   let payment
   try{
    payment=await adapters.readPrivatePazoPaymentBySaleId({
     sellerTransactionId:tx.seller_transaction_id})
   }catch{return INVALID}
   if(!validPayment(payment,tx.seller_transaction_id))return INVALID
   let intent
   try{
    intent=await adapters.readPrivateBoundIntentBySubscription({
     subscriptionId:payment.externalSubscriptionId})
   }catch{return INVALID}
   if(!validIntent(intent,payment))return INVALID
   // Ownership only: NOT a paid cycle, reversal determination or permission
   // to grant benefits. Caller's further retention/rollout controls still apply.
   return 'confirmed_pazo'
  },
 })
}
