// F16: service_role-only existing-sale lookup for original-merchant refunds.
// Requires the separately reviewed, staged read RPC; NOT WIRED or DEPLOYED.
// Never reads payment credentials, never modifies an order, never returns PII.
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const fail=()=>{throw Error('live_original_sale_read_unavailable')}
const required=[
 'recorded','sourceEnvironment','ownerId','intentId','subscriptionId',
 'merchantGeneration','saleId','amountMinor','currency'
]
export function createPazoLiveRecordedSaleReader({
 projectUrl,serviceRoleKey,fetchImpl=fetch
}={}){
 if(projectUrl!==URL||typeof serviceRoleKey!=='string'||
  serviceRoleKey.length<24||serviceRoleKey.length>8192||
  /\s/.test(serviceRoleKey)||typeof fetchImpl!=='function')fail()
 return async function findRecordedSale({ownerId,intentId,subscriptionId,
   merchantGeneration,saleId}={}){
  if(!UUID.test(ownerId||'')||!INTENT.test(intentId||'')||
   !SUB.test(subscriptionId||'')||!SALE.test(saleId||'')||
   !Number.isSafeInteger(merchantGeneration)||merchantGeneration<1||
   merchantGeneration>9999)fail()
  let response
  try{response=await fetchImpl(URL+
   '/rest/v1/rpc/pazo_f16_live_service_recorded_sale_read',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(12000),
    headers:{apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_owner:ownerId,p_intent:intentId,
     p_subscription:subscriptionId,p_generation:merchantGeneration,p_sale_id:saleId})
   })}catch{fail()}
  if(!response?.ok||response.status!==200||
   !/^application\/json(?:\s*;|$)/i.test(response.headers?.get?.('content-type')||''))fail()
  let raw
  try{raw=await response.text()}catch{fail()}
  if(typeof raw!=='string'||raw.length>2048)fail()
  let data
  try{data=JSON.parse(raw)}catch{fail()}
  if(data===null)return null
  if(!data||typeof data!=='object'||Array.isArray(data)||
   Object.keys(data).sort().join('|')!==required.slice().sort().join('|')||
   data.recorded!==true||data.sourceEnvironment!=='live'||
   data.ownerId!==ownerId||data.intentId!==intentId||
   data.subscriptionId!==subscriptionId||
   data.merchantGeneration!==merchantGeneration||data.saleId!==saleId||
   data.amountMinor!==299||data.currency!=='USD')fail()
  return Object.freeze({...data})
 }
}
