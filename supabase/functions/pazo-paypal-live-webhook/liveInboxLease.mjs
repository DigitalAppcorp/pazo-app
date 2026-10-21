// PAZO F16 — durable service-only signed-event lease adapter, not released.
// A lease is not a paid receipt: resolve original merchant, subscription,
// PayPal event and transaction *before* attempting a financial writer.
// Companion SQL is REVIEW_REQUIRED and not hosted until PO migration GO.
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s
const fail=()=>{throw Error('live_event_lease_unavailable')}
export function createPazoLiveInboxLease({projectUrl,serviceRoleKey,fetchImpl=fetch}={}){
 if(projectUrl!==URL||typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24||serviceRoleKey.length>8192||
  /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')fail()
 const paths={claim:'inbox_claim',finish:'inbox_finish',receipt:'signed_receipt_read'}
 const post=async(name,body)=>{
  let response
  try{response=await fetchImpl(URL+'/rest/v1/rpc/pazo_f16_live_service_'+paths[name],{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(12000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify(body)
  })}catch{fail()}
  if(!response?.ok||response.status!==200||!/^application\/json(?:\s*;|$)/i.test(
   response.headers?.get?.('content-type')||''))fail()
  let raw
  try{raw=await response.text()}catch{fail()}
  if(typeof raw!=='string'||raw.length>4096)fail()
  try{return JSON.parse(raw)}catch{fail()}
 }
 const valid=(n,id)=>Number.isSafeInteger(n)&&n>=1&&n<=9999&&EVENT.test(id||'')
 return Object.freeze({
  async readSignedReceipt({merchantGeneration,eventId,leaseToken}={}){
   if(!valid(merchantGeneration,eventId)||!UUID.test(leaseToken||''))fail()
   const d=await post('receipt',{p_generation:merchantGeneration,p_event_id:eventId,p_lease:leaseToken})
   if(d===null)return null
   if(d?.signatureVerified!==true||d.proofSource!=='paypal_live_postback_success'||
    !/^[a-f0-9]{64}$/.test(d.signedBodySha256||'')||
    !/^[A-Za-z0-9_-]{8,100}$/.test(d.webhookId||'')||!SUB.test(d.subscriptionId||'')||
    !EVENT.test(d.subjectId||'')||d.eventId!==eventId||d.merchantGeneration!==merchantGeneration||
    typeof d.eventType!=='string'||!iso(d.providerEventAt)||!iso(d.subjectAt)||
    (d.activationAt!==null&&!iso(d.activationAt))||(d.nextBillingAt!==null&&!iso(d.nextBillingAt))||
    d.financialEvidenceVerified!==false||d.mayGrantBenefits!==false)fail()
   return Object.freeze({signatureVerified:d.signatureVerified,proofSource:d.proofSource,
    signedBodySha256:d.signedBodySha256,webhookId:d.webhookId,subscriptionId:d.subscriptionId,
    subjectId:d.subjectId,eventId:d.eventId,eventType:d.eventType,merchantGeneration:d.merchantGeneration,
    providerEventAt:d.providerEventAt,subjectAt:d.subjectAt,activationAt:d.activationAt,
    nextBillingAt:d.nextBillingAt,financialEvidenceVerified:false,mayGrantBenefits:false})
  },
  async claim({merchantGeneration,eventId}={}){
   if(!valid(merchantGeneration,eventId))fail()
   const d=await post('claim',{p_generation:merchantGeneration,p_event_id:eventId})
   if(d===null)return null
   if(d?.claimed!==true||d.eventId!==eventId||
    d.merchantGeneration!==merchantGeneration||
    d.sourceEnvironment!=='live'||d.provider!=='paypal'||
    !UUID.test(d.leaseToken||'')||!UUID.test(d.ownerId||'')||
    !INTENT.test(d.intentId||'')||d.financialEvidenceVerified!==false||
    d.mayGrantBenefits!==false||typeof d.eventType!=='string')fail()
   return Object.freeze({...d})
  },
  async finish({merchantGeneration,eventId,leaseToken,result}={}){
   if(!valid(merchantGeneration,eventId)||!UUID.test(leaseToken||'')||
    !['pending','held','processed'].includes(result))fail()
   const d=await post('finish',{p_generation:merchantGeneration,
    p_event_id:eventId,p_lease:leaseToken,p_result:result})
   if(typeof d!=='boolean')fail()
   return d
  }
 })
}
