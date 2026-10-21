// PAZO F16 — signed Live webhook candidate, not default/deployed.
// May only queue events after PayPal verification, original owner binding
// and generation validation. Never credits paid periods synchronously.
// Candidate needs its own postflight and Product Owner GO; never install
// this entrypoint merely because the two files exist in the repository.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveHostedWebhook} from './liveHostedWebhook.mjs'
Deno.serve(createPazoLiveHostedWebhook({
 released:true,getEnv:(name:string)=>Deno.env.get(name)
}))
