// F16 READ-ONLY orchestration: trusted durable inbox reference -> PayPal event
// -> PayPal subscription + transactions -> trusted owner binding -> candidate.
// NEVER grants supporter status, writes profiles, persists receipts, or publishes pets.
// Must not be deployed alone; the durable ledger and worker state are absent.
import {assessPaypalSandboxPayment} from './paymentReconciliation.mjs'

const REF=/^[A-Za-z0-9._-]{3,128}$/
const reject=reason=>({acceptedForLedger:false,entitlement:false,reason})
export function createReadOnlyF16Reconciler({
  eventReader,subscriptionReader,loadVerifiedIntent,loadKnownReversalIds,
}={}) {
  if(typeof eventReader?.readEvent!=='function' ||
     typeof subscriptionReader?.read!=='function' ||
     typeof loadVerifiedIntent!=='function' ||
     typeof loadKnownReversalIds!=='function')
    throw Error('reconciler_not_configured')
  return {
    async inspect(inboxRef,{startTime,endTime}={}){
      if(inboxRef?.provider!=='paypal' ||
        typeof inboxRef.eventId!=='string' || !REF.test(inboxRef.eventId) ||
        typeof inboxRef.eventType!=='string' || !inboxRef.eventType)
        return reject('invalid_inbox_reference')
      const event=await eventReader.readEvent(inboxRef.eventId)
      if(event.eventId!==inboxRef.eventId ||
        event.eventType!==inboxRef.eventType) return reject('provider_event_mismatch')
      if(event.requiresReversalReview===true) return reject('reversal_requires_independent_reconciliation')
      if(event.eventType!=='PAYMENT.SALE.COMPLETED')
        return reject('no_completed_payment')
      if(typeof event.externalPaymentId!=='string' || !REF.test(event.externalPaymentId) ||
         typeof event.externalSubscriptionId!=='string' || !REF.test(event.externalSubscriptionId))
        return reject('missing_provider_payment_link')
      // DO NOT derive ownership from PayPal custom_id or webhook payload.
      // The server-side intent lookup must verify owner + correlation.
      const intent=await loadVerifiedIntent(event.externalSubscriptionId)
      if(!intent) return reject('no_verified_owner_intent')
      const observed=await subscriptionReader.read({
        subscriptionId:event.externalSubscriptionId,startTime,endTime,
      })
      if(observed.lookupSubscriptionId!==event.externalSubscriptionId ||
         !Array.isArray(observed.transactions))
        return reject('provider_subscription_history_invalid')
      const transaction=observed.transactions.find(t=>t.id===event.externalPaymentId)
      if(!transaction) return reject('payment_not_present_in_provider_history')
      // This must be durable DB state. If unknown/unavailable, the assessor
      // rejects; do not treat a missing table as an empty successful reversal set.
      const knownReversalIds=await loadKnownReversalIds(event.externalSubscriptionId)
      return assessPaypalSandboxPayment({
        environment:'sandbox',intent,
        subscription:observed.subscription,transaction,
        transactionLookupSubscriptionId:observed.lookupSubscriptionId,
        merchantScopedByPayPalApi:observed.merchantScopedByPayPalApi,
        knownReversalIds,
      })
    },
  }
}
