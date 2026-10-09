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
// The previous path-only synthetic test was visually approved and retired.
// Keep Git history as evidence; do not ship an executable path-only cleaner.
assert.ok(!existsSync('src/features/moderation/F14StorageProbe.tsx'),
  'Deprecated path-only Storage test must not return to the app')
assert.ok(!qaHost.includes('F14StorageProbe'),
  'Previously approved path-only test must stay unmounted from Preview')
const updateMigration = 'supabase/migrations/20261009054411_f14_held_media_fail_closed_recheck_update_guard.sql'
const updateSmoke = 'supabase/tests/database/f14_storage_held_media_update_draft_rollback.test.sql'
const updateBehavior = 'supabase/tests/database/f14_storage_held_update_behavior_rollback.test.sql'
const updateCandidate = 'supabase/tests/database/f14_storage_held_update_candidate_rollback.test.sql'
const updateInstalled = 'supabase/tests/database/f14_storage_held_update_installed_rollback.test.sql'
const insertInstalled = 'supabase/tests/database/f14_storage_held_insert_guard_installed_rollback.test.sql'
const casGate = 'supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md'
assert.ok(!existsSync('supabase/drafts/20261009_f14_storage_held_media_update_guard.sql'),
  'Applied migration must no longer remain in drafts')
for (const f of [updateMigration, updateSmoke, updateBehavior, updateCandidate, updateInstalled, insertInstalled, casGate])
  assert.ok(existsSync(f), 'F14 staged fail-closed UPDATE artifact missing: '+f)
const updateSql = read(updateMigration)
assert.ok(updateSql.includes('APPLIED to hosted PAZO Supabase version 20261009054411'),
  'Canonical applied migration must record hosted version')
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
for (const f of [updateSmoke, updateBehavior, updateCandidate, updateInstalled, insertInstalled]) {
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
const installedSql = read(updateInstalled)
assert.ok(installedSql.includes('Installed UPDATE guard is missing') &&
  installedSql.includes('Installed guard: held claim must still protect after TTL expiry') &&
  !installedSql.includes('CREATE OR REPLACE FUNCTION public.f14_recheck_media_claim') &&
  !installedSql.includes('CREATE POLICY f14_media_claim_restrict_update'),
  'Installed SQL regression must test live backend without replacing production functions')
const insertSql = read(insertInstalled)
assert.ok(insertSql.includes('INSERT to held path must raise 42501') &&
  insertSql.includes('INSERT free path failed') &&
  insertSql.includes('ROLLBACK;') &&
  !insertSql.includes('DELETE FROM storage.objects'),
  'Installed Storage RLS test must cover held/free INSERT without SQL metadata deletion')
const copyRisk = 'supabase/tests/database/f14_storage_copy_prerequisites_rollback.test.sql'
const copyRecovery = 'supabase/drafts/f14_media_purge_v2/HELD_CLAIM_RECOVERY_AND_COPY_AUDIT.md'
for (const f of [copyRisk, copyRecovery])
  assert.ok(existsSync(f), 'F14 cross-service remaining-risk artifact missing: '+f)
const copySql = read(copyRisk)
assert.ok(copySql.includes('A public SELECT source + unheld owned INSERT destination') &&
  copySql.includes('SET LOCAL ROLE authenticated') &&
  copySql.trimEnd().endsWith('ROLLBACK;') &&
  !copySql.includes('DELETE FROM storage.objects'),
  'COPY limitations must be backed by reversible SQL without Storage deletion')
const recoveryContract = read(copyRecovery)
assert.ok(recoveryContract.includes('service_role') &&
  recoveryContract.includes('manual_review') &&
  recoveryContract.includes('MOVE') && recoveryContract.includes('COPY') &&
  recoveryContract.includes('UPSERT') && recoveryContract.includes('HTTP 503'),
  'Recovery/COPY limitations must remain documented and fail-closed')
const casContract = read(casGate)
assert.ok(casContract.includes('service_role') &&
  casContract.includes('claim_id') &&
  casContract.includes('manual_review'),
  'CAS design must fail closed on service bypass, identity drift and uncertainty')
assert.ok(parked.includes('status: 503') &&
  !parked.includes('.remove(') && !parked.includes('fetch('),
  'F14 moderation purge Edge must remain strictly parked; no Storage HTTP operations')

// F14 A2 hosted hardening 20261009055801 + 20261009055955.
const copyMigration = 'supabase/migrations/20261009055801_f14_held_media_copy_source_operation_guard.sql'
const copyDraft = 'supabase/drafts/20261009_f14_held_copy_source_select_guard.sql'
const copyDraftTest = 'supabase/tests/database/f14_held_copy_source_select_rollback.test.sql'
const copyInstalledTest = 'supabase/tests/database/f14_held_copy_source_installed_rollback.test.sql'
const disabledMigration = 'supabase/migrations/20261009055955_f14_disable_unverified_media_purge_confirmation.sql'
const disabledDraft = 'supabase/drafts/20261009_f14_disable_legacy_media_purge_confirmation.sql'
const disabledDraftTest = 'supabase/tests/database/f14_legacy_media_confirmation_disabled_rollback.test.sql'
const disabledInstalledTest = 'supabase/tests/database/f14_legacy_media_confirmation_installed_rollback.test.sql'
for (const path of [copyMigration,copyDraftTest,copyInstalledTest,
  disabledMigration,disabledDraftTest,disabledInstalledTest])
  assert.ok(existsSync(path), 'Applied F14 security gate artifact missing: ' + path)
for (const path of [copyDraft,disabledDraft])
  assert.ok(!existsSync(path), 'Applied migration must not remain in drafts: ' + path)
const copyGuardSql = read(copyMigration)
assert.ok(copyGuardSql.includes('AS RESTRICTIVE FOR SELECT') &&
  copyGuardSql.includes('storage.allow_any_operation') &&
  copyGuardSql.includes('storage.object.copy') &&
  copyGuardSql.includes('storage.s3.object.copy') &&
  copyGuardSql.includes('storage.s3.upload.part_copy') &&
  copyGuardSql.includes('OR public.f14_storage_media_path_unclaimed(bucket_id,name)'),
  'Copy guard must only deny held-source COPY operations, not ordinary reads')
const disabledSql = read(disabledMigration)
assert.ok(disabledSql.includes('CREATE OR REPLACE FUNCTION public.f14_confirm_media_cleanup') &&
  disabledSql.includes('Legacy media cleanup confirmation disabled') &&
  disabledSql.includes("ERRCODE='42501'") &&
  disabledSql.includes('REVOKE ALL ON FUNCTION public.f14_confirm_media_cleanup') &&
  !disabledSql.includes("SET media_status='purged'"),
  'Legacy media confirmation must reject all callers without purged mutation')
for (const path of [copyDraftTest,copyInstalledTest,disabledDraftTest,disabledInstalledTest]) {
  const sql = read(path)
  assert.ok(sql.includes('BEGIN;') && sql.trimEnd().endsWith('ROLLBACK;') &&
    !sql.includes('DELETE FROM storage.objects'),
    'Security SQL tests must be reversible and not delete Storage metadata: ' + path)
}
assert.ok(read(copyInstalledTest).includes('Installed COPY source guard missing'),
  'COPY validation must check hosted installed policy rather than install it')
assert.ok(read(disabledInstalledTest).includes('Service role must not invoke legacy purged confirmation'),
  'Legacy RPC validation must reject service_role on hosted backend')

const pendingMediaView = read('src/features/moderation/ModerationMediaQueue.tsx')
const reportApi = read('src/features/moderation/reportingService.ts')
assert.ok(pendingMediaView.includes('Revisión manual pendiente') &&
  pendingMediaView.includes('no se ha confirmado eliminación') &&
  pendingMediaView.includes('getPendingModerationMedia'),
  'Pending media UI must state manual-only review, not fake Storage success')
assert.ok(!pendingMediaView.includes('purgeModerationMedia') &&
  !pendingMediaView.includes('Storage aceptó la operación') &&
  !pendingMediaView.includes('Revisar y eliminar medio') &&
  !reportApi.includes("functions.invoke('f14-moderation-purge'") &&
  !reportApi.includes('purgeModerationMedia'),
  'User-facing moderator tools must not invoke parked destructive Storage Edge')

const noFalsePurge = 'supabase/migrations/20261009061213_f14_reject_unverified_purged_status.sql'
const noFalsePurgeDraftTest = 'supabase/tests/database/f14_reject_unverified_purged_draft_rollback.test.sql'
const noFalsePurgeInstalledTest = 'supabase/tests/database/f14_reject_unverified_purged_installed_rollback.test.sql'
for (const file of [noFalsePurge,noFalsePurgeDraftTest,noFalsePurgeInstalledTest])
  assert.ok(existsSync(file),'F14 false-purge safety regression missing: '+file)
const purgeLockSql=read(noFalsePurge)
assert.ok(purgeLockSql.includes('CREATE TRIGGER f14_no_unverified_media_purge') &&
  purgeLockSql.includes("IF NEW.media_status='purged'") &&
  purgeLockSql.includes("ERRCODE='23514'") &&
  !purgeLockSql.includes('DELETE FROM storage.objects'),
  'Installed false-purge guard must prevent recording success without object proof')
for (const file of [noFalsePurgeDraftTest,noFalsePurgeInstalledTest]) {
  const sql=read(file)
  assert.ok(sql.includes('BEGIN;') && sql.trimEnd().endsWith('ROLLBACK;') &&
    !sql.includes('DELETE FROM storage.objects'),
    'False-purge tests must be reversible and never delete Storage metadata')
}

// Exact-version behavior remains a Preview-only synthetic test, NOT production purge.
const versionInspector=read('supabase/drafts/f14_media_purge_v2/exactVersionPreflight.mjs')
const versionProbe=read('src/features/moderation/F14VersionProbe.tsx')
const safetyRoot=read('src/features/moderation/SafetySettings.tsx')
assert.ok(versionInspector.includes("status: 'manual_review'") &&
  versionInspector.includes("status: 'candidate_only'") &&
  versionInspector.includes('mayDelete: false') &&
  versionInspector.includes('versionId: live.version') &&
  !versionInspector.includes('.remove('),
  'Exact-version inspector must never become an executable deletion function')
assert.ok(existsSync('supabase/drafts/f14_media_purge_v2/exactVersionPreflight.test.mjs'),
  'Exact-version recheck must have hermetic unit tests')
assert.ok(safetyRoot.includes('f14QaPreview && <F14VersionProbe') &&
  versionProbe.includes('f14-version-probe-') &&
  versionProbe.includes('upsert: false') &&
  versionProbe.includes('storage.remove([{ path, versionId: wrongVersion }])') &&
  versionProbe.includes('storage.remove([{ path, versionId: version }])') &&
  versionProbe.includes('storage.remove([{ path, versionId: previous.versionId }])') &&
  versionProbe.includes('current.data?.id !== previous.objectId') &&
  versionProbe.includes('current.data?.version !== previous.versionId') &&
  versionProbe.includes('JSON.stringify({ path, objectId: firstId, versionId: version })') &&
  !versionProbe.includes('storage.remove([path])') &&
  versionProbe.includes("String(absent.error.statusCode) !== '404'") &&
  versionProbe.includes('setDone(true)') &&
  versionProbe.includes('const runningRef = useRef(false)') &&
  versionProbe.includes('if (runningRef.current || done) return') &&
  versionProbe.includes('runningRef.current = true') &&
  versionProbe.includes('runningRef.current = false') &&
  versionProbe.includes('storage.getPublicUrl(path).data.publicUrl') &&
  versionProbe.includes("url.searchParams.set('cacheNonce', crypto.randomUUID())") &&
  versionProbe.includes("fetch(url.toString(), { cache: 'no-store', signal: AbortSignal.timeout(5000) })") &&
  versionProbe.includes("fetch(publicUrl, { cache: 'reload', signal: AbortSignal.timeout(5000) })") &&
  versionProbe.includes('No demuestra invalidación mundial') &&
  versionProbe.indexOf('const edge = await fetch(') > versionProbe.indexOf("success('Versión exacta eliminada") &&
  !versionProbe.includes('purgeCache(') &&
  !versionProbe.includes('SUPABASE_SERVICE_ROLE_KEY') &&
  !versionProbe.includes('createClient(') &&
  !versionProbe.includes('pet-documents'),
  'Exact-version HTTP probe must be opt-in, synthetic, version-specific and never use service secrets')
const pkg=read('package.json')
assert.ok(pkg.includes('exactVersionPreflight.test.mjs'),
  'New preflight regression suite must be executed during CI governance')

// Hosted schema adapter remains PURE and must never authorize deletion.
const hostedAdapter = 'supabase/drafts/f14_media_purge_v2/hostedClaimEvidence.mjs'
const hostedTests = 'supabase/drafts/f14_media_purge_v2/hostedClaimEvidence.test.mjs'
assert.ok(existsSync(hostedAdapter) && existsSync(hostedTests), 'F14 hosted snapshot reconciliation needs tests')
const hostedCode = read(hostedAdapter)
assert.ok(hostedCode.includes('inspectExactVersionPreflight({') &&
  hostedCode.includes('snap.storage_object_id !== reservation.storage_object_id') &&
  hostedCode.includes('currentSourceSnapshot') &&
  hostedCode.includes('current_source_snapshot_drift') &&
  hostedCode.includes("references.url_reference_count !== 1") &&
  hostedCode.includes('references.community_path_count !== 1') &&
  hostedCode.includes("snap.source_url !== url") &&
  !hostedCode.includes('.remove(') &&
  !hostedCode.includes('supabase.storage') &&
  read('package.json').includes('hostedClaimEvidence.test.mjs'),
  'Hosted claim snapshot preflight must validate independent evidence and not delete')

// Five-type hosted SQL smoke: positive Auth intake, duplicate, 5/day limit,
// moderator dismissals and audit are reversible. NOT equivalent to browser QA.
const fiveKindsSmoke = 'supabase/tests/database/f14_five_report_kinds_hosted_rollback.test.sql'
assert.ok(existsSync(fiveKindsSmoke), 'Five report-kind hosted rollback suite must exist')
const fiveKindsSql = read(fiveKindsSmoke)
assert.ok(fiveKindsSql.trimEnd().endsWith('ROLLBACK;') &&
  fiveKindsSql.includes('SET LOCAL ROLE authenticated;') &&
  fiveKindsSql.includes("WHEN unique_violation THEN") &&
  fiveKindsSql.includes("WHEN invalid_parameter_value THEN") &&
  fiveKindsSql.includes("public.f14_review_report(") &&
  fiveKindsSql.includes("moderation_private.moderation_actions") &&
  !/\bCOMMIT\s*;/i.test(fiveKindsSql),
  'Hosted report QA must cover authentication, rate limits, audit and rollback')
for(const kind of ['feed_post','feed_comment','pet_profile','community_post','community_comment'])
  assert.ok(fiveKindsSql.includes(kind), 'Missing report target smoke case: '+kind)

// Moderated-content RLS must hide the 5 approved target kinds before beta.
// These hosted tests require seeded content but commit no reports or restrictions.
const fiveKindsVisibility = 'supabase/tests/database/f14_five_target_visibility_hosted_rollback.test.sql'
assert.ok(existsSync(fiveKindsVisibility), 'F14 hosted five-target visibility regression missing')
const visibilitySql = read(fiveKindsVisibility)
assert.ok(visibilitySql.trimEnd().endsWith('ROLLBACK;') &&
  visibilitySql.includes('SET LOCAL ROLE authenticated;') &&
  visibilitySql.includes('SET LOCAL ROLE anon;') &&
  visibilitySql.includes('moderation_private.content_restrictions') &&
  visibilitySql.includes('Moderated resource still visible to authenticated role') &&
  visibilitySql.includes('Moderated public Feed or pet visible to anon') &&
  !visibilitySql.includes('COMMIT;'),
  'F14 five-target RLS coverage must be reversible and verify anonymous visibility')
for(const kind of ['feed_post','feed_comment','pet_profile','community_post','community_comment'])
  assert.ok(visibilitySql.includes(kind), 'Missing visibility target: '+kind)

// Fail-closed recovery and exact-version HTTP classification are product gates,
// never automatically declare moderation media "purged" after a timeout or CDN hit.
for(const file of [
 'supabase/drafts/f14_media_purge_v2/held_claim_reconciliation_readonly.sql',
 'supabase/tests/database/f14_held_claim_operator_diagnostics_rollback.test.sql',
 'supabase/drafts/f14_media_purge_v2/HELD_CLAIM_OPERATOR_RUNBOOK.md',
 'supabase/drafts/f14_media_purge_v2/exactVersionOutcome.mjs',
 'supabase/drafts/f14_media_purge_v2/exactVersionOutcome.test.mjs',
]) assert.ok(existsSync(file),'F14 held-claim safety gate missing: '+file)
const claimDiagnose = read('supabase/drafts/f14_media_purge_v2/held_claim_reconciliation_readonly.sql')
const exactOutcome = read('supabase/drafts/f14_media_purge_v2/exactVersionOutcome.mjs')
assert.ok(claimDiagnose.includes('held_expired') &&
 claimDiagnose.includes('held_source_drift') &&
 claimDiagnose.includes('held_without_storage_metadata') &&
 claimDiagnose.includes('held_moderation_state_drift') &&
 !/\b(?:DELETE|TRUNCATE|INSERT|UPDATE|GRANT|REVOKE)\b/i.test(claimDiagnose.replace(/--[^\n]*/g,'')),
 'Operator diagnostic must be aggregate SELECT only')
assert.ok(exactOutcome.includes("status: 'origin_absent_observed'") &&
 exactOutcome.includes('mayFinalizePurge: false') &&
 exactOutcome.includes('cdnAbsentVerified: false') &&
 !exactOutcome.includes('.remove(') &&
 !exactOutcome.includes('supabase.storage'),
 'Exact-version outcome may observe origin absence but must never trigger deletion or final purge')
for(const testName of ['held_claim_reconciliation_readonly.test.mjs','exactVersionOutcome.test.mjs'])
 assert.ok(read('package.json').includes(testName),'Safety suites must run in F14 CI: '+testName)

// Permission regression proves that backend service access stays narrow and
// nobody gets direct SELECT access to private F14 moderation tables.
const privatePrivilegesTest = 'supabase/tests/database/f14_private_claim_permissions_readonly.test.sql'
assert.ok(existsSync(privatePrivilegesTest),'F14 private grants regression missing')
const privateAcl = read(privatePrivilegesTest)
assert.ok(privateAcl.trimEnd().endsWith('ROLLBACK;') &&
 privateAcl.includes("has_schema_privilege('authenticated',v_schema,'USAGE')") &&
 privateAcl.includes("has_schema_privilege('service_role',v_schema,'USAGE')") &&
 privateAcl.includes("has_function_privilege('service_role','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE')") &&
 privateAcl.includes('f14_no_unverified_media_purge') &&
 !privateAcl.includes('COMMIT;') &&
 !privateAcl.includes('GRANT '),
 'F14 permission smoke must remain read-only and deny legacy purge')

// A deployed SECURITY DEFINER reader must stay service-only and its SQL
// contract must be exercised by the same CI as the rest of F14.
const serviceReaderMigration = 'supabase/migrations/20261009095635_f14_service_only_media_evidence_reader.sql'
const serviceReaderTest = 'supabase/drafts/f14_media_purge_v2/serviceEvidenceRpc.test.mjs'
const serviceReaderRoles = 'supabase/tests/database/f14_service_only_evidence_reader_permissions_rollback.test.sql'
assert.ok([serviceReaderMigration,serviceReaderTest,serviceReaderRoles].every(existsSync),
  'Installed F14 reader SQL, contract test and hosted permission regression required')
const serviceReaderSql = read(serviceReaderMigration)
assert.ok(serviceReaderSql.includes("auth.role() IS DISTINCT FROM 'service_role'") &&
  serviceReaderSql.includes("'mayDelete',false") &&
  serviceReaderSql.includes('FOR SHARE OF c,cr,r,o') &&
  !/\b(?:INSERT INTO|UPDATE |DELETE FROM|TRUNCATE)\b/i.test(serviceReaderSql.replace(/--[^\n]*/g, '')) &&
  read('package.json').includes(serviceReaderTest),
  'Service-only claim reader must remain read-only and regression-covered')

// The live service-reader regression covers the adversarial cases missing
// from the initial positive fixture; SQL runs against PAZO only under ROLLBACK.
const serviceReaderDrift = 'supabase/tests/database/f14_service_evidence_reader_drift_rollback.test.sql'
assert.ok(existsSync(serviceReaderDrift), 'Service-only reader drift regression missing')
const readerDriftSql = read(serviceReaderDrift)
assert.ok(readerDriftSql.trimEnd().endsWith('ROLLBACK;') &&
  readerDriftSql.includes('Shared photo URL unexpectedly passed') &&
  readerDriftSql.includes('Expired media hold unexpectedly returned') &&
  readerDriftSql.includes('Dismissed report unexpectedly returned') &&
  readerDriftSql.includes('No longer pending_review unexpectedly returned') &&
  readerDriftSql.includes('Changed Storage version unexpectedly returned') &&
  !readerDriftSql.includes('COMMIT;') &&
  !readerDriftSql.includes('DELETE FROM storage.objects'),
  'Adversarial service-reader test must remain complete and rollback-only')

// Service-only evidence can be assessed offline, never sent to Storage for deletion.
const dryRunAdapterPath = 'supabase/drafts/f14_media_purge_v2/serviceReaderDryRun.mjs'
const dryRunAdapterTest = 'supabase/drafts/f14_media_purge_v2/serviceReaderDryRun.test.mjs'
assert.ok(existsSync(dryRunAdapterPath) && existsSync(dryRunAdapterTest),
  'Service-only reader dry-run adapter/tests must be checked in')
const dryRunAdapter = read(dryRunAdapterPath)
assert.ok(dryRunAdapter.includes('inspectHostedClaimEvidence(result)') &&
  dryRunAdapter.includes('mayDelete: false') &&
  dryRunAdapter.includes('requires_privileged_writer_fence_and_attempt_ledger') &&
  !dryRunAdapter.includes('.remove(') &&
  !dryRunAdapter.includes('supabase.storage') &&
  read('package.json').includes(dryRunAdapterTest),
  'Service-only evidence must never turn directly into permission to purge')

// A hypothetical HTTP journal cannot become an implicit DELETE permission.
// Proof model enumerates event interleavings but is NOT a live service fence.
const attemptModel = 'supabase/drafts/f14_media_purge_v2/privilegedAttemptProtocol.mjs'
const attemptTest = 'supabase/drafts/f14_media_purge_v2/privilegedAttemptProtocol.test.mjs'
assert.ok(existsSync(attemptModel) && existsSync(attemptTest),
  'Privileged attempt model and concurrency regression required')
const attemptText = read(attemptModel)
const attemptSuite = read(attemptTest)
assert.ok(attemptText.includes('mayDelete: false') &&
  attemptText.includes('shouldSendHttp: false') &&
  attemptText.includes('mayFinalizePurge: false') &&
  attemptText.includes('canReleaseHold: false') &&
  !attemptText.includes('.remove(') &&
  !attemptText.includes('supabase.storage') &&
  attemptSuite.includes('interleavings up to 3 events') &&
  attemptSuite.includes('HTTP_TIMEOUT') &&
  attemptSuite.includes('RETRY_DELETE') &&
  read('package.json').includes(attemptTest),
  'Concurrent writer protocol must remain simulation-only and fail-closed')

// The ledger is ONLY A DRAFT: the active project has no ledger RPC/table,
// no privileged writer fence, and no media delete endpoint. CI must prevent
// this prototype from silently becoming a deployed purge.
const ledgerDraft = 'supabase/drafts/f14_media_purge_v2/20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql'
const ledgerTest = 'supabase/drafts/f14_media_purge_v2/privilegedAttemptLedgerDraft.test.mjs'
const writerInventory = 'supabase/drafts/f14_media_purge_v2/WRITER_INVENTORY_AND_BOUNDARIES.md'
assert.ok([ledgerDraft,ledgerTest,writerInventory].every(existsSync),
  'F14 privileged writer inventory, private ledger draft and contract tests required')
const ledgerSqlText = read(ledgerDraft)
assert.ok(ledgerSqlText.includes('ARCHITECTURAL DRAFT ONLY. DO NOT APPLY') &&
  ledgerSqlText.includes('REVOKE ALL ON TABLE moderation_private.media_purge_attempts') &&
  ledgerSqlText.includes('FOREIGN KEY (active_operation_id,bucket,object_path,generation)') &&
  !ledgerSqlText.includes('GRANT EXECUTE ON FUNCTION') &&
  read('package.json').includes(ledgerTest),
  'F14 ledger proposal must remain private, fenced by identity, tested and unapplied')

// F14 A2: private journal transitions are draft-only; exercises never
// authorize an HTTP send or a release. The two-connection SQL fixture must
// remain in the isolated Docker CI (not in Supabase production migrations).
const transitionDraft = 'supabase/drafts/f14_media_purge_v2/20261009_attempt_transitions_SIMULATION_ONLY.sql'
const transitionTest = 'supabase/drafts/f14_media_purge_v2/attempt_transitions_ephemeral.test.sql'
const raceFiles = [
  'supabase/drafts/f14_media_purge_v2/attempt_concurrency_ephemeral.setup.sql',
  'supabase/drafts/f14_media_purge_v2/attempt_concurrency_worker_a.sql',
  'supabase/drafts/f14_media_purge_v2/attempt_concurrency_worker_b.sql',
  'supabase/drafts/f14_media_purge_v2/attempt_concurrency_after.sql',
]
assert.ok([transitionDraft,transitionTest,...raceFiles].every(existsSync),
  'F14 private journal transition and two-session SQL proof required')
const transitionSql = read(transitionDraft)
const transitionSmoke = read('scripts/test-f14-ledger-ephemeral.sh')
assert.ok(transitionSql.includes('SECURITY INVOKER') &&
  transitionSql.includes('FOR UPDATE OF a,f,c') &&
  transitionSql.includes("'shouldSendHttp',false") &&
  transitionSql.includes("'mayDelete',false") &&
  transitionSql.includes('REVOKE ALL ON FUNCTION') &&
  !transitionSql.includes('GRANT EXECUTE') &&
  !transitionSql.includes('DELETE FROM storage.objects') &&
  read(transitionTest).trimEnd().endsWith('ROLLBACK;') &&
  read(raceFiles[1]).includes('pg_sleep(6)') &&
  read(raceFiles[2]).includes("lock_timeout = '450ms'") &&
  read(raceFiles[3]).trimEnd().endsWith('ROLLBACK;') &&
  transitionSmoke.includes(transitionDraft) &&
  raceFiles.every(file => transitionSmoke.includes(file)),
  'Private draft journal must remain locked, unprivileged and SQL-tested')

console.log('F14 moderation static contract: PASS (not a database or Storage purge test)')
