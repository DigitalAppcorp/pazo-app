// PAZO F16 — Sandbox-only webhook receiver composition. UNDEPLOYED.
// This function is the only assembly point for the verified HTTP intake,
// PayPal's authenticated signature check, and durable service-only inbox RPC.
// No user, membership, founder, ledger, or refund writes happen on delivery.
import {createSafeF16WebhookHandler} from './core.mjs'
import {createPaypalSandboxPostbackVerifier} from './paypalSandboxPostback.mjs'
import {createPaypalVerifiedEventInbox} from './paypalInboxAdapter.mjs'

const PROJECT='https://mrybvqdebbgcayuvgkkr.supabase.co'
const WEBHOOK='6N7889790V1467139'
const PLAN='P-14V25407JP6850922NLHMDKI'
const unavailable=()=>new Response(JSON.stringify({code:'integration_not_configured'}),{
  status:503,headers:{'content-type':'application/json','cache-control':'no-store'},
})

export function createF16SandboxWebhookReceiver({env,fetchImpl=fetch}={}) {
  const get=typeof env?.get==='function'?(key)=>env.get(key):()=>undefined
  // Fail closed if unset, Live, different merchant endpoint or plan; NEVER
  // fall back to Live. PayPal credentials and Supabase role key remain server-only.
  if(get('PAYPAL_ENV')!=='sandbox' ||
     get('PAYPAL_WEBHOOK_ID')!==WEBHOOK ||
     get('PAYPAL_PLAN_ID')!==PLAN ||
     get('SUPABASE_URL')!==PROJECT ||
     typeof fetchImpl!=='function') return unavailable
  let verifySignature,inbox
  try {
    verifySignature=createPaypalSandboxPostbackVerifier({
      clientId:get('PAYPAL_CLIENT_ID'),
      clientSecret:get('PAYPAL_CLIENT_SECRET'),fetchImpl,
    })
    inbox=createPaypalVerifiedEventInbox({
      projectUrl:PROJECT,serviceRoleKey:get('SUPABASE_SERVICE_ROLE_KEY'),
      fetchImpl,
    })
  } catch {
    return unavailable
  }
  return createSafeF16WebhookHandler({
    environment:'sandbox',webhookId:WEBHOOK,planId:PLAN,
    verifySignature,inbox,
  })
}
