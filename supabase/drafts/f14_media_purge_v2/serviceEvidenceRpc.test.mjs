import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const sql=readFileSync('supabase/migrations/20261009153000_f14_service_only_media_evidence_reader.sql','utf8')
const body=sql.replace(/--[^\n]*/g,'').trim()
test('RPC is strict service-only security definer, no grants on private schema',()=>{
 assert.ok(sql.includes('CREATE FUNCTION public.f14_get_media_claim_evidence(p_claim uuid)'))
 assert.ok(sql.includes('SECURITY DEFINER'))
 assert.ok(sql.includes("SET search_path = ''"))
 assert.ok(sql.includes("auth.role() IS DISTINCT FROM 'service_role'"))
 assert.ok(sql.includes("USING ERRCODE='42501'"))
 assert.ok(sql.includes('FROM PUBLIC,anon,authenticated,service_role'))
 assert.ok(sql.includes('TO service_role;'))
 assert.doesNotMatch(body,/\bGRANT\s+(?:USAGE|SELECT|INSERT|DELETE|UPDATE)\s+ON\s+(?:SCHEMA|TABLE|ALL\s+TABLES)/i)
})
test('RPC returns only candidate evidence when current claim, source and moderation align',()=>{
 for(const token of [
  "'status','candidate_only'","'mayDelete',false",
  "c.status='held'","c.expires_at>clock_timestamp()",
  "cr.report_id=c.report_id AND cr.media_status='pending_review'",
  "r.target_id=c.target_id AND r.status='removed'",
  'moderation_private.f14_media_probe(c.target_kind,c.target_id)',
  'live.snapshot=c.snapshot','o.id=c.storage_object_id',
  "o.name=(c.snapshot->>'path')",'FOR SHARE OF c,cr,r,o',
  "'url_reference_count'","'community_path_count'",
 ]) assert.ok(sql.includes(token),'Missing read-only RPC safeguard: '+token)
 assert.doesNotMatch(body,/\b(?:DELETE\s+FROM|UPDATE\s+|INSERT\s+INTO|TRUNCATE\s+|DROP\s+|ALTER\s+|CALL\s+)\b/i)
 assert.doesNotMatch(body,/(?:storage\.remove|\.storage\.from|\.remove\()/i)
 assert.doesNotMatch(body,/\bpurged\b/i)
})
