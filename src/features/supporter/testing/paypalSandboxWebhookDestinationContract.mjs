// Inspect one PayPal webhook WITHOUT echoing its registered URL.
// Equality only establishes configuration, never reachability/security/delivery.
export const PAZO_SANDBOX_WEBHOOK_ID='6N7889790V1467139'
export const PAZO_EXPECTED_WEBHOOK_URL='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/paypal-webhook'
export function inspectPazoWebhookDestination(details){
  if(!details || typeof details!=='object' || Array.isArray(details))
    return {ok:false,status:'invalid_response',webhookIdMatches:false,destinationMatches:false}
  const webhookIdMatches=details.id===PAZO_SANDBOX_WEBHOOK_ID
  // Exact comparison is intentional: reject unexpected trailing paths, query strings,
  // userinfo, redirections, port deviations, or other hostnames.
  const destinationMatches=typeof details.url==='string' &&
    details.url===PAZO_EXPECTED_WEBHOOK_URL
  return {
    ok:webhookIdMatches && destinationMatches,
    status: webhookIdMatches ? (destinationMatches?'destination_matches':'destination_mismatch') : 'webhook_id_mismatch',
    webhookIdMatches,destinationMatches,
  }
}
