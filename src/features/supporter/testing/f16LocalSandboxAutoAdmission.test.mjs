import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
const sql=readFileSync(new URL('../../../../supabase/migrations/20261018170858_f16_local_sandbox_automatic_qa_admission.sql',import.meta.url),'utf8')
test('new Auth owner sees published offer locally without manual QA allowlist',()=>{
 assert.ok(edge.includes("const localSandbox=QA_LOCAL_ORIGINS.has(runtime.origin)"))
 assert.ok(edge.includes("data.action==='begin' && localSandbox"))
 assert.ok(edge.includes("else if(!localSandbox || data.action!=='offer')"))
 assert.ok(edge.includes("if(!await runtime.canBuy(qaOwner))"))
 assert.ok(edge.includes("QA_LOCAL_ORIGINS.has(origin)"))
})
test('automatic admission only after server Auth and explicit consent; never on offer',()=>{
 const auth=edge.indexOf('qaOwner=await runtime.resolveAuthenticatedOwner(request)')
 const after=edge.indexOf("data.action==='begin' && localSandbox")
 const auto=edge.indexOf('runtime.autoAdmitLocalOwner(qaOwner)')
 const offer=edge.indexOf("if(data.action==='offer')",auto)
 assert.ok(auth>=0&&after>auth&&auto>after&&offer>auto)
 const begin=edge.slice(after,offer)
 for(const required of ["c.affirmativeConsent!==true","c.termsVersion!==SANDBOX_BENEFITS_OFFER_V2",
   "!/^[a-f0-9]{64}$/.test(c.termsDigest||'')",
   "explicit_sandbox_consent_required","autoAdmitLocalOwner(qaOwner)"])
  assert.ok(begin.includes(required),required)
 assert.ok(!begin.includes('runtime.checkout.begin('))
 assert.ok(!begin.includes('subscriptionCreator.create('))
})
test('production preview does not automatically authorize unrelated Auth accounts',()=>{
 assert.ok(edge.includes("const QA_LOCAL_ORIGINS=new Set(['http://localhost:5173','http://127.0.0.1:5173'])"))
 const helper=edge.slice(edge.indexOf('const autoAdmitLocalOwner='),edge.indexOf('const inventoryRead=',edge.indexOf('const autoAdmitLocalOwner=')))
 assert.ok(helper.includes('!QA_LOCAL_ORIGINS.has(origin)'))
 assert.ok(edge.includes("get('PAZO_F16_PAYPAL_ENV')!=='sandbox'"))
 assert.ok(edge.includes("get('PAZO_F16_PAYPAL_PLAN_ID')!==PLAN"))
 assert.ok(edge.includes('verify_jwt')===false||!edge.includes('verify_jwt:false'))
})
test('RPC is service-only, does not overwrite disabled owner or make payments',()=>{
 for(const x of ["service_role","REVOKE ALL ON FUNCTION","ON CONFLICT (owner_id) DO NOTHING",
 "AND u.email_confirmed_at IS NOT NULL", "u.is_anonymous IS DISTINCT FROM true",
 "RETURN public.f16_qa_v2_owner_can_checkout(p_owner_id)"])
  assert.ok(sql.includes(x),x)
 assert.ok(!sql.includes('PAYMENT.SALE.COMPLETED'))
 assert.ok(!sql.includes('UPDATE supporter_private.paypal_payment_entries'))
 assert.ok(!sql.includes('INSERT INTO supporter_private.paypal_subscription_intents'))
 assert.ok(!sql.includes('DELETE FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts'))
})
