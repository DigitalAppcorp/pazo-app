// PAZO F16 — Admin Live Edge provisioning HTTP boundary (HOSTED INERT).
// RELEASE OFF by default. Requires verified Supabase JWT, fresh MFA, and trusted
// provider merchant proof from the separately gated provisioning orchestrator.
// Preflight never reads the body or calls the provisioning backend.
const PATHS=new Set(['/functions/v1/pazo-admin-paypal-provision','/pazo-admin-paypal-provision'])
const ORIGINS=new Set(['http://localhost:5173','http://127.0.0.1:5173','https://pazo-app-t83r.vercel.app'])
const JSON_TYPE=/^application\/json(?:\s*;\s*charset=utf-8)?$/i
const BEARER=/^Bearer [A-Za-z0-9_\-]+(?:\.[A-Za-z0-9_\-]+){2}$/
const MAX_BODY=2048
const allowedKeys=['merchantGeneration','clientId','clientSecret',
 'confirmation','expectedRevision']
function cors(request){
 const origin=request instanceof Request?request.headers.get('origin'):null
 return {'vary':'Origin',...(ORIGINS.has(origin)?{
  'access-control-allow-origin':origin,
  'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,x-region,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version'
 }:{})}
}
const deny=(request,status,code)=>new Response(JSON.stringify({
 ok:false,code,liveActivated:false,mayCharge:false
}),{status,headers:{'content-type':'application/json','cache-control':'no-store',...cors(request)}})
function pathAllowed(request){
 try{
  const url=new URL(request.url)
  return (url.protocol==='http:'||url.protocol==='https:')&&
   PATHS.has(url.pathname)&&url.search===''&&url.hash===''
 }catch{return false}
}
export function createPazoLiveProvisioningIntake({released=false,provision}={}){
 return async req=>{
  if(released!==true)return deny(req,503,'live_provisioning_not_released')
  if(!(req instanceof Request)||!pathAllowed(req))
   return deny(req,400,'invalid_provisioning_request')
  const origin=req.headers.get('origin')
  if(origin!==null&&!ORIGINS.has(origin))
   return deny(req,403,'untrusted_origin')
  if(req.method==='OPTIONS'){
   if(origin===null||req.headers.get('access-control-request-method')!=='POST')
    return deny(req,400,'invalid_provisioning_preflight')
   return new Response(null,{status:204,headers:{'cache-control':'no-store',...cors(req)}})
  }
  if(req.method!=='POST'||typeof provision!=='function')
   return deny(req,405,'provisioning_unavailable')
  if(!BEARER.test(req.headers.get('authorization')||'')||
   !JSON_TYPE.test(req.headers.get('content-type')||''))
   return deny(req,400,'invalid_provisioning_request')
  if(Number(req.headers.get('content-length'))>MAX_BODY)
   return deny(req,413,'provisioning_request_too_large')
  let text
  try{text=await req.text()}catch{return deny(req,400,'invalid_provisioning_request')}
  if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>MAX_BODY)
   return deny(req,413,'provisioning_request_too_large')
  let data
  try{data=JSON.parse(text)}catch{return deny(req,400,'invalid_provisioning_request')}
  if(!data||Array.isArray(data)||typeof data!=='object'||
   Object.keys(data).length!==allowedKeys.length||
   Object.keys(data).some(k=>!allowedKeys.includes(k)))
   return deny(req,400,'invalid_provisioning_request')
  let outcome
  try{outcome=await provision({...data,request:req})}
  catch{return deny(req,503,'provisioning_backend_unavailable')}
  if(outcome?.ok===true&&outcome?.code==='generation_secret_names_confirmed'&&
   outcome?.liveActivated===false&&outcome?.mayCharge===false&&
   outcome?.credentialsExposed===false)
   return new Response(JSON.stringify({ok:true,
    code:'generation_secret_names_confirmed',liveActivated:false,
    mayCharge:false}),{status:202,headers:{
    'content-type':'application/json','cache-control':'no-store',...cors(req)}})
  // Never reflect backend errors or request fields. In particular no
  // client_secret, PAT, PayPal OAuth token, plan, merchant fingerprint.
  return deny(req,503,'provisioning_not_completed')
 }
}
