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
const mediaDraft = 'supabase/migrations/20261009010551_f14_media_status_presence_guard.sql'
const mediaTest = 'supabase/tests/database/f14_media_presence_rollback.test.sql'
assert.ok(existsSync(mediaDraft), 'Applied media classification must be in canonical migrations')
assert.ok(!existsSync('supabase/drafts/20261009_f14_media_status_presence_guard.sql'), 'Applied SQL must no longer remain in drafts')
assert.ok(existsSync(mediaTest), 'Media classification rollback test must be included')
assert.ok(read(mediaDraft).includes('depublished_no_media_review'), 'No-photo content must return no-media result')
assert.ok(read(mediaDraft).includes('photo_storage_path'), 'Community photo path must be checked')
assert.ok(read(mediaDraft).includes("WHEN 'pet_profile' THEN 'pending_review'"), 'Pet profile media status remains conservative')
assert.ok(read(mediaTest).includes('ROLLBACK;'), 'Migration test must end with rollback')
assert.ok(moderationQueue.includes('depublished_no_media_review'), 'Moderator UI must display correct no-media result')
const v2Guard = 'supabase/drafts/f14_media_purge_v2/mediaGuard.mjs'
const v2Cases = 'supabase/drafts/f14_media_purge_v2/mediaGuard.test.mjs'
const v2Readme = 'supabase/drafts/f14_media_purge_v2/README.md'
const realJwt = 'scripts/f14-signed-jwt-authorization.mjs'
for (const f of [v2Guard,v2Cases,v2Readme,realJwt]) assert.ok(existsSync(f), 'F14 A2 safe Storage audit artifact missing: ' + f)
assert.ok(read(v2Guard).includes("status: 'candidate_only'"), 'V2 must never claim deletion success')
assert.ok(!read(v2Guard).includes('.remove(['), 'Pure V2 must never delete files')
assert.ok(read(v2Cases).includes('legacy feed pet-only path'), 'Legacy paths must be regression-tested')
assert.ok(read(v2Readme).includes('NEVER DEPLOY'), 'Unapproved purge must remain gated')
assert.ok(read(realJwt).includes('PAZO_NORMAL_USER_ACCESS_TOKEN'), 'Security tests need a separate genuine user JWT')
const claimDraft = 'supabase/migrations/20261009014616_f14_media_claim_preflight.sql'
const claimPlan = 'supabase/drafts/f14_media_purge_v2/CLAIM_GATE.md'
const claimTests = [
  'supabase/tests/database/f14_media_claim_lease_rollback.test.sql',
  'supabase/tests/database/f14_media_claim_permissions_rollback.test.sql',
  'supabase/tests/database/f14_media_claim_community_rollback.test.sql',
  'supabase/tests/database/f14_media_claim_version_rollback.test.sql',
  'supabase/tests/database/f14_media_claim_legacy_rollback.test.sql',
  'supabase/tests/database/f14_media_claim_expiry_rollback.test.sql',
  'supabase/tests/database/f14_media_claim_refusals_rollback.test.sql',
]
for (const f of [claimDraft, claimPlan, ...claimTests])
  assert.ok(existsSync(f), 'F14 A2 claim gate artifact missing: ' + f)
const claimSql = read(claimDraft)
assert.ok(claimSql.includes('CREATE TABLE moderation_private.media_claims'), 'Private claim table missing')
assert.ok(claimSql.includes('CREATE TABLE moderation_private.media_claim_events'), 'Claim audit events missing')
assert.ok(claimSql.includes('pg_advisory_xact_lock'), 'Transactional preflight lock missing')
assert.ok(claimSql.includes("IF auth.role() IS DISTINCT FROM 'service_role'"), 'Service-only role check missing')
assert.ok(claimSql.includes('CREATE FUNCTION public.f14_recheck_media_claim'), 'Claim recheck missing')
assert.ok(!claimSql.includes('DELETE FROM storage.objects'), 'Never delete Storage metadata via SQL')
assert.ok(!claimSql.includes('storage.from('), 'Draft claim SQL must not mutate Storage API')
assert.ok(read(claimPlan).includes('APLICADA') && read(claimPlan).includes('503'), 'Claim migration is applied but purge must stay parked')
assert.ok(!existsSync('supabase/drafts/20261009_f14_media_claim_preflight.sql'), 'Applied migration draft must not remain as a second source')
for (const f of claimTests) {
  const testSql = read(f)
  assert.ok(testSql.trimEnd().endsWith('ROLLBACK;'), 'Claim SQL test must end with ROLLBACK: '+f)
  assert.ok(!testSql.includes('\nCOMMIT;'), 'Claim SQL test must never COMMIT: '+f)
}
const uiQa = read('src/features/moderation/F14RoleCheck.tsx')
const qaHost = read('src/features/moderation/SafetySettings.tsx')
assert.ok(uiQa.includes("supabase.auth.getUser()"), 'F14 QA must check current real authenticated session')
assert.ok(uiQa.includes("f14_prepare_media_claim") && uiQa.includes("f14_recheck_media_claim"), 'F14 QA must test service-only RPC denial')
assert.ok(uiQa.includes("error?.code === '42501'"), 'Denied permission MUST require SQLSTATE 42501, not any error')
assert.ok(!uiQa.includes('!!prepare.error') && !uiQa.includes('!!recheck.error'), 'Network errors must NOT pass security checks')
assert.ok(!uiQa.includes('!!queue.error') && !uiQa.includes('!!media.error'), 'Normal users require confirmed authorization denials')
assert.ok(uiQa.includes("Tipo de cuenta comprobado:"), 'Preview QA must identify its verified account type')
assert.ok(!uiQa.includes('access_token') && !uiQa.includes('getSession()'), 'F14 QA must not read/copy bearer tokens')
assert.ok(qaHost.includes("window.location.hostname.includes('pazo-app-t83r')"), 'QA must only appear in isolated Preview project')
assert.ok(!uiQa.includes('remove(['), 'F14 QA must never delete Storage content')
const holdMigration = 'supabase/migrations/20261009040957_f14_storage_held_media_guard.sql'
const holdRegression = 'supabase/tests/database/f14_storage_held_media_guard_rollback.test.sql'
assert.ok(existsSync(holdMigration) && existsSync(holdRegression), 'Installed Storage hold guard must be versioned')
assert.ok(!existsSync('supabase/drafts/20261009_f14_storage_held_media_policy.sql'), 'Applied hold guard must not remain a draft')
const holdSql = read(holdMigration)
assert.ok(holdSql.includes('AS RESTRICTIVE FOR INSERT') && holdSql.includes('AS RESTRICTIVE FOR DELETE'), 'Storage hold must restrict both insert and delete')
assert.ok(holdSql.includes('f14_media_claims_held_bucket_path_idx'), 'Storage hold lookup index required')
assert.ok(!holdSql.includes('DELETE FROM storage.objects') && !holdSql.includes('.remove('), 'Storage hold migration must not delete files')
assert.ok(read(holdRegression).trimEnd().endsWith('ROLLBACK;'), 'Storage hold test must be reversible')
const storageSmoke = read('src/features/moderation/F14StorageProbe.tsx')
assert.ok(storageSmoke.includes('f14-storage-probe-'), 'Storage smoke must isolate its fixture by unique path')
assert.ok(storageSmoke.includes('upsert: false'), 'Storage smoke must never overwrite existing files')
assert.ok(storageSmoke.includes('.remove([path])'), 'Storage smoke must clean ONLY its self-generated file')
assert.ok(storageSmoke.includes('isTrialPath(path, uid)'), 'Storage smoke must validate exact fixture ownership before removal')
assert.ok(storageSmoke.includes('storage.list(uid,'), 'Storage smoke must verify object presence and absence via supported list API')
assert.ok(!storageSmoke.includes('storage.info(path)'), 'Storage smoke must not depend on unavailable SDK info method')
assert.ok(storageSmoke.includes('sessionStorage.setItem'), 'Storage smoke must support interrupted cleanup')
assert.ok(qaHost.includes('<F14StorageProbe lang={lang} />'), 'Storage smoke must live in QA-only Preview')
const updateDraft = 'supabase/drafts/20261009_f14_storage_held_media_update_guard.sql'
const updateSmoke = 'supabase/tests/database/f14_storage_held_media_update_draft_rollback.test.sql'
const updateBehavior = 'supabase/tests/database/f14_storage_held_update_behavior_rollback.test.sql'
const updateCandidate = 'supabase/tests/database/f14_storage_held_update_candidate_rollback.test.sql'
const casGate = 'supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md'
for (const f of [updateDraft, updateSmoke, updateBehavior, updateCandidate, casGate])
  assert.ok(existsSync(f), 'F14 staged fail-closed UPDATE artifact missing: '+f)
const updateSql = read(updateDraft)
assert.ok(updateSql.includes('AS RESTRICTIVE FOR UPDATE') &&
  updateSql.includes('USING (public.f14_storage_media_path_unclaimed(bucket_id,name))') &&
  updateSql.includes('WITH CHECK (public.f14_storage_media_path_unclaimed(bucket_id,name))'),
  'Staged UPDATE guard must protect BOTH existing and new object paths')
assert.ok(updateSql.includes("AND c.status='held'") &&
  !updateSql.includes('c.expires_at>statement_timestamp()'),
  'Candidate must block held media even after claim TTL expires')
assert.ok(updateSql.includes('CREATE OR REPLACE FUNCTION public.f14_recheck_media_claim') &&
  updateSql.includes('RETURN false;'),
  'Service-role recheck candidate must fail closed on expired/drifted claims')
assert.ok(!updateSql.includes("SET status='invalidated'"),
  'Candidate recheck must not automatically release media holds')
assert.ok(!updateSql.includes('DELETE FROM storage.objects'), 'Guard draft must never delete Storage metadata')
for (const f of [updateSmoke, updateBehavior, updateCandidate]) {
  const testSql = read(f)
  assert.ok(testSql.includes('BEGIN;') && testSql.trimEnd().endsWith('ROLLBACK;'),
    'Staged RLS tests must be transactionally reversible: '+f)
  assert.ok(!testSql.includes('\nCOMMIT;'), 'Staged RLS tests must never commit: '+f)
}
const behaviorSql = read(updateBehavior)
assert.ok(behaviorSql.includes('f14_test_update_permission') &&
  behaviorSql.includes('SET LOCAL ROLE authenticated') &&
  behaviorSql.includes('Unheld UPDATE should be permitted') &&
  behaviorSql.includes('Held UPDATE must affect zero rows'),
  'Behavior-level SQL must simulate a future UPDATE grant while blocking held media')
const candidateSql = read(updateCandidate)
assert.ok(candidateSql.includes('Candidate: held claim must still protect after TTL expiry') &&
  candidateSql.includes('Invalidated claim must release path') &&
  candidateSql.includes('CREATE OR REPLACE FUNCTION public.f14_storage_media_path_unclaimed') &&
  candidateSql.includes('Expiry recheck must NOT automatically invalidate the hold') &&
  candidateSql.includes('Source drift recheck must NOT automatically invalidate hold'),
  'Candidate rollback test must prove fail-closed expiry and explicit release')
const casContract = read(casGate)
assert.ok(casContract.includes('service_role') &&
  casContract.includes('claim_id') &&
  casContract.includes('manual_review'),
  'CAS design must fail closed on service bypass, identity drift and uncertainty')
assert.ok(parked.includes('status: 503') &&
  !parked.includes('.remove(') && !parked.includes('fetch('),
  'F14 moderation purge Edge must remain strictly parked; no Storage HTTP operations')

console.log('F14 moderation static contract: PASS (not a database or Storage purge test)')
