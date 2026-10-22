import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const phase1=readFileSync(new URL('../supabase/queries/f14_qa_begin_processing_ADMIN_ONLY.sql',import.meta.url),'utf8')
const phase2=readFileSync(new URL('../supabase/queries/f14_qa_complete_verified_ADMIN_ONLY.sql',import.meta.url),'utf8')

test('one-time QA admin transitions are scoped; no executor or destructive DDL',()=>{
 for(const sql of [phase1,phase2]) {
  assert.match(sql,/BEGIN;\s*DO \$pazo_qa_/)
  assert.match(sql,/COMMIT;\s*$/)
  assert.match(sql,/GET DIAGNOSTICS v_changed=ROW_COUNT/)
  assert.match(sql,/IF v_changed <> 1 THEN/)
  assert.doesNotMatch(sql,/\b(?:DELETE\s+FROM|INSERT\s+INTO|TRUNCATE|DROP\s+TABLE|ALTER\s+TABLE|CREATE\s+FUNCTION)\b/i)
  assert.doesNotMatch(sql,/\b(?:auth\.admin\.deleteUser|storage\.objects\s+SET)\b/)
  assert.match(sql,/account_requests_private\.deletion_requests/)
  assert.match(sql,/moderation_private\.moderator_grants/)
  assert.match(sql,/appdigital\.corp@gmail\.com/)
 }
 assert.match(phase1,/appdigital\.corp\+pazo-baja-qa@gmail\.com/)
 assert.match(phase1,/\(SELECT count\(\*\) FROM auth\.users\) <> 7/)
 assert.match(phase1,/WHERE subject_user_id=v_subject AND status='requested' AND processed_at IS NULL/)
 assert.match(phase1,/SET status='processing'/)
 assert.match(phase2,/v_subject uuid := '00000000-0000-0000-0000-000000000000'::uuid/)
 assert.match(phase2,/IF EXISTS \(SELECT 1 FROM auth\.users WHERE id=v_subject\)/)
 assert.match(phase2,/\(SELECT count\(\*\) FROM auth\.users\) <> 6/)
 assert.match(phase2,/\(SELECT count\(\*\) FROM storage\.objects\) <> 1/)
 assert.match(phase2,/\(SELECT count\(\*\) FROM public\.pets\) <> 1/)
 assert.match(phase2,/SET status='completed'/)
 assert.match(phase2,/processed_at=pg_catalog\.clock_timestamp\(\)/)
 assert.match(phase2,/AND status='processing'/)
 assert.match(phase2,/RAISE EXCEPTION 'QA STOP:/)
})
