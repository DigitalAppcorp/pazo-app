// PAZO F16-P28: operator-only merchant read boundary. NOT a financial worker.
// Disabled by default, and deliberately refuses reads until a hosted,
 // independently reviewed lease-attestation adapter exists.
const response=(status,code)=>new Response(JSON.stringify({
 code,environment:'sandbox',mayRecordPayment:false,mayGrantBenefits:false,
 mayCreatePaidPeriod:false,paidThrough:null,
}),{status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}})
const eq=(a,b)=>{
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||a.length<32)return false
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i)
 return diff===0
}
export function createP28OperatorMerchantRead({
 enabled=false,operatorKey,readLeasedEvent,merchantReader,resolvePrivateBinding,
}={}){
 return async(request)=>{
  if(request.method!=='POST')return response(405,'method_not_allowed')
  // Auth checked before parsing request body or querying DB/provider.
  const bearer=request.headers.get('authorization')
  if(!eq(bearer?.startsWith('Bearer ')?bearer.slice(7):null,operatorKey))
   return response(401,'operator_auth_required')
  if(!enabled)return response(503,'merchant_read_disabled')
  if(typeof readLeasedEvent!=='function'||!merchantReader||
   typeof merchantReader.getMerchantEvent!=='function'||
   typeof merchantReader.getMerchantSubscription!=='function'||
   typeof resolvePrivateBinding!=='function')
   return response(503,'lease_reader_unavailable')
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')
   return response(415,'invalid_content_type')
  let body
  try{
   const raw=await request.text()
   if(raw.length>512)return response(413,'invalid_body_size')
   body=JSON.parse(raw)
  }catch{return response(400,'invalid_json')}
  const EVENT=/^[A-Za-z0-9._-]{3,128}$/
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!=='claimToken,eventId'||
   !EVENT.test(body.eventId||'')||!UUID.test(body.claimToken||''))
   return response(400,'invalid_claim_reference')
  try{
   const claim=await readLeasedEvent(body)
   if(claim?.id!==body.eventId||claim?.type!=='PAYMENT.SALE.COMPLETED'||
    claim?.processingState!=='processing'||claim?.liveLease!==true||
    claim?.prospective!==true)
    return response(409,'live_claim_not_verified')
   const event=await merchantReader.getMerchantEvent(body)
   if(event?.id!==body.eventId||!event?.resource?.billing_agreement_id)
    return response(409,'merchant_event_mismatch')
   const sub=await merchantReader.getMerchantSubscription({
    ...body,subscriptionId:event.resource.billing_agreement_id})
   if(sub?.id!==event.resource.billing_agreement_id||
      typeof sub.custom_id!=='string'||
      !/^intent-[A-Za-z0-9_-]{12,90}$/.test(sub.custom_id)||
      sub.plan_id!=='P-14V25407JP6850922NLHMDKI')
    return response(409,'merchant_subscription_mismatch')
   const bound=await resolvePrivateBinding({
    eventId:body.eventId,claimToken:body.claimToken,
    subscriptionId:sub.id,intentId:sub.custom_id})
   if(bound?.intentId!==sub.custom_id||bound?.subscriptionId!==sub.id||
      bound?.planId!=='P-14V25407JP6850922NLHMDKI'||
      bound?.state!=='bound'||
      typeof bound?.ownerId!=='string'||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bound.ownerId))
    return response(409,'private_binding_not_verified')
   // No IDs or payment metadata in HTTP response. No ledger writes.
   return response(200,'merchant_refs_correlated_review_only')
  }catch{return response(503,'merchant_read_unavailable')}
 }
}
