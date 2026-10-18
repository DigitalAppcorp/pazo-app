// PAZO F16: merchant-wide subscription inventory; read-only Sandbox diagnostic.
// No retry grants, PayPal mutations, buyer PII, credentials, IDs or raw errors in output.
const HOST='https://api-m.sandbox.paypal.com'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const STATES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
const PER_PAGE=20
const MAX_PAGES=25
const report=(code,fields={})=>Object.freeze({
 environment:'sandbox',code,mayRetry:false,mayRecordPayment:false,
 mayGrantBenefits:false,...fields
})
function error(code){throw Error(code)}
export function createPazoSandboxV2InventoryRead({clientId,clientSecret,fetchImpl=fetch}={}){
 const valid=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&
  /^[\x21-\x7e]+$/.test(s)
 if(!valid(clientId)||clientId.includes(':')||!valid(clientSecret)||
  typeof fetchImpl!=='function')error('inventory_not_configured')
 async function api(url,init,stage){
  let r
  try{r=await fetchImpl(url,{...init,redirect:'error',signal:AbortSignal.timeout(12000)})}
  catch{error('inventory_network_unavailable')}
  if(!r?.ok){
   // Fixed diagnostic categories only. Never forward merchant payload, URI,
   // credentials, PayPal debug identifiers or error messages to a browser.
   if(stage==='oauth'&&(r?.status===401||r?.status===403))
    error('inventory_oauth_denied')
   if(r?.status===401)error('inventory_token_denied')
   if(r?.status===403)error('inventory_merchant_scope_unavailable')
   if(r?.status===400)error('inventory_request_rejected')
   if(r?.status===404)error('inventory_endpoint_unavailable')
   if(r?.status===429)error('inventory_rate_limited')
   error('inventory_provider_unavailable')
  }
  let x
  try{x=await r.json()}catch{error('inventory_malformed')}
  if(!x||typeof x!=='object'||Array.isArray(x))error('inventory_malformed')
  return x
 }
 return Object.freeze({
  async inspect({subscriptionId,planId}={}){
   if(!SUB.test(subscriptionId||'')||planId!==PLAN)
    error('inventory_binding_unverified')
   const t=await api(HOST+'/v1/oauth2/token',{
    method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
     'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:'grant_type=client_credentials'
   },'oauth')
   if(t.token_type?.toLowerCase()!=='bearer'||typeof t.access_token!=='string'||
     !t.access_token)error('inventory_oauth_invalid')
   const headers={Authorization:'Bearer '+t.access_token,Accept:'application/json'}
   const found=[]
   let fullyEnumerated=false
   let allRowsVerified=true
   for(let page=1;page<=MAX_PAGES;page++){
    const params=new URLSearchParams({plan_ids:PLAN,page_size:String(PER_PAGE),page:String(page)})
    const response=await api(HOST+'/v1/billing/subscriptions?'+params,{method:'GET',headers},'inventory')
    // A successful HTTP status alone cannot prove the merchant returned a
    // complete subscription collection. Never coerce an absent list to [].
    if(!Array.isArray(response.subscriptions))
      return report('merchant_inventory_collection_unverified')
    if(response.subscriptions.length>PER_PAGE)
      return report('merchant_inventory_page_unverified')
    const rows=response.subscriptions
    for(const row of rows){
     // PayPal may omit optional fields or include unexpected list records.
     // Unrelated/partial rows must NOT hide a fully verified exact match,
     // and must NEVER be treated as evidence that the target is absent.
     if(!row||typeof row!=='object'||Array.isArray(row)||!SUB.test(row.id||'')){
      allRowsVerified=false;continue
     }
     if(row.id===subscriptionId){
      if(row.plan_id!==PLAN||!STATES.has(row.status))
       return report('original_merchant_details_unverified')
      found.push(row.status)
     }else if(row.plan_id!==PLAN||!STATES.has(row.status)){
      allRowsVerified=false
     }
    }
    if(response.links!==undefined&&(!Array.isArray(response.links)||
       response.links.some(x=>!x||typeof x.rel!=='string')))
      return report('merchant_inventory_pagination_unverified')
    const hasNext=response.links?.some(x=>x.rel==='next')===true
    if(!hasNext&&rows.length<PER_PAGE){fullyEnumerated=true;break}
    if(!hasNext&&response.total_pages!==undefined&&
       Number.isInteger(response.total_pages)&&response.total_pages===page){
      fullyEnumerated=true;break
    }
    if(!hasNext&&rows.length===PER_PAGE&&response.total_pages===undefined){
     // Request subsequent page; do not infer coverage from a full final page.
     continue
    }
    if(!hasNext&&rows.length===0){fullyEnumerated=true;break}
   }
   if(found.length>1)return report('duplicate_original_in_inventory')
   if(found.length===1)return report('original_merchant_resource_found',{
     providerStatus:found[0],merchantInventoryEnumerated:fullyEnumerated&&allRowsVerified
   })
   if(!allRowsVerified)return report('merchant_inventory_rows_unverified')
   if(!fullyEnumerated)return report('merchant_inventory_pagination_incomplete')
   // Absence in one credential's merchant inventory CANNOT prove noncollectibility
   // in a different app/merchant, or exclude delayed payments.
   return report('original_not_in_current_merchant_inventory',{
    merchantInventoryEnumerated:true
   })
  }
 })
}
