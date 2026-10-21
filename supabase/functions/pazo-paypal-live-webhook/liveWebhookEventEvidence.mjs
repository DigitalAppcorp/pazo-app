// PAZO F16 — PayPal LIVE original merchant webhook event lookup.
// Read-only evidence for a previously signature-verified, SQL-leased event.
// Provider GET is not settlement proof: no paidThrough, no ledger/benefits.
import {requirePazoLiveProviderSubscription} from './liveOwnerScope.mjs'
import {canonicalPaypalInstant} from './liveBillingSnapshot.mjs'
const HOST='https://api-m.paypal.com'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const ASCII=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&
 /^[\x21-\x7e]+$/.test(s)
const DATE=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===
 s.replace(/(?:\.(\d{1,3}))?Z$/,(_m,f)=>'.'+(f||'').padEnd(3,'0')+'Z')
const fail=()=>{throw Error('live_original_webhook_event_unavailable')}
async function readJson(fetchImpl,url,opts){
 let resp
 try{resp=await fetchImpl(url,{...opts,redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(12000)})}catch{fail()}
 if(resp?.status!==200||!resp.ok||
  !/^application\/json(?:\s*;|$)/i.test(resp.headers?.get?.('content-type')||''))fail()
 let raw
 try{raw=await resp.text()}catch{fail()}
 if(typeof raw!=='string'||raw.length>65536)fail()
 let data
 try{data=JSON.parse(raw)}catch{fail()}
 if(!data||typeof data!=='object'||Array.isArray(data))fail()
 return data
}
export function createPaypalLiveWebhookEventEvidence({
 merchantGeneration,clientId,clientSecret,fetchImpl=fetch
}={}){
 if(!Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
  merchantGeneration>9999||!ASCII(clientId)||clientId.includes(':')||
  !ASCII(clientSecret)||typeof fetchImpl!=='function')fail()
 return async function lookup({eventId,eventType,expectedGeneration}={}){
  if(expectedGeneration!==merchantGeneration||!REF.test(eventId||'')||
   typeof eventType!=='string'||!/^([A-Z][A-Z0-9]*\.)+[A-Z][A-Z0-9.]*$/.test(eventType))fail()
  const access=await readJson(fetchImpl,HOST+'/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    Accept:'application/json','content-type':'application/x-www-form-urlencoded'},
   body:'grant_type=client_credentials'
  })
  if(access.token_type?.toLowerCase()!=='bearer'||!ASCII(access.access_token))fail()
  const event=await readJson(fetchImpl,HOST+
   '/v1/notifications/webhooks-events/'+encodeURIComponent(eventId),{
   method:'GET',headers:{Authorization:'Bearer '+access.access_token,
    Accept:'application/json'}
  })
  if(event.id!==eventId||event.event_type!==eventType||
   !DATE(event.create_time)||!event.resource||
   typeof event.resource!=='object'||Array.isArray(event.resource))fail()
  const resource=event.resource
  const subjectAt=resource.create_time===undefined?event.create_time:resource.create_time
  if(!DATE(subjectAt))fail()
  // Only bounded provider reference fields leave this function, not payer PII.
  const id=REF.test(resource.id||'')?resource.id:null
  const saleId=REF.test(resource.sale_id||'')?resource.sale_id:null
  const subscriptionId=requirePazoLiveProviderSubscription(eventType,resource)
  const activated=eventType==='BILLING.SUBSCRIPTION.ACTIVATED'
  return Object.freeze({
   verifiedProviderRead:true,provider:'paypal',sourceEnvironment:'live',
   merchantGeneration,eventId,eventType,providerEventAt:event.create_time,
   subjectId:id,saleId,subscriptionId,subjectAt:new Date(subjectAt).toISOString(),
   ...(activated?{activationAt:canonicalPaypalInstant(resource.status_update_time),
    nextBillingAt:canonicalPaypalInstant(resource.billing_info?.next_billing_time)}:{}),
   paymentSettled:false,servicePeriodVerified:false,
   mayRecordPayment:false,mayGrantBenefits:false
  })
 }
}
