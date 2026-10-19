// PAZO F16 Live webhook Edge placeholder — DO NOT deploy or enable.
// Production activation requires a separate PO-approved migration, Vault
// generations, verified merchant/owner scope, durable inbox + rollback.
// No runtime environment variable can turn this code-level latch on.
import {createPazoLiveWebhookIntake} from './liveIngress.mjs'
const LIVE_WEBHOOK_RELEASED=false
const unavailable=()=>new Response(JSON.stringify({code:'live_webhook_not_released'}),{
 status:503,headers:{'content-type':'application/json','cache-control':'no-store'}
})
Deno.serve(async(request:Request):Promise<Response>=>{
 if(!LIVE_WEBHOOK_RELEASED)return unavailable()
 // Deliberately NOT wired: unsafe to ACK webhooks before durable merchant-scoped
 // persistence and a real Live cancellation/ledger adapter are provisioned.
 // Deployed future code must inject server-owned verifier, scope and inbox.
 const handler=createPazoLiveWebhookIntake()
 return handler(request)
})
