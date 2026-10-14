// PAZO F16: concrete Supabase RPC adapter for DISPOSABLE PG17 LAB ONLY.
// Not imported by deployed Edge, browser, scheduler or frontend. NO secrets.
// Inject a server-owned rpcClient; each call names ONLY f16_lab_* DRAFT RPCs.
// No fallback to hosted f16_paypal_commit_verified_sale/reversal (NO LEASE).
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const REF=/^[A-Za-z0-9._-]{3,128}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
const EVENT_TYPES=new Set(['PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED'])
const SALE_RESULTS=new Set(['inserted_uncredited','duplicate_uncredited','inserted_blocked','duplicate_blocked'])
const REV_RESULTS=new Set(['reversal_recorded','reversal_duplicate'])
const CLAIM_KEYS=['attempt','event_type','lease_expires_at','lease_token','provider_event_id']
const INTENT_KEYS=['external_subscription_id','id','owner_id','plan_id','provider','state']
const invalid=()=>{throw Error('f16_lab_rpc_invalid_request')}
const matches=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 JSON.stringify(Object.keys(x).sort())===JSON.stringify(keys)
const ref=x=>typeof x==='string'&&REF.test(x)
const utc=x=>typeof x==='string'&&ISO.test(x)&&Number.isFinite(Date.parse(x))&&
 new Date(x).toISOString().replace(/\.000Z$/,'Z')===x
function subscription(s){if(typeof s!=='string'||!SUB.test(s))invalid()}
function eventId(id){if(!ref(id))invalid()}
function token(id){if(typeof id!=='string'||!UUID.test(id))invalid()}

export function createF16PrivateLabRpcStores({rpcClient,labDatabase}={}){
 // A deliberate opt-in, never an implicit authorization to use production.
 if(labDatabase!=='f14_synthetic'||typeof rpcClient?.rpc!=='function')
  throw Error('f16_disposable_rpc_client_required')
 async function call(name,args){
  // No dynamic function paths, no PUBLIC legacy finance writes.
  if(!name.startsWith('f16_lab_'))throw Error('f16_legacy_rpc_prohibited')
  let outcome
  try{outcome=await rpcClient.rpc(name,args)}
  catch{throw Error('f16_private_rpc_unavailable')}
  if(!outcome||outcome.error||outcome.data===undefined)
   throw Error('f16_private_rpc_unavailable')
  // Never return Supabase errors, provider payloads, keys, HTTP bodies.
  return outcome.data
 }
 const leaseStore=Object.freeze({
  async claim(reference){
   if(reference?.provider!=='paypal'||!eventIdIsValid(reference.eventId)||
      !EVENT_TYPES.has(reference.eventType))invalid()
   const row=await call('f16_lab_claim_verified_inbox',{
    p_provider_event_id:reference.eventId,p_lease_seconds:180,
   })
   if(row===null)return null
   if(!matches(row,CLAIM_KEYS)||row.provider_event_id!==reference.eventId||
       row.event_type!==reference.eventType||!UUID.test(row.lease_token||'')||
       !Number.isInteger(row.attempt)||row.attempt<1||row.attempt>5||
       !utc(row.lease_expires_at)||Date.parse(row.lease_expires_at)<=Date.now())
    throw Error('f16_private_rpc_contract_mismatch')
   return Object.freeze({...row})
  },
  async release(id,leaseToken,errorCode='unverified_provider_state'){
   eventId(id);token(leaseToken)
   if(errorCode!=='unverified_provider_state')invalid()
   const answer=await call('f16_lab_release_claim',{
    p_provider_event_id:id,p_lease_token:leaseToken,
    p_error_code:errorCode,p_terminal:false,
   })
   if(typeof answer!=='boolean')
    throw Error('f16_private_rpc_contract_mismatch')
   return answer
  },
  async recoverExpired(maxRows=50){
   if(!Number.isInteger(maxRows)||maxRows<1||maxRows>100)invalid()
   const count=await call('f16_lab_recover_expired',{p_max_rows:maxRows})
   if(!Number.isInteger(count)||count<0||count>maxRows)
    throw Error('f16_private_rpc_contract_mismatch')
   return count
  },
 })
 function eventIdIsValid(x){return ref(x)}
 async function loadPrivateBoundIntent(externalSubscriptionId){
  subscription(externalSubscriptionId)
  const row=await call('f16_lab_read_bound_intent_by_subscription',{
   p_subscription_id:externalSubscriptionId,
  })
  if(row===null)return null
  if(!matches(row,INTENT_KEYS)||row.external_subscription_id!==externalSubscriptionId||
      !ref(row.id)||!UUID.test(row.owner_id||'')||
      row.plan_id!==PLAN||row.state!=='bound'||row.provider!=='paypal')
   throw Error('f16_private_rpc_contract_mismatch')
  return Object.freeze({id:row.id,provider:'paypal',ownerId:row.owner_id,
   externalSubscriptionId:row.external_subscription_id,
   planId:row.plan_id,state:'bound'})
 }
 async function loadKnownReversalIds(externalSubscriptionId){
  subscription(externalSubscriptionId)
  const list=await call('f16_lab_read_known_reversal_ids',{
   p_subscription_id:externalSubscriptionId,
  })
  // A null result is UNKNOWN, never assume no refund.
  if(list===null)return null
  if(!Array.isArray(list)||list.length>500||
     list.some(x=>!ref(x))||new Set(list).size!==list.length)
   throw Error('f16_private_rpc_contract_mismatch')
  return Object.freeze([...list])
 }
 const financeStore=Object.freeze({
  async commitClaimedSale({eventId:evt,leaseToken,candidate,planId}={}){
   eventId(evt);token(leaseToken)
   if(candidate?.provider!=='paypal'||!ref(candidate.externalPaymentId)||
       !SUB.test(candidate.externalSubscriptionId||'')||
       !UUID.test(candidate.ownerId||'')||planId!==PLAN||
       candidate.grossMinorUnits!==299||candidate.currency!=='USD'||
       !utc(candidate.completedAt))invalid()
   const outcome=await call('f16_lab_commit_claimed_sale',{
    p_event_id:evt,p_lease_token:leaseToken,
    p_payment_id:candidate.externalPaymentId,
    p_subscription_id:candidate.externalSubscriptionId,
    p_owner_id:candidate.ownerId,p_plan_id:planId,
    p_minor:299,p_currency:'USD',p_completed_at:candidate.completedAt,
   })
   if(!SALE_RESULTS.has(outcome))throw Error('f16_private_rpc_contract_mismatch')
   return outcome
  },
  async commitClaimedReversal({eventId:evt,leaseToken,candidate}={}){
   eventId(evt);token(leaseToken)
   if(candidate?.provider!=='paypal'||!ref(candidate.externalPaymentId)||
       !['refunded','partially_refunded'].includes(candidate.kind)||
       !utc(candidate.verifiedAt))invalid()
   const outcome=await call('f16_lab_commit_claimed_reversal',{
    p_event_id:evt,p_lease_token:leaseToken,
    p_payment_id:candidate.externalPaymentId,p_kind:candidate.kind,
    p_verified_at:candidate.verifiedAt,
   })
   if(!REV_RESULTS.has(outcome))throw Error('f16_private_rpc_contract_mismatch')
   return outcome
  },
 })
 return Object.freeze({leaseStore,financeStore,loadPrivateBoundIntent,loadKnownReversalIds})
}
