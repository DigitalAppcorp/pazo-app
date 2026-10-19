// PAZO F16 — LIVE merchant-scoped READ/CANCEL adapter, UNRELEASED.
// Must be constructed with the immutable original Vault generation even when
// the global checkout selector changed. No cross-environment fallback.
const HOST='https://api-m.paypal.com'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const safe=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&
 /^[\x21-\x7e]+$/.test(s)
async function getToken(fetchImpl,id,secret){
 const r=await fetchImpl(HOST+'/v1/oauth2/token',{
  method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
  headers:{Authorization:'Basic '+btoa(id+':'+secret),
   'Content-Type':'application/x-www-form-urlencoded',
   Accept:'application/json'},body:'grant_type=client_credentials'
 })
 if(!r?.ok||r.status!==200)throw Error('live_auth_unavailable')
 const d=await r.json()
 if(d?.token_type?.toLowerCase()!=='bearer'||!safe(d.access_token))
  throw Error('live_auth_unavailable')
 return d.access_token
}
export function createPaypalLiveExistingSubscriptionProvider({
 clientId,clientSecret,planId,merchantGeneration,fetchImpl=fetch
}={}){
 if(!safe(clientId)||clientId.includes(':')||!safe(clientSecret)||
  !PLAN.test(planId||'')||!Number.isSafeInteger(merchantGeneration)||
  merchantGeneration<1||typeof fetchImpl!=='function')
  throw Error('live_historical_merchant_unavailable')
 const matchGen=x=>x===merchantGeneration
 return Object.freeze({
  async readMerchantSubscription({subscriptionId,merchantGeneration:requested}={}){
   if(!matchGen(requested)||!SUB.test(subscriptionId||''))
    throw Error('immutable_merchant_binding_unavailable')
   const token=await getToken(fetchImpl,clientId,clientSecret)
   const response=await fetchImpl(HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+token,Accept:'application/json'}
   })
   if(!response?.ok||response.status!==200)
    throw Error('live_subscription_read_unavailable')
   const d=await response.json()
   if(d?.id!==subscriptionId||d?.plan_id!==planId)
    throw Error('live_subscription_merchant_mismatch')
   return Object.freeze({id:d.id,plan_id:d.plan_id,
    custom_id:d.custom_id,status:d.status})
  },
  async cancelMerchantSubscription({subscriptionId,merchantGeneration:requested}={}){
   if(!matchGen(requested)||!SUB.test(subscriptionId||''))
    throw Error('immutable_merchant_binding_unavailable')
   const token=await getToken(fetchImpl,clientId,clientSecret)
   // Durable one-way claim is responsibility of the owner-scoped manager.
   const r=await fetchImpl(HOST+'/v1/billing/subscriptions/'+
    encodeURIComponent(subscriptionId)+'/cancel',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',
     Accept:'application/json'},body:JSON.stringify({
     reason:'Account holder requested cancellation of future renewals'
    })
   })
   return r?.ok===true&&r.status===204
  }
 })
}
