// F16 server-only read adapter for existing PayPal Sandbox subscriptions.
// Does not create payments or subscriptions, persist state, log PII or grant access.
const HOST='https://api-m.sandbox.paypal.com'
const SUBSCRIPTION_REF=/^[A-Za-z0-9_-]{3,50}$/
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/
function canonicalUtc(s){
  if(typeof s!=='string' || !UTC.test(s)) return null
  const n=Date.parse(s)
  if(!Number.isFinite(n) || new Date(n).toISOString()!==s.replace(/Z$/,'.000Z'))
    return null
  return n
}
async function readJson(fetchImpl,url,options){
  const r=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)})
  if(!r?.ok) throw Error('sandbox_api_unavailable')
  const body=await r.json()
  if(!body || typeof body!=='object' || Array.isArray(body)) throw Error('malformed_sandbox_response')
  return body
}
export function createPaypalSandboxSubscriptionReader({clientId,clientSecret,fetchImpl=fetch}={}){
  if(typeof clientId!=='string' || !/^[\x21-\x7e]{8,512}$/.test(clientId) ||
     clientId.includes(':') || typeof clientSecret!=='string' ||
     !/^[\x21-\x7e]{8,512}$/.test(clientSecret) || typeof fetchImpl!=='function')
    throw Error('sandbox_reader_not_configured')
  return {
    async read({subscriptionId,startTime,endTime}={}){
      if(typeof subscriptionId!=='string' || !SUBSCRIPTION_REF.test(subscriptionId))
        throw Error('invalid_subscription_id')
      const start=canonicalUtc(startTime),end=canonicalUtc(endTime)
      if(start===null || end===null || start>=end || end-start>31*24*60*60*1000)
        throw Error('invalid_transaction_window')
      const token=await readJson(fetchImpl,HOST+'/v1/oauth2/token',{
        method:'POST',headers:{
          Authorization:'Basic '+btoa(clientId+':'+clientSecret),
          'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json',
        },
        body:'grant_type=client_credentials',
      })
      if(token.token_type?.toLowerCase()!=='bearer' ||
         typeof token.access_token!=='string' || !token.access_token)
        throw Error('sandbox_oauth_invalid')
      const headers={Authorization:'Bearer '+token.access_token,Accept:'application/json'}
      const endpoint=HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)
      const subscription=await readJson(fetchImpl,endpoint,{method:'GET',headers})
      if(subscription.id!==subscriptionId) throw Error('subscription_response_mismatch')
      const params=new URLSearchParams({start_time:startTime,end_time:endTime})
      const list=await readJson(fetchImpl,endpoint+'/transactions?'+params,{
        method:'GET',headers,
      })
      // Do not trust a partial page as a complete statement of payment/reversal.
      if(!Array.isArray(list.transactions) ||
        (list.total_pages!==undefined && list.total_pages!==1 &&
          !(list.total_pages===0 && list.transactions.length===0)) ||
        (list.total_items!==undefined && list.total_items!==list.transactions.length) ||
        list.transactions.length>500) throw Error('incomplete_transaction_history')
      // Restrict the output. Provider response may have payer email and links.
      return {
        lookupSubscriptionId:subscriptionId,
        merchantScopedByPayPalApi:true, // evidence of successful merchant-app scoped reads, NOT paid-period proof
        subscription:{id:subscription.id,plan_id:subscription.plan_id,
          custom_id:subscription.custom_id,status:subscription.status},
        transactions:list.transactions.map(tx=>({
          id:tx?.id,status:tx?.status,time:tx?.time,
          amount_with_breakdown:{gross_amount:{
            currency_code:tx?.amount_with_breakdown?.gross_amount?.currency_code,
            value:tx?.amount_with_breakdown?.gross_amount?.value,
          }},
        })),
      }
    },
  }
}
