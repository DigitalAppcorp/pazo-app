import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync(new URL('../supabase/migrations/20261012071140_f14_one_object_admin_reconcile.sql',import.meta.url),'utf8')
const edge=readFileSync(new URL('../supabase/functions/f14-moderation-reconcile/index.ts',import.meta.url),'utf8')
const config=readFileSync(new URL('../supabase/config.toml',import.meta.url),'utf8')
const purge=readFileSync(new URL('../supabase/functions/f14-moderation-purge/index.ts',import.meta.url),'utf8')

test('reconciliation requires specific immutable target and service role',()=>{
  for(const token of [
    "auth.role() IS DISTINCT FROM 'service_role'",
    "'feed_post'","'140d3769-cde2-47dc-998a-dcb3238b6f17'::uuid",
    "'b9ef7bf4-9d86-4168-b124-a8b0b272d0c8'::uuid",
    "FOR UPDATE","v_claim.checked_at IS NULL",
    "v_claim.storage_object_id IS DISTINCT FROM p_storage_object_id",
    "v_claim.snapshot->>'source_url'",
    "r.status = 'removed'",
    "o.bucket_id = v_claim.bucket AND o.name = v_claim.snapshot->>'path'",
    "'complete'",
    "IF v_completed IS DISTINCT FROM true THEN RETURN false",
    "SET status = 'invalidated'",
    "VALUES (v_claim.claim_id,'invalidated')",
    "REVOKE ALL ON FUNCTION public.f14_finalize_one_object_reconciliation",
    "FROM PUBLIC, anon, authenticated",
    "TO service_role"
  ]) assert.ok(migration.includes(token),token)
})

test('reconciliation migration performs no Storage removal or schema security relaxation',()=>{
  assert.doesNotMatch(migration,/\b(?:DELETE FROM|TRUNCATE|DROP TRIGGER|DISABLE TRIGGER)\b/i)
  assert.doesNotMatch(migration,/\b(?:ALTER TABLE|GRANT.*TO\s+(?:PUBLIC|anon|authenticated))\b/i)
  assert.match(migration,/(?:^|\n)BEGIN;[\s\S]*COMMIT;\s*$/)
})

test('reconciliation Edge has no purge path and requires real moderator + four HTTP probes',()=>{
  for(const token of [
    'F14_ONE_OBJECT_RECONCILE_APPROVED = false',
    "F14_ONE_OBJECT_RECONCILE_ENABLED')!=='true'",
    "trialRequestAllowed(input.kind,input.id)",
    "userClient.auth.getUser(raw.slice(7))",
    "userClient.rpc('f14_is_moderator')",
    "admin.storage.from(target.bucket).info(target.path)",
    'storageObjectExists(info)',
    'publicUrlInaccessible(target.url)',
    "admin.rpc(\n      'f14_finalize_one_object_reconciliation'",
    "F14_TRIAL_SCOPE.storageObjectId"
  ]) assert.ok(edge.includes(token),token)
  assert.doesNotMatch(edge,/\.remove\s*\(|\brunMediaPurge\s*\(|createSignedUploadUrl|\.upload\s*\(/)
  assert.doesNotMatch(edge,/console\.(log|error|warn)\(/)
  assert.match(purge,/const F14_TRIAL_PURGE_APPROVED = false/)
  assert.match(purge,/const F14_MEDIA_PURGE_RELEASE_APPROVED = false/)
})

test('reconciliation deployment is disabled independently by config and immutable code',()=>{
  assert.match(config,/\[functions\.f14-moderation-reconcile\]\s+enabled = false\s+verify_jwt = true/)
  assert.match(edge,/if\(!F14_ONE_OBJECT_RECONCILE_APPROVED/)
})
