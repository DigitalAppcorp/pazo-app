import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../../../../supabase/drafts/f16_p28_historical_candidate_exact_DO_NOT_APPLY.sql',import.meta.url),'utf8')
test('P28 exact historical SQL is lab-only and read-only',()=>{
 assert.match(sql,/current_database\(\)<>'f14_synthetic'/)
 assert.match(sql,/SECURITY DEFINER SET search_path=''/)
 assert.match(sql,/e\.provider_event_id=p_event_id/)
 assert.match(sql,/e\.processing_state='pending'/)
 assert.match(sql,/e\.p05_claim_token IS NULL/)
 assert.match(sql,/e\.verified_at IS NOT NULL/)
 assert.match(sql,/REVOKE ALL ON FUNCTION/)
 assert.match(sql,/TO service_role/)
 assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE|INSERT|TRUNCATE)\s+supporter_private\./i)
 assert.doesNotMatch(sql,/\b(?:GRANT|REVOKE)\s+.*\b(?:payments|entitlements)\b/i)
})
