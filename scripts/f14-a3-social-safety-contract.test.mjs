import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const inventory=readFileSync(
  new URL('../supabase/drafts/20261010_f14_a3_social_dependency_review_NOT_APPLIED.sql',import.meta.url),'utf8')
const tombstone=readFileSync(
  new URL('../supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql',import.meta.url),'utf8')
const edge=readFileSync(
  new URL('../supabase/functions/f14-account-deletion/index.ts',import.meta.url),'utf8')

test('both review and tombstone drafts fail before any schema or data mutation',()=>{
  assert.match(inventory,/^BEGIN;\s*DO \$a3_review_guard\$/m)
  assert.match(inventory,/RAISE EXCEPTION 'F14 A3 SOCIAL DEPENDENCY DRAFT NOT APPLIED'/)
  assert.match(tombstone,/^BEGIN;[\s\S]{0,300}DO \$a3_uninstalled\$/m)
  assert.match(tombstone,/RAISE EXCEPTION 'F14 DELETED AUTHOR DRAFT NOT APPLIED/)
})

test('social dependency function returns counts only and never allows deletion',()=>{
  assert.match(inventory,/CREATE OR REPLACE FUNCTION public\.f14_a3_social_dependency_review/)
  assert.match(inventory,/current_setting\('request\.jwt\.claim\.role',true\)/)
  assert.match(inventory,/FROM account_requests_private\.deletion_requests r/)
  assert.match(inventory,/social_cleanup_verified',false/)
  assert.match(inventory,/destructive_execution_allowed',false/)
  assert.match(inventory,/REVOKE ALL ON FUNCTION public\.f14_a3_social_dependency_review\(uuid\)/)
  assert.match(inventory,/TO service_role/)
  const statements=inventory.split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n')
  assert.doesNotMatch(statements,/\b(?:DELETE FROM|UPDATE public\.|TRUNCATE TABLE|DROP TABLE)\b/i)
})

test('preflight counts genuine other authors in feed, communities and replies',()=>{
  for(const name of [
    'third_party_feed_replies_to_preserve',
    'third_party_community_replies_to_preserve',
    'third_party_community_posts_to_preserve',
    'own_feed_replies_elsewhere',
    'owned_documents','owned_care_items','owned_care_completions',
    'owned_storage_objects','held_moderation_claims',
  ]) assert.ok(inventory.includes(name),name)
  assert.match(inventory,/commenter\.owner_id<>p_subject_user_id/)
  assert.match(inventory,/cp\.author_user_id IS DISTINCT FROM p_subject_user_id/)
  assert.match(inventory,/community\.owner_user_id=p_subject_user_id/)
  assert.match(inventory,/moderation_private\.media_claims/)
})

test('deleted-author draft changes dangerous CASCADE relationships only under separate gate',()=>{
  assert.match(tombstone,/posts_pet_id_fkey/)
  assert.match(tombstone,/community_posts_author_pet_id_fkey/)
  assert.match(tombstone,/ON DELETE SET NULL/)
  assert.match(tombstone,/f14_guard_deleted_thread_write/)
  assert.match(edge,/account_deletion_disabled/)
})
