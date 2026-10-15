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
 projectUrl,serviceRoleKey,fetchImpl=fetch,
}={}){
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
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
   const x=await rpc('f16_p06_begin_checkout',{
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
  async claimProviderCreate({ownerId,requestKey,intentId}={}){
   if(!UUID.test(ownerId||'')||!UUID.test(requestKey||'')||
      !INTENT.test(intentId||''))
     throw Error('pazo_provider_create_claim_invalid')
   const result=await rpc('f16_p07_claim_provider_create',{
    p_owner_id:ownerId,p_request_key:requestKey,p_intent_id:intentId,
   })
   if(typeof result!=='boolean')fail()
   // false = already claimed, mismatched, or no longer pending.
   // It is NEVER a license to retry PayPal's mutation.
   return result
  },
 })
}
