import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const file = 'supabase/drafts/f14_media_purge_v2/hosted_claim_evidence_readonly.sql'
const sql = readFileSync(file, 'utf8')
test('Hosted claim reader is one parameterized SELECT with no application DML', () => {
  const body = sql.replace(/--[^\n]*/g, '').trim()
  assert.match(body, /^SELECT\s+jsonb_build_object\(/i)
  assert.match(body, /WHERE\s+c\.claim_id=\$1::uuid\s*;/i)
  assert.doesNotMatch(body, /\b(?:DELETE|TRUNCATE|INSERT|UPDATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO)\b/i)
  assert.doesNotMatch(body, /storage\.from\(/i)
  assert.doesNotMatch(body, /service_role\s*key/i)
})
test('Live probes require lock-capable transaction; SQL remains SELECT-only', () => {
  assert.ok(sql.includes('REPEATABLE READ'))
  assert.ok(sql.includes('f14_media_probe'))
  assert.ok(sql.includes('FOR SHARE'))
  assert.ok(sql.includes('MUST NOT use PostgreSQL READ ONLY'))
  const body = sql.replace(/--[^\n]*/g, '')
  assert.doesNotMatch(body, /\bBEGIN\b|\bSET\s+TRANSACTION\b/i)
})
test('Hosted evidence includes independently computed live source and version', () => {
  assert.ok(sql.includes('moderation_private.f14_media_probe(c.target_kind, c.target_id)'))
  assert.ok(sql.includes('md5(coalesce(o.metadata::text,\'\'))'))
  assert.ok(sql.includes("'url_reference_count'"))
  assert.ok(sql.includes("'community_path_count'"))
  assert.ok(sql.includes("'databaseNow', clock_timestamp()"))
  assert.ok(sql.includes("'is_delete_marker', o.is_delete_marker"))
  assert.ok(sql.includes("'archived_at', o.archived_at"))
})
test('Do not expose report description, private documents, or user content', () => {
  assert.doesNotMatch(sql, /\b(?:rep\.details|rep\.reporter_user_id|rep\.reason|cp\.body|p\.text|pet-documents)\b/)
  assert.match(sql, /'report', jsonb_build_object\(/)
  assert.match(sql, /'reservation', jsonb_build_object\(/)
})
