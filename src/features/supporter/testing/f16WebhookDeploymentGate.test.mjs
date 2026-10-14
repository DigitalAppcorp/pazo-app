import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('new F16 webhook entrypoint cannot be deployed or enabled accidentally',()=>{
 const source=readFileSync('supabase/functions/f16-paypal-webhook/index.ts','utf8')
 const config=readFileSync('supabase/config.toml','utf8')
 assert.match(source,/const F16_SANDBOX_RECEIVER_RELEASE_APPROVED = false/)
 assert.match(source,/Deno\.serve\(/)
 assert.match(source,/createF16SandboxWebhookReceiver/)
 const section=config.split('[functions.f16-paypal-webhook]')[1]
 assert.ok(section,'new function config required')
 assert.match(section,/enabled = false/)
 assert.match(section,/verify_jwt = false/)
 assert.match(section,/entrypoint = "\.\/functions\/f16-paypal-webhook\/index\.ts"/)
 assert.doesNotMatch(source,/update\s*\(\s*\{[^}]*is_founder/s)
})
test('webhook receiver builds from static Sandbox API, narrow RPC and no user payload',()=>{
 const receiver=readFileSync('supabase/functions/f16-paypal-webhook/receiver.mjs','utf8')
 const inbox=readFileSync('supabase/functions/f16-paypal-webhook/paypalInboxAdapter.mjs','utf8')
 const configGate=readFileSync('supabase/functions/f16-paypal-webhook/sandboxConfigPreflight.mjs','utf8')
 assert.match(receiver,/assessF16SandboxConfig\(env\)\.ready/)
 assert.match(configGate,/PAZO_F16_PAYPAL_ENV:'sandbox'/)
 assert.match(configGate,/PAZO_F16_PAYPAL_WEBHOOK_ID:'6N7889790V1467139'/)
 assert.match(receiver,/createPaypalSandboxPostbackVerifier/)
 assert.match(receiver,/createPaypalVerifiedEventInbox/)
 assert.match(inbox,/f16_paypal_record_verified_event/)
 const core=readFileSync('supabase/functions/f16-paypal-webhook/core.mjs','utf8')
 const gate=readFileSync('supabase/functions/f16-paypal-webhook/workerAdmissionGate.mjs','utf8')
 assert.match(core,/f16WorkerAdmissionGate/)
 assert.match(core,/admissionGate\.tryEnter\(\)/)
 assert.match(core,/finally\s*\{[\s\S]*release\(\)/)
 assert.match(gate,/maxInFlight=4, maxPerWindow=60/)
 assert.match(gate,/export const f16WorkerAdmissionGate=createF16WorkerAdmissionGate\(\)/)
 assert.doesNotMatch(receiver,/api-m\.paypal\.com(?!\.sandbox)/)
})

test('F16 must not read or require generic PayPal secrets used by legacy v30',()=>{
  const paths=[
    'supabase/functions/f16-paypal-webhook/receiver.mjs',
    'supabase/functions/f16-paypal-webhook/sandboxConfigPreflight.mjs',
    'supabase/functions/f16-paypal-webhook/.env.example',
  ]
  for(const path of paths){
    const code=readFileSync(path,'utf8')
    // Project-wide PAYPAL_* is consumed by the legacy v30 webhook.
    // The new F16 receiver must use its own PAZO_F16_PAYPAL_* names.
    assert.doesNotMatch(code,/(?<!PAZO_F16_)PAYPAL_(?:ENV|CLIENT_ID|CLIENT_SECRET|PLAN_ID|WEBHOOK_ID)/,
      'generic project-wide PayPal configuration forbidden in F16: '+path)
    assert.match(code,/PAZO_F16_PAYPAL_/)
  }
})
