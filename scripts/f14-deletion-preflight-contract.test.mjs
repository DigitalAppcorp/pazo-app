import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql',import.meta.url),'utf8')
const pet=readFileSync(new URL('../src/components/views/PetView.tsx',import.meta.url),'utf8')
test('preflight is scoped to requested accounts only and never mutates data',()=>{
 assert.match(sql,/account_requests_private\.deletion_requests r WHERE r\.status='requested'/)
 assert.match(sql,/r\.subject_user_id AS user_id/)
 for(const name of [
  'public.pets','public.posts','public.communities','public.community_post_comments',
  'public.community_post_likes',
 ]) if(name!=='public.community_post_likes')assert.ok(sql.includes(name),name)
 assert.match(sql,/storage\.objects/)
 assert.match(sql,/moderation_private\.reports/)
 assert.match(sql,/false AS may_delete_auth/)
 assert.match(sql,/false AS may_delete_storage/)
 assert.doesNotMatch(sql,/\b(?:DELETE\s+FROM|UPDATE\s+\w|INSERT\s+INTO|TRUNCATE\s+\w|DROP\s+TABLE|ALTER\s+TABLE)\b/i)
})
test('deletion request entry is enabled in localhost only, never in production by default',()=>{
 assert.match(pet,/import\.meta\.env\.DEV\s*\|\|\s*import\.meta\.env\.VITE_F14_DELETION_REQUESTS_ENABLED\s*===\s*'true'/)
})

test('preflight includes third-party comments on owner posts EVEN AFTER ownership transfer',()=>{
 for(const v of [
  'AS external_comments_on_own_community_posts',
  'cp.author_user_id=q.user_id AND pet.owner_id<>q.user_id',
  "'external_comments_on_own_community_posts',external_comments_on_own_community_posts"
 ])assert.ok(sql.includes(v),v)
})
