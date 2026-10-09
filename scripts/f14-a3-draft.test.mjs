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


const archiveSql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql', import.meta.url), 'utf8')
test('archive draft aborts execution before DDL and cannot delete content', () => {
  const blocker = archiveSql.indexOf("RAISE EXCEPTION 'A3 ARCHIVE DRAFT ONLY")
  const ddl = archiveSql.indexOf('CREATE TABLE')
  assert.ok(blocker >= 0 && ddl > blocker)
  assert.match(archiveSql.slice(0, ddl), /DO \$a3_archive_not_applied\$/)
  assert.doesNotMatch(archiveSql, /\bDELETE\s+FROM\s+(?:public|storage|auth)\./i)
  assert.doesNotMatch(archiveSql, /\bauth\.admin\.deleteUser/i)
  assert.match(archiveSql, /'ready_to_delete_auth',false/)
  assert.match(archiveSql, /'ready_to_delete_media',false/)
})
test('archive only snapshots other accounts, accessed by server role', () => {
  assert.match(archiveSql, /GRANT EXECUTE ON FUNCTION public\.f14_a3_worker_snapshot_contributions\(uuid\)\s+TO service_role/)
  assert.match(archiveSql, /REVOKE ALL ON FUNCTION public\.f14_a3_worker_snapshot_contributions\(uuid\)\s+FROM PUBLIC,anon,authenticated/)
  assert.match(archiveSql, /p\.author_user_id<>v_uid/)
  assert.match(archiveSql, /pet\.owner_id<>v_uid/)
  assert.match(archiveSql, /Manual Storage\/media archival required before snapshot/)
})


const leaseSql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_worker_lease_NOT_APPLIED.sql', import.meta.url),'utf8')
test('worker lease SQL is inert and cannot physically delete records or assets', () => {
  assert.ok(leaseSql.indexOf('BEGIN;') < leaseSql.indexOf("RAISE EXCEPTION 'A3 LEASE DRAFT ONLY"))
  assert.ok(leaseSql.indexOf("RAISE EXCEPTION 'A3 LEASE DRAFT ONLY") < leaseSql.indexOf('CREATE TABLE'))
  assert.match(leaseSql, /ALTER TABLE account_private\.deletion_worker_leases ENABLE ROW LEVEL SECURITY/)
  assert.doesNotMatch(leaseSql, /\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b/i)
  assert.doesNotMatch(leaseSql, /\bauth\.admin\.deleteUser\s*\(/i)
})
test('leases serialize claims and reject stale workers', () => {
  assert.match(leaseSql, /WHERE id=p_job_id FOR UPDATE/)
  assert.match(leaseSql, /ON CONFLICT \(job_id\) DO UPDATE/)
  assert.match(leaseSql, /lease_version = account_private\.deletion_worker_leases\.lease_version\+1/)
  assert.match(leaseSql, /WHERE account_private\.deletion_worker_leases\.expires_at <= v_now/)
  assert.match(leaseSql, /AND lease_version=p_version AND expires_at>clock_timestamp\(\)/)
  assert.match(leaseSql, /p_seconds < 5 OR p_seconds > 60/)
  for (const f of ['acquire_lease(uuid,integer)', 'validate_lease(uuid,uuid,bigint)', 'release_lease(uuid,uuid,bigint)']) {
    assert.ok(leaseSql.includes('FROM PUBLIC,anon,authenticated'))
    assert.ok(leaseSql.includes('GRANT EXECUTE ON FUNCTION public.f14_a3_worker_'+f+' TO service_role'))
  }
})


const fenceSql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_write_fence_NOT_APPLIED.sql', import.meta.url),'utf8')
test('write-fence migration aborts inside transaction BEFORE all SQL changes', () => {
  const abort=fenceSql.indexOf("RAISE EXCEPTION 'F14 A3 WRITE FENCE DRAFT ONLY")
  const ddl=fenceSql.indexOf('CREATE OR REPLACE FUNCTION')
  assert.ok(fenceSql.indexOf('BEGIN;')<abort && abort<ddl)
  assert.match(fenceSql,/DO \$a3_fence_not_applied\$/)
  assert.doesNotMatch(fenceSql,/\b(?:DELETE\s+FROM|TRUNCATE\s+|DROP\s+TABLE)\b/i)
})
test('write-fence covers all mapped row tables on insert/update/delete', () => {
  const list=['pets','posts','communities','community_posts','post_comments',
    'community_post_comments','community_memberships','follows',
    'care_items','care_completions','pet_documents']
  for (const table of list) {
    assert.ok(fenceSql.includes("WHEN '"+table+"' THEN"),'owner resolver for '+table)
    assert.ok(fenceSql.includes('BEFORE INSERT OR UPDATE OR DELETE ON public.'+table),'trigger for '+table)
  }
  assert.match(fenceSql,/IF TG_OP <> 'INSERT' THEN/)
  assert.match(fenceSql,/IF TG_OP <> 'DELETE' THEN/)
  assert.match(fenceSql,/ARRAY_CAT\(v_owners,account_private\.f14_a3_row_owners/)
  assert.match(fenceSql,/SELECT DISTINCT uid FROM UNNEST\(v_owners\) AS owner\(uid\)/)
  assert.match(fenceSql,/pg_advisory_xact_lock/)
  assert.match(fenceSql,/status NOT IN \('requested','cancelled'\)/)
})
test('write-fence never claims to cover Storage, JWT, Auth or all tables', () => {
  assert.match(fenceSql,/NOT COVERED: Storage API/)
  assert.match(fenceSql,/direct Auth/)
  assert.doesNotMatch(fenceSql,/\bauth\.admin\.deleteUser/)
})


const fkSql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_community_fk_NOT_APPLIED.sql', import.meta.url), 'utf8')
test('community FK draft aborts transaction before altering any table', () => {
  assert.ok(fkSql.indexOf('BEGIN;') < fkSql.indexOf("RAISE EXCEPTION 'F14 A3 COMMUNITY FK DRAFT ONLY"))
  assert.ok(fkSql.indexOf("RAISE EXCEPTION 'F14 A3 COMMUNITY FK DRAFT ONLY") < fkSql.indexOf('ALTER TABLE'))
  assert.match(fkSql,/DO \$a3_fk_not_applied\$/)
  assert.doesNotMatch(fkSql,/\bDELETE\s+FROM\b|\bTRUNCATE\s+/i)
})
test('active communities need owner and archived orphan has guarded trigger', () => {
  assert.match(fkSql,/CHECK \(status <> 'active' OR owner_user_id IS NOT NULL\)/)
  assert.match(fkSql,/NEW.status='archived' AND NEW.owner_user_id IS NULL/)
  assert.match(fkSql,/NEW.owner_user_id IS NULL OR NOT EXISTS/)
  assert.match(fkSql,/owner_user_id\) REFERENCES auth\.users\(id\) ON DELETE SET NULL/)
})
test('community authored posts cannot disappear through Auth/pet cascading FK', () => {
  assert.match(fkSql,/community_posts_author_user_id_fkey[\s\S]*?REFERENCES auth\.users\(id\) ON DELETE RESTRICT/)
  assert.match(fkSql,/community_posts_author_pet_id_fkey[\s\S]*?REFERENCES public\.pets\(id\) ON DELETE RESTRICT/)
  assert.match(fkSql,/INCOMPLETE: legacy\/community views/)
})

test('SQL draft dollar quotes are paired and no malformed AS $ single marker exists', () => {
  const paths = [
    '../supabase/drafts/20261009_f14_a3_request_preflight_NOT_APPLIED.sql',
    '../supabase/drafts/20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql',
    '../supabase/drafts/20261009_f14_a3_worker_lease_NOT_APPLIED.sql',
    '../supabase/drafts/20261009_f14_a3_write_fence_NOT_APPLIED.sql',
    '../supabase/drafts/20261009_f14_a3_community_fk_NOT_APPLIED.sql',
  ]
  for (const path of paths) {
    const source = readFileSync(new URL(path,import.meta.url),'utf8')
    assert.doesNotMatch(source,/\bAS\s+\$(?!\$|[A-Za-z_])/m,path+' contains invalid dollar quote')
    const markers = source.match(/\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$/g)||[]
    for (const name of new Set(markers)) {
      assert.equal(markers.filter(x=>x===name).length % 2,0,path+' unpaired '+name)
    }
    assert.ok(source.indexOf('BEGIN;') >= 0 && source.indexOf('RAISE EXCEPTION') > source.indexOf('BEGIN;'),path+' must fail closed in transaction')
  }
})

test('A3 preflight identifies embedded comments and media as manual review blockers', () => {
  for (const key of ['legacy_embedded_comments','feed_posts_with_photos',
    'community_posts_with_photos','pet_profiles_with_photos']) {
    assert.match(sql,new RegExp("'"+key+"'"))
  }
  assert.match(sql,/jsonb_typeof\(p\.comments\)='array'/)
  assert.match(sql,/jsonb_array_length\(p\.comments\)/)
  assert.match(sql,/CASE[\s\S]*?WHEN jsonb_typeof\(p\.comments\)='array' THEN jsonb_array_length/)
  assert.match(archiveSql,/CASE WHEN jsonb_typeof\(p\.comments\)='array'/)
  assert.match(archiveSql,/Legacy embedded comments require manual author reconciliation/)
  assert.match(archiveSql,/jsonb_array_length\(p\.comments\)>0/)
})
