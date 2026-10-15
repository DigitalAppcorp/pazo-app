// PAZO F16-P17 — read-only Sandbox account-gateway diagnostic.
// NEVER creates subscriptions, cancels PayPal, writes ledger, or grants benefits.
// No network unless caller explicitly enables transport.
import {pathToFileURL} from 'node:url'
const ENDPOINT='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-supporter-account'
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_HEADERS=['authorization','content-type','apikey']
export function validStableOrigin(origin){
 if(typeof origin!=='string')return false
 try{
  const parsed=new URL(origin)
  return parsed.protocol==='https:'&&parsed.origin===origin&&
   /^(?=.{1,253}$)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(parsed.hostname)&&
   parsed.username===''&&parsed.password===''&&parsed.port===''&&
   parsed.pathname==='/'&&parsed.search===''&&parsed.hash===''&&
   !origin.includes('*')
 }catch{return false}
}
const outcome=(phase,more={})=>Object.freeze({
 phase,environment:'sandbox',readOnly:true,paidThrough:null,
 mayCancel:false,mayCreateSubscription:false,
 mayGrantBenefits:false,mayRecordPayment:false,...more,
})
const denied=reason=>outcome('BLOCKED',{reason})
const headerList=s=>new Set((s||'').toLowerCase().split(',')
 .map(k=>k.trim()).filter(Boolean))
const validList=x=>x?.ok===true&&x?.code==='account_list_verified'&&
 x?.paidThrough===null&&x?.mayGrantBenefits===false&&
 x?.mayCreateSubscription===false&&Array.isArray(x.accounts)&&
 x.accounts.length<=5&&x.accounts.every(a=>
  a&&typeof a==='object'&&!Array.isArray(a)&&
  INTENT.test(a.intentId||'')&&['pending','bound'].includes(a.state)&&
  typeof a.canDownloadAcceptance==='boolean'&&
  Object.keys(a).every(k=>['intentId','state','canDownloadAcceptance'].includes(k)))
/** Network side effects are limited to CORS OPTIONS and signed-in list POST. */
export async function inspectSupporterGateway({
 origin,bearer,publishableKey,fetchImpl,allowNetwork=false,
}={}){
 if(!validStableOrigin(origin))
  return denied('stable_https_origin_not_verified')
 if(allowNetwork!==true||typeof fetchImpl!=='function')
  return outcome('NOT_RUN',{reason:'explicit_read_only_transport_required'})
 let preflight
 try{
  preflight=await fetchImpl(ENDPOINT,{
   method:'OPTIONS',redirect:'error',signal:AbortSignal.timeout(8000),
   headers:{Origin:origin,'Access-Control-Request-Method':'POST',
    'Access-Control-Request-Headers':'authorization,content-type,apikey'},
  })
 }catch{return denied('preflight_transport_unavailable')}
 const httpStatus=preflight?.status
 if(httpStatus!==204) {
  const reason=({
   401:'preflight_http_401_authentication_gate',
   403:'preflight_http_403_origin_or_gateway_denial',
   404:'preflight_http_404_route_missing',
   503:'preflight_http_503_unavailable',
  })[httpStatus]||'preflight_http_unexpected'
  // Static enum only; never expose raw provider body, headers or URL.
  if(httpStatus===503){
   // Whitelist only a server-generated static code; never print raw bodies.
   let code
   try{code=(await preflight.json())?.code}catch{}
   if(code==='account_origin_not_configured')
    return denied('preflight_503_origin_not_configured')
   if(code==='supporter_account_not_configured')
    return denied('preflight_503_runtime_not_configured')
  }
  return denied(reason)
 }
 const headers=headerList(preflight?.headers?.get('access-control-allow-headers'))
 const methods=headerList(preflight?.headers?.get('access-control-allow-methods'))
 if(preflight?.status!==204||
    preflight?.headers?.get('access-control-allow-origin')!==origin||
    !methods.has('post')||!ALLOWED_HEADERS.every(h=>headers.has(h)))
  return denied('cors_or_gateway_preflight_not_verified')
 if(typeof bearer!=='string'||!/^[A-Za-z0-9._~+/-]{20,4096}$/.test(bearer)||
    typeof publishableKey!=='string'||publishableKey.length<10||
    publishableKey.length>2048||/\s/.test(publishableKey))
  return outcome('CORS_VERIFIED',{reason:'verified_owner_session_not_supplied'})
 let response
 try{
  response=await fetchImpl(ENDPOINT,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
   headers:{Origin:origin,Authorization:'Bearer '+bearer,
    apikey:publishableKey,'Content-Type':'application/json'},
   body:'{"action":"list"}',
  })
 }catch{return denied('authenticated_list_transport_unavailable')}
 if(response?.status!==200||
    response.headers?.get('access-control-allow-origin')!==origin||
    response.headers?.get('cache-control')!=='no-store')
  return denied('authenticated_list_not_verified')
 let data
 try{data=await response.json()}
 catch{return denied('account_list_invalid_json')}
 if(!validList(data))return denied('account_list_contract_mismatch')
 // Never return JWT, owner, intent IDs, provider identifiers or emails.
 return outcome('READ_ONLY_LIST_VERIFIED',{accountCount:data.accounts.length})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await inspectSupporterGateway({
  origin:process.env.PAZO_F16_STABLE_ORIGIN,
  bearer:process.env.PAZO_F16_TEST_USER_JWT,
  publishableKey:process.env.PAZO_F16_PUBLIC_KEY,
  allowNetwork:process.env.PAZO_F16_P17_READ_ONLY_GO==='I_AUTHORIZE_READ_ONLY',
  fetchImpl:fetch,
 })
 console.log(JSON.stringify(result))
}
