// F16 offline webhook intake contract. NOT a deployed HTTP endpoint or real PayPal verifier.
// The verifier and durable inbox MUST be supplied by a separately authorized server integration.
const requiredHeaders = ['paypal-transmission-id','paypal-transmission-time','paypal-transmission-sig','paypal-auth-algo','paypal-cert-url']
export async function receivePaypalEvent(request, { verifySignature, inbox, webhookId }) {
  if (request.method !== 'POST') return { status:405, code:'method_not_allowed' }
  const contentType = request.headers['content-type']?.toLowerCase().split(';')[0]?.trim()
  if (contentType !== 'application/json') return { status:415, code:'unsupported_content_type' }
  if (!(request.body instanceof Uint8Array) || request.body.length === 0 || request.body.length > 65536)
    return { status:413, code:'invalid_body_size' }
  if (!webhookId || typeof verifySignature !== 'function' || !inbox || typeof inbox.insertIfAbsent !== 'function')
    return { status:503, code:'not_configured' }
  for (const key of requiredHeaders) {
    const value = request.headers[key]
    if (typeof value !== 'string' || !value || value.length > 2048)
      return { status:400, code:'invalid_headers' }
  }
  // This callback is responsible for the actual verified PayPal signature check,
  // including trusted certificate origin and raw-body integrity. NEVER trust client booleans.
  let verified = false
  try { verified = await verifySignature({ rawBody:request.body, headers:request.headers, webhookId }) === true }
  catch { return { status:503, code:'verification_unavailable' } }
  if (!verified) return { status:401, code:'signature_invalid' }
  let event
  try { event = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(request.body)) }
  catch { return { status:400, code:'invalid_json' } }
  if (!event || typeof event.id !== 'string' || !/^[a-zA-Z0-9_.-]{1,128}$/.test(event.id) ||
    typeof event.event_type !== 'string' || event.event_type.length > 128)
    return { status:400, code:'invalid_event' }
  try {
    // Must be ATOMIC and durable in production. No payment/entitlement changes here.
    const created = await inbox.insertIfAbsent({provider:'paypal',eventId:event.id,eventType:event.event_type})
    if (created === true) return { status:202, code:'accepted_for_reconciliation' }
    if (created === false) return { status:200, code:'duplicate' }
    return { status:503, code:'inbox_unavailable' }
  } catch { return { status:503, code:'inbox_unavailable' } }
}
