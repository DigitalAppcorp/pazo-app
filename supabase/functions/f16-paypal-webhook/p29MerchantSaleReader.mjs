// F16-P29 offline only: independent PayPal Sandbox Sale GET, never enabled by default.
const HOST='https://api-m.sandbox.paypal.com'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function createP29MerchantSaleReader({enabled=false,readClaimedMerchantEvent,getAccessToken,fetchImpl=fetch}={}){
 return async({saleId,eventId,claimToken}={})=>{
  if(!enabled||typeof readClaimedMerchantEvent!=='function'||typeof getAccessToken!=='function'||typeof fetchImpl!=='function')return null
  if(typeof saleId!=='string'||!REF.test(saleId)||typeof eventId!=='string'||!REF.test(eventId)||
   typeof claimToken!=='string'||!UUID.test(claimToken))return null
  try{
   const event=await readClaimedMerchantEvent({eventId,claimToken})
   if(event?.id!==eventId||event?.event_type!=='PAYMENT.SALE.COMPLETED'||
    event?.resource?.id!==saleId)return null
   const token=await getAccessToken()
   if(typeof token!=='string'||token.length<8)return null
   const res=await fetchImpl(HOST+'/v1/payments/sale/'+encodeURIComponent(saleId),{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+token,Accept:'application/json'}
   })
   if(!res?.ok)return null
   const sale=await res.json()
   if(!sale||Array.isArray(sale)||sale.id!==saleId||
    sale.billing_agreement_id!==event.resource.billing_agreement_id||
    !['completed','COMPLETED'].includes(sale.state)||
    sale.amount?.currency!=='USD'||sale.amount?.total!=='2.99')return null
   return Object.freeze({id:saleId,billing_agreement_id:sale.billing_agreement_id,
    state:sale.state,amount:Object.freeze({currency:'USD',total:'2.99'})})
  }catch{return null}
 }
}
