// PAZO F16 — release-candidate checkout ENTRYPOINT, not default/deployed.
// This arms ONLY the compiled handler; private SQL selector, onboarding,
// worker health, original Vault generation and signed terms remain required.
// Deploy this exact entrypoint only following Product Owner financial GO,
// preflight on installed SQL and recorded provenance of this SHA.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveHostedCheckout} from './liveHostedCheckout.mjs'
Deno.serve(createPazoLiveHostedCheckout({
 released:true,getEnv:(name:string)=>Deno.env.get(name)
}))
