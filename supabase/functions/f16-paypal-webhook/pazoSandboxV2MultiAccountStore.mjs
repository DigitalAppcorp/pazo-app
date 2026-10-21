// F16 V2 Sandbox: read all immutable checkout attempts for one server-verified owner.
// Includes original V2 + append-only retries. P06 is separate and untouched.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const VERSION='pazo-supporter-sandbox.benefits-v2'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const HASH=/^[a-f0-9]{64}$/
const fail=()=>{throw Error('qa_v2_multi_account_unavailable')}
function validate(x,ownerId) {
 if(!x||typeof x!=='object'||Array.isArray(x)||
   x.ownerId!==ownerId||!INTENT.test(x.intentId||'')||
   x.provider!=='paypal'||x.planId!==PLAN||
   !['pending','bound'].includes(x.state)||
   (x.state==='bound'&&!SUB.test(x.externalSubscriptionId||''))||
   (x.state==='pending'&&x.externalSubscriptionId!==null)||
   x.termsVersion!==VERSION||!HASH.test(x.termsDigest||'')||
   !['es','en'].includes(x.locale)||typeof x.exactCopy!=='string'||
   x.exactCopy.length<100||x.exactCopy.length>12000||
   typeof x.consentedAt!=='string'||!Number.isFinite(Date.parse(x.consentedAt))||
   x.priceMinor!==299||x.currency!=='USD'||x.cadence!=='MONTH_1'||
   typeof x.providerCreateClaimed!=='boolean')fail()
 return Object.freeze(x)
}
export function createPazoSandboxV2MultiAccountStore({projectUrl,serviceRoleKey,fetchImpl=fetch}={}) {
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
   serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||
   typeof fetchImpl!=='function')fail()
 async function readMany(ownerId){
  if(!UUID.test(ownerId||''))fail()
  let r
  try{
   r=await fetchImpl(BASE+'/rest/v1/rpc/f16_qa_v2_multi_list_owner_accounts',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
      'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_owner_id:ownerId})
   })
  }catch{fail()}
  if(!r?.ok)fail()
  let records
  try{records=await r.json()}catch{fail()}
  if(!Array.isArray(records)||records.length>20)fail()
  const validated=records.map(x=>validate(x,ownerId))
  const ids=validated.map(x=>x.intentId)
  if(new Set(ids).size!==ids.length)fail()
  return Object.freeze(validated)
 }
 async function exact(ownerId,intentId){
  if(!INTENT.test(intentId||''))fail()
  return (await readMany(ownerId)).find(x=>x.intentId===intentId)||null
 }
 return Object.freeze({
  async listForOwner({ownerId}={}){
   return (await readMany(ownerId)).map(x=>Object.freeze({
     intentId:x.intentId,state:x.state,canDownloadAcceptance:true
   }))
  },
  async readForOwner({ownerId,intentId}={}){
   return intentId ? exact(ownerId,intentId) : (await readMany(ownerId))[0]||null
  },
  async load(intentId,ownerId){
   const x=await exact(ownerId,intentId)
   if(!x)return null
   return Object.freeze({id:x.intentId,ownerId:x.ownerId,provider:'paypal',
     planId:PLAN,state:x.state,externalSubscriptionId:x.externalSubscriptionId})
  },
  async readAcknowledgementForOwner({ownerId,intentId}={}){
   const x=await exact(ownerId,intentId)
   if(!x)return null
   return Object.freeze({ownerId:x.ownerId,intentId:x.intentId,locale:x.locale,
     termsVersion:x.termsVersion,termsDigest:x.termsDigest,exactCopy:x.exactCopy,
     consentedAt:x.consentedAt,priceMinor:299,currency:'USD',cadence:'MONTH_1'})
  }
 })
}
