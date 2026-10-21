// F16 V2: verify a signed-inbox CREATED candidate against PayPal's original
// server-side webhook event. This NEVER proves a paid cycle, terminal state,
// noncollectibility or authorization for another subscription.
// No payer, IDs, merchant payload, secrets or URLs are returned to the caller.
const API='https://api-m.sandbox.paypal.com'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const TYPE='BILLING.SUBSCRIPTION.CREATED'
const safe=(code,extra={})=>Object.freeze({
 environment:'sandbox',code,correlated:false,
 eventReconciled:false,mayRetry:false,mayRecordPayment:false,
 mayGrantBenefits:false,paidThrough:null,...extra
})
const fail=code=>{throw Error(code)}
export function createPazoSandboxV2CreatedEventAudit({
 clientId,clientSecret,fetchImpl=fetch
}={}){
 const credential=x=>typeof x==='string'&&/^[\x21-\x7e]{8,512}$/.test(x)
 if(!credential(clientId)||clientId.includes(':')||!credential(clientSecret)||
   typeof fetchImpl!=='function')fail('created_audit_not_configured')
 async function get(url,init,stage){
  let r
  try{r=await fetchImpl(url,{...init,redirect:'error',
   signal:AbortSignal.timeout(12000)})}
  catch{fail('created_audit_network_unavailable')}
  if(!r?.ok){
   if(stage==='oauth'&&(r.status===401||r.status===403))
    fail('created_audit_oauth_denied')
   if(r.status===404)fail('created_audit_event_not_found')
   if(r.status===401||r.status===403)fail('created_audit_access_denied')
   if(r.status===429)fail('created_audit_rate_limited')
   fail('created_audit_provider_unavailable')
  }
  let body
  try{body=await r.json()}catch{fail('created_audit_invalid_response')}
  if(!body||typeof body!=='object'||Array.isArray(body))
   fail('created_audit_invalid_response')
  return body
 }
 return Object.freeze({
  async inspect({eventId,eventType,subscriptionId,intentId,planId}={}){
   if(!EVENT.test(eventId||'')||eventType!==TYPE||!SUB.test(subscriptionId||'')||
      !INTENT.test(intentId||'')||planId!==PLAN)
    fail('created_audit_binding_unverified')
   const token=await get(API+'/v1/oauth2/token',{
    method:'POST',headers:{
     Authorization:'Basic '+btoa(clientId+':'+clientSecret),
     'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:'grant_type=client_credentials'
   },'oauth')
   if(token.token_type?.toLowerCase()!=='bearer'||
       typeof token.access_token!=='string'||!token.access_token)
    fail('created_audit_invalid_token')
   const evidence=await get(
    API+'/v1/notifications/webhooks-events/'+encodeURIComponent(eventId),{
    method:'GET',headers:{
     Authorization:'Bearer '+token.access_token,Accept:'application/json'}
   },'event')
   // The private inbox signature already proves event ID+type were attested.
   // The provider GET independently checks the same ID, exact subscription
   // resource ID and all available immutable intent/plan binding fields.
   const resource=evidence.resource
   if(evidence.id!==eventId||evidence.event_type!==TYPE||
       !resource||typeof resource!=='object'||Array.isArray(resource))
    return safe('created_event_identity_unverified')
   if(resource.id!==subscriptionId||
      (resource.custom_id!==undefined&&resource.custom_id!==intentId)||
      (resource.plan_id!==undefined&&resource.plan_id!==PLAN))
    return safe('created_event_not_same_subscription')
   return safe('created_event_matches_bound_subscription',{correlated:true})
  }
 })
}
