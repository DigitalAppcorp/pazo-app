import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../../../../supabase/drafts/f16_p28_historical_audit_hosted_REVIEW_ONLY_DO_NOT_APPLY.sql',import.meta.url),'utf8')
test('P28 hosted audit draft is single-definition minimal and locked down',()=>{
 assert.equal(sql.split('CREATE TABLE supporter_private.p28_historical_read_audit').length-1,1)
 assert.equal(sql.split('CREATE FUNCTION public.f16_p28_draft_ack_historical_audit').length-1,1)
 assert.equal(sql.split('COMMIT;').length-1,1)
 assert.ok(sql.includes("event_fingerprint text NOT NULL"))
 assert.ok(sql.includes("event_fingerprint ~ '^[0-9a-f]{64}$'"))
 assert.ok(sql.includes('INSERT INTO supporter_private.p28_historical_read_audit(request_id,event_fingerprint)'))
 assert.ok(sql.includes("FORCE ROW LEVEL SECURITY"))
 assert.ok(sql.includes('TO service_role'))
 assert.ok(sql.includes('manual reconciliation required'))
 assert.ok(!sql.includes('worker_gate'))
 assert.ok(!sql.includes('payment_entries'))
 assert.ok(!sql.includes('paypal_verified_event_inbox'))
})
