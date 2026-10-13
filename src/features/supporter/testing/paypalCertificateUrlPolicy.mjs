// Offline-only PayPal certificate URL policy. Network/certificate chain validation belongs
// to a separately authorized server adapter. No user-supplied URL is fetched here.
const HOSTS = Object.freeze({
  sandbox: 'api.sandbox.paypal.com',
  live: 'api-m.paypal.com',
})
export function inspectPayPalCertUrl(value, environment) {
  if (!Object.hasOwn(HOSTS, environment) || typeof value !== 'string' ||
      value.length > 2048 || /[\\\u0000-\u001f\u007f]/.test(value)) return false
  let url
  try { url = new URL(value) } catch { return false }
  if (url.protocol !== 'https:' || url.hostname !== HOSTS[environment] ||
      url.username || url.password || url.port || url.search || url.hash ||
      !/^\/v1\/notifications\/certs\/[A-Za-z0-9._-]+$/.test(url.pathname)) return false
  return true
}
export function validatePayPalWebhookContext({ environment, certificateUrl, configuredEnvironment, webhookId }) {
  return environment === configuredEnvironment &&
    typeof webhookId === 'string' && /^[A-Za-z0-9_-]{3,128}$/.test(webhookId) &&
    inspectPayPalCertUrl(certificateUrl, environment)
}
