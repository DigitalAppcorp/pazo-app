// F16 Sandbox sale worker — OFFLINE ONLY, not wired to a scheduler.
// Only the verified private inbox gate can authorize reading an event.
// A candidate can create an UNCredited ledger entry in a FUTURE trusted
// server deployment, never a PAZO entitlement or founder status.
const EVENT=/^[A-Za-z0-9._-]{1,128}$/
export function createSandboxSaleWorker({inboxGate,reconciler,financeStore}={}){
 if(typeof inboxGate?.inspect!=='function'||
    typeof reconciler?.inspect!=='function'||
    typeof financeStore?.commitVerifiedSale!=='function')
  throw Error('sandbox_sale_worker_not_configured')
 return Object.freeze({
  async process(inboxRef,window){
   if(inboxRef?.provider!=='paypal'||
      inboxRef.eventType!=='PAYMENT.SALE.COMPLETED'||
      typeof inboxRef.eventId!=='string'||!EVENT.test(inboxRef.eventId))
    return Object.freeze({recorded:false,entitlement:false,
      reason:'unsupported_inbox_reference'})
   const gate=await inboxGate.inspect(inboxRef)
   if(gate?.ready!==true||gate.handling!==
      'sale_requires_private_owner_and_provider_reconciliation'||
      gate.entitlement!==false)
    return Object.freeze({recorded:false,entitlement:false,
      reason:gate?.reason||'private_inbox_not_verified'})
   const decision=await reconciler.inspect(inboxRef,window)
   if(decision?.acceptedForLedger!==true||decision.entitlement!==false||
      !decision.candidate)
    return Object.freeze({recorded:false,entitlement:false,
      reason:decision?.reason??'financial_proof_unavailable'})
   // Only a versioned private atomic RPC may eventually implement this writer.
   const committed=await financeStore.commitVerifiedSale({
     eventId:inboxRef.eventId,candidate:decision.candidate,environment:'sandbox',
   })
   if(committed?.entitlement!==false)throw Error('unsafe_finance_store_result')
   return Object.freeze({recorded:true,entitlement:false,
     reason:committed.result})
  },
 })
}
