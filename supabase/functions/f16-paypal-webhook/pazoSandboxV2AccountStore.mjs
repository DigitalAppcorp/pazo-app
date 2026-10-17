// F16 — read one V2 Sandbox QA account/receipt by the *verified* Supabase
// Auth owner. Do not use P06's generic intent lookup: it can resolve the old
// bound subscription for the same owner. Only the SQL V2 join is authoritative.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const HASH=/^[a-f0-9]{64}$/
const VERSION='pazo-supporter-sandbox.benefits-v2'
const PLAN='P-14V25407JP6850922NLHMDKI'
function reject(){throw Error('qa_v2_private_owner_account_unavailable')}
export function createPazoSandboxV2AccountStore({
 projectUrl,serviceRoleKey,fetchImpl=fetch,
}={}){
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
    serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||
    typeof fetchImpl!=='function')reject()
 async function queryV2OwnerRecord(ownerId,intentId=null){
  if(!UUID.test(ownerId||'')||(intentId!==null&&!INTENT.test(intentId)))reject()
  let response
  try{
   response=await fetchImpl(BASE+'/rest/v1/rpc/f16_qa_v2_read_owner_account',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
      'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_owner_id:ownerId,p_intent_id:intentId})
   })
  }catch{reject()}
  if(!response?.ok)reject()
  let x
  try{x=await response.json()}catch{reject()}
  if(x===null)return null
  if(!x||typeof x!=='object'||Array.isArray(x)||
     x.ownerId!==ownerId||!INTENT.test(x.intentId||'')||
     (intentId!==null && x.intentId!==intentId)||
     x.provider!=='paypal'||x.planId!==PLAN||
     !['pending','bound'].includes(x.state)||
     (x.state==='bound'&&!SUB.test(x.externalSubscriptionId||''))||
     (x.state==='pending'&&x.externalSubscriptionId!==null)||
     x.termsVersion!==VERSION||!HASH.test(x.termsDigest||'')||
     !['es','en'].includes(x.locale)||
     typeof x.exactCopy!=='string'||x.exactCopy.length<100||
     x.exactCopy.length>12000||typeof x.consentedAt!=='string'||
     !Number.isFinite(Date.parse(x.consentedAt))||
     x.priceMinor!==299||x.currency!=='USD'||x.cadence!=='MONTH_1'||
     typeof x.providerCreateClaimed!=='boolean')reject()
  return Object.freeze(x)
 }
 return Object.freeze({
  async readForOwner({ownerId}={}){
   return queryV2OwnerRecord(ownerId)
  },
  // Owner argument is mandatory. No listing/query by arbitrary intent alone.
  async load(intentId,ownerId){
   if(!INTENT.test(intentId||'')||!UUID.test(ownerId||''))reject()
   const record=await queryV2OwnerRecord(ownerId,intentId)
   if(!record)return null
   return Object.freeze({
    id:record.intentId,ownerId:record.ownerId,provider:'paypal',
    planId:PLAN,state:record.state,
    externalSubscriptionId:record.externalSubscriptionId
   })
  },
  async readAcknowledgementForOwner({ownerId,intentId}={}){
   if(!UUID.test(ownerId||'')||!INTENT.test(intentId||''))reject()
   const x=await queryV2OwnerRecord(ownerId,intentId)
   if(!x)return null
   return Object.freeze({
    ownerId:x.ownerId,intentId:x.intentId,
    locale:x.locale,termsVersion:x.termsVersion,
    termsDigest:x.termsDigest,exactCopy:x.exactCopy,
    consentedAt:x.consentedAt,priceMinor:299,currency:'USD',cadence:'MONTH_1'
   })
  }
 })
}
