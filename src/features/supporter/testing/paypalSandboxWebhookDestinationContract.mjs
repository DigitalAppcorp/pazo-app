// Read-only F16 diagnosis of an existing PayPal Sandbox webhook URL.
// Never print or return any original callback URL or its secrets.
// This detects configuration differences only, NOT endpoint safety or deliverability.
export const PAZO_SANDBOX_WEBHOOK_ID='6N7889790V1467139'
export const PAZO_EXPECTED_WEBHOOK_URL='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/paypal-webhook'

function classifyDestination(value) {
  if (typeof value!=='string' || value.length===0 || value.length>4096 ||
      /[\u0000-\u001f\u007f]/.test(value)) return 'invalid_or_missing'
  let actual
  try { actual=new URL(value) } catch { return 'invalid_or_missing' }
  const expected=new URL(PAZO_EXPECTED_WEBHOOK_URL)
  if (actual.protocol!=='https:') return 'non_https'
  if (actual.username || actual.password || actual.search || actual.hash ||
      actual.port || value.includes('\\')) return 'has_extra_parameters_or_credentials'
  if (actual.origin===expected.origin && actual.pathname===expected.pathname+'/')
    return 'trailing_slash'
  if (actual.hostname===expected.hostname) return 'same_project_different_path'
  if (actual.hostname.endsWith('.supabase.co')) return 'different_supabase_project'
  return 'different_host'
}

export function inspectPazoWebhookDestination(details) {
  if (!details || typeof details!=='object' || Array.isArray(details))
    return {ok:false,status:'invalid_response',webhookIdMatches:false,destinationMatches:false,destinationCategory:'not_available'}
  const webhookIdMatches=details.id===PAZO_SANDBOX_WEBHOOK_ID
  const destinationMatches=typeof details.url==='string' && details.url===PAZO_EXPECTED_WEBHOOK_URL
  return {
    ok:webhookIdMatches && destinationMatches,
    status: !webhookIdMatches?'webhook_id_mismatch':destinationMatches?'destination_matches':'destination_mismatch',
    webhookIdMatches,
    destinationMatches,
    // Closed vocabulary; never reflect URL host, path, query or credentials.
    destinationCategory: !webhookIdMatches?'not_available':destinationMatches?'exact_match':classifyDestination(details.url),
  }
}
