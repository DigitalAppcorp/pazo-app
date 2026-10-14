// F16 read-only assessment of webhook registrations owned by the Sandbox REST app.
// Does NOT validate endpoint reachability, signatures, merchant association to a plan,
// or any payment/entitlement. No arbitrary URLs or account data are returned.
export const PAZO_REQUIRED_PAYPAL_EVENTS = Object.freeze([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'PAYMENT.SALE.COMPLETED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
])
function httpsEndpoint(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.hash && url.port === '' && url.hostname !== 'localhost' &&
      !/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(url.hostname)
  } catch { return false }
}
export function assessPazoSandboxWebhooks(payload) {
  if (!payload || !Array.isArray(payload.webhooks)) {
    return { ok:false, status:'invalid_response', count:0, candidates:[] }
  }
  const hooks=payload.webhooks
  const candidates=hooks.slice(0,20).map(hook=>{
    const id=typeof hook?.id==='string' && /^[A-Za-z0-9_-]{3,128}$/.test(hook.id) ? hook.id : null
    const eventNames=new Set(Array.isArray(hook?.event_types) ?
      hook.event_types.filter(e=>typeof e?.name==='string').map(e=>e.name) : [])
    const missing=eventNames.has('*') ? [] : PAZO_REQUIRED_PAYPAL_EVENTS.filter(e=>!eventNames.has(e))
    const httpsUrl=httpsEndpoint(hook?.url)
    return {webhookId:id,httpsUrl,missingEvents:missing,subscriptionEventsConfigured:!!id && httpsUrl && missing.length===0}
  })
  const ok=candidates.some(c=>c.subscriptionEventsConfigured)
  // A positive result only verifies configuration as returned by PayPal:
  // endpoint reachability, source authenticity and actual event delivery remain untested.
  return {ok,status:ok?'subscriptions_configured':'needs_webhook_configuration',count:hooks.length,candidates}
}
