// PAZO F16 — Live PayPal webhook hosted composition. OFF BY DEFAULT.
// No browser user input can configure merchant generations or secret access.
// A signed event is only queued; a separate reconciler must verify sales,
// subscription periods and reversals before granting any membership benefits.
import {createPazoLiveGenerationPinnedWebhook} from './liveGenerationPinnedWebhook.mjs'
import {createPazoLiveVaultHistoricalVerification} from './liveHistoricalReadPipeline.mjs'
import {createPazoLiveHostedInbox} from './liveHostedInbox.mjs'
import {createPazoLiveServiceRpc} from '../pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const unavailable=()=>new Response(JSON.stringify({code:'live_webhook_not_released'}),{
 status:503,headers:{'content-type':'application/json','cache-control':'no-store'}
})
export function createPazoLiveHostedWebhook({
 released=false,getEnv=()=>undefined,fetchImpl=fetch
}={}){
 if(released!==true)return unavailable
 let url,service
 try{
  url=getEnv('SUPABASE_URL')
  service=getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if(url!==PROJECT||typeof service!=='string'||service.length<24)throw Error('missing')
 }catch{return unavailable}
 let pipeline,inbox,rpc
 try{
  rpc=createPazoLiveServiceRpc({projectUrl:url,serviceRoleKey:service,fetchImpl})
  pipeline=createPazoLiveVaultHistoricalVerification({
   supabaseUrl:url,serviceRoleKey:service,released:true,fetchImpl
  })
  inbox=createPazoLiveHostedInbox({
   supabaseUrl:url,serviceRoleKey:service,fetchImpl
  })
 }catch{return unavailable}
 const handle=createPazoLiveGenerationPinnedWebhook({
  released:true,resolveVerifierForGeneration:pipeline.verifierForGeneration,
  provePazoScope:pipeline.provePazoScope,inbox
 })
 return async request=>{
  try{
   if(await rpc('releaseRuntime',{p_component:'webhook',p_build:'pazo_live_webhook_controlled_v1'})!==true)return unavailable()
  }catch{return unavailable()}
  // Minimal same-project availability probe, never signature/payment evidence.
  // POST continues through the full signed original-generation pipeline.
  if(request instanceof Request&&request.method==='GET'){
   const parsed=new URL(request.url)
   if(!parsed.search&&['/functions/v1/pazo-paypal-live-webhook','/pazo-paypal-live-webhook'].includes(parsed.pathname))
    return new Response(JSON.stringify({source:'pazo_live_webhook_readiness_v1',ready:true,mayGrantBenefits:false}),{
     status:200,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})
  }
  return handle(request)
 }
}
