// F16 PRIVATE / OFFLINE integration preparation. PayPal Sandbox OAuth merchant-only reads.
// Payments v1 SALE/REFUND GET are DEPRECATED: if PayPal denies a lookup, FAIL CLOSED.
// Never import in frontend. Never persist/log raw PayPal bodies, payer data or tokens.
const BASE='https://api-m.sandbox.paypal.com'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d:(?:\d\d)(?:\.\d+)?Z$/
function date(value) {
 if(typeof value!=='string'||!UTC.test(value))return null
 const millis=Date.parse(value)
 return Number.isFinite(millis)&&new Date(millis).toISOString().replace(/\.000Z$/,'Z')===value?value:null
}
function minor(value) {
 if(typeof value!=='string'||!/^\d+\.\d{2}$/.test(value))return null
 const [whole,cents]=value.split('.')
 const n=Number(whole)*100+Number(cents)
 return Number.isSafeInteger(n)?n:null
}
async function json(fetchImpl,path,opts) {
 let response,body
 try {
  response=await fetchImpl(BASE+path,{...opts,redirect:'error',signal:AbortSignal.timeout(12000)})
  if(!response?.ok) throw Error('unavailable')
  body=await response.json()
 }catch {throw Error('f16_merchant_api_unavailable')}
 if(!body||typeof body!=='object'||Array.isArray(body))
  throw Error('f16_merchant_response_invalid')
 return body
}
export function createF16PaypalSandboxOriginalReader({clientId,clientSecret,fetchImpl=fetch}={}) {
 if(typeof clientId!=='string'||!/^[\x21-\x7e]{8,512}$/.test(clientId)||clientId.includes(':')||
  typeof clientSecret!=='string'||!/^[\x21-\x7e]{8,512}$/.test(clientSecret)||
  typeof fetchImpl!=='function') throw Error('f16_original_reader_not_configured')
 async function token(){
  const oauth=await json(fetchImpl,'/v1/oauth2/token',{
   method:'POST',body:'grant_type=client_credentials',
   headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
     'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
  })
  if(oauth.token_type!=='Bearer'||typeof oauth.access_token!=='string'||
    !/^[\x21-\x7e]{8,4096}$/.test(oauth.access_token))
   throw Error('f16_merchant_oauth_invalid')
  return oauth.access_token
 }
 async function get(kind,id){
  if(typeof id!=='string'||!REF.test(id))throw Error('f16_original_reference_invalid')
  const bearer=await token()
  return json(fetchImpl,'/v1/payments/'+kind+'/'+encodeURIComponent(id),{
   method:'GET',headers:{Authorization:'Bearer '+bearer,Accept:'application/json'},
  })
 }
 return Object.freeze({
  async readSale(saleId){
   const data=await get('sale',saleId)
   const sub=data.billing_agreement_id
   const money=minor(data.amount?.total)
   const completedAt=date(data.create_time)
   if(data.id!==saleId||!SUB.test(sub||'')||
      money===null||data.amount?.currency!=='USD'||
      completedAt===null||typeof data.state!=='string')
     throw Error('f16_original_sale_not_proven')
   return Object.freeze({id:saleId,subscriptionId:sub,state:data.state,
    grossMinorUnits:money,currency:'USD',completedAt,
    verifiedByMerchantApi:true})
  },
  async readRefund(refundId){
   const data=await get('refund',refundId)
   const original=data.sale_id
   const amount=minor(data.amount?.total)
   const at=date(data.update_time)
   if(data.id!==refundId||!REF.test(original||'')||
      amount===null||data.amount?.currency!=='USD'||at===null||
      typeof data.state!=='string')
     throw Error('f16_refund_original_link_unproven')
   return Object.freeze({id:refundId,originalSaleId:original,
    refundMinorUnits:amount,currency:'USD',
    state:data.state,verifiedAt:at,verifiedByMerchantApi:true})
  },
 })
}
