// F16: in-memory gate for ONE server-loaded, signature-verified PayPal inbox
// reference. Not an endpoint, scheduler, payment ledger or entitlement service.
// The injected loader MUST read only supporter_private.paypal_verified_event_inbox
// using a server-controlled identity; callers cannot supply a fabricated row.
const REF=/^[A-Za-z0-9._-]{1,128}$/
const CATALOG=new Set([
 'BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.UPDATED',
 'BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.SUSPENDED',
 'BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.PAYMENT.FAILED',
 'BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.RE-ACTIVATED',
 'PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED',
 'PAYMENT.SALE.REVERSED',
])
const refuse=reason=>Object.freeze({ready:false,entitlement:false,reason})
export function createF16PrivateInboxDecisionGate({loadVerifiedInbox}={}){
 if(typeof loadVerifiedInbox!=='function')
  throw Error('private_inbox_reader_required')
 return Object.freeze({
  async inspect(ref){
   if(ref?.provider!=='paypal'||typeof ref.eventId!=='string'||
      !REF.test(ref.eventId)||!CATALOG.has(ref.eventType))
    return refuse('unrecognized_or_unsafe_inbox_reference')
   // A trusted load happens BEFORE any merchant API request, reconciler, or
   // financial write. Stored type and provider event ID must match exactly.
   let stored
   try{stored=await loadVerifiedInbox(ref.eventId)}
   catch{return refuse('private_inbox_unavailable')}
   if(!stored || stored.provider_event_id!==ref.eventId ||
      stored.event_type!==ref.eventType)
    return refuse('verified_inbox_reference_missing_or_mismatch')
   if(stored.processing_state!=='pending')
    return refuse('inbox_not_pending')
   // These rows must stay on hold until retention and processing gates settle.
   if(stored.retention_hold!==true)
    return refuse('unexpected_inbox_retention_state')
   const handling=ref.eventType==='PAYMENT.SALE.COMPLETED'?
     'sale_requires_private_owner_and_provider_reconciliation':
     (ref.eventType==='PAYMENT.SALE.REFUNDED'||
      ref.eventType==='PAYMENT.SALE.REVERSED')?
       'reversal_requires_independent_original_payment_proof':
       'subscription_lifecycle_no_payment_credit'
   return Object.freeze({ready:true,entitlement:false,handling})
  },
 })
}
