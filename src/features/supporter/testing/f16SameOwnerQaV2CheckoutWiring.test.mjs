import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const store=readFileSync(new URL('../../../../supabase/functions/f16-paypal-webhook/p06CheckoutConsentStore.mjs',import.meta.url),'utf8')
const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter/index.ts',import.meta.url),'utf8')

test('F16 Sandbox: existing PAZO Auth owner begins a fresh V2 checkout, never overwrites historical P06',()=>{
 assert.match(store,/qaV2=false/)
 assert.match(store,/qaV2\?'f16_qa_v2_begin_checkout':'f16_p06_begin_checkout'/)
 assert.match(store,/qaV2\?'f16_qa_v2_claim_provider_create':'f16_p07_claim_provider_create'/)
 assert.match(store,/sandbox_qa_v2_acceptance_required/)
 assert.match(edge,/createPazoCheckoutConsentStore\(\{projectUrl:BASE,serviceRoleKey:key,qaV2:true\}\)/)
 assert.match(edge,/data\.consent\?\.termsVersion!==SANDBOX_BENEFITS_OFFER_V2/)
 assert.match(edge,/const QA_CHECKOUT_RELEASE_APPROVED = false/)
})
test('F16 Sandbox: status/cancel V2 only use owner-scoped store, not old P06 binding',()=>{
 assert.match(edge,/createPazoSandboxV2AccountStore/)
 assert.match(edge,/privateIntentStore:v2AccountStore/)
 assert.match(edge,/consentStore:v2AccountStore/)
 assert.match(edge,/runtime\.manage\(request\)/)
 assert.match(edge,/const QA_CHECKOUT_RELEASE_APPROVED = false/)
 assert.doesNotMatch(edge,/privateIntentStore:store,\s*provider:cancellation/)
 assert.match(store,/qa_v2_recovery_read_requires_new_binding/)
 assert.match(store,/qa_v2_recovery_bind_requires_new_binding/)
})
