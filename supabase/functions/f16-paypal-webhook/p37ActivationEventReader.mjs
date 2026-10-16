// F16-P37: claim-scoped PayPal Sandbox activation event GET. OFFLINE ONLY.
// The service-owned claim verifier must authenticate the independent event.
// This adapter never credits money, grants benefits or verifies a cycle.
const HOST='https://api-m.sandbox.paypal.com'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function createP37ActivationEventReader({enabled=false,readClaimedActivation,getAccessToken,fetchImpl=fetch}={}){
 return async({activationEventId,activationClaimToken,subscriptionId}={})=>{
  if(!enabled||typeof readClaimedActivation!=='function'||typeof getAccessToken!=='function'||typeof fetchImpl!=='function')return null
  if(!REF.test(activationEventId||'')||!UUID.test(activationClaimToken||'')||!SUB.test(subscriptionId||''))return null
  try{
   const claim=await readClaimedActivation({eventId:activationEventId,claimToken:activationClaimToken})
   if(claim?.id!==activationEventId||claim?.type!=='BILLING.SUBSCRIPTION.ACTIVATED'||
    claim?.processingState!=='processing'||claim?.subscriptionId!==subscriptionId||
    claim?.signatureVerified!==true)return null
   const token=await getAccessToken()
   if(typeof token!=='string'||token.length<8)return null
   const response=await fetchImpl(HOST+'/v1/notifications/webhooks-events/'+encodeURIComponent(activationEventId),{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+token,Accept:'application/json'}
   })
   if(!response?.ok)return null
   const event=await response.json()
   if(event?.id!==activationEventId||event?.event_type!=='BILLING.SUBSCRIPTION.ACTIVATED'||
    event?.resource?.id!==subscriptionId||typeof event.create_time!=='string'||
    !Number.isFinite(Date.parse(event.create_time)))return null
   return Object.freeze({event_type:event.event_type,
    create_time:event.create_time,resource:Object.freeze({id:subscriptionId})})
  }catch{return null}
 }
}
