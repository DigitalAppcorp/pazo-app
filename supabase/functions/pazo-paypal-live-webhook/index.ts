// PAZO F16 — hosted Live PayPal webhook wired, safely dormant.
// PayPal requires a public unauthenticated webhook endpoint; this does not
// authorize event ingestion until the PO release gate is enabled in code.
// A valid signed event is only queued; never credits an unpaid member.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveHostedWebhook} from './liveHostedWebhook.mjs'
const LIVE_WEBHOOK_RELEASED=false
Deno.serve(createPazoLiveHostedWebhook({
 released:LIVE_WEBHOOK_RELEASED,getEnv:(name:string)=>Deno.env.get(name)
}))
