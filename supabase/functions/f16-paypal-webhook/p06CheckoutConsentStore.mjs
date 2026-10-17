// PAZO F16-P06 — PRIVATE server RPC for published recurring offer and
// durable affirmative consent. Inactive until the reviewed SQL is installed.
// Never accepts arbitrary terms text, owner ID, price or subscription from UI.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HASH=/^[0-9a-f]{64}$/
const VERSION=/^pazo-supporter-[a-z0-9.-]{3,40}$/
const GOOD=new Set(['pending','bound'])
const fail=()=>{throw Error('pazo_checkout_private_rpc_unavailable')}
export function createPazoCheckoutConsentStore({
 projectUrl,serviceRoleKey,fetchImpl=fetch,qaV2=false,
}={}){
 if(typeof qaV2!=='boolean'||projectUrl!==BASE||typeof serviceRoleKey!=='string'||
    serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||
    typeof fetchImpl!=='function')
  throw Error('pazo_checkout_store_not_configured')
 async function rpc(name,args){
  let r
  try{
   r=await fetchImpl(BASE+'/rest/v1/rpc/'+name,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify(args),
   })
  }catch{fail()}
  if(!r?.ok)fail()
  try{return await r.json()}catch{fail()}
 }
 return Object.freeze({
  async readOffer({locale}={}){
   if(locale!=='es'&&locale!=='en')throw Error('pazo_offer_locale_invalid')
   const o=await rpc('f16_p06_read_published_offer',{p_locale:locale})
   if(o===null)return null
   if(o?.locale!==locale||!VERSION.test(o.version||'')||
    !HASH.test(o.termsDigest||'')||
    typeof o.exactCopy!=='string'||o.exactCopy.length<100||
    o.priceMinor!==299||o.currency!=='USD'||o.cadence!=='MONTH_1')
    fail()
   return Object.freeze({version:o.version,locale:o.locale,
    exactCopy:o.exactCopy,termsDigest:o.termsDigest,
    priceMinor:299,currency:'USD',cadence:'MONTH_1'})
  },
  async beginForOwner({ownerId,requestKey,locale,termsVersion,termsDigest,
    affirmativeConsent}={}){
   if(!UUID.test(ownerId||'')||!UUID.test(requestKey||'')||
    !['es','en'].includes(locale)||!VERSION.test(termsVersion||'')||
    !HASH.test(termsDigest||'')||affirmativeConsent!==true)
    throw Error('pazo_checkout_explicit_consent_missing')
   if(qaV2 && termsVersion!=='pazo-supporter-sandbox.benefits-v2')
    throw Error('sandbox_qa_v2_acceptance_required')
   const x=await rpc(qaV2?'f16_qa_v2_begin_checkout':'f16_p06_begin_checkout',{ 
    p_owner_id:ownerId,p_request_key:requestKey,p_locale:locale,
    p_terms_version:termsVersion,p_terms_digest:termsDigest,
    p_affirmative:true,
   })
   if(!x||x.ownerId!==ownerId||x.requestKey!==requestKey||
    !INTENT.test(x.intentId||'')||x.locale!==locale||
    x.termsVersion!==termsVersion||x.termsDigest!==termsDigest||
    x.planId!==PLAN||!GOOD.has(x.state)||
    typeof x.createdAt!=='string'||!Number.isFinite(Date.parse(x.createdAt)))
    fail()
   return Object.freeze({intentId:x.intentId,ownerId:x.ownerId,
    requestKey:x.requestKey,locale:x.locale,
    termsVersion:x.termsVersion,termsDigest:x.termsDigest,
    planId:PLAN,createdAt:x.createdAt,state:x.state})
  },
  async readAcknowledgementForOwner({ownerId,intentId}={}){
   if(qaV2)throw Error('qa_v2_acknowledgement_read_requires_new_binding')
   if(!UUID.test(ownerId||'')||!INTENT.test(intentId||''))
    throw Error('pazo_acknowledgement_identity_invalid')
   const x=await rpc('f16_p14_read_owner_checkout_acknowledgement',{
    p_owner_id:ownerId,p_intent_id:intentId,
   })
   if(x===null)return null
   if(!x||x.ownerId!==ownerId||x.intentId!==intentId||
     !['es','en'].includes(x.locale)||!VERSION.test(x.termsVersion||'')||
     !HASH.test(x.termsDigest||'')||
     typeof x.exactCopy!=='string'||x.exactCopy.length<100||
     x.exactCopy.length>12000||
     typeof x.consentedAt!=='string'||
     !Number.isFinite(Date.parse(x.consentedAt))||
     x.priceMinor!==299||x.currency!=='USD'||x.cadence!=='MONTH_1')
    fail()
   return Object.freeze({
    ownerId, intentId, locale:x.locale, termsVersion:x.termsVersion,
    termsDigest:x.termsDigest,exactCopy:x.exactCopy,
    consentedAt:new Date(x.consentedAt).toISOString(),
    priceMinor:299,currency:'USD',cadence:'MONTH_1',
   })
  },
  async readRecoveryForOwner({ownerId,requestKey}={}){
   if(qaV2)throw Error('qa_v2_recovery_read_requires_new_binding')
   if(!UUID.test(ownerId||'')||!UUID.test(requestKey||''))
    throw Error('pazo_checkout_recovery_lookup_invalid')
   const x=await rpc('f16_p08_read_checkout_recovery',{
    p_owner_id:ownerId,p_request_key:requestKey,
   })
   if(x===null)return null
   if(!x||x.ownerId!==ownerId||x.requestKey!==requestKey||
      !INTENT.test(x.intentId||'')||x.planId!==PLAN||
      !GOOD.has(x.state)||typeof x.providerCreateClaimed!=='boolean'||
      (x.providerCreateClaimed===true&&
       (typeof x.providerCreateClaimedAt!=='string'||
        !Number.isFinite(Date.parse(x.providerCreateClaimedAt))))||
      (x.providerCreateClaimed===false&&x.providerCreateClaimedAt!==null)||
      (x.state==='pending'&&x.subscriptionId!==null)||
      (x.state==='bound'&&
       (x.providerCreateClaimed!==true||
        !/^I-[A-Za-z0-9_-]{3,70}$/.test(x.subscriptionId||''))))fail()
   return Object.freeze({ownerId:x.ownerId,requestKey:x.requestKey,
    intentId:x.intentId,planId:PLAN,state:x.state,
    providerCreateClaimed:x.providerCreateClaimed,
    providerCreateClaimedAt:x.providerCreateClaimedAt===null?null:
     new Date(x.providerCreateClaimedAt).toISOString(),
    subscriptionId:x.subscriptionId})
  },
  async bindRecoveredForOwner({
   if(qaV2)throw Error('qa_v2_recovery_bind_requires_new_binding')
   ownerId,requestKey,intentId,subscriptionId,
  }={}){
   if(!UUID.test(ownerId||'')||!UUID.test(requestKey||'')||
      !INTENT.test(intentId||'')||
      !/^I-[A-Za-z0-9_-]{3,70}$/.test(subscriptionId||''))
     throw Error('pazo_recovered_binding_arguments_invalid')
   // Caller MUST perform independent merchant GET + authenticated operator gate.
   // SQL enforces one claim, exact owner/key/intent and unique external sub.
   const result=await rpc('f16_p10_bind_recovered_checkout',{
    p_owner_id:ownerId,p_request_key:requestKey,
    p_intent_id:intentId,p_subscription_id:subscriptionId,
   })
   if(result!=='new_binding'&&result!=='already_bound')fail()
   return result
  },
  async claimProviderCreate({ownerId,requestKey,intentId}={}){
   if(!UUID.test(ownerId||'')||!UUID.test(requestKey||'')||
      !INTENT.test(intentId||''))
     throw Error('pazo_provider_create_claim_invalid')
   const result=await rpc(qaV2?'f16_qa_v2_claim_provider_create':'f16_p07_claim_provider_create',{ 
    p_owner_id:ownerId,p_request_key:requestKey,p_intent_id:intentId,
   })
   if(typeof result!=='boolean')fail()
   // false = already claimed, mismatched, or no longer pending.
   // It is NEVER a license to retry PayPal's mutation.
   return result
  },
 })
}
