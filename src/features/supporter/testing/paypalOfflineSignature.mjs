import { createVerify, X509Certificate } from 'node:crypto'

// Isolated PayPal RSA SHA256 verifier. NO network or certificate downloads.
// Production certificate trust, hostname allowlist, revocation and caching are NOT implemented.
// A server adapter must supply trusted/corroborated certificate PEM after a separate gate.
export function crc32Decimal(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(10)
}
export function paypalSignedMessage({ rawBody, headers, webhookId }) {
  if (!(rawBody instanceof Uint8Array) || !rawBody.length || !webhookId) throw Error('invalid_input')
  const id = headers['paypal-transmission-id'], time = headers['paypal-transmission-time']
  if (!id || !time) throw Error('missing_header')
  return `${id}|${time}|${webhookId}|${crc32Decimal(rawBody)}`
}
export function verifyPaypalSignatureOffline({rawBody,headers,webhookId,trustedCertificatePem}) {
  if (!trustedCertificatePem || headers['paypal-auth-algo'] !== 'SHA256withRSA') return false
  const encoded=headers['paypal-transmission-sig']
  if (typeof encoded !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return false
  try {
    const cert = new X509Certificate(trustedCertificatePem)
    // Certificate chain, expiry, OCSP/revocation and PayPal authority must be verified
    // BEFORE this function is called by a production adapter.
    const verifier=createVerify('RSA-SHA256')
    verifier.update(paypalSignedMessage({rawBody,headers,webhookId}),'utf8')
    verifier.end()
    return verifier.verify(cert.publicKey,Buffer.from(encoded,'base64'))
  } catch { return false }
}
