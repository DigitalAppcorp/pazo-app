// PAZO F16 webhook intake core; original receiver is already deployed in Sandbox.
// Dispute intake changes in this branch are NOT DEPLOYED and default DISABLED.
// Requires an authenticated PayPal signature verifier AND a durable private inbox.
// Never writes profiles/is_founder or grants memberships.
import {f16WorkerAdmissionGate} from './workerAdmissionGate.mjs'
import {requireCertUrl} from './paypalSandboxPostback.mjs'
// Disputes can refer to unrelated transactions for the same PayPal merchant.
// The server-only scope resolver must prove PAZO ownership before any inbox DML.
// Gate stays OFF until legal retention, SQL allowlist and PayPal webhook changes.
const DISPUTE_EVENT_TYPES = new Set([
  'CUSTOMER.DISPUTE.CREATED',
  'CUSTOMER.DISPUTE.UPDATED',
  'CUSTOMER.DISPUTE.RESOLVED',
])
const EVENT_TYPES = new Set([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  // Preserve the PO-observed Sandbox lifecycle events. A validated signature
  // and durable inbox write are mandatory, but neither event grants benefits.
  'BILLING.SUBSCRIPTION.CREATED',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED',
  'PAYMENT.SALE.COMPLETED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
  ...DISPUTE_EVENT_TYPES,
])
const HEADERS=[
  'paypal-transmission-id', 'paypal-transmission-time',
  'paypal-transmission-sig', 'paypal-auth-algo', 'paypal-cert-url',
]
const LIMIT=65536
const reply=(status,code,retryAfter=null)=>new Response(JSON.stringify({code}),{
  status,headers:{'content-type':'application/json','cache-control':'no-store',
    ...(retryAfter===null?{}:{'retry-after':String(retryAfter)}),
  },
})
export function createSafeF16WebhookHandler({environment,webhookId,planId,verifySignature,inbox,
  admissionGate=f16WorkerAdmissionGate,globalAdmission=null,
  disputeCaptureApproved=false,assessTrustedDisputeScope=null,
  verifyDisputeRetentionRelease=null}={}) {
  return async function handle(request) {
    if(request.method!=='POST') return reply(405,'method_not_allowed')
    // This F16 test integration is Sandbox-only until a separately approved Live gate.
    if(environment!=='sandbox' || typeof webhookId!=='string' || !webhookId ||
        typeof planId!=='string' || !/^P-[A-Za-z0-9]+$/.test(planId) ||
        typeof verifySignature!=='function' || typeof inbox?.insertIfAbsent!=='function' ||
        typeof admissionGate?.tryEnter!=='function')
      return reply(503,'integration_not_configured')
    if(request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json')
      return reply(415,'unsupported_content_type')
    for(const name of HEADERS) {
      const value=request.headers.get(name)
      if(typeof value!=='string' || value.length===0 || value.length>2048)
        return reply(400,'missing_or_invalid_headers')
    }
    // Reject obviously forged/non-Sandbox signature envelopes BEFORE any RPC
    // or PayPal OAuth call. Preserve fail-closed response and never log the URL.
    if(request.headers.get('paypal-auth-algo')!=='SHA256withRSA' ||
       !requireCertUrl(request.headers.get('paypal-cert-url')))
      return reply(503,'verification_unavailable')
    const declared=Number(request.headers.get('content-length'))
    if(request.headers.has('content-length') && (!Number.isSafeInteger(declared) || declared<0 || declared>LIMIT))
      return reply(413,'invalid_body_size')
    // Stream with an actual byte limit: Content-Length may be missing,
    // false, or chunked. Reading arrayBuffer() unbounded risks memory exhaustion.
    const chunks=[]
    let total=0
    try {
      const reader=request.body?.getReader()
      if(!reader) return reply(400,'unreadable_body')
      while(true) {
        const {done,value}=await reader.read()
        if(done) break
        if(!(value instanceof Uint8Array)) return reply(400,'unreadable_body')
        total+=value.byteLength
        if(total>LIMIT) {
          await reader.cancel().catch(()=>{})
          return reply(413,'invalid_body_size')
        }
        chunks.push(value)
      }
    } catch { return reply(400,'unreadable_body') }
    if(total===0) return reply(413,'invalid_body_size')
    const bytes=new Uint8Array(total)
    let offset=0
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
    let event
    try {event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}
    catch {return reply(400,'invalid_json')}
    if(!event || typeof event!=='object' || Array.isArray(event) ||
      typeof event.id!=='string' || !/^[A-Za-z0-9._-]{1,128}$/.test(event.id) ||
      typeof event.event_type!=='string' || event.event_type.length>128)
      return reply(400,'invalid_event')
    // Admission happens only after cheap size/shape checks, before any paid
    // outbound PayPal request. Denied deliveries MUST be retryable, not ACKed.
    // This gate is shared per worker, not a substitute for an upstream firewall.
    const release=admissionGate.tryEnter()
    if(typeof release!=='function')return reply(503,'f16_worker_busy',5)
    try {
      // Cross-isolate gate: a server-authenticated, durable, global budget.
      // This is optional only for isolated core tests. The actual receiver ALWAYS
      // constructs this adapter; if its RPC is missing it fails closed (503).
      if(globalAdmission!==null) {
        if(typeof globalAdmission?.tryAdmit!=='function')return reply(503,'f16_global_budget_unavailable',5)
        let globallyApproved=false
        try {globallyApproved=(await globalAdmission.tryAdmit())===true}
        catch {return reply(503,'f16_global_budget_unavailable',5)}
        if(!globallyApproved)return reply(503,'f16_global_budget_exhausted',5)
      }
      let valid=false
      try {
        valid=(await verifySignature({headers:request.headers,event,rawBody:bytes,webhookId,environment}))===true
      } catch {return reply(503,'verification_unavailable')}
      if(!valid) return reply(401,'signature_invalid')
      if(DISPUTE_EVENT_TYPES.has(event.event_type)) {
        // Explicit, immutable code-level operator release is required BEFORE
        // signing up to PayPal dispute events or deploying a matching SQL RPC.
        // A signed merchant event may concern an unrelated business payment.
        if(disputeCaptureApproved!==true) return reply(503,'dispute_intake_not_released',300)
        // Separate privacy/retention approval from merchant ownership and
        // technical capture gate. This trusted server-side verifier remains
        // UNCONFIGURED until category, hold, access, backup and deletion rules
        // are formally approved. It only sees event type + environment.
        if(typeof verifyDisputeRetentionRelease!=='function')
          return reply(503,'dispute_retention_not_approved',300)
        let privacyAllowed=false
        try {privacyAllowed=(await verifyDisputeRetentionRelease({
          eventType:event.event_type,environment}))===true}
        catch {return reply(503,'dispute_retention_not_approved',300)}
        if(!privacyAllowed)return reply(503,'dispute_retention_not_approved',300)
        if(typeof assessTrustedDisputeScope!=='function')
          return reply(503,'dispute_scope_unavailable',300)
        let scope
        try {scope=await assessTrustedDisputeScope({
          eventId:event.id,eventType:event.event_type,
        })} catch {return reply(503,'dispute_scope_unavailable',300)}
        // 'outside_pazo' MUST be provider+private-ledger attested, not a
        // caller-supplied flag; otherwise retry without ACK or storage.
        if(scope==='outside_pazo')return reply(200,'verified_non_pazo_dispute')
        if(scope!=='confirmed_pazo')return reply(503,'dispute_scope_unverified',300)
      }
      // Unknown, verified events are not business actions; do not persist their payload.
      if(!EVENT_TYPES.has(event.event_type)) return reply(200,'verified_unhandled_event')
      try {
        // The inbox adapter MUST atomically persist (provider,eventId) or report a
        // previously persisted duplicate. It MUST NOT credit a user or mutate profiles.
        const created=await inbox.insertIfAbsent({
          provider:'paypal',eventId:event.id,eventType:event.event_type,
        })
        if(created===true) return reply(202,'verified_event_queued')
        if(created===false) return reply(200,'duplicate_verified_event')
        return reply(503,'inbox_not_durable')
      } catch {return reply(503,'inbox_unavailable')}
    } finally {
      // Release on signature failure, invalid/unhandled events, duplicates and DB faults.
      release()
    }
  }
}
