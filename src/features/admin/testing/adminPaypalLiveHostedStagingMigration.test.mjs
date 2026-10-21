import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../../../../supabase/migrations/20261019235351_pazo_f16_live_gateway_inert_private_staging.sql',import.meta.url),'utf8')
const lab=readFileSync(new URL('../../../../scripts/f16-live-gateway-disposable-lab.sql',import.meta.url),'utf8')
test('staged SQL requires existing Sandbox runtime and never releases Live',()=>{
 assert.match(sql,/to_regclass\('admin_private\.paypal_gateway_runtime'\)/)
 assert.match(sql,/to_regclass\('admin_private\.admin_grants'\)/)
 assert.match(sql,/active_environment='sandbox'/)
 assert.match(sql,/live_checkout_enabled=false/)
 for(const invariant of [
  "CHECK(environment='sandbox')","CHECK(live_enabled=false)",
  "CHECK(kill_switch=true)","CHECK(active_generation IS NULL)"
 ])assert.ok(sql.includes(invariant),invariant)
 assert.ok(lab.includes('supabase/migrations/20261019235351_pazo_f16_live_gateway_inert_private_staging.sql'))
})
test('inert private model restricts all payment data and privileged functions',()=>{
 const n=(sql.match(/CREATE TABLE /g)||[]).length
 assert.equal(n,9)
 assert.equal((sql.match(/FORCE ROW LEVEL SECURITY/g)||[]).length,n)
 assert.equal((sql.match(/REVOKE ALL ON /g)||[]).length>=n,true)
 assert.doesNotMatch(sql,/GRANT (?:EXECUTE|SELECT|INSERT|UPDATE|DELETE|ALL)\b/)
 assert.doesNotMatch(sql,/CREATE(?: OR REPLACE)? FUNCTION public\./)
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE TABLE|DELETE FROM supporter_private\.paypal_verified_event_inbox/i)
})
test('period integrity and cancellation operations are gated and private',()=>{
 for(const phrase of [
  "verified_event_type='PAYMENT.SALE.COMPLETED'",
  'pazo_live_claim_cancel_once','pazo_live_project_paid_periods',
  'pazo_paypal_live_paid_periods','pazo_paypal_live_period_holds',
  'pazo_paypal_live_event_inbox','pazo_paypal_switch_live_atomically',
  'pazo_paypal_stop_new_checkout_atomically'
 ])assert.ok(sql.includes(phrase),phrase)
 assert.doesNotMatch(sql,/payer_email|payer_name|raw_payload|ip_address|user_agent/i)
})
