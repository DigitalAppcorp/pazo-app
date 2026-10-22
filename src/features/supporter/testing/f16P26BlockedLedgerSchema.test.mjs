import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

// P26-B is deliberately NOT applied by CI. This is a static guard
// against accidentally publishing an accounting writer or entitlement.
const sql=readFileSync(new URL('../../../../supabase/drafts/f16_p26_blocked_ledger_schema_DO_NOT_APPLY.sql',import.meta.url),'utf8')
test('P26-B SQL is lab-only and has an explicit DB/session guard',()=>{
 assert.match(sql,/current_database\(\).*f14_synthetic/s)
 assert.match(sql,/session_user.*f14_admin/)
 assert.match(sql,/current_user.*postgres/)
 assert.match(sql,/p25_first_obligation_reviews/)
})
test('P26-B has no credited state, paid period, worker or grants',()=>{
 assert.match(sql,/CHECK\(credit_state='blocked'\)/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON supporter_private\.p26_proposed_obligation_credits/)
 assert.doesNotMatch(sql,/GRANT\s+(?:ALL|INSERT|UPDATE|EXECUTE)/i)
 assert.doesNotMatch(sql,/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.f16_.*(?:commit|grant|activate)/i)
})
test('P26-B proposal reserves one sale and obligation, matches P25',()=>{
 assert.match(sql,/external_sale_id text NOT NULL UNIQUE/)
 assert.match(sql,/PRIMARY KEY\(intent_id,obligation_ordinal\)/)
 assert.match(sql,/REFERENCES supporter_private\.p25_first_obligation_reviews/)
 assert.match(sql,/v\.external_sale_id IS DISTINCT FROM NEW\.external_sale_id/)
 assert.match(sql,/v\.owner_id IS DISTINCT FROM NEW\.owner_id/)
})
