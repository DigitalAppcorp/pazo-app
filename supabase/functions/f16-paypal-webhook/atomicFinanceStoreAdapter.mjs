// PAZO F16: private RPC adapter for ATOMIC verified event -> ledger writes.
// Server-only, Sandbox-only; these RPCs are staged in a migration NOT applied.
// Passing this an unverified provider snapshot would be an integration bug.
// Neither RPC creates paid coverage or modifies public profiles / founder.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REF=/^[A-Za-z0-9._-]{3,128}$/
const DATE=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
function validDate(text){
 return typeof text==='string'&&DATE.test(text)&&Number.isFinite(Date.parse(text))&&
   new Date(text).toISOString().replace(/\.000Z$/,'Z')===text
}
export function createAtomicFinanceStore({
 projectUrl,serviceRoleKey,fetchImpl=fetch,
}={}) {
 if(projectUrl!==BASE || typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24 || /\s/.test(serviceRoleKey) ||
  typeof fetchImpl!=='function')throw Error('atomic_finance_store_not_configured')
 async function post(rpc,data){
  const response=await fetchImpl(BASE+'/rest/v1/rpc/'+rpc,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{'Content-Type':'application/json',Accept:'application/json',
      apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey},
    body:JSON.stringify(data),
  })
  if(!response?.ok)throw Error('atomic_finance_rpc_unavailable')
  return response.json()
 }
 return {
  async commitVerifiedSale({eventId,candidate,environment}={}){
    if(environment!=='sandbox'||!REF.test(eventId||'')||
     candidate?.provider!=='paypal'||!REF.test(candidate?.externalPaymentId||'')||
     !REF.test(candidate?.externalSubscriptionId||'')||
     !UUID.test(candidate?.ownerId||'')||
     candidate?.grossMinorUnits!==299||candidate?.currency!=='USD'||
     !validDate(candidate?.completedAt))
      throw Error('sale_proof_incomplete')
    const result=await post('f16_paypal_commit_verified_sale',{
      p_event_id:eventId,p_payment_id:candidate.externalPaymentId,
      p_subscription_id:candidate.externalSubscriptionId,p_owner_id:candidate.ownerId,
      p_plan_id:PLAN,p_minor:299,p_currency:'USD',
      p_completed_at:candidate.completedAt,
    })
    if(!['inserted_uncredited','duplicate_uncredited','inserted_blocked',
      'duplicate_blocked','already_processed'].includes(result))
       throw Error('unexpected_financial_commit_result')
    return Object.freeze({result,entitlement:false})
  },
  async commitVerifiedReversal({eventId,externalPaymentId,kind,verifiedAt,environment}={}){
    if(environment!=='sandbox'||!REF.test(eventId||'')||
       !REF.test(externalPaymentId||'')||
       !['reversed','refunded','partially_refunded'].includes(kind)||
       !validDate(verifiedAt))
      throw Error('reversal_proof_incomplete')
    const result=await post('f16_paypal_commit_verified_reversal',{
      p_event_id:eventId,p_payment_id:externalPaymentId,
      p_kind:kind,p_verified_at:verifiedAt,
    })
    if(!['reversal_recorded','reversal_duplicate','already_processed'].includes(result))
       throw Error('unexpected_reversal_commit_result')
    return Object.freeze({result,entitlement:false})
  },
 }
}
