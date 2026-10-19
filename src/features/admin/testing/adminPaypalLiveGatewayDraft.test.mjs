import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../../../../supabase/drafts/f16_live_gateway_generation_inbox_DISPOSABLE_ONLY.sql',import.meta.url),'utf8')
test('draft refuses PAZO hosted DB and requires isolated postgres laboratory',()=>{
 assert.match(sql,/current_database\(\)<>'f14_synthetic'/)
 assert.match(sql,/current_user<>'postgres'/)
 assert.match(sql,/RAISE EXCEPTION 'F16 LIVE GATEWAY DISPOSABLE ONLY'/)
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION public\./)
 assert.doesNotMatch(sql,/GRANT EXECUTE/)
})
test('merchant version, owner consent, idempotency, inbox and refund holds are separate',()=>{
 for(const name of [
  'pazo_paypal_merchant_generations',
  'pazo_paypal_new_checkout_switch',
  'pazo_paypal_switch_audit',
  'pazo_paypal_live_checkout_intents',
  'pazo_paypal_live_event_inbox',
  'pazo_paypal_live_paid_periods',
  'pazo_paypal_live_period_holds',
 ])assert.ok(sql.includes('CREATE TABLE '+(name.startsWith('pazo_paypal_live')?
 'supporter_private.':'admin_private.')+name))
 assert.match(sql,/UNIQUE\(owner_id,request_key\)/)
 assert.match(sql,/PRIMARY KEY\(merchant_generation,provider_event_id\)/)
 assert.match(sql,/UNIQUE\(intent_id,cycle_key\)/)
 assert.match(sql,/CHECK\(amount_minor=299\)/)
 assert.match(sql,/CHECK\(currency='USD'\)/)
})
test('no hosted activation, table privileges or grant to frontend, with forced RLS',()=>{
 assert.match(sql,/CHECK\(environment='sandbox'\)/)
 assert.match(sql,/CHECK\(live_enabled=false\)/)
 assert.match(sql,/CHECK\(kill_switch=true\)/)
 assert.match(sql,/CHECK\(active_generation IS NULL\)/)
 const count=(sql.match(/CREATE TABLE /g)||[]).length
 assert.equal(count,7)
 assert.equal((sql.match(/FORCE ROW LEVEL SECURITY/g)||[]).length,count)
 assert.equal((sql.match(/REVOKE ALL ON /g)||[]).length,count)
 assert.doesNotMatch(sql,/GRANT (SELECT|INSERT|UPDATE|DELETE|ALL) ON/)
 assert.doesNotMatch(sql,/paypal_client_secret\s+text/i)
 assert.doesNotMatch(sql,/payer_email|payer_name|raw_payload|ip_address|user_agent/i)
})

test('a Live intent, signed event and paid period cannot silently cross merchant generation',()=>{
 assert.match(sql,/UNIQUE\(environment,generation\)/)
 assert.match(sql,/FOREIGN KEY\s*\(source_environment,merchant_generation\)/g)
 assert.match(sql,/UNIQUE\(intent_id,merchant_generation\)/)
 assert.match(sql,/FOREIGN KEY\(intent_id,merchant_generation\)/)
})
