// F16 READ ONLY: resolve verified event ID via PayPal Sandbox API after durable ACK.
// Avoid storing raw payer data in our inbox. No payments/entitlements are changed.
const API='https://api-m.sandbox.paypal.com'
const REF=/^[A-Za-z0-9._-]{3,128}$/
async function json(fetchImpl,url,options){
 const response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)})
 if(!response?.ok) throw Error('paypal_event_query_unavailable')
 const body=await response.json()
 if(!body || typeof body!=='object' || Array.isArray(body)) throw Error('invalid_event_response')
 return body
}
export function createPaypalSandboxEventReader({clientId,clientSecret,fetchImpl=fetch}={}){
 if(typeof clientId!=='string' || !/^[\x21-\x7e]{8,512}$/.test(clientId) || clientId.includes(':') ||
    typeof clientSecret!=='string' || !/^[\x21-\x7e]{8,512}$/.test(clientSecret) ||
    typeof fetchImpl!=='function') throw Error('event_reader_not_configured')
 return {
  async readEvent(eventId){
   if(typeof eventId!=='string' || !REF.test(eventId))
     throw Error('invalid_event_id')
   const token=await json(fetchImpl,API+'/v1/oauth2/token',{
    method:'POST',
    headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
      'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:'grant_type=client_credentials',
   })
   if(token.token_type?.toLowerCase()!=='bearer' ||
     typeof token.access_token!=='string' || !token.access_token)
     throw Error('oauth_unavailable')
   const event=await json(fetchImpl,API+'/v1/notifications/webhooks-events/'+encodeURIComponent(eventId),{
    method:'GET',headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'},
   })
   if(event.id!==eventId || typeof event.event_type!=='string' ||
      event.event_type.length>128) throw Error('event_id_mismatch')
   const r=event.resource && typeof event.resource==='object' && !Array.isArray(event.resource)?
     event.resource:{}
   const sale=event.event_type==='PAYMENT.SALE.COMPLETED'
   return {
    eventId,
    eventType:event.event_type,
    occurredAt:typeof event.create_time==='string'?event.create_time:null,
    // Only sale notifications have a known resource ID->transaction correlation.
    // Refunds and reversals must remain quarantined until PayPal's transaction
    // API and the ledger determine the affected original payment.
    externalPaymentId:sale && typeof r.id==='string' && REF.test(r.id)?r.id:null,
    externalSubscriptionId:sale && typeof r.billing_agreement_id==='string' &&
      REF.test(r.billing_agreement_id)?r.billing_agreement_id:null,
    requiresReversalReview:event.event_type==='PAYMENT.SALE.REFUNDED' ||
      event.event_type==='PAYMENT.SALE.REVERSED',
   }
  },
 }
}
