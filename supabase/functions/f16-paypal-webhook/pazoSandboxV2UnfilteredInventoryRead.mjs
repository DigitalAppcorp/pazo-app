// PAZO F16 — independent, unfiltered merchant subscription inventory.
// This intentionally omits plan_ids/statuses so an APPROVAL_PENDING record
// excluded by a narrower list can still be found. A negative result NEVER
// proves noncollectibility, zero future charges, or permits checkout retries.
// Read-only PayPal OAuth token POST + merchant GET; no payer PII in result.
const HOST='https://api-m.sandbox.paypal.com'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const STATES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
const PER_PAGE=20,MAX_PAGES=25
const report=(code,other={})=>Object.freeze({
 environment:'sandbox',code,scope:'merchant_unfiltered',
 merchantInventoryEnumerated:false,mayRetry:false,
 mayRecordPayment:false,mayGrantBenefits:false,paidThrough:null,...other
})
const fail=code=>{throw Error(code)}
export function createPazoSandboxV2UnfilteredInventoryRead({
 clientId,clientSecret,fetchImpl=fetch
}={}){
 const valid=x=>typeof x==='string'&&x.length>=8&&x.length<=512&&
  /^[\x21-\x7e]+$/.test(x)
 if(!valid(clientId)||clientId.includes(':')||!valid(clientSecret)||
    typeof fetchImpl!=='function')fail('unfiltered_inventory_not_configured')
 const read=async(url,init,stage)=>{
  let response
  try{response=await fetchImpl(url,{
   ...init,redirect:'error',signal:AbortSignal.timeout(12000)})}
  catch{fail('unfiltered_inventory_network_unavailable')}
  if(!response?.ok){
   if(stage==='oauth'&&[401,403].includes(response?.status))
    fail('unfiltered_inventory_oauth_denied')
   if(response?.status===403)fail('unfiltered_inventory_access_denied')
   if(response?.status===401)fail('unfiltered_inventory_token_denied')
   if(response?.status===429)fail('unfiltered_inventory_rate_limited')
   if(response?.status===400)fail('unfiltered_inventory_request_rejected')
   fail('unfiltered_inventory_provider_unavailable')
  }
  let body
  try{body=await response.json()}catch{fail('unfiltered_inventory_invalid_response')}
  if(!body||typeof body!=='object'||Array.isArray(body))
   fail('unfiltered_inventory_invalid_response')
  return body
 }
 return Object.freeze({
  async inspect({subscriptionId,planId}={}){
   if(!SUB.test(subscriptionId||'')||planId!==PLAN)
    fail('unfiltered_inventory_binding_unverified')
   const auth=await read(HOST+'/v1/oauth2/token',{
    method:'POST',headers:{
     Authorization:'Basic '+btoa(clientId+':'+clientSecret),
     'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:'grant_type=client_credentials'
   },'oauth')
   if(auth.token_type?.toLowerCase()!=='bearer'||
      typeof auth.access_token!=='string'||!auth.access_token)
    fail('unfiltered_inventory_invalid_token')
   const headers={Authorization:'Bearer '+auth.access_token,Accept:'application/json'}
   let found=null,invalidRows=false,complete=false
   for(let page=1;page<=MAX_PAGES;page++){
    // Deliberately NO plan_ids, statuses or buyer-specific filters.
    const query=new URLSearchParams({page_size:String(PER_PAGE),page:String(page)})
    const result=await read(HOST+'/v1/billing/subscriptions?'+query,{
     method:'GET',headers},'inventory')
    if(!Array.isArray(result.subscriptions)||
       result.subscriptions.length>PER_PAGE)
     return report('unfiltered_inventory_collection_unverified')
    if(result.links!==undefined&&
       (!Array.isArray(result.links)||result.links.some(x=>
         !x||typeof x!=='object'||typeof x.rel!=='string')))
     return report('unfiltered_inventory_pagination_unverified')
    if(result.total_pages!==undefined&&
       (!Number.isInteger(result.total_pages)||
        result.total_pages<1||result.total_pages<page))
     return report('unfiltered_inventory_pagination_unverified')
    const rows=result.subscriptions
    for(const row of rows){
     if(!row||typeof row!=='object'||Array.isArray(row)||
       !SUB.test(row.id||'')){invalidRows=true;continue}
     if(row.id!==subscriptionId)continue
     if(found!==null)return report('unfiltered_inventory_duplicate_original')
     if(!STATES.has(row.status)||row.plan_id!==PLAN)
      return report('unfiltered_inventory_original_details_unverified')
     found=row.status
    }
    const hasNext=result.links?.some(x=>x.rel==='next')===true
    if(Number.isInteger(result.total_pages)&&(
      (hasNext&&result.total_pages===page)||
      (!hasNext&&result.total_pages>page&&rows.length<PER_PAGE)))
     return report('unfiltered_inventory_pagination_unverified')
    if(!hasNext&&rows.length<PER_PAGE){complete=true;break}
    if(!hasNext&&Number.isInteger(result.total_pages)&&
      result.total_pages===page){complete=true;break}
    if(!hasNext&&rows.length===PER_PAGE&&result.total_pages===undefined)
     continue
   }
   if(found!==null)return report('unfiltered_inventory_original_found',{
    providerStatus:found,merchantInventoryEnumerated:complete&&!invalidRows
   })
   if(invalidRows)return report('unfiltered_inventory_rows_unverified')
   if(!complete)return report('unfiltered_inventory_pagination_incomplete')
   // Even a complete unfiltered snapshot is only a snapshot, NOT terminal proof.
   return report('unfiltered_inventory_original_absent',{
    merchantInventoryEnumerated:true
   })
  }
 })
}
