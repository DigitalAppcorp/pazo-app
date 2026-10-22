// Internal random invoker capability is checked by service-only SQL admission.
// Database control starts disabled, processing OFF; this cannot create a charge.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveHostedPrivateWorker} from './hostedPrivateWorker.mjs'
Deno.serve(createPazoLiveHostedPrivateWorker({released:true,getEnv:(name:string)=>Deno.env.get(name)}))
