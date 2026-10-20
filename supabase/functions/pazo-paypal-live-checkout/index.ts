// PAZO F16 — Hosted Live recurring checkout. Code wired, RELEASE OFF.
// Public beta changes the release latch only after end-to-end merchant,
// verified webhook, ledger and Product Owner launch gates pass.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveHostedCheckout} from './liveHostedCheckout.mjs'
const LIVE_CHECKOUT_RELEASED=false
Deno.serve(createPazoLiveHostedCheckout({
 released:LIVE_CHECKOUT_RELEASED,getEnv:(name:string)=>Deno.env.get(name)
}))
