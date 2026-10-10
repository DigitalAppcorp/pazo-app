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

test('redacted author references are mandatory if FK owner or pet becomes null',()=>{
 for(const v of [
  'author_deleted_at IS NULL AND user_id IS NOT NULL',
  'author_deleted_at IS NOT NULL AND user_id IS NULL',
  'author_deleted_at IS NULL AND author_user_id IS NOT NULL AND author_pet_id IS NOT NULL',
  'author_deleted_at IS NOT NULL AND author_user_id IS NULL AND author_pet_id IS NULL'
 ])assert.ok(sql.includes(v),v)
})
test('feed recommendation retains anonymous reply threads, not moderated removals',()=>{
 for(const v of [
  'CREATE OR REPLACE FUNCTION public.get_recommended_posts_page',
  'LEFT JOIN public.pets candidate_pet',
  'candidate.author_deleted_at IS NOT NULL',
  'EXISTS(\n        SELECT 1 FROM public.post_comments pc WHERE pc.post_id=candidate.id',
  "public.f14_content_visible('feed_post',candidate.id)"
 ])assert.ok(sql.includes(v.replace('\\n','\n')),v)
})

test('legacy and externally hosted media cannot be treated as verified deleted objects',()=>{
 for(const v of [
  'External or legacy media requires verified provider cleanup',
  "'/storage/v1/object/public/post-photos/'",
  "'/storage/v1/object/public/community-post-photos/'",
  "'/storage/v1/object/public/pet-avatars/'",
  'cp.photo_storage_path=obj.name',
  'comments_count=(SELECT count(*) FROM public.post_comments remaining',
  'comments_count=(SELECT count(*) FROM public.community_post_comments remaining'
 ])assert.ok(sql.includes(v),v)
})

test('RLS bypass and direct API calls cannot create comments or interactions in retained threads',()=>{
 for(const v of [
  'private.f14_guard_deleted_thread_write()',
  'Archived deleted-author discussion is read only',
  'CREATE TRIGGER f14_block_deleted_feed_replies',
  'CREATE TRIGGER f14_block_deleted_community_replies',
  'CREATE TRIGGER f14_block_deleted_community_likes',
  'CREATE TRIGGER f14_block_deleted_feed_interactions',
  'BEFORE INSERT OR UPDATE ON public.post_comments',
  'BEFORE INSERT OR UPDATE ON public.community_post_comments',
  'BEFORE INSERT OR UPDATE ON public.community_post_likes',
  'BEFORE INSERT OR UPDATE ON public.interactions'
 ]) assert.ok(sql.includes(v),v)
})
test('UI renders only existing third-party replies with no new author actions',()=>{
 const feed=readFileSync(new URL('../src/components/views/HomeView.tsx',import.meta.url),'utf8')
 const community=readFileSync(new URL('../src/components/views/CommunityDetailView.tsx',import.meta.url),'utf8')
 const service=readFileSync(new URL('../src/services/communityService.ts',import.meta.url),'utf8')
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
 assert.match(feed,/if \(post\.isAuthorDeleted\) return/)
 assert.match(community,/post\.isAuthorDeleted \? \(/)
 assert.match(service,/VITE_F14_DELETED_AUTHOR_THREADS_ENABLED/)
 assert.match(service,/canDelete: !deleted/)
 assert.match(app,/photoUrl: wasAuthorDeleted\(post\) \? null : post\.photo_url/)
})
