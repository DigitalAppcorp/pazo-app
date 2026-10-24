// One bounded transport retry for the private worker's webhook readiness probe.
// A webhook that explicitly responds unhealthy is never retried into a "ready" claim.
const PROJECT_ORIGIN='https://mrybvqdebbgcayuvgkkr.supabase.co'
const FIRST_TIMEOUT_MS=8000
const RETRY_TIMEOUT_MS=2500

export async function probePazoWebhookReadiness({projectUrl,apiKey,fetchImpl=fetch}={}){
 let url
 try{url=new URL(projectUrl)}catch{return false}
 if(url.origin!==PROJECT_ORIGIN||url.pathname!=='/'||url.search||url.hash||
  typeof apiKey!=='string'||apiKey.length===0||typeof fetchImpl!=='function')return false
 const endpoint=PROJECT_ORIGIN+'/functions/v1/pazo-paypal-live-webhook'
 const once=async(timeoutMs)=>{
  let response
  try{
   response=await fetchImpl(endpoint,{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeoutMs),
    headers:{apikey:apiKey,Accept:'application/json'}
   })
  }catch{return {ready:false,retryTransport:true}}
  if(response?.ok!==true||response.status!==200)return {ready:false,retryTransport:false}
  let status
  try{status=await response.json()}catch{return {ready:false,retryTransport:false}}
  return {ready:status?.source==='pazo_live_webhook_readiness_v1'&&
   status.ready===true&&status.mayGrantBenefits===false,retryTransport:false}
 }
 const first=await once(FIRST_TIMEOUT_MS)
 if(first.ready||!first.retryTransport)return first.ready
 return (await once(RETRY_TIMEOUT_MS)).ready
}
