import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql=readFileSync(new URL('../supabase/drafts/20261010_f14_a3_write_fence_NOT_APPLIED.sql',import.meta.url),'utf8')
const disabled=readFileSync(new URL('../supabase/functions/f14-account-deletion/index.ts',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')

test('SQL remains deliberately non-executable by default and Edge disabled',()=>{
 assert.match(sql,/RAISE EXCEPTION 'A3 WRITE FENCE DRAFT MUST NOT BE APPLIED'/)
 assert.match(sql,/^BEGIN;/m)
 assert.match(disabled,/const A3_ACCOUNT_DELETION_RELEASE_APPROVED = false as const/)
 assert.match(disabled,/account_deletion_disabled/)
})

test('write fence handles old and new rows across high risk tables',()=>{
 for(const table of [
  'profiles','pets','posts','post_comments','communities',
  'community_memberships','community_posts','community_post_comments',
  'community_post_likes','follows','interactions','hidden_posts',
  'care_items','care_completions','pet_documents','pet_private_details',
  'pet_private_metrics','pet_public_links','lost_pet_alerts','pet_sightings',
  'notifications','pet_place_checkins','pet_place_presence',
  'place_suggestions','search_usage_events',
 ]){
  assert.ok(sql.includes('CREATE TRIGGER a3_account_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.'+table),table)
 }
 assert.match(sql,/IF i=1 THEN v_row:=pg_catalog\.to_jsonb\(NEW\)/)
 assert.match(sql,/ELSE v_row:=pg_catalog\.to_jsonb\(OLD\)/)
 assert.match(sql,/FOR SHARE/)
 assert.match(sql,/RAISE EXCEPTION 'Account is processing deletion'/)
})

test('frozen snapshot preserves target identity after owner detachment',()=>{
 assert.match(sql,/CREATE TABLE account_requests_private\.deletion_frozen_targets/)
 for(const type of ["'pet'","'post'","'community'","'cpost'","'storage'"]){
  assert.ok(sql.includes(type),type)
 }
 assert.match(sql,/t\.target_type=v_mode AND t\.target_id=v_id::text/)
 assert.match(sql,/t\.target_type='storage'/)
 assert.match(sql,/ON CONFLICT DO NOTHING/)
})

test('Storage grant is exact-path, exact generation and short-lived',()=>{
 assert.match(sql,/ON storage\.objects FOR EACH ROW/)
 assert.match(sql,/p_object_version/)
 assert.match(sql,/o\.version=p_object_version/)
 assert.match(sql,/g\.object_version=\(v_row->>'version'\)/)
 assert.match(sql,/g\.object_path=\(v_row->>'name'\)/)
 assert.match(sql,/v_now\+INTERVAL '2 minutes'/)
 assert.match(sql,/req\.status='processing'/)
 assert.match(sql,/j\.phase='remove_media'/)
 assert.match(sql,/TG_OP='DELETE'/)
 assert.doesNotMatch(sql,/DROP TABLE account_requests_private\.deletion_requests/i)
})

test('processing transition verifies signed-in session and atomically snapshots',()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_start_processing/)
 assert.match(sql,/FOR UPDATE;/)
 assert.match(sql,/s\.created_at>=v_requested_at/)
 assert.match(sql,/lease_expires_at>v_now/)
 assert.match(sql,/INSERT INTO account_requests_private\.deletion_frozen_targets/)
 assert.match(sql,/SET status='processing',updated_at=v_now/)
 assert.match(sql,/status='requested'/)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.f14_a3_start_processing/)
})
test('no production entry point or UI modified',()=>{
 assert.match(app,/Versión \{pazoBuildVersion\}/)
 assert.doesNotMatch(disabled,/auth\.admin\.deleteUser\(/)
})

test('Storage deletion is journaled and may only be retried after exact checkpoint',()=>{
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_checkpoint_media_removed\(/)
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.f14_a3_media_checkpoint_valid\(/)
 assert.match(sql,/g\.removed_at IS NOT NULL/)
 assert.match(sql,/g\.removed_at IS NULL/)
 assert.match(sql,/NOT EXISTS \(SELECT 1 FROM storage\.objects o/)
 assert.match(sql,/g\.object_version=p_object_version/)
 assert.match(sql,/j\.phase='remove_media'/)
})
