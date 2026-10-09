import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_request_preflight_NOT_APPLIED.sql', import.meta.url), 'utf8')
test('A3 draft aborts execution before creating schema or functions', () => {
  const guard = sql.indexOf("RAISE EXCEPTION 'A3 DRAFT ONLY")
  const ddl = sql.indexOf('CREATE SCHEMA')
  assert.ok(guard > 0)
  assert.ok(ddl > guard)
  assert.match(sql.slice(0,ddl), /DO \$a3_do_not_apply\$/)
})
test('no physical account, storage, Auth or public data deletes in intake proposal', () => {
  assert.doesNotMatch(sql, /\b(?:DELETE\s+FROM|TRUNCATE\s+|DROP\s+TABLE|storage\.remove\(|admin\.deleteUser\()/i)
  assert.doesNotMatch(sql, /\bservice_role\b/i)
})
test('private table RLS and explicit authenticated-only RPC grants', () => {
  for(const table of ['deletion_jobs','deletion_events']) assert.match(sql, new RegExp('ALTER TABLE account_private\\.'+table+' ENABLE ROW LEVEL SECURITY'))
  for(const name of ['f14_a3_deletion_preflight','f14_a3_deletion_status','f14_a3_request_deletion','f14_a3_cancel_deletion']) {
    assert.match(sql,new RegExp('REVOKE ALL ON FUNCTION public\\.'+name+'\\(\\) FROM PUBLIC, anon'))
    assert.match(sql,new RegExp('GRANT EXECUTE ON FUNCTION public\\.'+name+'\\(\\) TO authenticated'))
  }
})
test('Auth FK remains restrictive until the final verified phase', () => {
  assert.match(sql,/user_id uuid REFERENCES auth\.users\(id\) ON DELETE RESTRICT/)
  assert.match(sql,/CHECK \(user_id IS NOT NULL OR status = 'completed'\)/)
})

const archiveSql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql', import.meta.url),'utf8')
test('archive migration aborts before all DDL and cannot delete public content', () => {
  assert.ok(archiveSql.indexOf('RAISE EXCEPTION \'A3 ARCHIVE DRAFT ONLY') < archiveSql.indexOf('CREATE TABLE'))
  assert.doesNotMatch(archiveSql,/\\bDELETE\\s+FROM\\s+(?:public|storage|auth)\\./i)
  assert.doesNotMatch(archiveSql,/\\bauth\\.admin\\.deleteUser/i)
  assert.match(archiveSql,/ready_to_delete_auth',false/)
  assert.match(archiveSql,/ready_to_delete_media',false/)
})
test('archive snapshots require service role, preserve third parties only', () => {
  assert.match(archiveSql,/GRANT EXECUTE ON FUNCTION public\\.f14_a3_worker_snapshot_contributions\\(uuid\\)\\s+TO service_role/)
  assert.match(archiveSql,/REVOKE ALL ON FUNCTION public\\.f14_a3_worker_snapshot_contributions\\(uuid\\)\\s+FROM PUBLIC,anon,authenticated/)
  assert.match(archiveSql,/p\\.author_user_id<>v_uid/)
  assert.match(archiveSql,/pet\\.owner_id<>v_uid/)
  assert.match(archiveSql,/Manual Storage\\/media archival required before snapshot/)
})
