// F16-P35 OFFLINE ONLY. Merchant subscription snapshot for activation review.
// Caller must supply a claim-scoped merchant event reader and OAuth reader.
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const TIME=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/
const validTime=x=>typeof x==='string'&&TIME.test(x)&&Number.isFinite(Date.parse(x))
export function createP35ClaimScopedBillingSnapshot({enabled=false,getClaimedMerchantEvent,getAccessToken,fetchImpl=fetch}={}){
 return async({subscriptionId,eventId,claimToken}={})=>{
  if(!enabled||typeof getClaimedMerchantEvent!=='function'||typeof getAccessToken!=='function'||typeof fetchImpl!=='function')return null
  if(!SUB.test(subscriptionId||'')||!EVENT.test(eventId||'')||!UUID.test(claimToken||''))return null
  try{
   const event=await getClaimedMerchantEvent({eventId,claimToken})
   if(event?.id!==eventId||event?.event_type!=='PAYMENT.SALE.COMPLETED'||event?.resource?.billing_agreement_id!==subscriptionId)return null
   const token=await getAccessToken()
   if(typeof token!=='string'||token.length<8)return null
   const response=await fetchImpl('https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+token,Accept:'application/json'}
   })
   if(!response?.ok)return null
   const sub=await response.json()
   if(sub?.id!==subscriptionId||!['ACTIVE','CANCELLED'].includes(sub.status)||
    !validTime(sub.billing_info?.next_billing_time))return null
   return Object.freeze({id:sub.id,status:sub.status,
    billing_info:Object.freeze({next_billing_time:sub.billing_info.next_billing_time})})
  }catch{return null}
 }
}
