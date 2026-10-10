import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql',import.meta.url),'utf8')
test('FKs preserve retained posts when Auth and pets are eventually removed',()=>{
 for(const fragment of [
  'ALTER TABLE public.posts ALTER COLUMN user_id DROP NOT NULL',
  'FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE SET NULL',
  'FOREIGN KEY(pet_id) REFERENCES public.pets(id) ON DELETE SET NULL',
  'FOREIGN KEY(author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL',
  'FOREIGN KEY(author_pet_id) REFERENCES public.pets(id) ON DELETE SET NULL',
  'f14_posts_deleted_author_sanitized',
  'f14_community_deleted_author_sanitized',
 ])assert.ok(sql.includes(fragment),fragment)
})
test('author text, locations, avatars, photos and duplicated JSON are erased on tombstones',()=>{
 for(const fragment of ["pet_name='Autor eliminado'","pet_avatar=NULL","location=NULL",
  "text=''","photo_url=NULL","comments='[]'::jsonb","tags='{}'::text[]",
  "author_user_id=NULL","author_pet_id=NULL","photo_storage_path=NULL",
  "AND EXISTS(SELECT 1 FROM public.post_comments c",
  "AND EXISTS(SELECT 1 FROM public.community_post_comments c",
 ])assert.ok(sql.includes(fragment),fragment)
 assert.doesNotMatch(sql,/\b(?:DELETE FROM|TRUNCATE|DROP TABLE|auth\.admin\.deleteUser)\b/i)
})
test('only server processing can redact after verifying Storage, legacy comments and claims',()=>{
 for(const fragment of ["auth.role() IS DISTINCT FROM 'service_role'",
  "req.status='processing' FOR UPDATE",
  'Storage media not physically reconciled','Legacy embedded comments require reconciliation',
  'Held moderation claim requires reconciliation','Post photo still present in Storage',
  'GRANT EXECUTE ON FUNCTION public.pazo_redact_social_threads(uuid) TO service_role',
  "'account_deleted',false","'storage_deleted',false"
 ])assert.ok(sql.includes(fragment),fragment)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.pazo_redact_social_threads\(uuid\)\s+FROM PUBLIC,anon,authenticated/)
})
