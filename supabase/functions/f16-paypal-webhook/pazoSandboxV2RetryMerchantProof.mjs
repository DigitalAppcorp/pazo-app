// PAZO F16: PayPal Sandbox *only* terminal/orphan retry evidence.
// A browser leaving checkout is NEVER proof. Only an owner-bound account
// and verified provider events, complete listings, and zero transactions
// can produce evidence. The caller MUST also use the atomic SQL owner gate.
// No merchant secrets or buyer PII leave this module.
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const ID=/^I-[A-Za-z0-9_-]{3,70}$/
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const goodSecret=x=>typeof x==='string'&&/^[\x21-\x7e]{8,512}$/.test(x)
const fail=()=>{throw Error('retry_merchant_proof_unavailable')}
const SAFE_STATUS=new Set(['CANCELLED','EXPIRED'])
const EVENT_TYPES=new Set(['BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.CANCELLED',
 'BILLING.SUBSCRIPTION.EXPIRED'])
export function createPazoSandboxV2RetryMerchantProof({
 clientId,clientSecret,fetchImpl=fetch,inventoryRead,createdCandidateStore,
 createdEventAudit,now=Date.now
}={}){
 if(!goodSecret(clientId)||clientId.includes(':')||!goodSecret(clientSecret)||
  typeof fetchImpl!=='function'||typeof now!=='function'||
  typeof inventoryRead?.inspect!=='function'||
  typeof createdCandidateStore?.readForOwner!=='function'||
  typeof createdEventAudit?.inspect!=='function')fail()
 async function req(url,init={}){
  let r
  try{r=await fetchImpl(url,{...init,redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(12000)})}catch{fail()}
  return r
 }
 async function json(url,init={}){
  const r=await req(url,init)
  if(!r?.ok)fail()
  let x
  try{x=await r.json()}catch{fail()}
  if(!x||typeof x!=='object'||Array.isArray(x))fail()
  return x
 }
 async function auth(){
  const a=await json(HOST+'/v1/oauth2/token',{method:'POST',headers:{
   Authorization:'Basic '+btoa(clientId+':'+clientSecret),
   'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'
  },body:'grant_type=client_credentials'})
  if(a.token_type?.toLowerCase()!=='bearer'||!goodSecret(a.access_token))fail()
  return {Authorization:'Bearer '+a.access_token,Accept:'application/json'}
 }
 async function status(subscriptionId,intentId,headers){
  const r=await req(HOST+'/v1/billing/subscriptions/'+subscriptionId,
   {method:'GET',headers})
  if(r?.status===404)return 'MERCHANT_CONFIRMED_ABSENT_CANDIDATE'
  if(!r?.ok)fail()
  let x
  try{x=await r.json()}catch{fail()}
  if(x?.id!==subscriptionId||x.plan_id!==PLAN||x.custom_id!==intentId||
     typeof x.status!=='string')fail()
  if(!SAFE_STATUS.has(x.status))fail()
  return x.status
 }
 async function events(subscriptionId,intentId,created,checkedAt,headers){
  // Must see original creation and exhaust PayPal's event pagination.
  // Unknown financial events without owner association block the retry.
  const start=new Date(created-3600000).toISOString()
  const end=new Date(checkedAt).toISOString()
  let url=HOST+'/v1/notifications/webhooks-events?'+
    new URLSearchParams({start_time:start,end_time:end,page_size:'20'})
  let createdSeen=false,financial=false,rows=0
  const visited=new Set()
  for(let page=0;page<20;page++){
   if(visited.has(url))fail()
   visited.add(url)
   const x=await json(url,{method:'GET',headers})
   if(!Array.isArray(x.events)||x.events.length>20||
      !Array.isArray(x.links)||x.links.length>8)fail()
   for(const event of x.events){
    if(!event||typeof event!=='object'||
      typeof event.id!=='string'||!event.id||
      typeof event.event_type!=='string'||!event.event_type||
      !event.resource||typeof event.resource!=='object')fail()
    rows++
    if(rows>400)fail()
    const resource=event.resource
    const subId=event.event_type.startsWith('BILLING.SUBSCRIPTION.')
     ? resource.id
     : event.event_type.startsWith('PAYMENT.') ?
        (resource.billing_agreement_id??resource.subscription_id) : null
    if(event.event_type.startsWith('PAYMENT.')&&typeof subId!=='string')
      fail() // Cannot certify that this financial event belongs elsewhere.
    if(subId!==subscriptionId)continue
    if(event.event_type==='BILLING.SUBSCRIPTION.CREATED'){
     if(resource.custom_id!==undefined&&resource.custom_id!==intentId)fail()
     createdSeen=true
    }
    if(!EVENT_TYPES.has(event.event_type))financial=true
   }
   const next=x.links.filter(y=>y?.rel==='next')
   if(next.length>1)fail()
   if(next.length===0){
    if(!createdSeen||financial)fail()
    return {eventCount:rows,createdSeen:true}
   }
   const nextUrl=next[0]?.href
   if(typeof nextUrl!=='string')fail()
   let u
   try{u=new URL(nextUrl)}catch{fail()}
   if(u.origin!==HOST||u.pathname!=='/v1/notifications/webhooks-events'||
      u.username||u.password||u.hash||u.port)fail()
   url=u.toString()
  }
  fail()
 }
 async function noTransactions(subscriptionId,created,checkedAt,headers){
  const start=new Date(created-3600000).toISOString()
  const end=new Date(checkedAt).toISOString()
  // PayPal supports bounded transaction windows. Old/ambiguous windows
  // are blocked instead of assuming absence across an incomplete range.
  if(checkedAt-created>30*86400000)fail()
  const url=HOST+'/v1/billing/subscriptions/'+subscriptionId+'/transactions?'+
   new URLSearchParams({start_time:start,end_time:end})
  const x=await json(url,{method:'GET',headers})
  if(!Array.isArray(x.transactions)||x.transactions.length!==0||
     x.total_items!==undefined&&x.total_items!==0||
     x.total_pages!==undefined&&x.total_pages>1||
     x.links!==undefined&&(!Array.isArray(x.links)||
      x.links.some(y=>y?.rel==='next')))fail()
 }
 return Object.freeze({
  async verify({ownerId,intentId,subscriptionId,consentedAt}={}){
   if(typeof ownerId!=='string'||!INTENT.test(intentId||'')||
      !ID.test(subscriptionId||'')||typeof consentedAt!=='string')fail()
   const created=Date.parse(consentedAt),checkedAt=now()
   if(!Number.isFinite(created)||!Number.isFinite(checkedAt)||
      checkedAt-created<60000||checkedAt-created>30*86400000)fail()
   // The signed, held CREATED inbox event must independently match the
   // exact subscription under the same current merchant app credentials.
   const candidate=await createdCandidateStore.readForOwner({ownerId,intentId})
   if(!candidate)fail()
   const signed=await createdEventAudit.inspect({
    eventId:candidate.eventId,eventType:candidate.eventType,
    subscriptionId,intentId,planId:PLAN})
   if(signed?.correlated!==true)fail()
   const headers=await auth()
   const first=await status(subscriptionId,intentId,headers)
   if(first==='MERCHANT_CONFIRMED_ABSENT_CANDIDATE'){
    const inventory=await inventoryRead.inspect({subscriptionId,planId:PLAN})
    if(inventory?.code!=='original_not_in_current_merchant_inventory'||
       inventory.merchantInventoryEnumerated!==true)fail()
   }else{
    await noTransactions(subscriptionId,created,checkedAt,headers)
   }
   const listed=await events(subscriptionId,intentId,created,checkedAt,headers)
   const second=await status(subscriptionId,intentId,headers)
   if(second!==first)fail()
   const resolution=first==='MERCHANT_CONFIRMED_ABSENT_CANDIDATE'
    ?'MERCHANT_CONFIRMED_ABSENT':first
   const digestBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(
    ['pazo-v2-sandbox-retry-evidence-v1',ownerId,intentId,subscriptionId,
     resolution,candidate.eventId,listed.eventCount,String(checkedAt)].join('|')))
   const digest=Array.from(new Uint8Array(digestBytes),x=>x.toString(16).padStart(2,'0')).join('')
   return Object.freeze({resolution,evidenceDigest:digest,
    checkedAt:new Date(checkedAt).toISOString()})
  }
 })
}
