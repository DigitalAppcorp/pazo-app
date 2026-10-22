// P4 controlled runtime. Compilation/deployment grants no payment admission.
// Mandatory server artifact + SQL mode/owner/revision + worker/intake health;
// only the fresh-MFA operator action can admit a private canary or public use.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveHostedCheckout} from './liveHostedCheckout.mjs'
const CONTROLLED_CHECKOUT_RUNTIME=true
Deno.serve(createPazoLiveHostedCheckout({
 released:CONTROLLED_CHECKOUT_RUNTIME,getEnv:(name:string)=>Deno.env.get(name)
}))
