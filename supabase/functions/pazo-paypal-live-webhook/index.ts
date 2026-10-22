// P4 controlled intake: mandatory operator deployment certificate before use.
// A POST still requires genuine PayPal signature and original-generation scope.
// Queueing never grants a paid period; worker financial admission stays in SQL.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {createPazoLiveHostedWebhook} from './liveHostedWebhook.mjs'
const CONTROLLED_WEBHOOK_RUNTIME=true
Deno.serve(createPazoLiveHostedWebhook({
 released:CONTROLLED_WEBHOOK_RUNTIME,getEnv:(name:string)=>Deno.env.get(name)
}))
