import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = p => readFileSync(p,'utf8')
const canonical = 'supabase/migrations/20261008120333_f14_reports_moderation.sql'
assert.ok(existsSync(canonical), 'A2 applied SQL version must be tracked with hosted version')
assert.ok(!existsSync('supabase/drafts/20261008150000_f14_reports_moderation.sql'), 'Applied SQL must not stay in drafts')
const sql = read(canonical)
for (const s of [
  'CREATE SCHEMA IF NOT EXISTS moderation_private',
  'CREATE TABLE moderation_private.reports',
  'CREATE TABLE moderation_private.moderator_grants',
  'CREATE TABLE moderation_private.moderation_actions',
  'CREATE TABLE moderation_private.content_restrictions',
  'CREATE POLICY f14_moderated_pets_select',
  'AS RESTRICTIVE FOR SELECT TO PUBLIC',
  'CREATE FUNCTION public.f14_submit_report',
  'CREATE FUNCTION public.f14_is_moderator',
  'CREATE FUNCTION public.f14_moderation_queue',
  'CREATE FUNCTION public.f14_review_report',
  'CREATE FUNCTION public.f14_pending_media',
  'CREATE FUNCTION public.f14_media_task',
  'CREATE FUNCTION public.f14_confirm_media_cleanup',
  'legacy.legacy_id = item.elem',
  "'pending_review'",
  'REVOKE ALL ON ALL TABLES IN SCHEMA moderation_private',
]) assert.ok(sql.includes(s), 'Missing moderation contract: '+s)
for (const s of ['feed_post','feed_comment','pet_profile','community_post','community_comment'])
  assert.ok(sql.includes(s), 'Missing report target '+s)
for (const f of [
  'src/features/moderation/reportingService.ts',
  'src/features/moderation/ReportDialog.tsx',
  'src/features/moderation/ModeratorQueue.tsx',
  'src/features/moderation/ModerationMediaQueue.tsx',
  'supabase/functions/f14-moderation-purge/index.ts'
]) assert.ok(existsSync(f), 'Missing UI/service '+f)
const parked = read('supabase/functions/f14-moderation-purge/index.ts')
assert.ok(parked.includes('Media cleanup disabled pending security verification'), 'Deployed function must remain parked')
assert.ok(!parked.includes('.storage.from('), 'Deployed function must not contain Storage DELETE logic')
const future = read('supabase/drafts/f14_moderation_purge_full_proposal.ts')
assert.ok(future.includes('parts.length !== expected.length + 1'), 'Future purge must validate owner and path')
console.log('F14 moderation static contract: PASS (not a database or Storage purge test)')
