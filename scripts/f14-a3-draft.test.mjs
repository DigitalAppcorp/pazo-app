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
  const list=['account_blocks','pets','posts','communities','community_posts','post_comments',
    'community_post_comments','community_memberships','follows',
    'care_items','care_completions','pet_documents',
    'interactions','community_post_likes','pet_place_checkins','profiles','place_suggestions']
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


test('A3 expanded write fence covers 29 full-table triggers and one derived presence trigger', () => {
  const mapped=[...fenceSql.matchAll(/WHEN '([a-z_]+)' THEN/g)].map(m=>m[1])
  const triggers=[...fenceSql.matchAll(/CREATE TRIGGER a3_write_fence_([a-z_]+) BEFORE INSERT OR UPDATE OR DELETE ON public\.([a-z_]+)/g)]
  assert.equal(mapped.length,30)
  assert.equal(triggers.length,29)
  assert.equal(new Set(mapped).size,30)
  assert.equal(new Set(triggers.map(m=>m[2])).size,29)
  const partial='pet_place_presence'
  assert.deepEqual(triggers.map(m=>m[2]).sort(),mapped.filter(t=>t!==partial).sort())
  assert.match(fenceSql,/CREATE TRIGGER a3_write_fence_pet_place_presence BEFORE INSERT OR UPDATE ON public\.pet_place_presence/)
  assert.doesNotMatch(fenceSql,/CREATE TRIGGER a3_write_fence_pet_place_presence BEFORE INSERT OR UPDATE OR DELETE/)
  assert.match(fenceSql,/WHEN 'account_blocks' THEN[\s\S]*?blocker_user_id[\s\S]*?blocked_user_id/)
  assert.match(fenceSql,/WHEN 'pet_place_presence' THEN[\s\S]*?FROM public\.pet_place_checkins/)
  assert.match(fenceSql,/IF TG_TABLE_NAME='account_blocks' AND TG_OP IN \('INSERT','DELETE'\)/)
  assert.match(fenceSql,/ELSIF TG_TABLE_NAME='follows' AND TG_OP='DELETE'/)
  assert.match(fenceSql,/v_uid IS DISTINCT FROM v_exception_target/)
  assert.match(fenceSql,/auth\.uid\(\)/)
  assert.match(fenceSql,/FROM public\.account_blocks b/)
  assert.match(fenceSql,/WHEN 'profiles' THEN[\s\S]*?p_row->>'id'/)
  assert.match(fenceSql,/WHEN 'place_suggestions' THEN[\s\S]*?p_row->>'submitter_user_id'/)
  assert.match(fenceSql,/Unknown profile owner during A3 freeze/)
  assert.match(fenceSql,/Unknown place suggestion owner during A3 freeze/)
  assert.match(fenceSql,/Intentional exception: place-presence DELETE/)
  assert.match(fenceSql,/authenticated blocker/)
  assert.match(fenceSql,/CREATE TRIGGER a3_write_fence_account_blocks/)
  assert.match(fenceSql,/CREATE TRIGGER a3_write_fence_pet_place_presence/)
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
    '../supabase/drafts/20261009_f14_a3_worker_legacy_clear_NOT_APPLIED.sql',
    '../supabase/drafts/20261009_f14_a3_recent_auth_NOT_APPLIED.sql',
    '../supabase/drafts/20261009_f14_a3_freeze_transition_NOT_APPLIED.sql',
    '../supabase/drafts/20261009_f14_a3_interaction_lock_order_NOT_APPLIED.sql',
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

test('A3 interaction, community-like and check-in guards verify both owner and target', () => {
  assert.match(fenceSql,/WHEN 'interactions' THEN[\s\S]*?target_type'\)='post'/)
  assert.match(fenceSql,/Unknown interaction owner during A3 freeze/)
  assert.match(fenceSql,/Unsupported interaction target for A3 freeze/)
  assert.match(fenceSql,/WHEN 'community_post_likes' THEN[\s\S]*?p\.author_user_id,c\.owner_user_id/)
  assert.match(fenceSql,/WHEN 'pet_place_checkins' THEN[\s\S]*?v_owner := \(p_row->>'user_id'\)::uuid/)
  assert.match(fenceSql,/Unknown check-in owner during A3 freeze/)
})


const reviewSql = readFileSync(new URL('../supabase/drafts/20261009_f14_a3_worker_checkpoint_NOT_APPLIED.sql',import.meta.url),'utf8')
test('review SQL draft fail-closed, with no content deletion or credentials',()=>{
 assert.ok(reviewSql.indexOf('BEGIN;') < reviewSql.indexOf("RAISE EXCEPTION 'A3 CHECKPOINT DRAFT ONLY"))
 assert.ok(reviewSql.indexOf("RAISE EXCEPTION 'A3 CHECKPOINT DRAFT ONLY") < reviewSql.indexOf('CREATE TABLE'))
 assert.doesNotMatch(reviewSql,/\bDELETE\s+FROM\b|\bTRUNCATE\s+|\bDROP\s+TABLE\b|\bauth\.admin\.deleteUser\b/i)
 assert.match(reviewSql,/ALTER TABLE account_private\.deletion_review_events ENABLE ROW LEVEL SECURITY/)
})
test('checkpoint uses service-only CAS, validated lease and revision',()=>{
 assert.match(reviewSql,/WHERE job_id=p_job_id AND revision=p_expected_revision/)
 assert.match(reviewSql,/lease_token=p_token AND lease_version=p_version/)
 assert.match(reviewSql,/expires_at>pg_catalog\.clock_timestamp\(\) FOR UPDATE/)
 assert.match(reviewSql,/status='reviewing' FOR UPDATE/)
 assert.match(reviewSql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_worker_review_checkpoint\(uuid,uuid,bigint,bigint,text,text,text\) TO service_role/)
 assert.match(reviewSql,/REVOKE ALL ON FUNCTION public\.f14_a3_worker_review_checkpoint\(uuid,uuid,bigint,bigint,text,text,text\) FROM PUBLIC,anon,authenticated/)
})

const a3Config=readFileSync(new URL('../supabase/config.toml',import.meta.url),'utf8')
test('A3 Edge endpoint stays disabled, uses named-secret middleware and dual gates',()=>{
  assert.match(a3Config,/\[functions\.f14-a3-account-deletion\][\s\S]*?enabled = false[\s\S]*?verify_jwt = false/)
  const fn=readFileSync(new URL('../supabase/functions/f14-a3-account-deletion/index.ts',import.meta.url),'utf8')
  assert.match(fn,/npm:@supabase\/server@1\.8\.1/)
  assert.match(fn,/withSupabase\(\{ auth: 'secret:pazo-a3-review' \}/)
  assert.match(fn,/PAZO_A3_REVIEW_WORKER_ENABLED/)
  assert.match(fn,/PAZO_A3_REVIEW_INVOKE_SECRET/)
  assert.match(fn,/makeA3InternalReviewHandler/)
  assert.doesNotMatch(fn,/\bauth\.admin\.deleteUser\b|storage\.from\(|\bauth: 'none'\b/)
})

const a3RecentSql=readFileSync(new URL('../supabase/drafts/20261009_f14_a3_recent_auth_NOT_APPLIED.sql',import.meta.url),'utf8')
test('A3 recent auth draft is fail-closed with five-minute server receipt',()=>{
 const a=a3RecentSql.indexOf("RAISE EXCEPTION 'A3 RECENT AUTH DRAFT ONLY")
 assert.ok(a3RecentSql.indexOf('BEGIN;')<a && a<a3RecentSql.indexOf('CREATE TABLE'))
 assert.match(a3RecentSql,/ALTER TABLE account_private\.deletion_recent_auth ENABLE ROW LEVEL SECURITY/)
 assert.match(a3RecentSql,/INTERVAL '5 minutes'/)
 assert.match(a3RecentSql,/auth\.sessions s WHERE s\.id=p_session_id/)
 assert.match(a3RecentSql,/r\.consumed_at IS NOT NULL/)
 assert.match(a3RecentSql,/j\.status='reviewing'/)
 assert.match(a3RecentSql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_service_record_reauth\(uuid,uuid,uuid\) TO service_role/)
 assert.doesNotMatch(a3RecentSql,/\bDELETE\s+FROM\b|\bTRUNCATE\b|\bauth\.admin\.deleteUser\b/i)
})

const transitionSql=readFileSync(new URL('../supabase/drafts/20261009_f14_a3_freeze_transition_NOT_APPLIED.sql',import.meta.url),'utf8')
test('A3 transition draft aborts before DDL and its freeze-readiness gate is always false',()=>{
 const guard=transitionSql.indexOf("RAISE EXCEPTION 'A3 TRANSITION DRAFT ONLY")
 assert.ok(transitionSql.indexOf('BEGIN;')<guard && guard<transitionSql.indexOf('CREATE OR REPLACE FUNCTION'))
 assert.match(transitionSql,/f14_a3_full_write_fence_ready\(\)[\s\S]*?SELECT false/)
 assert.match(transitionSql,/IF NOT account_private\.f14_a3_full_write_fence_ready\(\) THEN RETURN false/)
 assert.doesNotMatch(transitionSql,/\bDELETE\s+FROM\b|\bTRUNCATE\b|\bauth\.admin\.deleteUser\b/i)
})
test('A3 state transition shares owner advisory lock with all write-fence triggers',()=>{
 assert.match(transitionSql,/SELECT user_id INTO v_owner FROM account_private\.deletion_jobs/)
 assert.match(transitionSql,/pg_advisory_xact_lock\(\s*pg_catalog\.hashtextextended\(p_user_id::text,901426\)/)
 assert.match(transitionSql,/WHERE id=p_job_id FOR UPDATE/)
 assert.match(transitionSql,/v_status <> 'requested'/)
 assert.match(transitionSql,/FROM account_private\.deletion_recent_auth r[\s\S]*?FOR UPDATE/)
 assert.match(transitionSql,/v_expires <= v_now/)
 assert.match(transitionSql,/auth\.sessions s[\s\S]*?s\.user_id=p_user_id/)
 assert.match(transitionSql,/SET consumed_at=v_now/)
 assert.match(transitionSql,/SET status='reviewing',updated_at=v_now/)
 assert.match(transitionSql,/INSERT INTO account_private\.deletion_events\(job_id,action\)/)
 assert.match(transitionSql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_service_begin_review\(uuid,uuid,uuid\)[\s\S]*?TO service_role/)
})

const interactionLockSql=readFileSync(
  new URL('../supabase/drafts/20261009_f14_a3_interaction_lock_order_NOT_APPLIED.sql',import.meta.url),'utf8')
test('A3 interaction RPC lock-order draft aborts before DDL; invoker privilege preserved',()=>{
  const abort=interactionLockSql.indexOf("RAISE EXCEPTION 'A3 INTERACTION LOCK ORDER DRAFT ONLY")
  const ddl=interactionLockSql.indexOf('CREATE OR REPLACE FUNCTION')
  assert.ok(interactionLockSql.indexOf('BEGIN;')<abort && abort<ddl)
  assert.match(interactionLockSql,/DO \$a3_interaction_not_applied\$/)
  assert.match(interactionLockSql,/SECURITY INVOKER/)
  assert.doesNotMatch(interactionLockSql,/SECURITY DEFINER|\bauth\.admin\.deleteUser\s*\(|\bDELETE\s+FROM\s+(?:storage|auth)\./i)
  assert.match(interactionLockSql,/GRANT EXECUTE ON FUNCTION public\.register_interaction_signal\(uuid, uuid, text\) TO authenticated/)
})
test('A3 Feed RPC acquires ordered owner locks before locking metric rows or writing interactions',()=>{
  const start=interactionLockSql.indexOf('CREATE OR REPLACE FUNCTION public.register_interaction_signal(')
  const fragment=interactionLockSql.slice(start)
  const lock=fragment.indexOf('pg_catalog.pg_advisory_xact_lock')
  const metric=fragment.indexOf('INSERT INTO public.pet_private_metrics')
  const interactions=fragment.indexOf('INSERT INTO public.interactions')
  assert.ok(lock>0 && metric>lock && interactions>lock)
  assert.match(fragment,/SELECT DISTINCT uid[\s\S]*?WHERE uid IS NOT NULL ORDER BY uid/)
  assert.match(fragment,/hashtextextended\(v_a3_lock_owner::text,901426\)/)
  assert.match(fragment,/SELECT p\.tags, p\.user_id[\s\S]*?INTO v_tags, v_target_owner_id/)
  assert.match(fragment,/v_checked_actor_owner IS DISTINCT FROM v_owner_id/)
  assert.match(fragment,/v_checked_target_owner IS DISTINCT FROM v_target_owner_id/)
  assert.match(fragment,/ERRCODE='40001'/)
  assert.match(fragment,/p_action_type IN \('unlike', 'unsave'\)/)
  assert.match(fragment,/WHERE ppm\.pet_id = p_actor_pet_id[\s\S]*?FOR UPDATE/)
})


const cascadeQaSql=readFileSync(new URL('./f14-a3-cascade-temp-qa.sql',import.meta.url),'utf8')
test('A3 synthetic cascade QA stays pg_temp-only and rollback-protected',()=>{
 assert.match(cascadeQaSql,/^BEGIN;/m)
 assert.match(cascadeQaSql,/^ROLLBACK;/m)
 assert.match(cascadeQaSql,/CREATE TEMP TABLE a3_cascade_users/)
 assert.match(cascadeQaSql,/REFERENCES pg_temp\.a3_cascade_users\(id\) ON DELETE CASCADE/)
 assert.match(cascadeQaSql,/CREATE OR REPLACE FUNCTION pg_temp\.a3_cascade_profile_guard/)
 assert.match(cascadeQaSql,/WHERE j\.user_id=v_owner AND j\.status NOT IN \('requested','cancelled'\)/)
 assert.match(cascadeQaSql,/EXCEPTION WHEN SQLSTATE '42501'/)
 assert.match(cascadeQaSql,/SELECT 'PASS: synthetic frozen DELETE blocked/)
 assert.doesNotMatch(cascadeQaSql,/\b(?:INSERT\s+INTO|DELETE\s+FROM|UPDATE|TRUNCATE|ALTER\s+TABLE)\s+(?:public|auth|storage)\./i)
})
test('A3 Auth-last gate cannot be declared ready with a frozen-profile delete fence',()=>{
 assert.match(fenceSql,/WHEN 'profiles' THEN[\s\S]*?v_owner := \(p_row->>'id'\)::uuid/)
 assert.match(fenceSql,/CREATE TRIGGER a3_write_fence_profiles BEFORE INSERT OR UPDATE OR DELETE/)
 assert.match(fenceSql,/IF EXISTS \([\s\S]*?FROM account_private\.deletion_jobs[\s\S]*?status NOT IN \('requested','cancelled'\)/)
 assert.match(fenceSql,/v_uid IS DISTINCT FROM v_exception_target/)
 // No blanket service_role exception may disable A3 data protection.
 assert.doesNotMatch(fenceSql,/current_setting\('request\.jwt\.claim\.role'[\s\S]*?service_role[\s\S]*?THEN RETURN OLD/i)
 assert.match(transitionSql,/f14_a3_full_write_fence_ready\(\)[\s\S]*?SELECT false/)
})
