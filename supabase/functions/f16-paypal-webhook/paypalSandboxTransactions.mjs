// F16 server-only read adapter for existing PayPal Sandbox subscriptions.
// Does not create payments or subscriptions, persist state, log PII or grant access.
const HOST='https://api-m.sandbox.paypal.com'
const SUBSCRIPTION_REF=/^I-[A-Za-z0-9_-]{3,70}$/
const PAYMENT_REF=/^[A-Za-z0-9._-]{3,128}$/
// A merchant GET can expose an existing buyer-approval link. Never derive a
// ba_token or create a second subscription for an abandoned checkout.
const APPROVAL_HOSTS=new Set(['sandbox.paypal.com','www.sandbox.paypal.com'])
function pendingApprovalLink(subscription) {
  if(subscription.status!=='APPROVAL_PENDING')return null
  const links=subscription.links
  if(links===undefined)return null
  if(!Array.isArray(links)||links.length>10)throw Error('untrusted_subscription_links')
  const approve=links.filter(x=>x?.rel==='approve')
  if(approve.length===0)return null
  if(approve.length!==1||approve[0].method!=='GET'||
     typeof approve[0].href!=='string'||approve[0].href.length>2048)
    throw Error('untrusted_subscription_approval')
  const raw=approve[0].href
  let u
  try{u=new URL(raw)}catch{throw Error('untrusted_subscription_approval')}
  if(u.protocol!=='https:'||!APPROVAL_HOSTS.has(u.hostname)||
    u.username||u.password||u.port||u.hash||u.toString()!==raw||
    !u.pathname.startsWith('/webapps/billing/subscriptions')||
    !/^BA-[A-Za-z0-9_-]{6,128}$/.test(u.searchParams.get('ba_token')||'')||
    [...u.searchParams.keys()].some(key=>key!=='ba_token'))
    throw Error('untrusted_subscription_approval')
  return raw
}
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
    // This read is separately usable to verify Auth-owned subscription binding
    // BEFORE any paid transaction or entitlement is considered.
    async readSubscription(subscriptionId,{includeApprovalLink=false}={}){
      if(typeof subscriptionId!=='string' || !SUBSCRIPTION_REF.test(subscriptionId))
        throw Error('invalid_subscription_id')
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
      const subscription=await readJson(fetchImpl,
        HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),{
          method:'GET',
          headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json'},
        })
      if(subscription.id!==subscriptionId) throw Error('subscription_response_mismatch')
      // No subscriber PII or token logging. Approval URL is returned only
      // on a deliberate owner-authenticated recovery call, never normal reads.
      return Object.freeze({
        id:subscription.id,plan_id:subscription.plan_id,
        custom_id:subscription.custom_id,status:subscription.status,
        ...(includeApprovalLink===true
          ? (()=>{
              // An invalid/missing merchant link MUST NOT erase a separately
              // verified status. Never forward suspicious link bytes to UI.
              try {
                const approvalUrl=pendingApprovalLink(subscription)
                return {approvalUrl,approvalLinkState:
                  approvalUrl?'available':'missing'}
              }catch{
                return {approvalUrl:null,approvalLinkState:'rejected'}
              }
            })()
          : {}),
      })
    },
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
      // PayPal may omit total_pages/total_items. Never infer global
      // financial coverage from a single response or from missing totals.
      // A next-page link is an explicit indication that this read is partial.
      if(!Array.isArray(list.transactions) || list.transactions.length>500 ||
        (list.total_pages!==undefined &&
          (!Number.isInteger(list.total_pages) || list.total_pages<0)) ||
        (list.total_items!==undefined &&
          (!Number.isInteger(list.total_items) || list.total_items<0)) ||
        (list.links!==undefined && (!Array.isArray(list.links) ||
          list.links.some(link=>!link || typeof link!=='object' ||
            typeof link.rel!=='string'))) ||
        list.links?.some(link=>link.rel.toLowerCase()==='next') ||
        (list.total_pages!==undefined && list.total_pages!==1 &&
          !(list.total_pages===0 && list.transactions.length===0 &&
            (list.total_items===undefined || list.total_items===0))) ||
        (list.total_items!==undefined &&
          list.total_items!==list.transactions.length))
        throw Error('incomplete_transaction_history')
      // PayPal documents these totals as OPTIONAL. Absent totals are not an
      // error, but they cannot establish an exhaustive transaction history.
      const paginationMetadataComplete=
        list.total_pages!==undefined && list.total_items!==undefined
      const paginationEvidence=paginationMetadataComplete
        ? 'single_page_totals_consistent'
        : 'provider_totals_absent_review_required'
      // Provider statements must never contain conflicting or ambiguous IDs.
      // Dropping a duplicate silently could make a sale appear valid.
      const ids=list.transactions.map(tx=>tx?.id)
      if(ids.some(id=>typeof id!=='string'||!PAYMENT_REF.test(id)) ||
         new Set(ids).size!==ids.length)
        throw Error('ambiguous_transaction_history')
      // Restrict the output. Provider response may have payer email and links.
      return {
        lookupSubscriptionId:subscriptionId,
        merchantScopedByPayPalApi:true, // evidence of successful merchant-app scoped reads, NOT paid-period proof
        paginationMetadataComplete,
        paginationEvidence,
        requiresIndependentHistoryCoverage:!paginationMetadataComplete,
        globalFinancialCoverage:false,
        mayGrantBenefits:false,
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
