// One authenticated owner's original-generation subscription GET, diagnostic only.
// No credentials, IDs, customer data, URLs, PayPal debug_id or response body logged.
// Never logs OAuth, CREATE, CANCEL, sale evidence or a different host.
const ALLOWED_STATES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
const ALLOWED_ERRORS=new Set(['RESOURCE_NOT_FOUND','NOT_AUTHORIZED','PERMISSION_DENIED',
 'INVALID_RESOURCE_ID','AUTHENTICATION_FAILURE','INTERNAL_SERVER_ERROR',
 'UNPROCESSABLE_ENTITY','INVALID_REQUEST'])
const ERROR_HTTP=new Set([400,401,403,404,409,422,429,500,502,503,504])
const safeReport=(report,result)=>{try{report(Object.freeze(result))}catch{/* diagnostic cannot break status read */}}
const subscriptionGet=(url,options)=>{
 if(options?.method!=='GET'||typeof url!=='string'||url.length>200)return false
 let parsed
 try{parsed=new URL(url)}catch{return false}
 return parsed.protocol==='https:'&&parsed.host==='api-m.paypal.com'&&
  /^\/v1\/billing\/subscriptions\/I-[A-Za-z0-9_-]{3,70}$/.test(parsed.pathname)&&
  !parsed.search&&!parsed.hash&&!parsed.username&&!parsed.password
}
export function createPazoOriginalSubscriptionReadDiagnostic({fetchImpl=fetch,report=()=>{}}={}){
 if(typeof fetchImpl!=='function'||typeof report!=='function')
  throw Error('diagnostic_not_configured')
 return async function readOnlyTransport(url,options={}){
  if(!subscriptionGet(url,options))return fetchImpl(url,options)
  let response
  try{response=await fetchImpl(url,options)}
  catch{
   safeReport(report,{kind:'paypal_subscription_read',result:'network_unavailable'})
   throw Error('provider_response_unavailable')
  }
  const status=response?.status
  if(status!==200){
   let providerError='none'
   if(ERROR_HTTP.has(status)){
    try{
     const clone=response.clone()
     const raw=await clone.text()
     if(raw.length<=4096){
      const error=JSON.parse(raw)
      if(ALLOWED_ERRORS.has(error?.name))providerError=error.name
     }
    }catch{/* avoid reading unbounded/sensitive provider errors */}
   }
   safeReport(report,{kind:'paypal_subscription_read',result:'http_error',
    httpStatus:ERROR_HTTP.has(status)?status:'other',providerError})
   return response
  }
  let providerStatus='unknown',statusUpdateTime='unknown',result='invalid_json'
  try{
   const ct=response.headers?.get?.('content-type')||''
   if(/^application\/json(?:\s*;|$)/i.test(ct)){
    const clone=response.clone()
    const raw=await clone.text()
    if(raw.length<=65536){
     const body=JSON.parse(raw)
     if(body&&typeof body==='object'&&!Array.isArray(body)){
      result='http_200'
      providerStatus=ALLOWED_STATES.has(body.status)?body.status:'unknown'
      statusUpdateTime=body.status_update_time===undefined||body.status_update_time===null
       ?'absent':typeof body.status_update_time==='string'?'present':'invalid_type'
     }
    }
   }
  }catch{/* use bounded unknown result without changing provider response */}
  safeReport(report,{kind:'paypal_subscription_read',result,providerStatus,statusUpdateTime})
  return response
 }
}
