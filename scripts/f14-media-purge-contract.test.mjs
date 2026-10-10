import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../supabase/sql/f14_moderation_media_gate.sql',import.meta.url),'utf8')
const liveSql=readFileSync(new URL('../supabase/sql/f14_moderation_media_finalize.sql',import.meta.url),'utf8')
const edge=readFileSync(new URL('../supabase/functions/f14-moderation-purge/index.ts',import.meta.url),'utf8')
const core=readFileSync(new URL('../supabase/functions/f14-moderation-purge/core.ts',import.meta.url),'utf8')
const ui=readFileSync(new URL('../src/features/moderation/ModerationMediaQueue.tsx',import.meta.url),'utf8')
test('SQL only authorizes exact server-only removed content and matches Storage owner',()=>{
 for(const item of [
  "current_setting('request.jwt.claim.role',true)","'service_role'",
  "p_kind NOT IN ('feed_post','community_post')",
  "r.media_status='pending_review'",
  "p_bucket IS DISTINCT FROM v_expected_bucket",
  "v_path IS DISTINCT FROM p_path",
  "v_url IS DISTINCT FROM p_url",
  "v_refs <> 1",
  "o.owner_id IS DISTINCT FROM v_owner::text",
  "p_stage='preflight'",
  "p_stage IS NULL",
  "photo_storage_path=p_path",
  "IF p_stage='preflight' THEN RETURN true; END IF;",
  "RETURN false;",
  "c.status='held'",
  "c.checked_at IS NOT NULL",
  "c.snapshot->>'source_url'=p_url",
  "report.status='removed'",
 ]) assert.ok(sql.includes(item),item)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.f14_moderation_media_gate[\s\S]*FROM PUBLIC,anon,authenticated/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_moderation_media_gate[\s\S]*TO service_role/)
 assert.doesNotMatch(sql,/\b(?:DELETE FROM|TRUNCATE)\s+(?:storage|auth|public)\./i)
 assert.doesNotMatch(sql,/\bUPDATE\s+moderation_private\.content_restrictions\b/i)
})
test('Edge is off unless explicitly enabled, verifies user and role, and never logs key or raw URL',()=>{
 assert.match(edge,/F14_MEDIA_PURGE_ENABLED'\)!=='true'/)
 assert.match(edge,/userClient\.auth\.getUser\(token\)/)
 assert.match(edge,/userClient\.rpc\('f14_is_moderator'\)/)
 assert.match(edge,/admin\.storage\.from\(target\.bucket\)\.remove\(\[target\.path\]\)/)
 assert.match(edge,/admin\.storage\.from\(target\.bucket\)\.info\(target\.path\)/)
 assert.match(edge,/storageObjectExists\(result\)/)
 assert.doesNotMatch(edge,/\.exists\(/)
 assert.match(edge,/p_stage:stage/)
 assert.match(edge,/method:'HEAD'/)
 assert.match(edge,/method:'GET'/)
 assert.match(edge,/Range':'bytes=0-0'/)
 assert.match(edge,/Cache-Control':'no-cache'/)
 assert.doesNotMatch(edge,/console\.(?:log|error|warn)\(/)
 assert.match(core,/await deps\.publicUrlInaccessible\(target\)/)
})
test('moderation UI stays disabled until local flag and operator gate',()=>{
 assert.match(ui,/VITE_F14_MEDIA_PURGE_ENABLED/)
 assert.match(ui,/purgeModerationMedia\(/)
 assert.match(ui,/window\.confirm/)
})

test('server deployment is disabled independently of hosted secret values',()=>{
 assert.match(edge,/const F14_MEDIA_PURGE_RELEASE_APPROVED = false/)
 assert.match(edge,/if\(!F14_MEDIA_PURGE_RELEASE_APPROVED \|\| Deno\.env\.get\('F14_MEDIA_PURGE_ENABLED'\)!=='true'\)/)
})

test('D3A finalization preserves claim/version and requires server proof and absent Storage object',()=>{
 for(const v of [
  "moderation_private.f14_media_probe(p_kind,p_target)",
  "v_live IS DISTINCT FROM v_claim.snapshot",
  "v_claim.expires_at<=pg_catalog.clock_timestamp()",
  "v_claim.checked_at IS NULL",
  "v_claim.snapshot->>'source_url' IS DISTINCT FROM p_url",
  "o.bucket_id=p_bucket AND o.name=p_path",
  "SET media_status='purged'",
  "pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'",
  "NOT EXISTS (SELECT 1 FROM storage.objects o",
  "c.status='held' AND c.checked_at IS NOT NULL"
 ]) assert.ok(liveSql.includes(v),v)
 assert.doesNotMatch(liveSql,/DROP TRIGGER|DISABLE TRIGGER|TRUNCATE|DELETE FROM storage\./i)
 assert.match(liveSql,/CREATE OR REPLACE FUNCTION moderation_private\.f14_reject_unverified_purged/)
 assert.match(edge,/admin\.rpc\('f14_prepare_media_claim'/)
 assert.match(edge,/admin\.rpc\('f14_recheck_media_claim'/)
 assert.ok(edge.indexOf("f14_prepare_media_claim")<edge.indexOf("f14_recheck_media_claim"))
 assert.ok(edge.indexOf("f14_recheck_media_claim")<edge.indexOf("f14_moderation_media_gate"))
 assert.match(edge,/const F14_MEDIA_PURGE_RELEASE_APPROVED = false/)
})
