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

test('supervised review claim serializes reviewers but cannot start erasure', () => {
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_review_operator_authorized\(/)
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_review_claim\(/)
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_review_lease_valid\(/)
  assert.match(sql,/FOR UPDATE OF r/)
  assert.match(sql,/WHERE j\.subject_user_id=p_subject_user_id AND j\.revision=v_previous/)
  assert.match(sql,/p_expected_revision <> v_previous/)
  assert.match(sql,/lease_expires_at>v_now/)
  assert.match(sql,/v_now \+ INTERVAL '5 minutes'/)
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_review_claim\(uuid,uuid,bigint\)/)
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_review_lease_valid\(uuid,uuid,uuid,bigint\)/)
  assert.match(sql,/'destructive_execution_allowed',false/)
  assert.doesNotMatch(sql,/UPDATE\s+account_requests_private\.deletion_requests\s+SET/i)
  assert.doesNotMatch(sql,/\.storage\.from\(|auth\.admin\.deleteUser/i)
})

test('fresh sign-in is self-bound to Auth session created after deletion request', () => {
  assert.match(sql,/ADD COLUMN reauth_session_id uuid/)
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_subject_record_recent_signin\(\)/)
  assert.match(sql,/v_owner uuid := auth\.uid\(\)/)
  assert.match(sql,/v_session := \(auth\.jwt\(\)->>'session_id'\)::uuid/)
  assert.match(sql,/s\.id=v_session AND s\.user_id=v_owner/)
  assert.match(sql,/v_started < v_request/)
  assert.match(sql,/v_started < v_now-INTERVAL '5 minutes'/)
  assert.match(sql,/lease_expires_at>v_now/)
  assert.match(sql,/SET reauthenticated_at=v_now,reauth_session_id=v_session,updated_at=v_now/)
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_subject_record_recent_signin\(\)\s+TO authenticated/)
  assert.doesNotMatch(sql.replace(/^\s*--.*$/gm,''),/signInWithPassword|user_metadata|plaintext_password/i)
})

test('reviewer rechecks same subject, operator, lease, revision and reauth session', () => {
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_reauth_evidence_valid\(/)
  assert.match(sql,/ses\.id=j\.reauth_session_id AND ses\.user_id=j\.subject_user_id/)
  assert.match(sql,/ses\.created_at>=req\.requested_at/)
  assert.match(sql,/j\.reauthenticated_at>pg_catalog\.clock_timestamp\(\)-INTERVAL '5 minutes'/)
  assert.match(sql,/j\.lease_token=p_lease_token/)
  assert.match(sql,/j\.revision=p_revision/)
  assert.match(sql,/reauthenticated_at=NULL,\s+reauth_session_id=NULL/)
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_reauth_evidence_valid\(uuid,uuid,uuid,bigint\)\s+TO service_role/)
  assert.match(sql,/RAISE EXCEPTION 'F14 A3 REVIEW DRAFT ONLY/)
})

test('A3 operator enrollment is installer-only, private and identity-safe', () => {
  const enrollment = readFileSync(
    new URL('../supabase/drafts/20261010_f14_a3_operator_enrollment_NOT_APPLIED.sql',import.meta.url),
    'utf8',
  )
  assert.match(enrollment,/RAISE EXCEPTION 'A3 OPERATOR ENROLLMENT DRAFT:/)
  assert.match(enrollment,/current_user NOT IN \('postgres'\)/)
  assert.match(enrollment,/current_setting\('pazo\.a3_operator_email',true\)/)
  assert.match(enrollment,/email_confirmed_at IS NOT NULL/)
  assert.match(enrollment,/deleted_at IS NULL/)
  assert.match(enrollment,/v_match_count<>1/)
  assert.match(enrollment,/INSERT INTO account_requests_private\.deletion_review_operators/)
  assert.match(enrollment,/ON CONFLICT \(operator_user_id\) DO NOTHING/)
  assert.doesNotMatch(enrollment,/auth\.admin\.deleteUser|\bDELETE\s+FROM\s+auth\.users/i)
  assert.doesNotMatch(enrollment,/[\w.+-]+@gmail\.com/i)
  assert.doesNotMatch(enrollment,/GRANT (?:ALL|INSERT|UPDATE|DELETE).*\b(?:anon|authenticated|service_role)\b/i)
})
