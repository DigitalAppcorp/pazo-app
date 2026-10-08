import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = p => readFileSync(p,'utf8')
const draft = 'supabase/drafts/20261008150000_f14_reports_moderation.sql'
assert.ok(existsSync(draft), 'A2 SQL draft must remain outside canonical production migrations')
assert.ok(!existsSync('supabase/migrations/20261008150000_f14_reports_moderation_DRAFT.sql'), 'Draft must not be picked up by migrations')
const sql = read(draft)
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
console.log('F14 moderation static contract: PASS (not a database or Storage purge test)')
