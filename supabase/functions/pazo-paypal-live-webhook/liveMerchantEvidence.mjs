// PAZO F16: merchant-pinned PayPal LIVE payment evidence reader.
// Unreleased. Called ONLY after a trusted server resolves immutable merchant
// generation and account binding, and AFTER cryptographic webhook verification.
// GET provider facts; NEVER derives paidThrough, grants benefits, or writes DB.
const HOST='https://api-m.paypal.com'
const PLAN=/^P-[A-Z0-9]{12,40}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ASCII=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&/^[\x21-\x7e]+$/.test(s)
const MAX_RESPONSE=65536
const NO='live_provider_evidence_unavailable'
const date=(d)=>typeof d==='string'&&Number.isFinite(Date.parse(d))&&
 new Date(d).toISOString()===d
function fail(){throw Error(NO)}
async function json(fetchImpl,url,options){
 let response
 try{response=await fetchImpl(url,{...options,redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(12000)})}catch{fail()}
 if(!response?.ok||response.status!==200)fail()
 const ct=response.headers?.get?.('content-type')
 if(typeof ct!=='string'||!/^application\/json(?:\s*;|$)/i.test(ct))fail()
 let body
 try{body=await response.text()}catch{fail()}
 if(typeof body!=='string'||body.length>MAX_RESPONSE)fail()
 let d
 try{d=JSON.parse(body)}catch{fail()}
 if(!d||Array.isArray(d)||typeof d!=='object')fail()
 return d
}
export function createPaypalLiveMerchantEvidenceReader({
 merchantGeneration,planId,clientId,clientSecret,fetchImpl=fetch
}={}){
 if(!Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
  !PLAN.test(planId||'')||!ASCII(clientId)||clientId.includes(':')||
  !ASCII(clientSecret)||typeof fetchImpl!=='function')
  throw Error('live_merchant_generation_not_configured')
 async function token(){
  // PayPal requires OAuth POST; no checkout/mutating provider endpoints invoked.
  const raw=await json(fetchImpl,HOST+'/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials'
  })
  if(raw.token_type?.toLowerCase()!=='bearer'||!ASCII(raw.access_token))fail()
  return raw.access_token
 }
 const auth=t=>({Authorization:'Bearer '+t,Accept:'application/json'})
 async function subscription(subscriptionId,intentId){
  if(!SUB.test(subscriptionId||'')||!INTENT.test(intentId||''))fail()
  const t=await token()
  const d=await json(fetchImpl,HOST+'/v1/billing/subscriptions/'+
   encodeURIComponent(subscriptionId),{method:'GET',headers:auth(t)})
  if(d.id!==subscriptionId||d.plan_id!==planId||
   d.custom_id!==intentId||!['APPROVAL_PENDING','APPROVED','ACTIVE',
    'SUSPENDED','CANCELLED','EXPIRED'].includes(d.status))fail()
  return Object.freeze({id:d.id,plan_id:d.plan_id,custom_id:d.custom_id,
   status:d.status,merchantGeneration,sourceEnvironment:'live'})
 }
 return Object.freeze({
  async readVerifiedSubscription({subscriptionId,intentId,expectedGeneration}={}){
   if(expectedGeneration!==merchantGeneration)fail()
   return subscription(subscriptionId,intentId)
  },
  async readCompletedSale({subscriptionId,intentId,saleId,expectedGeneration,
   startTime,endTime}={}){
   if(expectedGeneration!==merchantGeneration||!SALE.test(saleId||'')||
    !date(startTime)||!date(endTime)||Date.parse(endTime)<=Date.parse(startTime)||
    Date.parse(endTime)-Date.parse(startTime)>31*86400000)fail()
   // Exact subscription owner/plan/provider link established independently
   // before reading merchant's transactions. Do NOT infer from webhook custom_id.
   await subscription(subscriptionId,intentId)
   const t=await token()
   const path='/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)+
    '/transactions?start_time='+encodeURIComponent(startTime)+
    '&end_time='+encodeURIComponent(endTime)
   const d=await json(fetchImpl,HOST+path,{method:'GET',headers:auth(t)})
   if(!Array.isArray(d.transactions)||d.transactions.length>500||
    !Number.isSafeInteger(d.total_pages)||d.total_pages!==1||
    !Number.isSafeInteger(d.total_items)||d.total_items!==d.transactions.length)
    fail() // Never rely on partial/unread pages to grant a paid period.
   const matching=d.transactions.filter(x=>x?.id===saleId)
   if(matching.length!==1)fail()
   const x=matching[0]
   if(x.status!=='COMPLETED'||x.amount_with_breakdown?.gross_amount?.currency_code!=='USD'||
    x.amount_with_breakdown?.gross_amount?.value!=='2.99'||!date(x.time)||
    Date.parse(x.time)<Date.parse(startTime)||
    Date.parse(x.time)>Date.parse(endTime))fail()
   // Deliberately discard payer names, email, card details, tokens, links.
   // A service period must be derived from separately verified billing-cycle
   // evidence, NOT automatically from transaction time or ACTIVE status.
   return Object.freeze({verified:true,sourceEnvironment:'live',
    merchantGeneration,subscriptionId,intentId,saleId,
    amountMinor:299,currency:'USD',paidAt:x.time,
    servicePeriodVerified:false,paidThrough:null,mayGrantBenefits:false})
  }
 })
}
