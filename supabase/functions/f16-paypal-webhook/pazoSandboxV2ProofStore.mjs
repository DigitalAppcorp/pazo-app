// Service-role only adapter for F16 four-benefit Sandbox QA cycle proof.
// Merchant verification is performed by pazoSandboxV2MerchantVerify before
// calling either RPC. Browser cannot post dates, sale IDs or reverse money.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ID=/^[A-Za-z0-9._-]{6,110}$/
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/
const fail=()=>{throw Error('qa_v2_proof_rpc_unavailable')}
export function createPazoSandboxV2ProofStore({
 projectUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
   serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')
  fail()
 async function rpc(name,args){
  let r
  try{r=await fetchImpl(BASE+'/rest/v1/rpc/'+name,{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(12000),
   headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify(args)
  })}catch{fail()}
  if(!r?.ok)fail()
  try{return await r.json()}catch{fail()}
 }
 return Object.freeze({
  async commitVerified({ownerId,intentId,saleId,saleCompletedAt,serviceStart,serviceEnd}={}){
   if(!UUID.test(ownerId||'')||!INTENT.test(intentId||'')||
    !ID.test(saleId||'')||[saleCompletedAt,serviceStart,serviceEnd].some(x=>!
       ISO.test(x||'')||!Number.isFinite(Date.parse(x))))fail()
   const x=await rpc('f16_qa_v2_record_verified_first_cycle',{
    p_owner_id:ownerId,p_intent_id:intentId,p_sale_id:saleId,
    p_sale_completed_at:saleCompletedAt,
    p_service_start:serviceStart,p_service_end:serviceEnd
   })
   if(!x||x.cycleVerified!==true||
      !['verified_first_sandbox_cycle','already_verified'].includes(x.phase)||
      !Number.isFinite(Date.parse(x.periodEnd||'')))fail()
   return x
  },
  async markReversal({ownerId,intentId,saleId,reason}={}){
   if(!UUID.test(ownerId||'')||!INTENT.test(intentId||'')||
      !ID.test(saleId||'')||!['refunded','partially_refunded','reversed','disputed'].includes(reason))
    fail()
   const x=await rpc('f16_qa_v2_mark_merchant_sale_reversal',{
    p_owner_id:ownerId,p_intent_id:intentId,
    p_sale_id:saleId,p_reason:reason
   })
   if(x!==true)fail()
   return true
  }
 })
}
