// PAZO F16-P05 — PayPal SANDBOX merchant GETs under a fenced signed inbox claim.
// INACTIVE server-side adapter: no import from active edge / checkout / worker.
// Only OAuth token POST and scoped merchant GETs; no subscription/payment writes.
// Ingress signature was verified by the existing inbox boundary, NOT by this file.
// readClaimedEvent MUST be a service-only RPC that validates eventId + claimToken.
import {createP29MerchantSaleReader} from './p29MerchantSaleReader.mjs'
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const UTC=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|\+00:00)$/
const validTime=x=>typeof x==='string'&&UTC.test(x)&&Number.isFinite(Date.parse(x))&&
 new Date(x).toISOString().slice(0,19)===x.slice(0,19)
const goodSecret=x=>typeof x==='string'&&x.length>=8&&x.length<=512&&
 /^[\x21-\x7e]+$/.test(x)
const fail=message=>{throw Error(message)}
const projection=e=>Object.freeze({
 id:e.id,
 event_type:e.event_type,
 create_time:e.create_time,
 resource:Object.freeze({
  id:e.resource?.id,
  billing_agreement_id:e.resource?.billing_agreement_id,
  state:e.resource?.state,
  amount:Object.freeze({
   currency:e.resource?.amount?.currency,
   total:e.resource?.amount?.total,
  }),
 }),
})
async function requestJson(fetchImpl,url,options){
 let response
 try{
  response=await fetchImpl(url,{...options,
   redirect:'error',signal:AbortSignal.timeout(12000)})
 }catch{fail('p05_paypal_sandbox_transport_unavailable')}
 if(!response?.ok)fail('p05_paypal_sandbox_response_unavailable')
 let data
 try{data=await response.json()}
 catch{fail('p05_paypal_sandbox_invalid_json')}
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('p05_paypal_sandbox_invalid_json')
 return data
}
export function createP05SandboxClaimScopedMerchantReaders({
 clientId,clientSecret,readClaimedEvent,fetchImpl=fetch,
}={}){
 if(!goodSecret(clientId)||!goodSecret(clientSecret)||
  clientId.includes(':')||typeof readClaimedEvent!=='function'||
  typeof fetchImpl!=='function')
  fail('p05_claimed_merchant_reader_not_configured')

 async function verifyClaim({eventId,claimToken}){
  if(!EVENT.test(eventId||'')||!UUID.test(claimToken||''))
   fail('p05_claimed_event_reference_invalid')
  let proof
  try{proof=await readClaimedEvent({eventId,claimToken})}
  catch{fail('p05_claimed_event_read_unavailable')}
  if(!proof||proof.id!==eventId||
   proof.type!=='PAYMENT.SALE.COMPLETED'||
   proof.processingState!=='processing'||!validTime(proof.verifiedAt))
   fail('p05_claimed_event_not_verified')
 }
 async function authorize(){
  const token=await requestJson(fetchImpl,HOST+'/v1/oauth2/token',{
   method:'POST',headers:{
    Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'Content-Type':'application/x-www-form-urlencoded',
    Accept:'application/json',
   },body:'grant_type=client_credentials',
  })
  if(token.token_type?.toLowerCase()!=='bearer'||
   typeof token.access_token!=='string'||token.access_token.length<8)
   fail('p05_paypal_sandbox_auth_invalid')
  return {Authorization:'Bearer '+token.access_token,Accept:'application/json'}
 }
 async function merchantEvent({eventId,claimToken}){
  await verifyClaim({eventId,claimToken})
  const headers=await authorize()
  const e=await requestJson(fetchImpl,
   HOST+'/v1/notifications/webhooks-events/'+encodeURIComponent(eventId),
   {method:'GET',headers})
  if(e.id!==eventId||e.event_type!=='PAYMENT.SALE.COMPLETED'||
   !validTime(e.create_time)||!EVENT.test(e.resource?.id||'')||
   !SUB.test(e.resource?.billing_agreement_id||'')||
   !['completed','COMPLETED'].includes(e.resource?.state)||
   e.resource?.amount?.currency!=='USD'||e.resource?.amount?.total!=='2.99')
   fail('p05_paypal_sandbox_sale_event_mismatch')
  return projection(e)
 }
 // P29 reuses the same PRIVATE verified event check and OAuth closure.
 // The bearer token never escapes the server-only reader interface.
 const independentSale=createP29MerchantSaleReader({
  enabled:true,
  readClaimedMerchantEvent:merchantEvent,
  getAccessToken:async()=>{
   const headers=await authorize()
   return headers.Authorization.slice('Bearer '.length)
  },
  fetchImpl,
 })
 return Object.freeze({
  getMerchantEvent:merchantEvent,
  getIndependentMerchantSale:independentSale,
  async getMerchantSubscription({subscriptionId,eventId,claimToken}={}){
   if(!SUB.test(subscriptionId||''))fail('p05_subscription_ref_invalid')
   // Recheck the active lease + original merchant event immediately before
   // looking up any subscription. A caller cannot use this method to fetch
   // arbitrary subscription IDs outside the claimed event's billing agreement.
   const event=await merchantEvent({eventId,claimToken})
   if(event.resource.billing_agreement_id!==subscriptionId)
    fail('p05_subscription_not_in_claimed_sale')
   const headers=await authorize()
   const sub=await requestJson(fetchImpl,
    HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),
    {method:'GET',headers})
   if(sub.id!==subscriptionId||sub.plan_id!==PLAN||
    !INTENT.test(sub.custom_id||'')||
    !['ACTIVE','CANCELLED'].includes(sub.status))
    fail('p05_subscription_merchant_binding_mismatch')
   // No subscriber data, payer ID or contact details leave this adapter.
   return Object.freeze({id:sub.id,plan_id:sub.plan_id,
    custom_id:sub.custom_id,status:sub.status})
  },
 })
}
