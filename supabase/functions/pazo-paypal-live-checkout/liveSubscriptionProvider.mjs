// PAZO F16 — PayPal LIVE subscription provider, ISOLATED AND UNRELEASED.
// Caller must first authorize the PAZO account/consent/merchant generation.
// This module NEVER derives paid service periods, grants badges or performs
// fallback between Sandbox and Live merchants.
const HOST='https://api-m.paypal.com'
const PLAN=/^P-[A-Z0-9]{12,40}$/
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const ascii=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&
 /^[\x21-\x7e]+$/.test(s)
export function publicBetaOrigin(value){
 if(typeof value!=='string'||value.length>250)return false
 try{
  const url=new URL(value)
  return value===url.origin&&url.protocol==='https:'&&url.hostname.includes('.')&&
   url.username===''&&url.password===''&&url.port===''&&
   url.pathname==='/'&&!url.search&&!url.hash&&
   !url.hostname.endsWith('.local')&&!url.hostname.endsWith('.localhost')
 }catch{return false}
}
export function validLiveApprovalUrl(value){
 if(typeof value!=='string'||value.length>2048)return false
 try{
  const url=new URL(value)
  return url.protocol==='https:'&&url.hostname==='www.paypal.com'&&
   url.username===''&&url.password===''&&url.port===''&&
   url.pathname==='/webapps/billing/subscriptions'&&
   Boolean(url.searchParams.get('ba_token'))&&url.hash===''&&
   url.searchParams.size===1
 }catch{return false}
}
async function apiJson(fetchImpl,path,options){
 const r=await fetchImpl(HOST+path,{
  ...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)
 })
 if(!r?.ok||![200,201].includes(r.status))throw Error('provider_response_unavailable')
 const ct=r.headers?.get?.('content-type')||'application/json'
 if(!/^application\/json(?:\s*;|$)/i.test(ct))throw Error('provider_response_unavailable')
 const s=await r.text()
 if(typeof s!=='string'||s.length>65536)throw Error('provider_response_unavailable')
 const parsed=JSON.parse(s)
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
  throw Error('provider_response_unavailable')
 return parsed
}
export function createPaypalLiveSubscriptionProvider({clientId,clientSecret,planId,
 origin,fetchImpl=fetch}={}){
 if(!ascii(clientId)||clientId.includes(':')||!ascii(clientSecret)||
   !PLAN.test(planId||'')||!publicBetaOrigin(origin)||
   typeof fetchImpl!=='function')throw Error('live_provider_configuration_unavailable')
 const auth=async()=>{
  const response=await apiJson(fetchImpl,'/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'content-type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials'
  })
  if(response.token_type?.toLowerCase()!=='bearer'||!ascii(response.access_token))
   throw Error('live_provider_oauth_unavailable')
  return response.access_token
 }
 const headers=token=>({Authorization:'Bearer '+token,Accept:'application/json'})
 const originalCreate=async({intentId,requestKey}={})=>{
  if(!INTENT.test(intentId||'')||!UUID.test(requestKey||''))
   throw Error('live_idempotent_intent_unverified')
  const token=await auth()
  return apiJson(fetchImpl,'/v1/billing/subscriptions',{
   method:'POST',headers:{...headers(token),'content-type':'application/json',
    'PayPal-Request-Id':requestKey},
   body:JSON.stringify({plan_id:planId,custom_id:intentId,
    application_context:{return_url:origin+'/paypal/return',
     cancel_url:origin+'/paypal/cancel',user_action:'SUBSCRIBE_NOW',
     shipping_preference:'NO_SHIPPING'}})
  })
 }
 const readDetail=async subscriptionId=>{
  if(!SUB.test(subscriptionId||''))throw Error('live_subscription_id_invalid')
  const token=await auth()
  return apiJson(fetchImpl,'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),{
   method:'GET',headers:headers(token)
  })
 }
 return Object.freeze({
  async createSubscription({intentId,requestKey}={}){
   const created=await originalCreate({intentId,requestKey})
   if(!SUB.test(created.id||'')||
      created.status!=='APPROVAL_PENDING'||
      !Array.isArray(created.links))
    throw Error('live_subscription_creation_unverified')
   const approval=created.links.filter(x=>x?.rel==='approve').map(x=>x.href)
   if(approval.length!==1||!validLiveApprovalUrl(approval[0]))
    throw Error('live_approval_url_untrusted')
   return Object.freeze({subscriptionId:created.id,status:created.status,
    approvalUrl:approval[0],entitlement:false})
  },
  async readSubscription(subscriptionId){
   const d=await readDetail(subscriptionId)
   if(d.id!==subscriptionId)return null
   return Object.freeze({id:d.id,plan_id:d.plan_id,custom_id:d.custom_id,
    status:d.status})
  },
  // Only the recovery coordinator may call this, after a durable original
  // request lease within 48h (inside PayPal's 72h idempotency retention).
  // The request body AND PayPal-Request-Id are identical to the first POST.
  // There is no automatic retry and this response is never payment proof.
  async recoverOriginalCreate({intentId,requestKey}={}){
   const d=await originalCreate({intentId,requestKey})
   if(!SUB.test(d.id||''))throw Error('live_recovery_response_unverified')
   return Object.freeze({subscriptionId:d.id})
  },
  async readCheckout(subscriptionId){
   const d=await readDetail(subscriptionId)
   if(d.id!==subscriptionId)return null
   const links=Array.isArray(d.links)?d.links.filter(x=>x?.rel==='approve'):[]
   const approvalUrl=links.length===1&&validLiveApprovalUrl(links[0]?.href)
    ?links[0].href:null
   return Object.freeze({id:d.id,plan_id:d.plan_id,custom_id:d.custom_id,
    status:d.status,approvalUrl})
  },
  // Caller MUST first durably claim the owner's cancellation in SQL.
  // POST can have succeeded even when the network response is lost, so this
  // method never retries. Caller must independently GET and reconcile.
  async cancelSubscription(subscriptionId){
   if(!SUB.test(subscriptionId||''))throw Error('live_subscription_id_invalid')
   const token=await auth()
   const response=await fetchImpl(HOST+'/v1/billing/subscriptions/'+
    encodeURIComponent(subscriptionId)+'/cancel',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(12000),
    headers:{...headers(token),'content-type':'application/json'},
    body:JSON.stringify({reason:'Customer requested cancellation of future renewals'})
   })
   if(response?.status!==204||!response.ok)
    throw Error('live_cancel_provider_unconfirmed')
   return Object.freeze({postAccepted:true,subscriptionId})
  }
 })
}
