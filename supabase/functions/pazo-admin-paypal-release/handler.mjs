// Fresh GoTrue/admin/TOTP gate precedes the service-only atomic SQL controller.
// No PayPal calls, credentials, user-supplied owner or release evidence.
const ORIGIN='https://pazo-app-t83r.vercel.app'
const CANONICAL_ORIGIN='https://pazo-app.vercel.app'
const allowedOrigin=value=>value===ORIGIN||value===CANONICAL_ORIGIN
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const CONFIRMATIONS=Object.freeze({canary:'AUTORIZO PRUEBA LIVE DE 2.99 USD',
 public:'AUTORIZO PUBLICAR CHECKOUT LIVE',stop:'DETENER NUEVAS COMPRAS'})
const CODES=new Set(['invalid_release_request','release_state_unavailable','release_request_conflict',
 'release_revision_changed','release_engineering_pending','release_credentials_unverified',
 'original_operator_required','release_worker_unavailable','release_terms_unavailable',
 'release_stop_before_new_canary','release_canary_required','release_canary_evidence_pending',
 'release_reconciliation_pending'])
const SUCCESS=new Set(['release_request_already_recorded','new_checkout_already_stopped','release_state_updated'])
const reply=(req,status,code,extra={})=>new Response(JSON.stringify({code,mayCharge:false,...extra}),{
 status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',
  vary:'Origin',...(allowedOrigin(req.headers.get('origin'))?{'access-control-allow-origin':req.headers.get('origin'),
   'access-control-allow-methods':'POST, OPTIONS',
   'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-supabase-api-version,x-region,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version'}:{})}
})
async function readBody(req){
 const length=req.headers.get('content-length')
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>2048))throw Error('size')
 if(!req.body)throw Error('body')
 const reader=req.body.getReader();const chunks=[];let size=0
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break
   size+=value.byteLength
   if(size>2048){await reader.cancel();throw Error('size')}
   chunks.push(value)
  }
 }finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))
}
export function createPazoLiveReleaseHandler({authenticateAdmin,changeRelease}={}){
 return async req=>{
  if(!(req instanceof Request))return new Response(null,{status:400})
  let url
  try{url=new URL(req.url)}catch{return reply(req,400,'invalid_release_request')}
  if(!['/functions/v1/pazo-admin-paypal-release','/pazo-admin-paypal-release'].includes(url.pathname)||url.search)
   return reply(req,404,'route_not_found')
  if(!allowedOrigin(req.headers.get('origin')))return reply(req,403,'untrusted_origin')
  if(req.method==='OPTIONS')return reply(req,200,'release_preflight')
  if(req.method!=='POST')return reply(req,405,'post_required')
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers.get('content-type')||''))
   return reply(req,415,'json_required')
  if(typeof authenticateAdmin!=='function'||typeof changeRelease!=='function')return reply(req,503,'release_backend_unavailable')
  let actor
  try{actor=await authenticateAdmin(req)}catch{return reply(req,403,'fresh_admin_mfa_required')}
  if(!UUID.test(actor?.id||'')||actor.isAdmin!==true||actor.freshSession!==true)
   return reply(req,403,'fresh_admin_mfa_required')
  let body
  try{body=await readBody(req)}catch{return reply(req,400,'invalid_release_request')}
  if(!body||Array.isArray(body)||typeof body!=='object'||
   Object.keys(body).sort().join(',')!=='action,confirmation,expectedRevision,requestId'||
   !Object.hasOwn(CONFIRMATIONS,body.action)||body.confirmation!==CONFIRMATIONS[body.action]||
   !Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0||!UUID.test(body.requestId||''))
   return reply(req,400,'explicit_release_confirmation_required')
  let result
  try{result=await changeRelease({actorId:actor.id,action:body.action,
   expectedRevision:body.expectedRevision,requestId:body.requestId})}
  catch{return reply(req,503,'release_outcome_unknown')}
  if(SUCCESS.has(result?.code)&&['off','canary','public'].includes(result.mode)&&
   Number.isSafeInteger(result.revision)&&result.revision>=0)
   return reply(req,200,result.code,{mode:result.mode,revision:result.revision})
  // Do not expose raw SQL/provider errors or treat missing response as OFF.
  return CODES.has(result?.code)?reply(req,409,result.code):reply(req,503,'release_outcome_unknown')
 }
}
