import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const sql=readFileSync(new URL('../supabase/drafts/20261010_f14_a3_owned_activity_cleanup_NOT_APPLIED.sql',import.meta.url),'utf8')
const edge=readFileSync(new URL('../supabase/functions/f14-account-deletion/index.ts',import.meta.url),'utf8')

test('candidate SQL is never installable accidentally',()=>{
 assert.match(sql,/^BEGIN;\s*DO \$not_applied\$/m)
 assert.match(sql,/RAISE EXCEPTION 'F14 A3 OWNED ACTIVITY DRAFT IS NOT AN APPLIED MIGRATION'/)
 assert.match(edge,/const A3_ACCOUNT_DELETION_RELEASE_APPROVED = false as const/)
})

test('SQL cannot delete any parent post, pet, community or Auth identity',()=>{
 const statement=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n')
 for(const root of [
  'public.posts','public.community_posts','public.pets',
  'public.communities','auth.users','storage.objects',
  'account_requests_private.deletion_requests',
 ]) assert.doesNotMatch(statement,
   new RegExp('\\bDELETE\\s+FROM\\s+'+root.replace('.','\\.'),'i'),
   root)
 assert.doesNotMatch(statement,/auth\.admin\.deleteUser|storage\.remove\(/i)
})

test('every row removed must be authored by a pet belonging to the subject',()=>{
 for(const name of ['post_comments','community_post_comments',
   'community_post_likes','interactions']){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  assert.match(sql,new RegExp('DELETE FROM public\\.'+escaped+'\\s+\\w+\\s+USING public\\.pets pet'))
 }
 const matches=[...sql.matchAll(/DELETE FROM public\.[a-z_]+ [a-z]+\s+USING public\.pets pet\s+WHERE ([\s\S]*?)\s+RETURNING /g)]
 assert.equal(matches.length,4)
 for(const [,where] of matches)assert.match(where,/pet\.owner_id=p_subject_user_id/)
})

test('SQL serializes with freeze and rechecks frozen third-party IDs',()=>{
 assert.match(sql,/r\.status='processing'\s+FOR UPDATE/)
 assert.match(sql,/j\.phase='clean_private_data'/)
 assert.match(sql,/j\.lease_token=p_lease_token AND j\.revision=p_revision/)
 assert.match(sql,/j\.lease_expires_at>v_now/)
 assert.match(sql,/moderation_private\.media_claims/)
 assert.match(sql,/Third-party replies have not been preserved/)
 assert.match(sql,/deletion_third_party_evidence e/)
 assert.match(sql,/Third-party contribution disappeared/)
})

test('post and community counters are recalculated from surviving rows',()=>{
 assert.match(sql,/SET comments_count=\(/)
 assert.match(sql,/FROM public\.post_comments c WHERE c\.post_id=p\.id/)
 assert.match(sql,/FROM public\.community_post_comments c/)
 assert.match(sql,/FROM public\.community_post_likes l/)
 assert.match(sql,/i\.action_type='like' AND i\.target_id=p\.id/)
 assert.match(sql,/'account_deleted',false,'destructive_execution_allowed',false/)
})
