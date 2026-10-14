// PAZO F16 — candidate Supabase Edge entrypoint. NOT DEPLOYED.
// Deployment and activating a public webhook require a separate PO gate.
// This code-level latch cannot be overridden by environment variables.
import {createF16SandboxWebhookReceiver} from './receiver.mjs'

// Safety latch: must be changed in an explicitly approved/reviewed commit
// only after end-to-end tests and provider/secret configuration.
const F16_SANDBOX_RECEIVER_RELEASE_APPROVED = false

const disabled = () => new Response(
  JSON.stringify({code:'f16_receiver_not_released'}),
  {status:503,headers:{'content-type':'application/json','cache-control':'no-store'}},
)

Deno.serve(async (request: Request): Promise<Response> => {
  if(!F16_SANDBOX_RECEIVER_RELEASE_APPROVED) return disabled()
  // Construct privately on the Edge runtime; never use request-supplied env,
  // URLs, webhook IDs or provider keys. All secrets stay on the server.
  try {
    const receive=createF16SandboxWebhookReceiver({env:Deno.env})
    return await receive(request)
  } catch {
    // Never emit raw webhook payload, PayPal PII, API response or credentials.
    return new Response(JSON.stringify({code:'f16_receiver_unavailable'}),{
      status:503,headers:{'content-type':'application/json','cache-control':'no-store'},
    })
  }
})
