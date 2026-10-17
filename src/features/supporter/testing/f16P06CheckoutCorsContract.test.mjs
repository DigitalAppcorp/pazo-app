import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

// The browser explicitly sends authorization, apikey, content-type.
// The Edge OPTIONS response must allow all three; missing apikey makes
// preflight fail before the user can view the published QA offer.
const endpoint=readFileSync(
 new URL('../../../../supabase/functions/f16-paypal-supporter/index.ts',import.meta.url),'utf8')
const browser=readFileSync(
 new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')

test('F16-P06 QA CORS OPTIONS includes all client request headers',()=>{
 assert.match(browser,/authorization:\s*'Bearer '/)
 assert.match(browser,/apikey:config\.key/)
 assert.match(browser,/'content-type':'application\/json'/)
 assert.match(endpoint,/'access-control-allow-headers':'authorization, apikey, content-type'/)
 assert.match(endpoint,/if\(request\.method==='OPTIONS'\)/)
 assert.match(endpoint,/'access-control-allow-methods':'POST, OPTIONS'/)
})
test('QA CORS fix never opens the PayPal checkout or entitlements',()=>{
 assert.match(endpoint,/const QA_CHECKOUT_RELEASE_APPROVED = false/)
 assert.match(endpoint,/if\(!QA_CHECKOUT_RELEASE_APPROVED \|\|/)
 assert.match(endpoint,/return addCors\(reply\(503,'paid_supporter_checkout_not_released'\)/)
 assert.match(endpoint,/const QA_V2_MANAGEMENT_RELEASE_APPROVED = false/)
 assert.match(endpoint,/if\(!QA_CHECKOUT_RELEASE_APPROVED && !QA_V2_MANAGEMENT_RELEASE_APPROVED\)/)
 assert.match(endpoint,/verifyAuthenticatedOwner|resolveAuthenticatedOwner/)
 assert.match(endpoint,/mayGrantBenefits:false/)
})
