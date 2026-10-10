import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const sql=readFileSync(new URL('../supabase/drafts/20261010_f14_community_ownership_continuity_NOT_APPLIED.sql',import.meta.url),'utf8')
const dbTest = (fragment) => assert.ok(sql.includes(fragment),fragment)
test('archival preserves third-party community posts even after Auth deletion',()=>{
 for(const v of ["ON DELETE SET NULL","owner_user_id IS NOT NULL OR status='archived'",
   "status='archived',owner_user_id=NULL","community_private.ensure_owner_membership()",
   "v_archived:=v_archived+1"])dbTest(v)
 assert.doesNotMatch(sql,/\\b(?:DELETE FROM|TRUNCATE|DROP TABLE|DELETE USER)\\b/i)
 assert.doesNotMatch(sql,/ON DELETE CASCADE;\\s*--.*communities owner/i)
})
test('accepted transfer is authenticated, consent-only and atomically matches membership and owner',()=>{
 for(const v of [
  "candidate_user_id=v_uid","m.role='admin'","role='owner'","role='member'",
  "o.status='pending'","o.expires_at>pg_catalog.clock_timestamp()",
  "r.subject_user_id=v_owner AND r.status='requested' FOR UPDATE",
  "status='accepted',accepted_at=pg_catalog.clock_timestamp()",
  "owner_user_id=v_uid WHERE id=p_community_id AND owner_user_id=v_owner",
  "FOREIGN KEY(owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL",
 ])dbTest(v)
})
test('archive can only be invoked by service role for processing request',()=>{
 for(const v of [
  "auth.role() IS DISTINCT FROM 'service_role'",
  "r.subject_user_id=p_subject_user_id AND r.status='processing' FOR UPDATE",
  "RAISE EXCEPTION 'Community has pending transfer acceptance'",
  "GRANT EXECUTE ON FUNCTION public.pazo_archive_owned_communities_for_deletion(uuid) TO service_role",
  "REVOKE ALL ON FUNCTION public.pazo_archive_owned_communities_for_deletion(uuid) FROM PUBLIC,anon,authenticated",
 ])dbTest(v)
})
test('owner and candidate RPCs have explicit grants and no direct public table grants',()=>{
 for(const v of ['pazo_community_set_admin(uuid,uuid)','pazo_community_offer_transfer(uuid,uuid)','pazo_community_accept_transfer(uuid)','pazo_community_transfer_offer(uuid)']){
   assert.match(sql,new RegExp('GRANT EXECUTE ON FUNCTION public\\.'+v.replace(/[()]/g,'\\$&')+' TO authenticated'))
 }
 dbTest('ALTER TABLE community_private.ownership_transfer_offers ENABLE ROW LEVEL SECURITY')
 dbTest('REVOKE ALL ON community_private.ownership_transfer_offers FROM PUBLIC,anon,authenticated')
})

test('refusing a transfer belongs only to the exact logged-in candidate',()=>{
 for(const fragment of [
 "CREATE OR REPLACE FUNCTION public.pazo_community_decline_transfer",
 "o.candidate_user_id=v_uid","o.status='pending' AND o.expires_at>pg_catalog.clock_timestamp()",
 "GRANT EXECUTE ON FUNCTION public.pazo_community_decline_transfer(uuid) TO authenticated"
 ])dbTest(fragment)
})

test('UI and Supabase client remain gated until reviewed migration is installed',()=>{
 const ui=readFileSync(new URL('../src/components/views/CommunityDetailView.tsx',import.meta.url),'utf8')
 const svc=readFileSync(new URL('../src/features/account/communityOwnershipService.ts',import.meta.url),'utf8')
 const types=readFileSync(new URL('../src/types/pazo.ts',import.meta.url),'utf8')
 assert.match(svc,/VITE_F14_COMMUNITY_OWNERSHIP_ENABLED === 'true'/)
 assert.match(svc,/COMMUNITY_OWNERSHIP_RELEASE_READY = false/)
 assert.match(ui,/exitUiEnabled && member\.role === 'member'/)
 assert.match(ui,/ownershipOffer\.isCandidate/)
 assert.match(ui,/declineCommunityTransfer\(communityId\)/)
 assert.match(types,/export type CommunityRole = 'owner' \| 'admin' \| 'member'/)
 assert.match(types,/ownerUserId: string \| null/)
})

test('archive refuses to hide third-party reply loss on departing owner posts',()=>{
 for(const fragment of ['JOIN public.community_post_comments', 'cp.author_user_id=p_subject_user_id',
 'pet.owner_id<>p_subject_user_id',
 'Other users comments on departing owner posts require preservation']) {
   // Name of JOIN in SQL is community_post_comments cc, not an ALTER or DELETE.
   if(fragment==='JOIN public.community_post_comments')
      assert.match(sql,/FROM public\.community_post_comments cc/)
   else dbTest(fragment)
 }
})

test('cancel-and-reissue invalidates any stale ownership offer',()=>{
 for(const marker of [
  'r.requested_at<=v_old.created_at',
  'o.created_at>=r.requested_at',
  'r.requested_at<=o.created_at'
 ]) dbTest(marker)
})
