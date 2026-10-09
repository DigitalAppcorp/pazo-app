import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read=p=>readFileSync(p,'utf8')
const sql=read('supabase/drafts/f14_media_purge_v2/20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql')
const body=sql.replace(/--[^\n]*/g,'').trim()
const inventory=read('supabase/drafts/f14_media_purge_v2/WRITER_INVENTORY_AND_BOUNDARIES.md')
const protocol=read('supabase/drafts/f14_media_purge_v2/PRIVILEGED_ATTEMPT_FENCE_GATE.md')

test('privileged ledger SQL is clearly an unapplied, schema-only proposal',()=>{
 assert.match(sql,/ARCHITECTURAL DRAFT ONLY\. DO NOT APPLY/)
 assert.ok(sql.trimEnd().endsWith('no Edge DELETE.'))
 assert.match(body,/^BEGIN;/)
 assert.match(body,/COMMIT;$/)
 assert.match(body,/CREATE TABLE moderation_private\.media_purge_attempts\s*\(/)
 assert.match(body,/CREATE TABLE moderation_private\.media_writer_fences\s*\(/)
 assert.match(body,/CREATE TABLE moderation_private\.media_purge_attempt_events\s*\(/)
 assert.doesNotMatch(body,/\b(?:DELETE\s+FROM|UPDATE\s+[a-z]|INSERT\s+INTO|TRUNCATE|DROP\s+TABLE|CREATE\s+(?:OR REPLACE\s+)?FUNCTION|CREATE\s+POLICY|CREATE\s+TRIGGER|CALL\s+)\b/i)
 assert.doesNotMatch(body,/\bGRANT\b/i)
})
test('claims and exact Storage identity cannot be silently swapped',()=>{
 for(const token of [
  'claim_id uuid NOT NULL UNIQUE',
  'REFERENCES moderation_private.media_claims(claim_id) ON DELETE RESTRICT',
  'object_version text NOT NULL',
  'fence_generation bigint NOT NULL CHECK (fence_generation > 0)',
  'fence_token uuid NOT NULL',
  'UNIQUE(operation_id,bucket,object_path)',
  'CREATE UNIQUE INDEX media_purge_attempts_path_once',
  'ON moderation_private.media_purge_attempts(bucket,object_path)',
  'FOREIGN KEY (active_operation_id,bucket,object_path)',
  'REFERENCES moderation_private.media_purge_attempts(operation_id,bucket,object_path)',
  'UNIQUE(operation_id,event_type,fence_generation,event_at)',
 ])
  assert.ok(body.includes(token),'Missing private ledger integrity contract: '+token)
 for(const bucket of ['post-photos','community-post-photos'])
  assert.ok(body.includes(bucket))
 assert.ok(body.includes("position('..' in object_path) = 0"))
 assert.ok(body.includes("position('//' in object_path) = 0"))
})
test('attempts remain uncertain/held after timeout and cannot auto-close or release',()=>{
 for(const status of [
  "'prepared_unverified'","'possibly_in_flight'","'unknown_after_dispatch'",
  "'awaiting_origin_check'","'origin_absent_observed'","'manual_review'",
 ])
  assert.ok(body.includes(status),'Missing fail-closed state '+status)
 assert.ok(body.includes('CHECK (dispatch_count IN (0,1))'))
 assert.ok(body.includes("CHECK (state IN ('quarantined','possibly_in_flight','manual_review'))"))
 assert.doesNotMatch(body,/\bpurged\b|\breleased\b|\bretry_delete\b|\bauto_retry\b/i)
 assert.doesNotMatch(body,/\b(?:expires_at|ttl|lease_timeout|retention_until)\b/i)
})
test('private ledger cannot be selected or mutated directly by API roles',()=>{
 const tables=[
  'moderation_private.media_purge_attempts',
  'moderation_private.media_writer_fences',
  'moderation_private.media_purge_attempt_events',
 ]
 for(const name of tables){
  assert.ok(body.includes('ALTER TABLE '+name+' ENABLE ROW LEVEL SECURITY;'))
  assert.ok(body.includes('ALTER TABLE '+name+' FORCE ROW LEVEL SECURITY;'))
  assert.ok(body.includes('REVOKE ALL ON TABLE '+name))
 }
 assert.ok(body.includes('FROM PUBLIC,anon,authenticated,service_role;'))
 assert.ok(body.includes('REVOKE ALL ON SEQUENCE moderation_private.media_purge_attempt_events_event_id_seq'))
 assert.doesNotMatch(body,/\bGRANT\b/i)
 assert.doesNotMatch(body,/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/i)
})
test('private attempt data is minimal and events have no free-text payload',()=>{
 assert.doesNotMatch(body,/\b(?:reporter_id|reporter_user_id|email|phone|jwt|auth_header|post_text|user_content|image_bytes|gps|ip_address|event_payload|error_body)\b/i)
 assert.ok(body.includes('event_type text NOT NULL'))
 assert.ok(body.includes('event_at timestamptz NOT NULL DEFAULT clock_timestamp()'))
})
test('actual front-end operations and special synthetic probe are inventoried',()=>{
 const feed=read('src/components/modals/CreatePostModal.tsx')
 const communities=read('src/services/communityService.ts')
 const docs=read('src/services/documentService.ts')
 const client=read('src/services/supabaseClient.ts')
 const edge=read('supabase/functions/f14-moderation-purge/index.ts')
 assert.ok(feed.includes(".from('post-photos')"))
 assert.ok(feed.includes('upsert: false'))
 assert.ok(communities.includes("const COMMUNITY_POST_BUCKET = 'community-post-photos'"))
 assert.ok(communities.includes('export const deleteCommunityPost = async'))
 assert.ok(communities.includes('.remove([post.photoStoragePath])'))
 assert.ok(communities.includes('upsert: false'))
 assert.ok(docs.includes('DOCUMENT_BUCKET'))
 assert.doesNotMatch(client,/SERVICE_ROLE_KEY|service_role/i)
 assert.doesNotMatch(edge,/\.remove\(|storage\/v1\/object|storage\.from\(/)
 for(const phrase of ['CreatePostModal.tsx','communityService.ts','F14VersionProbe.tsx',
  'petService.ts','documentService.ts','NO comprobado'])
  assert.ok(inventory.includes(phrase),'Inventory missing: '+phrase)
 assert.ok(inventory.includes('inventario') && inventory.includes('no exhaustivo'))
 assert.ok(protocol.includes('todos los escritores') ||
  protocol.includes('TODOS los escritores') || protocol.includes('absolutamente todos'))
})
