import { inspectPayPalCertUrl } from './paypalCertificateUrlPolicy.mjs'
import { verifyPaypalSignatureOffline } from './paypalOfflineSignature.mjs'

// UNDEPLOYED integration seam. Caller must inject a server-side HTTPS fetch with
// trusted TLS, DNS/rebinding protection and no redirect following. No network by default.
export async function verifyPayPalCertificateBoundSignature({
  rawBody, headers, webhookId, environment, fetchCertificate,
}) {
  const url = headers?.['paypal-cert-url']
  if (!inspectPayPalCertUrl(url,environment) || typeof fetchCertificate !== 'function') return false
  let result
  try {
    result = await fetchCertificate(url,{
      redirect:'error', method:'GET', environment, maxBytes:16384,
    })
  } catch { return false }
  if (!result || result.redirected !== false || result.status !== 200 ||
      typeof result.certificatePem !== 'string' || result.certificatePem.length > 16384)
    return false
  return verifyPaypalSignatureOffline({
    rawBody, headers, webhookId, trustedCertificatePem:result.certificatePem,
  })
}
