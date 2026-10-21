// PAZO F16 — merchant-generation pinned LIVE webhook router, CODE-ONLY,
// NOT DEPLOYED. Never creates a checkout, credits a sale or exposes secrets.
// The URL ?generation=7 is only an UNTRUSTED routing hint to choose original
// merchant credentials for PayPal signed postback. The signed event's owner
// must match the SAME generation from the immutable PAZO DB binding.
import {createPazoLiveWebhookIntake} from './liveIngress.mjs'
const error=(status,code)=>new Response(JSON.stringify({code}),{
 status,headers:{'content-type':'application/json','cache-control':'no-store'}
})
const HINT=/^[1-9]\d{0,3}$/
const MAX_GEN=9999
export function createPazoLiveGenerationPinnedWebhook({
 released=false,resolveVerifierForGeneration,provePazoScope,inbox
}={}){
 return async function pinnedWebhook(request){
  // Compile-time release latch is separately reviewed before deployment.
  if(released!==true)return error(503,'live_ingress_not_released')
  if(typeof resolveVerifierForGeneration!=='function'||
   typeof provePazoScope!=='function'||
   typeof inbox?.recordIfAbsent!=='function')
   return error(503,'live_ingress_not_configured')
  if(!(request instanceof Request))
   return error(400,'invalid_request')
  let url
  try{url=new URL(request.url)}catch{return error(400,'invalid_request_url')}
  if(!new Set(['/functions/v1/pazo-paypal-live-webhook','/pazo-paypal-live-webhook']).has(url.pathname)||
   url.searchParams.size!==1||url.searchParams.getAll('generation').length!==1||
   url.hash!==''||!HINT.test(url.searchParams.get('generation')||''))
   return error(400,'invalid_merchant_generation_hint')
  const generation=Number(url.searchParams.get('generation'))
  if(!Number.isSafeInteger(generation)||generation>MAX_GEN)
   return error(400,'invalid_merchant_generation_hint')
  let verifier
  try{verifier=await resolveVerifierForGeneration({
   merchantGeneration:generation,sourceEnvironment:'live'
  })}catch{return error(503,'merchant_webhook_config_unavailable')}
  if(typeof verifier?.verifySignature!=='function'||typeof verifier?.webhookId!=='string'||
   !/^[A-Za-z0-9_-]{8,100}$/.test(verifier.webhookId))
   return error(503,'merchant_webhook_config_unavailable')
  const verifyOriginalOwner=async input=>{
   const scope=await provePazoScope(input)
   if(scope?.confirmed!==true||scope.merchantGeneration!==generation)
    throw Error('signed_event_other_merchant')
   return scope
  }
  return createPazoLiveWebhookIntake({
   released:true,environment:'live',webhookId:verifier.webhookId,
   verifySignature:verifier.verifySignature,
   provePazoScope:verifyOriginalOwner,inbox
  })(request)
 }
}
