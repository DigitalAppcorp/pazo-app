// PAZO F16: PayPal Sandbox ONLY verified webhook postback adapter (draft).
// This module is not deployed or wired to live PAZO membership.
// Never use a browser context, persist credentials, or log provider response bodies.
const HOST='https://api-m.sandbox.paypal.com'
const ALLOWED_CERT_HOSTS=new Set(['api.sandbox.paypal.com','api-m.sandbox.paypal.com'])
const CERT_PATH=/^\/v1\/notifications\/certs\/CERT-[A-Za-z0-9-]{3,180}$/
const HEADERS={
  'paypal-auth-algo':'auth_algo',
  'paypal-cert-url':'cert_url',
  'paypal-transmission-id':'transmission_id',
  'paypal-transmission-sig':'transmission_sig',
  'paypal-transmission-time':'transmission_time',
}
export function requireCertUrl(value) {
  let cert
  try { cert=new URL(value) } catch { return false }
  return cert.protocol==='https:' && ALLOWED_CERT_HOSTS.has(cert.hostname) &&
    !cert.port && !cert.username && !cert.password && !cert.search &&
    !cert.hash && CERT_PATH.test(cert.pathname) && value===cert.href
}
function buildVerificationBody(headers,rawBody,webhookId) {
  if(!(rawBody instanceof Uint8Array) || rawBody.length===0 || rawBody.length>65536)
    throw Error('invalid_webhook_body')
  if(typeof webhookId!=='string' || !/^[A-Za-z0-9_-]{3,128}$/.test(webhookId))
    throw Error('invalid_webhook_id')
  const fields={}
  for(const [key,dest] of Object.entries(HEADERS)) {
    const value=headers.get(key)
    if(typeof value!=='string' || value.length===0 || value.length>2048)
      throw Error('invalid_webhook_headers')
    fields[dest]=value
  }
  if(fields.auth_algo!=='SHA256withRSA' || !requireCertUrl(fields.cert_url))
    throw Error('invalid_signature_certificate')
  // The core parsed this as an event already. Preserve byte-equivalent event JSON
  // inside the request body; never JSON.stringify(event) from a parsed object.
  const rawText=new TextDecoder('utf-8',{fatal:true}).decode(rawBody)
  const event=JSON.parse(rawText)
  if(!event || typeof event!=='object' || Array.isArray(event))
    throw Error('invalid_webhook_body')
  const prefix=JSON.stringify({...fields,webhook_id:webhookId})
  return prefix.slice(0,-1)+',"webhook_event":'+rawText+'}'
}
async function jsonResponse(fetchImpl,url,options) {
  // This adapter never takes a remotely supplied endpoint: only fixed Sandbox API routes.
  const response=await fetchImpl(url,{
    ...options,redirect:'error',signal:AbortSignal.timeout(12000),
  })
  if(!response?.ok) throw Error('paypal_api_unavailable')
  return response.json()
}
export function createPaypalSandboxPostbackVerifier({clientId,clientSecret,fetchImpl=fetch}={}) {
  if(typeof clientId!=='string' || !/^[\x21-\x7e]{8,512}$/.test(clientId) ||
      clientId.includes(':') ||
      typeof clientSecret!=='string' || !/^[\x21-\x7e]{8,512}$/.test(clientSecret) ||
      typeof fetchImpl!=='function')
    throw Error('sandbox_verifier_not_configured')
  return async function verifySignature({headers,rawBody,webhookId,environment}={}) {
    if(environment!=='sandbox' || typeof headers?.get!=='function')
      throw Error('sandbox_only')
    const verificationPayload=buildVerificationBody(headers,rawBody,webhookId)
    const token=await jsonResponse(fetchImpl,HOST+'/v1/oauth2/token',{
      method:'POST',
      headers:{
        Authorization:'Basic '+btoa(clientId+':'+clientSecret),
        'Content-Type':'application/x-www-form-urlencoded',
        Accept:'application/json',
      },
      body:'grant_type=client_credentials',
    })
    if(token?.token_type?.toLowerCase()!=='bearer' ||
        typeof token.access_token!=='string' || !token.access_token)
      throw Error('paypal_oauth_unavailable')
    const result=await jsonResponse(fetchImpl,HOST+'/v1/notifications/verify-webhook-signature',{
      method:'POST',
      headers:{Authorization:'Bearer '+token.access_token,
        'Content-Type':'application/json',Accept:'application/json'},
      body:verificationPayload,
    })
    // Any non-SUCCESS provider response fails closed.
    return result?.verification_status==='SUCCESS'
  }
}
