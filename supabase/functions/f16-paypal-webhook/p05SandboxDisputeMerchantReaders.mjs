// PAZO F16-P05 — inactive Sandbox-only merchant dispute evidence GET.
// Server-only; no direct imports in deployed webhook, checkout or browser.
// The webhook signature is verified BEFORE caller invokes this reader.
// POST /oauth2/token is authentication, not payment; all others are GET.
const HOST='https://api-m.sandbox.paypal.com'
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const DISPUTE=/^[A-Za-z0-9-]{3,128}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const TYPES=new Set(['CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED',
 'CUSTOMER.DISPUTE.RESOLVED'])
const fail=code=>{throw Error(code)}
const secret=x=>typeof x==='string'&&x.length>=8&&x.length<=512&&
 /^[\x21-\x7e]+$/.test(x)
async function getJSON(fetchImpl,url,opts){
 let response
 try{response=await fetchImpl(url,{...opts,redirect:'error',
  signal:AbortSignal.timeout(12000)})}
 catch{fail('p05_dispute_merchant_transport_unavailable')}
 if(!response?.ok)fail('p05_dispute_merchant_http_unavailable')
 let data
 try{data=await response.json()}
 catch{fail('p05_dispute_merchant_invalid_json')}
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('p05_dispute_merchant_invalid_json')
 return data
}
export function createP05SandboxDisputeMerchantReaders({
 clientId,clientSecret,fetchImpl=fetch,
}={}){
 if(!secret(clientId)||!secret(clientSecret)||clientId.includes(':')||
  typeof fetchImpl!=='function')
  fail('p05_dispute_merchant_not_configured')
 async function auth(){
  const d=await getJSON(fetchImpl,HOST+'/v1/oauth2/token',{
   method:'POST',headers:{
    Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'Content-Type':'application/x-www-form-urlencoded',
    Accept:'application/json',
   },body:'grant_type=client_credentials',
  })
  if(d.token_type?.toLowerCase()!=='bearer'||
   typeof d.access_token!=='string'||d.access_token.length<8)
   fail('p05_dispute_merchant_auth_invalid')
  return {Authorization:'Bearer '+d.access_token,Accept:'application/json'}
 }
 return Object.freeze({
  async getPayPalWebhookEvent({eventId}={}){
   if(typeof eventId!=='string'||!EVENT.test(eventId))
    fail('p05_dispute_merchant_event_invalid')
   const headers=await auth()
   const e=await getJSON(fetchImpl,
    HOST+'/v1/notifications/webhooks-events/'+encodeURIComponent(eventId),
    {method:'GET',headers})
   if(e.id!==eventId||!TYPES.has(e.event_type)||
    typeof e.resource?.dispute_id!=='string'||
    !DISPUTE.test(e.resource.dispute_id))
    fail('p05_dispute_merchant_event_mismatch')
   return Object.freeze({
    id:e.id,event_type:e.event_type,
    resource:Object.freeze({dispute_id:e.resource.dispute_id}),
   })
  },
  async getPayPalDisputeDetails({disputeId}={}){
   if(typeof disputeId!=='string'||!DISPUTE.test(disputeId))
    fail('p05_dispute_merchant_dispute_invalid')
   const headers=await auth()
   const d=await getJSON(fetchImpl,
    HOST+'/v1/customer/disputes/'+encodeURIComponent(disputeId),
    {method:'GET',headers})
   if(d.dispute_id!==disputeId||!Array.isArray(d.disputed_transactions)||
    d.disputed_transactions.length>12)
    fail('p05_dispute_merchant_details_mismatch')
   return Object.freeze({
    dispute_id:d.dispute_id,
    disputed_transactions:d.disputed_transactions.map(t=>Object.freeze({
     seller_transaction_id:typeof t?.seller_transaction_id==='string'&&
      SALE.test(t.seller_transaction_id)?t.seller_transaction_id:null,
     ...(t?.gross_amount?{gross_amount:Object.freeze({
      currency_code:t.gross_amount.currency_code,
      value:t.gross_amount.value,
     })}:{}),
    })),
   })
  },
 })
}
