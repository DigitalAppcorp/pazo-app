import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../supabase/sql/f14_moderation_media_gate.sql',import.meta.url),'utf8')
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
  "IF EXISTS(SELECT 1 FROM storage.objects o",
  "SET media_status='purged'",
  "AND media_status='pending_review'",
 ]) assert.ok(sql.includes(item),item)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.f14_moderation_media_gate[\s\S]*FROM PUBLIC,anon,authenticated/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_moderation_media_gate[\s\S]*TO service_role/)
 assert.doesNotMatch(sql,/\b(?:DELETE FROM|TRUNCATE)\s+(?:storage|auth|public)\./i)
})
test('Edge is off unless explicitly enabled, verifies user and role, and never logs key or raw URL',()=>{
 assert.match(edge,/F14_MEDIA_PURGE_ENABLED'\)!=='true'/)
 assert.match(edge,/userClient\.auth\.getUser\(token\)/)
 assert.match(edge,/userClient\.rpc\('f14_is_moderator'\)/)
 assert.match(edge,/admin\.storage\.from\(target\.bucket\)\.remove\(\[target\.path\]\)/)
 assert.match(edge,/admin\.storage\.from\(target\.bucket\)\.exists\(target\.path\)/)
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
