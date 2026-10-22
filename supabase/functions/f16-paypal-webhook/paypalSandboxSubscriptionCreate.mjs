// PAZO F16: server-only PayPal Sandbox subscription creation.
// NO hosted deployment and NO actual PayPal calls during tests.
// A private intent must already exist and belong to a server-verified PAZO
// account; never accept purchaser names, amounts, custom_id or owner from UI.
const API='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const INTENT=/^intent-([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const SANDBOX_APPROVAL_HOST=new Set(['www.sandbox.paypal.com','sandbox.paypal.com'])
function approvalUrl(data){
 const links=Array.isArray(data?.links)?data.links:[]
 const link=links.find(v=>v?.rel==='approve'&&v?.method==='GET'&&typeof v?.href==='string')
 if(!link)throw Error('sandbox_approval_link_missing')
 let url
 try {url=new URL(link.href)} catch {throw Error('unsafe_approval_url')}
 if(url.protocol!=='https:'||!SANDBOX_APPROVAL_HOST.has(url.hostname)||
    url.username||url.password||url.port||url.hash||url.href!==link.href)
    throw Error('unsafe_approval_url')
 return link.href
}
function trustRedirect(url){
 if(typeof url!=='string')throw Error('redirect_not_configured')
 let parsed
 try {parsed=new URL(url)}catch{throw Error('redirect_not_configured')}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.hash||
    parsed.search||parsed.port||parsed.hostname==='localhost'||
    !parsed.hostname.includes('.')||parsed.href!==url)throw Error('redirect_not_configured')
 return url
}
export function createPaypalSandboxSubscriptionCreator({
 clientId,clientSecret,returnUrl,cancelUrl,fetchImpl=fetch,
}={}) {
 if(typeof clientId!=='string'||!/^[\x21-\x7e]{8,512}$/.test(clientId)||
    clientId.includes(':')||typeof clientSecret!=='string'||
    !/^[\x21-\x7e]{8,512}$/.test(clientSecret)||
    typeof fetchImpl!=='function')throw Error('sandbox_creator_not_configured')
 const approvedReturn=trustRedirect(returnUrl)
 const approvedCancel=trustRedirect(cancelUrl)
 if(new URL(approvedReturn).origin!==new URL(approvedCancel).origin)
   throw Error('redirect_origins_mismatch')
 return {
  async create({intent}={}){
   const match=INTENT.exec(intent?.id||'')
   if(!match || !UUID.test(intent?.ownerId||'')||
      intent?.provider!=='paypal'||intent?.planId!==PLAN||
      intent?.state!=='pending'||intent?.verifiedOwnerBinding!==true)
      throw Error('unverified_server_intent')
   async function call(url,options){
    const response=await fetchImpl(url,{
      ...options,redirect:'error',signal:AbortSignal.timeout(12000),
    })
    if(!response?.ok)throw Error('sandbox_provider_unavailable')
    const data=await response.json()
    if(!data||typeof data!=='object'||Array.isArray(data))
       throw Error('invalid_provider_response')
    return data
   }
   const oauth=await call(API+'/v1/oauth2/token',{
    method:'POST',headers:{
      Authorization:'Basic '+btoa(clientId+':'+clientSecret),
      'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json',
    },
    body:'grant_type=client_credentials',
   })
   if(oauth.token_type?.toLowerCase()!=='bearer'||
      typeof oauth.access_token!=='string'||!oauth.access_token)
       throw Error('sandbox_oauth_invalid')
   const result=await call(API+'/v1/billing/subscriptions',{
    method:'POST',headers:{
      Authorization:'Bearer '+oauth.access_token,
      'Content-Type':'application/json',Accept:'application/json',
      Prefer:'return=representation','PayPal-Request-Id':match[1],
    },
    body:JSON.stringify({
      plan_id:PLAN,custom_id:intent.id,
      application_context:{
        return_url:approvedReturn,cancel_url:approvedCancel,
        user_action:'SUBSCRIBE_NOW',
      },
    }),
   })
   if(!SUB.test(result.id||'')||result.plan_id!==undefined&&result.plan_id!==PLAN)
      throw Error('invalid_provider_subscription')
   if(result.custom_id!==undefined&&result.custom_id!==intent.id)
      throw Error('provider_custom_id_mismatch')
   if(!['APPROVAL_PENDING','CREATED','APPROVED'].includes(result.status))
      throw Error('unexpected_subscription_status')
   // An approval link is not a payment or entitlement.
   return Object.freeze({
     subscriptionId:result.id,status:result.status,
     approvalUrl:approvalUrl(result),entitlement:false,
   })
  },
 }
}
