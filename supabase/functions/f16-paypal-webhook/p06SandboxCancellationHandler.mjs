// PAZO F16 — owner-authenticated HTTP cancellation/status core, not deployed.
// Intended for a separate Edge function. Real Auth Admin and rate-limit
// dependencies must be wired server-side; never accept owner/sub ID from UI.
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const json=(status,code,extra={})=>new Response(JSON.stringify({
  ok:status===200,code,paidThrough:null,mayGrantBenefits:false,...extra,
}),{status,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}})
const keys=(obj,required)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).sort().join('|')===required.slice().sort().join('|')
export function createPazoSandboxCancellationHandler({
  resolveAuthenticatedOwner,privateIntentStore,admit,provider,
  trustedOrigins=[],
}={}){
 if(typeof resolveAuthenticatedOwner!=='function'||
  typeof privateIntentStore?.load!=='function'||
  typeof admit!=='function'||
  typeof provider?.read!=='function'||
  typeof provider?.cancel!=='function'||
  !Array.isArray(trustedOrigins)||trustedOrigins.some(v=>
    typeof v!=='string'||!v.startsWith('https://')))
  throw Error('pazo_cancellation_handler_not_configured')
 const allowed=new Set(trustedOrigins)
 return async request=>{
  if(!(request instanceof Request)||request.method!=='POST')
    return json(405,'method_not_allowed')
  const origin=request.headers.get('origin')
  // Browser requests must come from a known exact HTTPS site; the bearer
  // token is also mandatory, even for same-origin requests.
  if(origin!==null&&!allowed.has(origin))
    return json(403,'origin_not_allowed')
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return json(415,'json_required')
  const claimedLength=Number(request.headers.get('content-length')||0)
  if(!Number.isFinite(claimedLength)||claimedLength>2048)
    return json(413,'request_too_large')
  let owner
  try{owner=await resolveAuthenticatedOwner(request)}
  catch{return json(401,'authentication_required')}
  if(!UUID.test(owner||''))return json(401,'authentication_required')
  let payload
  try{
    const raw=await request.text()
    if(raw.length>2048)return json(413,'request_too_large')
    payload=JSON.parse(raw)
  }catch{return json(400,'invalid_request')}
  const wantsCancel=payload?.action==='cancel'
  if(!keys(payload,wantsCancel?
   ['action','intentId','confirmCancellation']:['action','intentId'])||
   !['status','cancel'].includes(payload.action)||
   !INTENT.test(payload.intentId||'')||
   (wantsCancel&&payload.confirmCancellation!==true))
    return json(400,'invalid_request')
  try{if(await admit({ownerId:owner,action:payload.action})!==true)
    return json(429,'rate_limited')}catch{return json(503,'admission_unavailable')}
  let intent
  try{intent=await privateIntentStore.load(payload.intentId,owner)}
  catch{return json(503,'account_lookup_unavailable')}
  if(!intent||intent.ownerId!==owner||intent.state!=='bound'||
    intent.provider!=='paypal'||intent.planId!==PLAN||
    !SUB.test(intent.externalSubscriptionId||''))
    return json(404,'subscription_not_found')
  try{
    const args={intentId:intent.id,subscriptionId:intent.externalSubscriptionId}
    if(payload.action==='status'){
      const state=await provider.read(args)
      return json(200,'subscription_status_verified',{
        providerStatus:state.status,cancelled:state.status==='CANCELLED',
      })
    }
    const state=await provider.cancel(args)
    if(state?.status!=='CANCELLED')
      return json(503,'paypal_confirmation_required')
    // Cancellation changes future renewals, NOT independently proven paid cover.
    return json(200,'future_renewals_cancelled',{providerStatus:'CANCELLED',
      cancelled:true})
  }catch{return json(503,'paypal_confirmation_required')}
 }
}
