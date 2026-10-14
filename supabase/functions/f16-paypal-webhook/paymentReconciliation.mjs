// PAZO F16 - Sandbox payment reconciliation DECISION, not a database mutation.
// All inputs must originate from server-side authenticated intent and the PayPal
// Subscription + List Transactions API (never browser/webhook resource snapshots).
// Even completed Sandbox payments without a durable BOUND Auth intent remain
// unclaimed; the one-time UI Sandbox buyer test must NEVER accrue to a PAZO user.
// A valid transaction is only a ledger candidate. It cannot grant an entitlement
// until an independently supported coverage period and reversal checks exist.
export const PAZO_SANDBOX_PLAN='P-14V25407JP6850922NLHMDKI'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
const blocked=(reason)=>({acceptedForLedger:false,entitlement:false,reason})

export function assessPaypalSandboxPayment({
  environment,intent,subscription,transaction,
  transactionLookupSubscriptionId,merchantScopedByPayPalApi,knownReversalIds,
}={}) {
  if(environment!=='sandbox') return blocked('not_sandbox')
  if(!intent || intent.provider!=='paypal' || intent.planId!==PAZO_SANDBOX_PLAN ||
    intent.state!=='bound' || intent.verifiedOwnerBinding!==true ||
    !UUID.test(intent.ownerId||'') || !REF.test(intent.id||'') ||
    !REF.test(intent.externalSubscriptionId||''))
    return blocked('missing_trusted_owner_binding')
  if(!subscription || subscription.id!==intent.externalSubscriptionId ||
    transactionLookupSubscriptionId!==subscription.id ||
    subscription.plan_id!==PAZO_SANDBOX_PLAN ||
    subscription.custom_id!==intent.id)
    return blocked('subscription_binding_mismatch')
  if(merchantScopedByPayPalApi!==true) return blocked('merchant_not_confirmed')
  if(!transaction || !REF.test(transaction.id||''))
    return blocked('missing_payment_id')
  if(!Array.isArray(knownReversalIds) ||
     knownReversalIds.some(id=>typeof id!=='string'||!REF.test(id)))
    return blocked('reversal_state_unknown')
  if(knownReversalIds.includes(transaction.id)) return blocked('payment_reversed')
  if(transaction.status!=='COMPLETED') return blocked('payment_not_completed')
  const gross=transaction.amount_with_breakdown?.gross_amount
  if(gross?.currency_code!=='USD' || gross?.value!=='2.99')
    return blocked('incorrect_currency_or_amount')
  if(typeof transaction.time!=='string' || !DATE.test(transaction.time) ||
      !Number.isFinite(Date.parse(transaction.time)) ||
      new Date(transaction.time).toISOString().replace(/\.000Z$/,'Z')!==transaction.time)
    return blocked('invalid_payment_time')
  // No period is derived from the event timestamp, nor "one month" guessed.
  // No idempotency is claimed until atomic unique(provider, payment_id) exists.
  return {
    acceptedForLedger:true,
    entitlement:false,
    reason:'candidate_requires_atomic_persistence_and_period',
    candidate:Object.freeze({
      provider:'paypal',
      externalPaymentId:transaction.id,
      externalSubscriptionId:subscription.id,
      ownerId:intent.ownerId,
      grossMinorUnits:299,
      currency:'USD',
      completedAt:transaction.time,
    }),
  }
}

export function assessPaypalSandboxReversal({environment,transactionId,verifiedTransactionStatus}={}) {
  if(environment!=='sandbox' || !REF.test(transactionId||'')) return {reconciliationRequired:false,reason:'invalid_source'}
  if(verifiedTransactionStatus==='REFUNDED' || verifiedTransactionStatus==='PARTIALLY_REFUNDED')
    return {reconciliationRequired:true,reason:'provider_refund_confirmed',externalPaymentId:transactionId}
  // REVERSED can arrive in event stream but status may be unavailable in the
  // transactions API; quarantine until it is corroborated by provider/admin API.
  return {reconciliationRequired:false,reason:'reversal_needs_provider_confirmation'}
}
