// F16 Sandbox sale worker, ready for a future PRIVATE scheduler.
// Must receive ONLY a previously signature-verified inbox reference fetched
// from the service-only database. No HTTP endpoint. No live scheduler yet.
// Re-read PayPal event, subscription, transactions, and trusted owner, THEN
// atomically persist verified sale as UNCredited. Never grant membership.
// Refund/reversal events remain quarantined until independently attributable.
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
export function createSandboxSaleWorker({reconciler,financeStore}={}) {
 if(typeof reconciler?.inspect!=='function'||
    typeof financeStore?.commitVerifiedSale!=='function')
   throw Error('sandbox_sale_worker_not_configured')
 return {
  async process(inboxRef,window){
   if(inboxRef?.provider!=='paypal'||
      inboxRef.eventType!=='PAYMENT.SALE.COMPLETED'||
      !EVENT.test(inboxRef.eventId||''))
     return Object.freeze({recorded:false,entitlement:false,reason:'unsupported_inbox_reference'})
   // IMPORTANT: the injected reconciler must be composed only of private
   // server intent/reversal providers and merchant-authenticated PayPal reads.
   const decision=await reconciler.inspect(inboxRef,window)
   if(decision?.acceptedForLedger!==true||decision.entitlement!==false||
      !decision.candidate)
     return Object.freeze({recorded:false,entitlement:false,
       reason:decision?.reason??'financial_proof_unavailable'})
   const committed=await financeStore.commitVerifiedSale({
     eventId:inboxRef.eventId,candidate:decision.candidate,environment:'sandbox',
   })
   if(committed?.entitlement!==false)
     throw Error('unsafe_finance_store_result')
   return Object.freeze({recorded:true,entitlement:false,
     reason:committed.result})
  },
 }
}
