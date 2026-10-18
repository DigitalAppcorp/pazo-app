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
   if(r?.status===401||r?.status===403)error('inventory_merchant_scope_unavailable')
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
   for(let page=1;page<=MAX_PAGES;page++){
    const params=new URLSearchParams({plan_ids:PLAN,page_size:String(PER_PAGE),page:String(page)})
    const response=await api(HOST+'/v1/billing/subscriptions?'+params,{method:'GET',headers},'inventory')
    if(!Array.isArray(response.subscriptions)||response.subscriptions.length>PER_PAGE)
      error('inventory_malformed')
    const rows=response.subscriptions
    for(const row of rows){
     if(!row||!SUB.test(row.id||'')||row.plan_id!==PLAN||!STATES.has(row.status))
       error('inventory_malformed')
     if(row.id===subscriptionId)found.push(row.status)
    }
    if(response.links!==undefined&&(!Array.isArray(response.links)||
       response.links.some(x=>!x||typeof x.rel!=='string')))error('inventory_malformed')
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
   if(!fullyEnumerated)return report('merchant_inventory_pagination_incomplete')
   if(found.length===1)return report('original_merchant_resource_found',{
     providerStatus:found[0],merchantInventoryEnumerated:true
   })
   // Absence in one credential's merchant inventory CANNOT prove noncollectibility
   // in a different app/merchant, or exclude delayed payments.
   return report('original_not_in_current_merchant_inventory',{
    merchantInventoryEnumerated:true
   })
  }
 })
}
