import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../supabase/drafts/20261010_f14_a3_supervised_review_NOT_APPLIED.sql',import.meta.url),'utf8')
const edge = readFileSync(new URL('../supabase/functions/f14-account-deletion/index.ts',import.meta.url),'utf8')
const ui = readFileSync(new URL('../src/features/account/DeletionRequestDialog.tsx',import.meta.url),'utf8')

test('A3 review draft has a fail-closed SQL transaction guard', () => {
  assert.match(sql,/^BEGIN;/m)
  assert.match(sql,/RAISE EXCEPTION 'F14 A3 REVIEW DRAFT ONLY/)
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/)
  assert.match(sql,/REVOKE ALL ON account_requests_private\.deletion_review_jobs FROM PUBLIC,anon,authenticated/)
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.f14_a3_review_inventory\(uuid\)/)
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_review_inventory\(uuid\) TO service_role/)
  assert.match(sql,/current_setting\('request.jwt.claim.role', true\)/)
  assert.match(sql,/destructive_execution_allowed',false/)
})

test('A3 draft never tries to delete accounts or Storage', () => {
  assert.doesNotMatch(sql,/\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b/i)
  assert.doesNotMatch(sql,/\b(?:UPDATE\s+auth\.users|auth\.admin\.deleteUser)\b/i)
  assert.doesNotMatch(edge,/\.storage\.from\(|auth\.admin\.deleteUser|SUPABASE_SERVICE_ROLE_KEY/)
  assert.match(edge,/const A3_ACCOUNT_DELETION_RELEASE_APPROVED = false as const/)
  assert.match(edge,/503, \{ error: 'account_deletion_disabled' \}/)
})

test('user-facing screen still promises a request, never successful erasure', () => {
  assert.match(ui,/NO borra todavía tu cuenta/)
  assert.doesNotMatch(ui,/ya eliminamos tu cuenta|se eliminó definitivamente/i)
})

test('review request stays attached to existing private intake and checks dependent authors', () => {
  assert.match(sql,/REFERENCES account_requests_private\.deletion_requests\(subject_user_id\)/)
  assert.match(sql,/JOIN public\.pets pet ON pet\.id=c\.author_pet_id/)
  assert.match(sql,/pet\.owner_id<>p_subject_user_id/)
  assert.match(sql,/p\.author_user_id<>p_subject_user_id/)
  assert.match(sql,/total_storage_objects_needing_ownership_review/)
})
