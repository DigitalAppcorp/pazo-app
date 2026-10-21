import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const ui=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
const provision=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-validate/liveEdgeProvisioning.mjs',import.meta.url),'utf8')
test('Live admin readiness cannot mistake a verified Vault credential for Edge provisioning',()=>{
 assert.match(ui,/const LIVE_EDGE_PROVISIONING_RELEASED=false/)
 assert.match(ui,/const legacyVaultLiveOAuthReady=liveConfig\?\.client_id_stored===true/)
 assert.match(ui,/const liveOAuthReady=LIVE_EDGE_PROVISIONING_RELEASED&&liveConfig\?\.edge_generation_verified===true/)
 assert.match(ui,/Credenciales Live en Edge verificadas/)
 assert.match(ui,/OAuth Live de Vault verificado; aprovisionamiento Edge todavía pendiente/)
 assert.doesNotMatch(ui,/const liveOAuthReady=liveConfig\?\.client_id_stored/)
})
test('administrative Edge provisioning never activates a Live checkout',()=>{
 assert.match(provision,/released=false/)
 assert.match(provision,/liveCheckoutEnabled!==false/)
 assert.match(provision,/killSwitch!==true/)
 assert.match(provision,/merchantIdentityVerified!==true/)
 assert.match(provision,/secret_write_outcome_unknown_manual_review/)
 assert.match(provision,/liveActivated:false/)
 assert.doesNotMatch(provision,/CREATE SUBSCRIPTION|PAYMENT\.SALE|GRANT EXECUTE|UPDATE admin_private/i)
})
