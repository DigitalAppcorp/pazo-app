// PAZO F18: isolated, administrator MFA-gated original PayPal evidence read.
// No user-controlled PayPal identifiers, subscriptions, leases, retries,
// payments, cancellations, settlement writes, or financial status changes.
const PATHS=new Set(['/functions/v1/pazo-admin-paypal-original-audit',
 '/pazo-admin-paypal-original-audit'])
const ORIGINS=new Set(['https://pazo-app.vercel.app',
 'https://pazo-app-t83r.vercel.app','http://localhost:5173',
 'http://127.0.0.1:5173'])
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const STATES=new Set(['APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED'])
const ERRORS=new Set(['RESOURCE_NOT_FOUND','NOT_AUTHORIZED','PERMISSION_DENIED',
 'INVALID_RESOURCE_ID','AUTHENTICATION_FAILURE','INTERNAL_SERVER_ERROR',
 'UNPROCESSABLE_ENTITY','INVALID_REQUEST'])
const FAILURES=new Set(['network','http','content_type','body','json','object'])
const CODES=new Set(['qa_signed_event_unverified',
 'qa_provider_read_subscription_get_unavailable','qa_provider_read_oauth_unavailable',
 'qa_provider_read_plan_get_unavailable','qa_provider_read_plan_terms_unavailable',
 'qa_provider_read_transactions_get_unavailable',
 'qa_provider_read_transactions_shape_unavailable',
 'qa_provider_read_pagination_unavailable',
 'qa_provider_read_transaction_coverage_unavailable',
 'qa_provider_read_binding_unavailable',
 'qa_provider_read_create_time_unavailable'])
const tri=v=>v===true?true:v===false?false:null
const number=v=>Number.isSafeInteger(v)&&v>=0&&v<=500?v:null
const response=(req,status,code,other={})=>{
 const origin=req?.headers?.get?.('origin')
 const cors=ORIGINS.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin',
  'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version'}:{}
 return new Response(status===204?null:JSON.stringify({
  ok:status===200,code,mayCharge:false,mayCancel:false,mayGrantBenefits:false,...other
 }),{status,headers:{'content-type':'application/json','cache-control':'no-store',
  'x-content-type-options':'nosniff',...cors}})
}
async function body(req){
 const len=req.headers.get('content-length')
 if(len!==null&&(!/^\d{1,3}$/.test(len)||Number(len)>180))throw Error('body')
 if(!req.body)throw Error('body')
 const reader=req.body.getReader()
 const chunks=[];let length=0
 try{for(;;){
  const {done,value}=await reader.read();if(done)break
  if(!(value instanceof Uint8Array))throw Error('body')
  length+=value.byteLength;if(length>180){await reader.cancel().catch(()=>{});throw Error('body')}
  chunks.push(value)
 }}finally{reader.releaseLock()}
 const all=new Uint8Array(length);let n=0
 for(const chunk of chunks){all.set(chunk,n);n+=chunk.byteLength}
 const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all))
 if(!input||typeof input!=='object'||Array.isArray(input)||
  Object.keys(input).sort().join(',')!=='action,confirmation'||
  input.action!=='read_original'||
  input.confirmation!=='CONSULTAR EVIDENCIA ORIGINAL')throw Error('body')
 return input
}
function sanitize(a){
 // Auditing an inaccessible subscription can still independently read the
 // signed event. Never substitute a 404 for a terminal status or zero sales.
 return Object.freeze({
  evidenceComplete:tri(a.complete),
  auditCode:CODES.has(a.code)?a.code:null,
  planVerified:tri(a.planVerified),
  originalPlanVerified:tri(a.originalPlanVerified),
  bindingVerified:tri(a.bindingVerified),
  originalGenerationVerified:tri(a.originalGenerationVerified),
  eventReadable:tri(a.eventReadable),
  signedEventMatches:tri(a.signedEventMatches),
  providerStatus:STATES.has(a.status)?a.status:null,
  providerHttpStatus:Number.isSafeInteger(a.providerHttpStatus)&&
   a.providerHttpStatus>=400&&a.providerHttpStatus<=599?a.providerHttpStatus:null,
  providerErrorName:ERRORS.has(a.providerErrorName)?a.providerErrorName:null,
  providerFailure:FAILURES.has(a.providerFailure)?a.providerFailure:null,
  transactionsComplete:tri(a.transactionsComplete),
  transactionCount:number(a.transactionCount),
  completedPayments:number(a.completedPayments)
 })
}
export function createPazoF18AdminOriginalAuditHandler({
 released=false,authenticateAdmin,readOriginalAudit
}={}){
 return async(req)=>{
  if(!(req instanceof Request))return response(null,400,'invalid_request')
  let url;try{url=new URL(req.url)}catch{return response(req,400,'invalid_request')}
  if(!PATHS.has(url.pathname)||url.search||url.hash)return response(req,404,'not_found')
  const origin=req.headers.get('origin')
  if(!ORIGINS.has(origin))return response(req,403,'untrusted_origin')
  if(req.method==='OPTIONS')return req.headers.get('access-control-request-method')==='POST'
   ?response(req,204,'preflight'):response(req,400,'invalid_request')
  if(req.method!=='POST')return response(req,405,'post_required')
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
   req.headers.get('content-type')||''))return response(req,415,'json_required')
  if(released!==true||typeof authenticateAdmin!=='function'||
   typeof readOriginalAudit!=='function')return response(req,503,'audit_service_unavailable')
  let admin
  try{admin=await authenticateAdmin(req)}catch{return response(req,403,'fresh_admin_mfa_required')}
  if(!UUID.test(admin?.id||'')||admin.isAdmin!==true||admin.freshSession!==true)
   return response(req,403,'fresh_admin_mfa_required')
  try{await body(req)}catch{return response(req,400,'explicit_confirmation_required')}
  let audit
  try{audit=await readOriginalAudit({actorId:admin.id})}catch{
   return response(req,503,'audit_transport_unavailable')
  }
  if(audit?.source!=='original_qa_provider_audit_v1')return response(req,503,'audit_result_unavailable')
  if(audit.code==='no_original_qa_contract')return response(req,409,'original_scope_unavailable')
  return response(req,200,'original_evidence_checked',{audit:sanitize(audit)})
 }
}
