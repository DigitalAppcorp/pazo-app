// Minimal durable provenance extracted ONLY from bytes that passed PayPal's
// Live postback verification. No payer, amount, credential or payload storage.
import {requirePazoLiveProviderSubscription} from './liveOwnerScope.mjs'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const HOOK=/^[A-Za-z0-9_-]{8,100}$/
const fail=()=>{throw Error('live_signed_receipt_unavailable')}
function instant(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value))return null
 const parsed=Date.parse(value)
 if(!Number.isFinite(parsed))return null
 const normalized=value.replace(/(?:\.(\d{1,3}))?Z$/,(_m,f)=>'.'+(f||'').padEnd(3,'0')+'Z')
 return new Date(parsed).toISOString()===normalized?normalized:null
}
export async function createPazoLiveSignedEventReceipt({
 signatureVerified=false,rawBody,webhookId,scope
}={}){
 if(signatureVerified!==true||!(rawBody instanceof Uint8Array)||rawBody.length<2||
  rawBody.length>65536||!HOOK.test(webhookId||'')||scope?.confirmed!==true||
  scope.sourceEnvironment!=='live'||scope.ownerIntentVerified!==true||scope.planVerified!==true)
  fail()
 let event
 try{event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(rawBody))}catch{fail()}
 if(!REF.test(event?.id||'')||typeof event.event_type!=='string')fail()
 let subscriptionId=requirePazoLiveProviderSubscription(event.event_type,event.resource)
 if(subscriptionId===null&&['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(event.event_type)&&
  scope.originalSaleVerified===true&&scope.originalSaleId===(event.resource?.sale_id||event.resource?.id))
  subscriptionId=scope.subscriptionId
 if(!subscriptionId||subscriptionId!==scope.subscriptionId||!REF.test(event.resource.id||''))fail()
 const providerEventAt=instant(event.create_time)
 const subjectAt=event.resource.create_time===undefined?providerEventAt:instant(event.resource.create_time)
 if(!providerEventAt||!subjectAt)fail()
 const activated=event.event_type==='BILLING.SUBSCRIPTION.ACTIVATED'
 const activationAt=activated?instant(event.resource.status_update_time):null
 const nextBillingAt=activated?instant(event.resource.billing_info?.next_billing_time):null
 const digest=await crypto.subtle.digest('SHA-256',rawBody)
 return Object.freeze({
  proofSource:'paypal_live_postback_success',
  signedBodySha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),
  webhookId,subscriptionId,subjectId:event.resource.id,providerEventAt,subjectAt,
  activationAt,nextBillingAt
 })
}
