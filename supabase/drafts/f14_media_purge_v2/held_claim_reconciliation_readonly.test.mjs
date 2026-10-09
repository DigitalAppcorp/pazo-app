import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const diagnostic = readFileSync('supabase/drafts/f14_media_purge_v2/held_claim_reconciliation_readonly.sql','utf8')
const regression = readFileSync('supabase/tests/database/f14_held_claim_operator_diagnostics_rollback.test.sql','utf8')

test('claim diagnostics are SELECT only and return aggregate counts, never private identifiers', () => {
  const body = diagnostic.replace(/--[^\n]*/g,'').trim()
  assert.match(body,/^WITH observed AS MATERIALIZED\s*\(/i)
  assert.doesNotMatch(body,/\b(?:INSERT|DELETE|UPDATE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|COMMIT)\b/i)
  assert.ok(diagnostic.includes('count(*) FILTER'))
  for(const status of ['held_expired','held_without_storage_metadata','held_source_drift','held_moderation_state_drift','held_snapshot_consistent_not_delete_authorized'])
    assert.ok(diagnostic.includes(status),'missing diagnostic state '+status)
  assert.ok(diagnostic.includes('moderation_private.f14_media_probe(c.target_kind,c.target_id)'))
  assert.doesNotMatch(body,/SELECT\s+c\.claim_id\b/i)
  assert.doesNotMatch(body,/SELECT\s+c\.snapshot\b/i)
  assert.doesNotMatch(body,/\b(?:photo_url|owner_id|target_owner_user_id|details)\b/i)
})
test('rollback regression verifies consistent, expired and drift states, with no real delete', () => {
  assert.match(regression,/^--[^\n]*\nBEGIN;/)
  assert.ok(regression.trimEnd().endsWith('ROLLBACK;'))
  assert.ok(regression.includes('held_snapshot_consistent_not_delete_authorized<>1'))
  assert.ok(regression.includes('held_expired<>1'))
  assert.ok(regression.includes('held_source_drift<>1'))
  assert.ok(regression.includes("UPDATE public.posts SET photo_url=NULL"))
  assert.doesNotMatch(regression,/\bCOMMIT\s*;/i)
  assert.doesNotMatch(regression,/DELETE\s+FROM\s+storage\.objects/i)
  assert.doesNotMatch(regression,/storage\.from\(/)
})
