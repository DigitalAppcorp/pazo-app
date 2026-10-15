// PAZO F16-P09 — bounded PayPal Sandbox orphan-subscription probe (UNDEPLOYED).
// Authenticated read-only recovery: cannot bind, credit, cancel or create.
// PayPal list API has NO documented custom_id query filter; inspect limited
// merchant plan/time results via authenticated GET detail, strip all PII.
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const STATUSES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','CANCELLED','SUSPENDED','EXPIRED'])
const MAX=10
const response=(phase,extra={})=>Object.freeze({
 phase,environment:'sandbox',paidThrough:null,mayRecordPayment:false,
 mayGrantBenefits:false,mayCreateSubscription:false,mayBindSubscription:false,
 mayEnableLive:false,mayResubscribe:false,...extra,
})
const denied=reason=>response('BLOCKED',{reason})
const secret=x=>typeof x==='string'&&/^[\x21-\x7e]{8,512}$/.test(x)
const isoTime=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(t)

export function createPazoSandboxOrphanMerchantReader({
 clientId,clientSecret,fetchImpl=fetch,
}={}){
 if(!secret(clientId)||clientId.includes(':')||!secret(clientSecret)||
    typeof fetchImpl!=='function')throw Error('orphan_reader_not_configured')
 async function request(url,init){
  let res
  try{res=await fetchImpl(url,{...init,redirect:'error',
    signal:AbortSignal.timeout(12000)})}catch{throw Error('orphan_merchant_unavailable')}
  if(!res?.ok)throw Error('orphan_merchant_unavailable')
  try{
   const value=await res.json()
   if(!value||typeof value!=='object'||Array.isArray(value))
    throw Error('orphan_provider_malformed')
   return value
  }catch{throw Error('orphan_provider_malformed')}
 }
 async function scan({intentId,claimedAt}={},privateCandidate=false){
   if(!INTENT.test(intentId||'')||!isoTime(claimedAt))
    throw Error('orphan_probe_scope_invalid')
   const time=Date.parse(claimedAt)
   // Tight merchant filter; not an absence/complete-history attestation.
   const after=new Date(time-60_000).toISOString()
   const before=new Date(time+10*60_000).toISOString()
   const auth=await request(HOST+'/v1/oauth2/token',{
    method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
     'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:'grant_type=client_credentials',
   })
   if(auth.token_type?.toLowerCase()!=='bearer'||!secret(auth.access_token))
    throw Error('orphan_oauth_invalid')
   const headers={Authorization:'Bearer '+auth.access_token,Accept:'application/json'}
   const search=new URLSearchParams({
    plan_ids:PLAN,created_after:after,created_before:before,
    page_size:String(MAX),page:'1',
   })
   const listing=await request(HOST+'/v1/billing/subscriptions?'+search,{
    method:'GET',headers,
   })
   if(!Array.isArray(listing.subscriptions)||listing.subscriptions.length>=MAX||
      (listing.links!==undefined&&(!Array.isArray(listing.links)||
       listing.links.some(l=>!l||typeof l.rel!=='string'))))
    return Object.freeze({outcome:'INCOMPLETE_MERCHANT_SCAN'})
   if(listing.links?.some(l=>l.rel.toLowerCase()==='next'))
    return Object.freeze({outcome:'INCOMPLETE_MERCHANT_SCAN'})
   const ids=listing.subscriptions.map(s=>s?.id)
   if(ids.some(id=>typeof id!=='string'||!SUB.test(id))||
      new Set(ids).size!==ids.length)
    return Object.freeze({outcome:'AMBIGUOUS_MERCHANT_LIST'})
   let matches=0
   let matched=null
   for(const id of ids){
    // Strictly bounded GET requests; no email/payer/links leave this function.
    const row=await request(HOST+'/v1/billing/subscriptions/'+encodeURIComponent(id),{
     method:'GET',headers,
    })
    if(row.id!==id||!SUB.test(row.id)||typeof row.plan_id!=='string'||
       typeof row.custom_id!=='string'||!STATUSES.has(row.status))
     return Object.freeze({outcome:'MERCHANT_DETAILS_INCOMPLETE'})
    if(row.plan_id!==PLAN)return Object.freeze({outcome:'MERCHANT_PLAN_MISMATCH'})
    if(row.custom_id===intentId){matches++;matched={id,status:row.status}}
    if(matches>1)return Object.freeze({outcome:'DUPLICATE_MATCHING_INTENTS'})
   }
   // Do not report zero results as proof of absence: delayed indexing,
   // PayPal paging semantics and wider merchant history remain unproven.
   if(privateCandidate&&matches===1){
    if(matched.status!=='APPROVAL_PENDING')
     return Object.freeze({outcome:'MERCHANT_STATUS_REVIEW_REQUIRED'})
    // INTERNAL ONLY. Never expose subscriptionId from a public-facing route.
    return Object.freeze({outcome:'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY',
      subscriptionId:matched.id})
   }
   return Object.freeze({outcome:matches===1?
     'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY':'NO_CANDIDATE_PROVEN'})
  }
  return Object.freeze({
   examine:args=>scan(args,false),
   // Internal trusted composition only; the public recovery probe uses examine.
   examinePrivate:args=>scan(args,true),
  })
}

export function createPazoSandboxOrphanRecoveryProbe({
 resolveAuthenticatedOwner,admit,consentStore,merchantReader,
 now=Date.now,
}={}){
 if(typeof resolveAuthenticatedOwner!=='function'||typeof admit!=='function'||
    typeof consentStore?.readRecoveryForOwner!=='function'||
    typeof merchantReader?.examine!=='function'||typeof now!=='function')
  throw Error('orphan_probe_not_configured')
 return Object.freeze({
  async inspect({request,requestKey}={}){
   if(!(request instanceof Request)||!UUID.test(requestKey||''))
    return denied('invalid_recovery_request')
   let owner
   try{owner=await resolveAuthenticatedOwner(request)}
   catch{return denied('authentication_unavailable')}
   if(!UUID.test(owner||''))return denied('verified_owner_required')
   try{if(await admit({ownerId:owner,action:'orphan_merchant_probe'})!==true)
    return denied('merchant_probe_admission_denied')}
   catch{return denied('merchant_probe_admission_unavailable')}
   let row
   try{row=await consentStore.readRecoveryForOwner({ownerId:owner,requestKey})}
   catch{return denied('private_recovery_unavailable')}
   if(row===null)return denied('recovery_not_available')
   if(!row||row.ownerId!==owner||row.requestKey!==requestKey||
      row.planId!==PLAN||!INTENT.test(row.intentId||'')||
      row.state!=='pending'||row.subscriptionId!==null||
      row.providerCreateClaimed!==true||!isoTime(row.providerCreateClaimedAt))
    return denied('claimed_unbound_intent_required')
   const claimed=Date.parse(row.providerCreateClaimedAt)
   const current=now()
   if(!Number.isFinite(current)||claimed>current+60_000||
      current-claimed>48*3600_000)
    return denied('recovery_window_not_eligible')
   let evidence
   try{evidence=await merchantReader.examine({
    intentId:row.intentId,claimedAt:row.providerCreateClaimedAt,
   })}catch{return denied('merchant_probe_unavailable')}
   const outcomes=new Set([
    'ONE_UNBOUND_CANDIDATE_REVIEW_ONLY','NO_CANDIDATE_PROVEN',
    'INCOMPLETE_MERCHANT_SCAN','AMBIGUOUS_MERCHANT_LIST',
    'MERCHANT_DETAILS_INCOMPLETE','MERCHANT_PLAN_MISMATCH',
    'DUPLICATE_MATCHING_INTENTS',
   ])
   if(!outcomes.has(evidence?.outcome))
    return denied('merchant_probe_evidence_untrusted')
   return response(evidence.outcome)
  },
 })
}
