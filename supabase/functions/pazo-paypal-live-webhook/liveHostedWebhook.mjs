// PAZO F16 — Live PayPal webhook hosted composition. OFF BY DEFAULT.
// No browser user input can configure merchant generations or secret access.
// A signed event is only queued; a separate reconciler must verify sales,
// subscription periods and reversals before granting any membership benefits.
import {createPazoLiveGenerationPinnedWebhook} from './liveGenerationPinnedWebhook.mjs'
import {createPazoLiveEdgeHistoricalVerification} from './liveHistoricalReadPipeline.mjs'
import {createPazoLiveHostedInbox} from './liveHostedInbox.mjs'
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
 let pipeline,inbox
 try{
  pipeline=createPazoLiveEdgeHistoricalVerification({
   supabaseUrl:url,serviceRoleKey:service,
   getSecret:name=>getEnv(name),released:true,fetchImpl
  })
  inbox=createPazoLiveHostedInbox({
   supabaseUrl:url,serviceRoleKey:service,fetchImpl
  })
 }catch{return unavailable}
 return createPazoLiveGenerationPinnedWebhook({
  released:true,resolveVerifierForGeneration:pipeline.verifierForGeneration,
  provePazoScope:pipeline.provePazoScope,inbox
 })
}
