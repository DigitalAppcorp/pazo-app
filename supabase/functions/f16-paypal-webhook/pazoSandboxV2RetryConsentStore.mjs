// PAZO F16: prepared append-only Sandbox V2 retry consent store.
// It CANNOT operate before the separately approved SQL migration and merchant
// proof are installed. No client-supplied owner IDs may reach this adapter.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const VERSION='pazo-supporter-sandbox.benefits-v2'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HASH=/^[a-f0-9]{64}$/
export function createPazoSandboxV2RetryConsentStore({
 projectUrl,serviceRoleKey,offerStore,fetchImpl=fetch,
}={}){
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||serviceRoleKey.length<24||
   /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function'||
   typeof offerStore?.readOffer!=='function')
  throw Error('qa_v2_retry_store_not_configured')
 async function rpc(name,payload){
  let result
  try{result=await fetchImpl(BASE+'/rest/v1/rpc/'+name,{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify(payload)
  })}catch{throw Error('retry_rpc_unavailable')}
  if(!result?.ok)throw Error('retry_rpc_unavailable')
  try{return await result.json()}catch{throw Error('retry_rpc_invalid_response')}
 }
 return Object.freeze({
  readOffer:({locale}={})=>offerStore.readOffer({locale}),
  async isEligible({ownerId}={}){
   if(!UUID.test(ownerId||''))throw Error('invalid_retry_owner')
   const r=await rpc('f16_qa_v2_retry_eligibility',{p_owner_id:ownerId})
   if(typeof r!=='boolean')throw Error('retry_eligibility_untrusted')
   return r
  },
  async beginForOwner({ownerId,requestKey,locale,termsVersion,termsDigest,affirmativeConsent}={}){
   if(!UUID.test(ownerId||'')||!UUID.test(requestKey||'')||
     !['es','en'].includes(locale)||termsVersion!==VERSION||
     !HASH.test(termsDigest||'')||affirmativeConsent!==true)
    throw Error('new_explicit_retry_consent_required')
   const r=await rpc('f16_qa_v2_retry_begin_checkout',{
    p_owner_id:ownerId,p_request_key:requestKey,p_locale:locale,
    p_terms_version:termsVersion,p_terms_digest:termsDigest,p_affirmative:true})
   if(!r||r.ownerId!==ownerId||r.requestKey!==requestKey||
      !INTENT.test(r.intentId||'')||r.planId!==PLAN||
      r.locale!==locale||r.termsVersion!==VERSION||
      r.termsDigest!==termsDigest||r.state!=='pending'&&r.state!=='bound'||
      typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))
    throw Error('retry_private_record_untrusted')
   return Object.freeze({ownerId,requestKey,intentId:r.intentId,planId:PLAN,
    locale,termsVersion,termsDigest,createdAt:r.createdAt,state:r.state})
  },
  async claimProviderCreate({ownerId,requestKey,intentId}={}){
   if(!UUID.test(ownerId||'')||!UUID.test(requestKey||'')||!INTENT.test(intentId||''))
    throw Error('invalid_retry_claim')
   const r=await rpc('f16_qa_v2_retry_claim_provider_create',{
    p_owner_id:ownerId,p_request_key:requestKey,p_intent_id:intentId})
   if(typeof r!=='boolean')throw Error('retry_claim_response_untrusted')
   return r
  }
 })
}
