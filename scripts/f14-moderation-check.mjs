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
const home = read('src/components/views/HomeView.tsx')
const petView = read('src/components/views/PetView.tsx')
const app = read('src/App.tsx')
const dialog = read('src/features/moderation/ReportDialog.tsx')
assert.ok(!home.includes('Bloqueos y contenido oculto'), 'Settings link must not interrupt Feed')
assert.ok(petView.includes('Seguridad y privacidad') && petView.includes('onOpenSafetySettings'), 'Security must be discoverable in account tab')
assert.ok(app.includes('onOpenSafetySettings={() => setShowSafetySettings(true)}'), 'Account tab must open security settings')
assert.ok(dialog.includes('subjectLabel') && home.includes('Post by '), 'Report needs selected-content context')
assert.ok(dialog.includes("from 'react-dom'") && dialog.includes('return createPortal(') && dialog.includes('document.body'), 'Report dialog must escape transformed Feed with a body portal')
assert.ok(dialog.includes('max-h-[calc(100dvh-2rem)]'), 'Report modal must stay visible on short mobile viewports')
assert.ok(dialog.includes('previousFocus?.focus()'), 'Report dialog must restore prior focus')
const moderationQueue = read('src/features/moderation/ModeratorQueue.tsx')
const safetySettings = read('src/features/moderation/SafetySettings.tsx')
assert.ok(moderationQueue.includes('createPortal(') && moderationQueue.includes('document.body'), 'Moderator queue must escape the animated safety panel')
assert.ok(moderationQueue.includes('max-h-[calc(100dvh-2rem)]'), 'Moderator queue must fit a mobile viewport')
assert.ok(safetySettings.includes('Ver denuncias pendientes'), 'Account view must show an actionable pending-report button')
assert.ok(dialog.includes("code === '23505'"), 'SQLSTATE duplicate report must be recognized')
assert.ok(dialog.includes('setAlreadyReported(true)') && dialog.includes('Denuncia pendiente'), 'Duplicate report UX must explain pending state')
assert.ok(dialog.includes("typeof dbError?.message === 'string'"), 'PostgREST plain-object errors must be supported')
assert.ok(home.includes('avatarFailed'), 'Social avatars should not render broken image placeholders')
assert.ok(home.includes('Opciones de la publicación'), 'Feed actions must use compact accessible menu')
const mediaDraft = 'supabase/drafts/20261009_f14_media_status_presence_guard.sql'
const mediaTest = 'supabase/tests/database/f14_media_presence_rollback.test.sql'
assert.ok(existsSync(mediaDraft), 'Media classification draft must be versioned outside canonical migrations')
assert.ok(existsSync(mediaTest), 'Media classification rollback test must be included')
assert.ok(read(mediaDraft).includes('depublished_no_media_review'), 'No-photo content must return no-media result')
assert.ok(read(mediaDraft).includes('photo_storage_path'), 'Community photo path must be checked')
assert.ok(read(mediaDraft).includes("WHEN 'pet_profile' THEN 'pending_review'"), 'Pet profile media status remains conservative')
assert.ok(read(mediaTest).includes('ROLLBACK;'), 'Migration test must end with rollback')
assert.ok(moderationQueue.includes('depublished_no_media_review'), 'Moderator UI must display correct no-media result')
console.log('F14 moderation static contract: PASS (not a database or Storage purge test)')
