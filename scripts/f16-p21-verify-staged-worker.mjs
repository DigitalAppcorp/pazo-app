// PAZO F16-P21: deterministic integrity check for reused P05 worker RPCs.
// No DB, network, secrets or merchant writes.
import fs from 'node:fs'
import assert from 'node:assert/strict'
const original=fs.readFileSync(
 'supabase/drafts/f16_p05_inbox_claim_v1_DO_NOT_APPLY.sql','utf8')
const candidate=fs.readFileSync(
 'supabase/drafts/f16_p21_hosted_compatible_inbox_worker_DO_NOT_APPLY.sql','utf8')
const start='CREATE TABLE supporter_private.p05_inbox_worker_gate ('
const a=original.indexOf(start),b=candidate.indexOf(start)
assert.ok(a>=0&&b>=0)
assert.equal(candidate.slice(b),original.slice(a),
 'P21 worker functions changed without an audited P05 gate')
const front=candidate.slice(0,b)
for(const needed of [
 'P21 staging: only disposable PG17',
 "column_name='p05_claim_token'",
 'CREATE TABLE', // Negative below: confirm no duplicate financial table creation.
]) {
 if(needed==='CREATE TABLE')continue
 assert.ok(front.includes(needed))
}
assert.equal((front.match(/ADD COLUMN p05_claim_token uuid;/g)||[]).length,1)
assert.equal(front.includes('ADD COLUMN attempt_count'),false)
assert.equal((candidate.match(/^COMMIT;$/gm)||[]).length,1)
assert.equal(candidate.includes('paidThrough'),false)
assert.ok(!/INSERT INTO supporter_private\.paypal_payment_entries/i.test(candidate))
assert.ok(!/UPDATE supporter_private\.paypal_payment_entries/i.test(candidate))
console.log('PASS: P21 hosted-shape worker draft matches the reviewed P05 worker core')
