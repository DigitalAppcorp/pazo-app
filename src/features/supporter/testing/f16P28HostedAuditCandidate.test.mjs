import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../../../../supabase/drafts/f16_p28_historical_audit_hosted_REVIEW_ONLY_DO_NOT_APPLY.sql',import.meta.url),'utf8')
test('hosted P28 audit review candidate installs only minimal audit objects',()=>{
 assert.match(sql,/CREATE TABLE supporter_private\.p28_historical_read_audit/)
 assert.match(sql,/FORCE ROW LEVEL SECURITY/)
 assert.match(sql,/REVOKE ALL ON TABLE supporter_private\.p28_historical_read_audit/)
 assert.match(sql,/REVOKE ALL ON FUNCTION/)
 assert.match(sql,/TO service_role/)
 assert.match(sql,/manual reconciliation required/)
 assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE|TRUNCATE)\s+supporter_private\./i)
 assert.doesNotMatch(sql,/\b(?:worker_gate|entitlements|payment_entries|paypal_verified_event_inbox)\b/i)
 assert.doesNotMatch(sql,/\b(?:event_id|owner_id|email|subscription_id|sale_id|amount|token)\s+(?:uuid|text|numeric|integer)/i)
})
