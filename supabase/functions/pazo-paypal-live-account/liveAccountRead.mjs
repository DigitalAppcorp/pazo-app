// PAZO F16 — read-only authenticated owner's original Live checkout slot.
// No subscription creation, provider API, credentials, finance, or cancellation.
// Sanitizes the service-role SQL response: never expose PayPal subscription IDs,
// request keys, merchant IDs, owner IDs, raw plan, original origin or signatures.
const PATHS=new Set(['/pazo-paypal-live-account',
 '/functions/v1/pazo-paypal-live-account'])
const ORIGINS=new Set(['https://pazo-app-t83r.vercel.app',
 'http://localhost:5173','http://127.0.0.1:5173'])
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const INTENT=/^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const reply=(req,status,code,extra={})=>{
 const origin=req?.headers?.get?.('origin')
 const cors=ORIGINS.has(origin)?{
  'access-control-allow-origin':origin,
  'access-control-allow-methods':'POST, OPTIONS',
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
  vary:'Origin'}:{vary:'Origin'}
 return new Response(JSON.stringify({ok:status===200,code,
  environment:'live',mayCharge:false,mayGrantBenefits:false,
  paidThrough:null,...extra}),{
  status,headers:{...cors,'content-type':'application/json',
   'cache-control':'no-store','x-content-type-options':'nosniff'}})
}
export function normalizePazoLiveOwnerSlots(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  raw.source!=='private_original_live_owner_checkouts'||
  !Array.isArray(raw.accounts)||raw.accounts.length>20||
  (raw.currentIntentId!==null&&!INTENT.test(raw.currentIntentId||'')))
  throw Error('untrusted_owner_slots')
 const open=[]
 for(const entry of raw.accounts){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
   !INTENT.test(entry.intentId||'')||
   !['pending','bound'].includes(entry.state)||
   !Number.isInteger(entry.merchantGeneration)||entry.merchantGeneration<1||
   typeof entry.createdAt!=='string'||!Number.isFinite(Date.parse(entry.createdAt))||
   !(entry.closedAt===null||typeof entry.closedAt==='string')||
   !(entry.providerStatus===null||
    (typeof entry.providerStatus==='string'&&/^[A-Z_]{2,35}$/.test(entry.providerStatus)))||
   !(entry.providerCreateClaimedAt===null||typeof entry.providerCreateClaimedAt==='string')||
   !(entry.subscriptionId===null||typeof entry.subscriptionId==='string')
  )throw Error('untrusted_owner_slots')
  if(entry.closedAt!==null)continue
  open.push({intentId:entry.intentId,state:entry.state,
   canDownloadAcceptance:false,
   needsReconciliation:entry.state==='pending'&&entry.providerCreateClaimedAt!==null})
 }
 if(open.length>1||
  (open.length===0&&raw.currentIntentId!==null)||
  (open.length===1&&open[0].intentId!==raw.currentIntentId))
  throw Error('untrusted_owner_slots')
 return open
}
export function createPazoLiveOwnerAccountRead({released=false,
 resolveAuthenticatedOwner,readPrivateOwner}={}){
 return async request=>{
  if(released!==true)return reply(request,503,'live_account_read_not_released')
  if(!(request instanceof Request))return reply(request,400,'invalid_request')
  let url
  try{url=new URL(request.url)}catch{return reply(request,400,'invalid_request')}
  if(!PATHS.has(url.pathname)||url.search||url.hash)
   return reply(request,400,'invalid_request')
  const origin=request.headers.get('origin')
  if(origin!==null&&!ORIGINS.has(origin))
   return reply(request,403,'untrusted_origin')
  if(request.method==='OPTIONS'){
   if(!origin||request.headers.get('access-control-request-method')!=='POST')
    return reply(request,400,'invalid_preflight')
   const r=reply(request,204,'')
   return new Response(null,{status:204,headers:r.headers})
  }
  if(request.method!=='POST')return reply(request,405,'post_required')
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(
   request.headers.get('content-type')||''))
   return reply(request,415,'json_required')
  if(typeof resolveAuthenticatedOwner!=='function'||
   typeof readPrivateOwner!=='function')
   return reply(request,503,'live_account_backend_unavailable')
  let data
  try{
   const advertised=request.headers.get('content-length')
   if(advertised!==null&&(!/^\d+$/.test(advertised)||Number(advertised)>256))
    return reply(request,413,'request_too_large')
   const body=await request.text()
   if(body.length>256)throw Error('too_large')
   data=JSON.parse(body)
  }catch{return reply(request,400,'invalid_request')}
  if(!data||typeof data!=='object'||Array.isArray(data)||
   Object.keys(data).length!==1||data.action!=='list')
   return reply(request,400,'invalid_request')
  let owner
  try{owner=await resolveAuthenticatedOwner(request)}
  catch{return reply(request,401,'authentication_required')}
  if(!UUID.test(owner||''))return reply(request,401,'authentication_required')
  try{
   const slots=await readPrivateOwner({ownerId:owner})
   const accounts=normalizePazoLiveOwnerSlots(slots)
   return reply(request,200,'live_account_list_verified',{accounts})
  }catch{return reply(request,503,'live_account_list_unavailable')}
 }
}
