# PAZO — ACTIVE HANDOFF

**Project Brain OS:** v1.4.0
**Canonical OS:** `DigitalAppcorp/project-brain-os`  
**Product Owner:** Brandon  
**Current state:** Fase 12 COMPLETADA  
**Active product module:** Production Hardening — infraestructura obligatoria  
**Gate:** Production Hardening Gate 8 — PR #30 MERGED / EXTERNAL HARDENING PENDING  
**Decision:** MVP REDUCIDO  
**Current remote mutation authorization:** NINGUNA; las aplicaciones históricas registradas permanecen verificadas

**Operational precedence:** the last checkpoint in this file supersedes earlier historical "exact next step" notes.

## Startup protocol

Before acting:
1. activate/read Project Brain OS v1.4.0 from `DigitalAppcorp/project-brain-os`;
2. read `AGENTS.md`;
3. read this file;
4. read `docs/PAZO_MASTER_ROADMAP.md`;
5. read `docs/PAZO_MODULE_LIFECYCLE.md`;
6. audit the real current `main` and open PRs before changing code.

Do not reconstruct project state from chat memory when repository evidence exists.

## Working model

- Brandon is Product Owner.
- Codex/local is the primary technical owner for day-to-day implementation, architecture, tests and durable documentation.
- ChatGPT normal + GitHub is the fallback path and must resume from repository evidence, not conversation memory.
- Product reasoning, code, backend, security, tests and Git/PR state must remain transferable through the canonical docs and Git state.
- Never mutate Supabase/production or push, merge or deploy without explicit current Product Owner authorization.
- Preserve already-approved behavior and avoid silent regressions.

## Fase 8 — final closure

**Status:** COMPLETADA / Gate 9 measurement.

Core merge:
- PR #20;
- merge commit `ca3fedd977e0720839a420f2e3673942871b7a61`.

Closure correction:
- PR #22;
- merge commit `f775ce75f680a7059dbb7ccef9084816a1c3a299`;
- `main` verified after merge.

Validated core:
- real Mapbox map: PASS;
- explicit ephemeral device location: PASS;
- exact GPS not persisted;
- curated Places catalog: PASS;
- search/filter/detail: PASS;
- private/visible check-in: PASS;
- 2-hour expiry: PASS;
- moving between places closes previous presence: PASS;
- manual checkout: PASS;
- F5 persistence: PASS;
- second-account privacy/isolation: PASS;
- place suggestion flow: PASS.

Closure deliverables:
- 6 contextual Place fake doors: PASS;
- fake-door backend registry: PASS;
- `Me interesa`: PASS;
- fake-door F5 persistence: PASS;
- 6 reusable glTF category models: PASS;
- veterinarian 3D visual validation: PASS;
- park/trail visual validation: PASS;
- 2D fallback retained;
- Product Owner build/runtime validation: PASS.

Supabase:
- `20261007052747 phase_8_places_map_core`;
- `20261007052749 phase_8_places_initial_catalog`;
- `20261007053859 fix_place_checkin_checkout_rls`;
- `20261007072355 place_extension_experiments` registry applied;
- 6 `places_*` module keys present;
- Security Advisor baseline unchanged;
- Leaked Password Protection remains global known debt.

**Scope Closure Reconciliation: PASS.**

## Fase 12 — final closure

**Status:** COMPLETADA / Gate 9 measurement.

Product:
- Explore was redefined as PAZO Global Search;
- searchable identity = public pet profiles, never human accounts;
- MVP providers = Pets + Communities + Places;
- Search lives in Header;
- Communities is a primary bottom-nav module;
- Posts and Events are outside this MVP.

Delivery:
- federated Search with independent providers;
- deterministic per-domain ranking;
- minimal type filters;
- debounce + stale-response protection;
- partial-provider failure tolerance;
- Search → public pet profile: PASS;
- Search → Community: PASS;
- Search → Map Place: PASS;
- manual return/navigation does not reopen consumed targets: PASS;
- old Explore container removed;
- Communities core reused rather than rebuilt.

Build/runtime evidence:
- pre-telemetry local build: PASS;
- final post-telemetry local build: PASS;
- Product Owner runtime/visual QA: PASS;
- Pet search: PASS;
- Community search: PASS;
- Place search: PASS;
- empty state/filter behavior: PASS;
- Feed / Communities / Map / My Pet smoke test: PASS;
- F5 persistence/stability smoke test: PASS.

Supabase:
- `20261007102632 phase_12_search_telemetry`;
- `20261007102748 index_search_usage_events_user`;
- RLS/grants/constraints: PASS;
- anon telemetry access: blocked;
- authenticated client: approved INSERT columns only;
- no client SELECT/UPDATE/DELETE;
- no raw query, entity id, owner id or GPS stored;
- live runtime telemetry observed: 33 events / 1 session during Product Owner QA;
- runtime telemetry included search opens, searches with/without results, all four filter states used, and result opens for pet/community/place;
- Security Advisor: no new Fase 12 security findings;
- FK index performance finding corrected forward.

Git final:
- PR #28 merged;
- merge commit `6ebc2e5d70b2cee37e7444916a03479b9b9d1d90`;
- `main` verified after merge;
- Global Search code present on `main`;
- both Phase 12 migration files present on `main`;
- canonical Phase 12 docs on `main` show Gate 8 CLOSED / Phase 12 COMPLETE;
- Vercel failures were quota/rate-limit only and were not used as build evidence.

**Scope Closure Reconciliation: PASS.**

Next:
- Production Hardening ocupa temporalmente el Carril de Implementación;
- Fase 12 permanece COMPLETADA / Gate 9 medición;
- no iniciar Fase 13 hasta cerrar el tranche crítico de hardening.

## Other current product state

Completed:
- F0 Foundation;
- F1 Public profile + Follow;
- F2 Feed interactions;
- F3 Pet registration/edit/privacy;
- F4 Security/stabilization;
- F5 Multi-pet;
- F6 QR passport/lost/sightings;
- F7 Communities real core;
- F8 Places/Map/Check-ins;
- F9A Agenda/Care;
- F9B Private Documents.

Validation/measurement:
- Communities advanced extensions;
- Places advanced extensions.

Postponed/re-evaluate:
- Messaging, due network effect/moderation cost.

Known global debt:
- Supabase Auth Leaked Password Protection disabled;
- general notification center incomplete/planned;
- events remain incomplete/planned.

## Canonical references

- `AGENTS.md`
- `docs/PAZO_MASTER_ROADMAP.md`
- `docs/PAZO_MODULE_LIFECYCLE.md`
- `docs/PAZO_MVP_MODULE_PRIORITY.md`
- `docs/PAZO_PHASE_8_PLACES_MASTER.md`
- `docs/PAZO_PHASE_12_EXPLORE_MASTER.md`

Repository state is canonical. Conversation memory is secondary.


## Active infrastructure — Production Hardening

Canonical:
- `docs/PAZO_PRODUCTION_HARDENING_MASTER.md`

Branch:
- `infra/external-hardening-2`

Current scope:
- PayPal webhook security;
- supporter pitch safety;
- React crash containment;
- CI baseline;
- observability/auth/key/cost hardening next.

Monetization intent remains valid, but supporter membership is temporarily hidden until secure backend confirmation plus product eligibility/price/benefits are defined.


### Production Hardening checkpoint
- Historical checkpoint: PR #30 was Draft at this stage; it was later merged.
- CI production build: PASS;
- legacy lint debt: 114 problems discovered; currently informational/non-blocking;
- supporter pitch removed from active frontend;
- browser-side Founder activation removed;
- Supabase browser key migrated to modern publishable key;
- PayPal webhook v3 deployed to production with fail-closed + PayPal signature verification logic;
- PayPal private secrets/runtime verified delivery: PENDING;
- Error Boundary global: implemented;
- Security Advisor: baseline only; Leaked Password Protection still pending.


### Production Hardening checkpoint — expanded
- PO runtime: PASS for removal of premature PayPal pitch/reload behavior.
- Social write anti-abuse migration: `20261007123638`, deployed + transactional PASS.
- Document finalize noise migration: `20261007124041`, deployed + transactional PASS.
- Error Boundary + privacy-minimal observability: implemented.
- PostHog env contract: implemented; external project ingestion verification PENDING.
- PostHog ChatGPT app: installed, actions not exposed in this session.
- Vercel ChatGPT app: installed, actions not exposed in this session.
- Auth UX/local baseline: 8+ chars, upper/lower/digit; fake Google/Apple bypass removed.
- Supabase hosted plan: Free; leaked-password protection therefore remains pending without forcing an upgrade.
- Inactive PayPal frontend SDK: removed.
- Expected 400/409 operational noise fixes: implemented.
- CI hardening regression test: implemented.
- Do NOT reactivate supporter membership until PayPal secrets + genuine webhook verification + product pricing/benefit/eligibility decisions are closed.


### Rescue/security checkpoint
- Migration `20261007124633_move_rescue_security_definers_private`: deployed.
- Public Rescue/Founder RPCs are now SECURITY INVOKER wrappers; privileged logic lives in non-exposed `rescue_private`.
- Anonymous wrapper test: PASS.
- Authenticated wrapper test: PASS.
- Security Advisor: 0 exposed SECURITY DEFINER warnings; only Leaked Password Protection remains.
- Supabase plan is Free, so do not upgrade solely for that warning without explicit PO approval.
- Cost rules canonical: `docs/PAZO_COST_GUARDRAILS.md`.
- PostHog exception protocol verified against current docs; structured redacted stack frames implemented.


### PR #30 final branch acceptance
- Product Owner final runtime/product validation: PASS.
- Final branch CI: PASS.
- Scope Closure Reconciliation for PR #30: PASS.
- Historical checkpoint: PR #30 was mergeable; final merged state is recorded below.
- Do NOT call Production Hardening globally complete yet.
- Historical next action completed: PR #30 merged and `main` was verified.
- After merge/main verification, continue the remaining external hardening backlog separately: PayPal real secrets/webhook delivery, PostHog live ingestion/alerts, Vercel/Mapbox spend controls, hosted Auth verification, CAPTCHA timing, backup/restore drill.


### Video-derived architecture/privacy reconciliation
Status: EN CURSO / PR #30 returned to Draft.

Implemented:
- canonical architecture contract: `docs/PAZO_ARCHITECTURE_CONTRACT.md`;
- canonical privacy/data governance: `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`;
- data + third-party provider inventory: `docs/PAZO_DATA_INVENTORY.md`;
- module lifecycle Gate 6/7 now requires data classification, telemetry/provider review and explicit code ownership;
- F14 expanded with UGC reporting/blocking, copyright/IP, account deletion, minor-handling procedure, data inventory, retention matrix, Privacy Policy/Terms and tracking audit;
- F15 expanded with restore drill, live observability verification, spend controls and client-storage audit;
- architecture CI guard blocks new domain services/views/modals in legacy global folders without conscious baseline update;
- privacy CI guard blocks session replay/autocapture/direct tracking patterns and reviewed tracking SDK additions by default;
- PostHog product events/properties now use an explicit allowlist;
- 18+ checkbox defaults false and requires active attestation;
- onboarding no longer claims acceptance of Terms that are not yet published.

Decision:
- no mass folder refactor in this tranche;
- no DOB/ID collection or invasive age verification introduced;
- no session replay/autocapture enabled.

Previous PR #30 Scope Closure Reconciliation is superseded by this mini-tranche and must be rerun after CI + PO visual/runtime validation.


### Architecture/privacy reconciliation CI checkpoint
- HEAD: `889fbe432019b1f13c30610cffac40c08fa5ae38`.
- Hardening regression checks: PASS.
- Architecture contract check: PASS.
- Privacy/data-governance check: PASS.
- TypeScript + production build: PASS.
- Lint: PASS on this run.
- PR #30 remains Draft until PO validates the visible 18+ onboarding change.


### Architecture/privacy reconciliation final acceptance
- PO visible onboarding validation: PASS.
- 18+ explicit attestation behavior: PASS.
- Navigation smoke test: PASS.
- Governance CI suite: PASS.
- Scope Closure Reconciliation: PASS.
- Historical checkpoint completed: PR #30 later returned to Ready for Review and was merged.
- Historical next action completed: PR #30 merged and main was verified.


### PR #30 merge closure
- PR #30: MERGED.
- Merge commit: `c179182c79c587c7727277a966cc09704002ce10`.
- Main verification:
  - premature PayPal pitch absent;
  - architecture contract present;
  - privacy/data-governance contract present;
  - data/provider inventory present;
  - hardening code present.
- Production Hardening remains EN CURSO.
- Next exact work is external/provider hardening, not F13:
  - PayPal real webhook verification;
  - PostHog live ingestion/alerts;
  - Vercel/Mapbox spend controls;
  - hosted Auth verification;
  - backup/restore drill.


### External hardening active checkpoint
- PostHog project connected.
- PostHog privacy settings applied + verified: anonymize IP ON; autocapture/replay/heatmaps/console/performance automatic capture OFF; timezone America/Los_Angeles.
- PostHog live ingestion: PENDING; project still has 0 events.
- PostHog integrations/alerts: 0; need an explicit destination before authoring alerts.
- Vercel connector: reachable but 0 teams / 0 projects; do not create a new project blindly.
- Supabase: Free; DB ~17 MB; Storage ~26 MB.
- Backup runbook: `docs/PAZO_BACKUP_RESTORE_RUNBOOK.md`.
- Storage backup utility: `scripts/backup-storage.mjs`.
- PayPal webhook v3: ACTIVE; 0 observed real webhook calls.
- Mapbox: env-token based, no hardcoded token; account restriction/usage alert verification pending.
- Next runtime gate: wire PostHog public token into a real PAZO runtime, verify first event + controlled exception.


### PostHog live ingestion checkpoint
- First real PAZO event: PASS (`app_boot`).
- Event contract observed: app/environment/release/session only from PAZO's reviewed payload.
- New privacy fix committed: all PAZO PostHog events send `$geoip_disable=true`.
- Privacy CI guard updated to require the GeoIP opt-out.
- Next exact runtime step: pull branch, restart Vite with temporary PostHog env vars, then trigger one controlled exception and verify `$exception` ingestion.


### PostHog error tracking + Documents checkpoint
- PostHog controlled exception ingestion: PASS.
- Two controlled `$exception` events grouped into one issue: PASS.
- Verified exception GeoIP enrichment absent.
- Documents repeated warning root cause found:
  - deleting document objects are hidden by Storage SELECT RLS because policy only allows `active`;
  - 4 stale deleting rows currently still have Storage objects;
  - 3 are for the current test user.
- Migration prepared in PR #33:
  - `20261008010500_fix_pet_document_delete_storage_visibility.sql`.
- DO NOT mark Documents cleanup fixed in production until PO authorizes migration, migration is applied, current user reloads, stale files disappear, and warnings stop.


### Documents recovery production verification
- Migration applied in production after explicit PO authorization:
  - `20261008010424_fix_pet_document_delete_storage_visibility.sql`.
- Owner-only Storage visibility for `deleting` objects verified.
- Current test account recovery after reload: PASS.
- Current test account pending deleting rows: 0.
- Current test account pending deleting Storage objects: 0.
- One stale deleting row/object remains for another account and should self-recover on that account's next recovery run.
- Documents repeated-warning issue is resolved for the current test account.


### Vercel Preview integration checkpoint
- Vercel project resolved: `pazo-app-t83r` (`prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH`).
- Production alias confirmed: `pazo-app-t83r.vercel.app`.
- Preview observability variables configured without paid resources.
- Preview deployment from PR #33: READY.
- PO Preview runtime validation: PASS.
- PostHog Preview ingestion: PASS.
- Preview events have `$geoip_disable=true` and no city/lat/long enrichment.
- Do NOT enable PostHog in production before PR #33 merge.
- Next gate: final CI -> PO merge authorization -> merge PR #33 -> add production PostHog/Supabase publishable env -> verify production deployment + PostHog.


### Places / Map rollout decision
- Product Owner declined upgrading to Pro to enable Mapbox in the published app before demand validation.
- Fase 8 engineering remains COMPLETE; public rollout is PAUSED.
- New active experiment: `docs/PAZO_PLACES_DEMAND_EXPERIMENT.md`.
- Published builds must render the `places_map` fake door instead of mounting `MapView`.
- Local `npm run dev` keeps the real map for development.
- Fake door telemetry:
  - module key: `places_map`;
  - source: `bottom_nav_map`;
  - generic unique view + deduped interest;
  - no GPS/location/Mapbox requests.
- Do not add `VITE_MAPBOX_ACCESS_TOKEN` to Vercel or buy a paid plan while this experiment is active.
- Re-evaluate after sufficient unique viewers / interest rate according to `PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.


### PR #33 / Vercel Production current state
- PR #33: MERGED.
- Merge commit: `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`.
- Production PostHog + Supabase publishable env: CONFIGURED in Vercel.
- New Production deployment: BLOCKED TEMPORARILY by Vercel Free daily deployment limit (>100/24h).
- Public alias is still serving the previous Production deployment until the limit resets.
- Do not upgrade Vercel solely to bypass this limit.

### Current exact product rollout
- Places/Map public rollout: PAUSED by PO.
- Real Mapbox view: local Vite development only.
- Published build target: `places_map` demand fake door.
- Canonical experiment: `docs/PAZO_PLACES_DEMAND_EXPERIMENT.md`.
- Tracking: generic unique views + deduped account interest.
- Next deployment, once Vercel allows it, must contain this fake door rather than require a production Mapbox token.


### Places demand experiment backend gate
- `places_map` is not yet present in `validation_private.modules`.
- Migration prepared but NOT applied:
  - `20261008013000_register_places_map_validation.sql`.
- No new table/RLS/provider is introduced; migration only registers the generic module key.
- Do not mark tracking operational until PO authorizes apply and runtime view + interest persistence are verified.


### Places demand backend — FINAL CHECKPOINT
This checkpoint supersedes the earlier pending backend-gate note.

- `places_map` registry: APPLIED in Supabase production.
- Applied migrations:
  - `20261008015255_register_places_map_validation.sql`;
  - `20261008015603_grant_module_validation_inserts.sql`.
- `module_validation_views`: authenticated INSERT only.
- `module_validation_interests`: authenticated INSERT + own-row SELECT through existing RLS.
- Generic view tracking now uses INSERT and ignores duplicate-session conflict code `23505`; it no longer needs client SELECT on the views table.
- Transactional QA:
  - view write: PASS;
  - interest write + own-row read: PASS;
  - rollback residue: 0.
- Backend tracking contract: OPERATIONAL.
- Frontend fake door is still development/PR #34 until merge + deployment.


## Codex-first continuity checkpoint — 2026-10-08

### Approved operating model
- Codex/local is the primary technical execution environment for PAZO.
- ChatGPT normal is the fallback agent; GitHub plus PAZO's canonical documents are the transfer medium.
- Every incoming instruction is classified before execution as Implementation, permanent PAZO rule, reusable Brain OS improvement or Handoff.
- Temporary requests do not become permanent governance automatically.
- PAZO-specific rules stay in this repository; reusable cross-project improvements belong in the separate `DigitalAppcorp/project-brain-os` repository only after review and explicit authorization.

### Resume protocol for either agent
1. Read `AGENTS.md`, this handoff, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_MODULE_LIFECYCLE.md` and the active sub-route.
2. Verify the real branch, HEAD, upstream, dirty working tree and open PR before assuming `main` is current.
3. Preserve uncommitted work until its origin and intended scope are confirmed.
4. Use `npm run verify` as the grouped local governance + build gate; record separately any runtime, backend, visual or provider validation.
5. Update this handoff after a meaningful milestone and before changing agents.
6. Never mutate production or perform migration, push, merge or deploy without current explicit Product Owner authorization.

### Current local Git state
- checkout: `product/places-demand-validation`;
- upstream: `origin/product/places-demand-validation`;
- local branch is 1 commit ahead;
- HEAD: `d2e0c09f066d245b37f44757ecb2d6a6c3e29490` — `chore: establish local-first verification workflow`;
- that commit adds the grouped `npm run verify` command and is not yet published to the upstream branch;
- staged changes: none at this checkpoint;
- governance files changed by this continuity update:
  - `AGENTS.md`;
  - `docs/PAZO_MASTER_ROADMAP.md`;
  - `docs/PAZO_ACTIVE_HANDOFF.md`;
- pre-existing local work that must not be overwritten or silently bundled with this governance change:
  - modified `src/services/supabaseClient.ts`;
  - 30 tracked historical migration files removed from `supabase/migrations/`;
  - corresponding untracked copies under `supabase/migrations_legacy/`;
  - untracked `supabase/migrations/20261008030000_pazo_local_baseline.sql`;
  - untracked local backup and Supabase branch marker.

### External/shared governance availability
- PAZO declares Project Brain OS v1.4.0 as canonical.
- No local checkout or installed skill for `DigitalAppcorp/project-brain-os` was available in this Codex environment.
- No Brain OS file was modified; this operating decision is PAZO-specific and is fully represented in PAZO governance.

### Exact next step
- review this governance-only diff and keep it separate from the pre-existing Supabase local-baseline reorganization;
- before resuming implementation, audit the real PR #34/current branch and confirm ownership and intent of every pending migration move;
- do not stage, commit, push, merge, deploy or mutate production as part of that audit without the applicable Product Owner authorization.


## Local development recovery checkpoint — 2026-10-08

This checkpoint supersedes the previous local-Supabase audit as the current local implementation state. It does not change the Production Hardening phase or authorize remote mutations.

### Result
- Local Supabase setup is reproducible through `npm run local:setup`; it starts the stack, refreshes only the local public client variables, and applies pending local migrations.
- Full local gate is `npm run verify:local`; it validates the database contract, exercises signup → profile → avatar → pet → Feed query, lints the public schema, runs governance checks and builds the app.
- Local Vite starts with `npm run dev:local` at `http://127.0.0.1:5173`.
- Canonical procedure: `docs/PAZO_LOCAL_DEVELOPMENT.md`.

### Local Supabase contract restored
- local migration history contains the baseline `20261008030000` plus `20261008061800_pazo_local_dev_contract`;
- `auth.users` once again triggers `public.handle_new_user()` so signup creates the required profile;
- direct client execution of `handle_new_user` is revoked;
- broad auto-exposed table/function privileges are disabled and replaced with the production-derived least-privilege allowlist;
- authenticated clients cannot update `profiles.is_founder`, while approved profile fields remain editable;
- buckets present: `pet-avatars`, `post-photos`, `pet-documents`, `community-avatars`, `community-post-photos`;
- 11 owner/path-aware Storage policies cover the five bucket contracts;
- all 29 public tables retain RLS;
- optional local analytics/vector services are disabled because the application does not require them;
- `.env.local` BOM was removed and local Supabase public values can be refreshed without printing them;
- no reset, remote migration, production change, push, merge or deployment was performed.

### Reproducibility files
- `supabase/migrations/20261008030000_pazo_local_baseline.sql`;
- `supabase/migrations/20261008061800_pazo_local_dev_contract.sql`;
- `supabase/tests/database/local_dev_contract.test.sql`;
- `supabase/seed.sql`;
- `scripts/configure-local-env.mjs`;
- `scripts/verify-local-flow.mjs`;
- `docs/PAZO_LOCAL_DEVELOPMENT.md`;
- `supabase/config.toml`, `package.json`, `.gitignore` and `src/services/supabaseClient.ts` updated for the local-only workflow.

The previous 30 incremental migration files remain preserved under `supabase/migrations_legacy/`; no migration history was deleted remotely. A pre-change local database dump exists under ignored `.local-backups/`.

### Verification evidence
- `npm run local:setup`: PASS on a running stack;
- pgTAP local database contract: 15/15 PASS;
- disposable API flow: PASS, with no residual test user/pet/object;
- Supabase public-schema lint: PASS, no schema errors;
- hardening, architecture, privacy, operations and product-rollout checks: PASS;
- targeted ESLint for the repaired/new runtime files: PASS;
- TypeScript + Vite production build: PASS;
- app root and local Auth health endpoint: HTTP 200;
- full repository lint remains known legacy debt: 110 findings (104 errors, 6 warnings); this local tranche introduced none in its checked files;
- Vite reports the existing >500 kB bundle-size warning; non-blocking for this recovery.

### Current Git/worktree state
- checkout: `product/places-demand-validation`, tracking `origin/product/places-demand-validation`, ahead by 1 commit;
- staged changes: none;
- all recovery work remains uncommitted and local alongside the already-documented governance changes;
- production configuration remains intact and untouched.

### Exact next step
1. Product Owner opens `http://127.0.0.1:5173`, creates a disposable account and personally completes the required 18+ attestation.
2. Register a pet with an avatar and confirm automatic entry into Feed.
3. Record visual/runtime approval or the exact failing step here before any commit, push, merge, deployment or production migration.

### Product Owner local runtime acceptance
- Date: 2026-10-08.
- Local account creation + explicit 18+ attestation: PASS.
- Pet registration with the restored local backend: PASS.
- Automatic entry into Feed: PASS.
- Session/pet persistence after reload: PASS.
- Local development recovery milestone: ACCEPTED.
- No production mutation, push, merge or deployment was performed.

### Next gate after local recovery
- Preserve the accepted recovery as local uncommitted work until its diff/commit boundary is reconciled.
- Resume only the remaining Production Hardening scope documented in `docs/PAZO_PRODUCTION_HARDENING_MASTER.md`.
- Any hosted-provider mutation, production verification, push, merge or deployment still requires explicit Product Owner authorization.
---

## PR #34 remote handoff imported during local reconciliation — 2026-10-08

### Places demand fake-door runtime validation
- Local production-build preview validated by Product Owner: PASS.
- Fake door visible instead of Mapbox: PASS.
- Real persisted telemetry after PO interaction:
  - total views: 1;
  - unique viewers: 1;
  - total interests: 1;
  - unique interested accounts: 1.
- No duplicate signals observed.
- Backend + frontend validation contract: PASS.
- Public Vercel rollout remains pending a new Production deployment after the Free deployment-rate limit resets.


---

# HANDOFF CRÍTICO — 2026-10-08 — CAMBIO A LOCAL-FIRST

## Regla operativa vigente

El Product Owner decidió trabajar PAZO **localmente durante desarrollo** para reducir tiempo, tokens e infraestructura.

Desde este checkpoint:
- NO nuevos deployments de Vercel durante desarrollo normal.
- NO Preview deployments.
- NO mergear PR #34 todavía.
- NO push/PR por microcambio.
- Git local = puntos de recuperación frecuentes.
- GitHub remoto = checkpoints significativos.
- Producción = solo por excepción o durante Release Candidate.
- Antes del lanzamiento final: reconciliación completa local ↔ remote branch ↔ main ↔ Supabase prod ↔ Vercel prod.

Brain OS canónico actualizado a **v1.4.0** con Local-First Efficiency Mode.

## Estado remoto exacto

Repositorio: `DigitalAppcorp/pazo-app`.

Remote branch activa:
`product/places-demand-validation`

PR:
- PR #34: OPEN
- Draft: false / Ready for Review
- Mergeable: true
- El HEAD remoto cambió al añadir este handoff; NO confiar en un SHA congelado aquí.
- El siguiente chat debe consultar PR #34 en vivo y usar su `head_sha` actual.
- Base histórica conocida antes de este handoff: `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`
- NO MERGEAR hasta nueva autorización explícita del PO dentro del release workflow.

## Estado del experimento Places / Map

- Fase 8 engineering: COMPLETE históricamente.
- Public rollout: PAUSADO.
- Real Mapbox: desarrollo local.
- Build publicado objetivo: fake door `places_map`.
- Fake door runtime local production-preview: PASS.
- Tracking real contra Supabase prod durante la validación:
  - views: 1
  - unique viewers: 1
  - interests: 1
  - unique interested: 1
- Backend tracking prod: OPERATIONAL.
- Migraciones prod ya aplicadas:
  - `20261008015255_register_places_map_validation`
  - `20261008015603_grant_module_validation_inserts`
- No comprar Vercel Pro / Mapbox add-on para este módulo mientras la demanda no lo justifique.

## Estado producción que YA existe

PR #33 ya fue mergeado históricamente:
- merge commit `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`.

Supabase producción ya contiene hardening autorizado, incluyendo:
- social write rate limits;
- idempotent document finalize;
- rescue SECURITY DEFINER moved behind private schema;
- document Storage visibility fix;
- `places_map` validation registry + INSERT grants.

PostHog:
- local ingestion: PASS;
- controlled exception + grouping: PASS;
- Vercel Preview ingestion: PASS;
- `$geoip_disable=true` verified;
- session replay/autocapture remain OFF.

Vercel:
- project `pazo-app-t83r`;
- production env for PostHog + Supabase publishable key was configured;
- public deployment remained older because Free plan API deployment limit was hit;
- do NOT spend/upgrade to bypass this during development.

## Estado LOCAL del Product Owner — NO asumir que GitHub lo contiene

Ruta local:
`C:\Users\osori\Downloads\pazo-app`

El PO creó/confirmó un flujo local de verificación:
- `npm run verify` = `npm run test:governance && npm run build`
- lint legacy NO bloquea el ciclo diario;
- razón: ESLint tiene deuda histórica aproximada de 104 errores / 6 warnings.
- último resultado reportado: **verify PASS**.

El PO hizo un commit local de `package.json` para este workflow.
El SHA local NO fue capturado en este chat; el siguiente chat debe leerlo con:
`git log -1 --oneline`

## Supabase local — estado crítico

Docker Desktop + WSL fueron instalados y funcionan.

Supabase CLI:
- versión observada: 2.120.0.

Problema descubierto:
- la historia legacy de migraciones del repo no puede reconstruir una DB vacía;
- la primera migración intentaba alterar `public.interactions` antes de que existiera;
- causa real: falta el baseline original del proyecto, no un único migration bug.

Decisión local tomada:
- preservar las migraciones históricas separadas;
- crear un baseline local a partir del schema backup actual.

Operaciones ejecutadas LOCALMENTE por el PO:
1. `supabase/migrations` fue renombrado a:
   `supabase/migrations_legacy`
2. se creó un nuevo:
   `supabase/migrations`
3. se copió el backup de schema a:
   `supabase/migrations/20261008030000_pazo_local_baseline.sql`

Resultado:
- `npx supabase start` después del baseline: **PASS**.

IMPORTANTE:
- estos cambios de migrations/baseline son LOCAL-ONLY al momento de este handoff;
- no asumir que están committeados ni pushed;
- baseline local NO debe empujarse a producción como una migration normal;
- release gate deberá reconciliar cuidadosamente history/baseline/prod.

## Backup local

Backup DB creado exitosamente en una carpeta bajo:
`C:\Users\osori\pazo-backups\...`

Tamaños observados:
- `roles.sql`: 370 bytes
- `schema.sql`: 176576 bytes
- `data.sql`: 2007873 bytes

Storage backup:
- NO completado;
- script falló con `Invalid Compact JWS` al usar nueva `sb_secret_...` en Storage;
- no se generó `storage-manifest.json`;
- decisión posterior: PAUSAR el backup/restore drill de Storage hasta release gate para no gastar tiempo ahora.

Si una shell antigua sigue abierta, limpiar cualquier credencial temporal:
`Remove-Item Env:PAZO_SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue`

Nunca pedir al usuario que pegue secrets en chat.

## Siguiente paso EXACTO para el nuevo chat

NO empezar una nueva fase todavía.

Primero reconstruir verdad local, porque hay cambios que GitHub no conoce.

Pedir al PO ejecutar SOLO:
```powershell
git status --short
git log -1 --oneline
npx supabase status -o env
```

Objetivo:
1. conocer working tree local exacto;
2. conocer local HEAD exacto;
3. confirmar que Supabase local está vivo y obtener URL/key locales sin exponer secret.

Después:
- crear/verificar `.env.local` apuntando PAZO a Supabase LOCAL;
- NO usar fallback de Supabase producción durante desarrollo;
- ejecutar `npm run dev`;
- registrar una cuenta de prueba LOCAL;
- verificar que puede entrar al Feed;
- si PASS, añadir guardrail para que DEV falle si intenta usar Supabase producción accidentalmente.

Resultado esperado del próximo gate:
**PAZO local frontend + Supabase local completamente desacoplados de producción.**

## Prohibiciones temporales

Mientras Local-First Mode esté activo:
- NO `npx supabase db reset --linked`
- NO `npx supabase db push`
- NO `supabase migration repair` contra prod
- NO merge PR #34
- NO nuevo Vercel deployment
- NO upgrade Vercel/Mapbox
- NO reactivar PayPal supporter flow
- NO publicar nuevos módulos

Usar `--local` explícitamente para operaciones destructivas de DB cuando exista ambigüedad.

## Forma de responder al Product Owner

- español;
- directo;
- no abrumar;
- ChatGPT toma decisiones técnicas y ejecuta lo que pueda;
- no pedir al PO decidir arquitectura;
- dar un solo bloque de comandos cuando realmente deba tocar su PC;
- explicar qué resultado esperar;
- para ahorro de tokens, pedir únicamente `PASS` o el primer error;
- no repetir historia si está en este handoff;
- distinguir siempre LOCAL / REMOTE BRANCH / MAIN / PRODUCCIÓN;
- no declarar algo probado si solo está implementado.


---

# LOCAL RECONCILIATION CHECKPOINT — 2026-10-08

This checkpoint supersedes the earlier exact-next-step notes in this file.

## Governance and Git
- Product Owner explicitly authorized local reconciliation with the four newer PR #34 commits.
- Project Brain OS v1.4.0 local-first rules and PAZO's Codex-first continuity rules are both preserved in `AGENTS.md`.
- Accepted recovery commit before reconciliation: `36aa9aa` (`chore: restore reproducible local development`).
- Recoverable local branch: `codex/pre-pr34-local-recovery-20261008` at `36aa9aa`.
- Remote PR #34 HEAD audited live before reconciliation: `21ceab643564830b4fc5a2d278c5c0c9354ca05a`.
- Local reconciliation merge commit: `605ea4c` (`merge: reconcile PR34 local-first governance`).
- After that merge the working tree was clean and the active branch was 3 commits ahead of the remote branch; this handoff update is the next local checkpoint.
- Integration is local only; PR #34 has not been merged, and nothing has been pushed or deployed.

## Local runtime acceptance
- `npm run local:setup`: PASS.
- `npm run verify:local`: PASS.
- Post-reconciliation `npm run verify:local`: PASS — pgTAP 15/15, disposable signup-to-Feed flow, schema lint, governance suite and build.
- Product Owner manual acceptance: signup + explicit 18+ attestation + pet registration + Feed + reload persistence PASS.
- Local Supabase remains isolated from production; no remote migration or production mutation occurred.

## Exact next step
- Keep the reconciled local commits unpushed until the Product Owner authorizes a meaningful GitHub checkpoint.
- Do not start Fase 13, 14, 10 or 11 automatically; module selection still requires the Product Owner lifecycle decision recorded in `docs/PAZO_MASTER_ROADMAP.md`.
- Continue remaining Production Hardening only when it can be done locally; hosted-provider work stays deferred to Release Candidate unless separately authorized.


---

# LOCAL ENVIRONMENT GATE — 2026-10-08

This checkpoint supersedes the earlier local-environment setup instructions in this file.

## Git and scope
- Active branch: `product/places-demand-validation`.
- Pre-checkpoint local HEAD: `cea8a33` (`docs: record local PR34 reconciliation`), 4 commits ahead of the remote branch.
- All work in this gate is local only. Production, the remote branch, PR #34 and Vercel were not changed.
- The generated Supabase workdir `.local-supabase/` is ignored by Git.

## Reproducible Supabase contract
- The 30 historical migrations are restored to the canonical production-safe path `supabase/migrations/`.
- The local reconstructed baseline and local development contract are isolated under `supabase/local_migrations/`; they are not part of the canonical remote migration chain.
- `scripts/prepare-local-supabase.mjs` generates `.local-supabase/supabase/` from the two local migrations plus any future canonical migration newer than the local baseline.
- Daily commands use an explicit local workdir. `npm run local:setup` prepares, starts, configures and migrates the local stack.
- `npm run local:test:cold` pauses the daily stack while preserving its volumes, rebuilds an empty isolated stack, verifies it and restores the daily stack. This serialized design is required by the current Docker memory budget on this machine.

## Verification evidence
- Empty cold rebuild: PASS.
- `npm run verify:local`: PASS.
- pgTAP database contract: 17/17 PASS.
- Database lint at error level: PASS.
- Disposable API flow: signup → pet → direct Feed read → recommended Feed RPC → representative module reads → cleanup: PASS.
- Runtime Storage upload/delete coverage: all five buckets PASS (`pet-avatars`, `post-photos`, `pet-documents`, `community-avatars`, `community-post-photos`).
- Governance, hardening, architecture, privacy and product-rollout checks: PASS.
- TypeScript/Vite build and targeted ESLint for changed files: PASS.
- Local Auth health and Vite app: HTTP 200.
- Test residue after cleanup: 0 users, 0 pets, 0 communities and 0 documents matching the disposable test markers.
- `git diff --check`: PASS; only Windows LF→CRLF notices were reported.

## Local safety behavior
- `.env.local` is generated from the running local stack without printing credentials.
- Development rejects non-local Supabase endpoints.
- PostHog is disabled by default on `localhost`/`127.0.0.1`; explicit local opt-in requires `PAZO_ENABLE_LOCAL_POSTHOG=1` when regenerating `.env.local`.
- No secrets are committed or intentionally printed by the workflow.

## Files in this local checkpoint
- Workflow/config: `.env.example`, `.gitignore`, `package.json`.
- Scripts: `scripts/prepare-local-supabase.mjs`, `scripts/verify-local-cold-start.mjs`, `scripts/configure-local-env.mjs`, `scripts/verify-local-flow.mjs`.
- Runtime: `src/services/observability.ts`.
- Database tests: `supabase/tests/database/local_dev_contract.test.sql`.
- Migration-path reconciliation: `supabase/migrations/` and `supabase/local_migrations/`.
- Documentation: `docs/PAZO_LOCAL_DEVELOPMENT.md`, `docs/PAZO_ACTIVE_HANDOFF.md`.

## Remaining gates
- Product Owner browser smoke test at `http://127.0.0.1:5173`: register a disposable local account/pet and enter Feed.
- Storage backup/restore drill remains explicitly deferred to the Release Candidate gate; the earlier failed manifest was not treated as complete.
- Full legacy ESLint debt remains nonblocking; changed files pass targeted lint.
- Do not start Fase 14 until the Product Owner accepts this local environment gate. After acceptance, audit the phase/sub-route before implementation.

---

# F14 GATE 7 CLOSURE / GATE 8 BLOCK 00 — 2026-10-08

This checkpoint supersedes the older F14 next-step instructions above. This is a DOCUMENTATION-ONLY approval, not implementation acceptance.

## Canonical source of truth
- `docs/PAZO_F14_MASTER.md` records F14 Gate 5 CLOSED (`MVP REDUCIDO`), Gate 6 CLOSED (scope), Gate 7 CLOSED (technical architecture), and decisions D1/D2/D3-A/D3-B approved by Product Owner.
- D1: pet profiles/posts remain public to anonymous visitors; mutual authenticated-account social blocking covers all pets on each account, but cannot promise anonymous invisibility.
- D2: archive/unpublish community on deletion of its sole owner; preserve other members' contributions in private custody as appropriate; do not assign a successor without consent.
- D3-A: data category deletion destinations and minimal justified retention.
- D3-B: approved *PAZO operational targets*, not implemented or guaranteed vendor/legal retention; see matrix in the F14 sub-route. Product Owner is provisional privacy lead and moderator; technical executor acts only under specific authorization.
- Reporting MVP is limited to five targets: Feed post, Feed comment, pet profile, Community post, Community comment.

## Architecture risks and gates
- Existing FK `communities.owner_user_id -> auth.users ON DELETE CASCADE` violates D2 unless migrated safely. Cascades from community post authors/pets and non-cascading document/care FKs also require controlled account deletion.
- Public SELECT policies and public Storage objects cannot be treated as hidden solely by React filters. RLS/RPC/write blocking and private archives must be verified under separate Gate 8 block approvals.
- Gate 8 execution plan: A0 docs only (THIS authorization); A1 blocking/hiding; A2 reports/moderation; A3 account deletion/community preservation; A4 retention/privacy. A1-A4 NOT authorized.
- No F14 database objects, UI, jobs or provider changes have been implemented or tested by this documentation checkpoint.

## Git/recovery and verification boundary
- Source reference for this documentation reconciliation: backup tag `backup/pazo-codex-local-20261008` -> `c4f466f9b537be2f7b7ef10737659780b7a2987f` (five commits ahead of remote feature branch when audited).
- Remote `product/places-demand-validation` was `21ceab643564830b4fc5a2d278c5c0c9354ca05a`; `main` was `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90` at last read-only audit. Verify live refs at any later release.
- Local machine working tree/HEAD cannot be assumed from this file: verify `git status --short` and `git log -1 --oneline` on the Product Owner machine before/after applying docs.
- A0 PASS is pending the local `git apply --check`/`git diff --check`/`npm run verify` report from the Product Owner. Do NOT report it as verified beforehand.
- No permission for F14 code, new/applied migrations, push, merge, deploy or production changes. PR #34 remains unmerged. Production Hardening remains open; Storage restore drill remains deferred to Release Candidate.

## Exact next step
- Finish/verify A0 docs locally and STOP. Require distinct Product Owner authorization for A1 and any later gate or hosted-provider action.

---

# F14/A1 — candidato de código/SQL PREPARADO, NO APLICADO — 2026-10-08

El Product Owner proporcionó `PAZO_F14_B01_SOURCE.zip` con la documentación A0 aceptada. Se preparó un parche para Bloque 01 en entorno aislado. El PO todavía NO autorizó aplicar migraciones SQL locales; la migración `20261008090000_f14_account_blocks_hidden_posts.sql` debe permanecer como archivo sin ejecutar. Ninguna operación remota, push, merge o deployment está autorizada. El entorno de preparación no pudo instalar todas las dependencias de npm, así que build completo, pgTAP y runtime están pendientes en Windows/Supabase LOCAL. Siguiente paso exacto: revisión/aplicación del parche local separada de autorización para aplicar migración local; después verificar con cuentas desechables, `npm run verify:local` y aceptar A1 solo con Scope Closure Reconciliation.


---

# HOSTED-FIRST MVP / F14 A1 TRANSFER CHECKPOINT — 2026-10-08

Este checkpoint **sustituye instrucciones anteriores de local-first y prohibiciones remotas que eran válidas ANTES de la autorización vigente**. Product Owner decidió trabajar directamente en producción durante el desarrollo temporal del MVP para eliminar parches descargables y comandos locales, manteniendo autorizaciones concretas, controles de seguridad, privacidad y cero gastos nuevos sin permiso.

## Git / Frontend
- Respaldo original de GitHub: `backup/pazo-codex-local-20261008` → `c4f466f9b537be2f7b7ef10737659780b7a2987f`.
- Rama dedicada del Bloque 01: `f14/block01-hosted-mvp-20261008`; commit de implementación `62c3f88b942cf2342e822f62582b1352fffea705`. Los 20 blobs de A0+A1 coincidieron con las versiones exactas verificadas de ZIP/parches locales. Este checkpoint documental añade un commit posterior.
- `main` y PR #34 siguen sin merge. La rama original `product/places-demand-validation` conserva un remote HEAD distinto: no sobrescribirla ni asumir que el working tree Windows está sincronizado.
- Integración GitHub generó **previews automáticos** READY para Vercel `pazo-app` y `pazo-app-t83r` (`target=null`), sin lanzamiento a producción. Vercel `pazo-app-t83r` preview deployment: `dpl_6UZBfRtNLdoeXoGXBPmTYJ5kpeU3`.
- Intentos autorizados de despliegue target=production y promoción del preview a producción **AMBOS 403 FORBIDDEN** bajo el scope `digitalapp`. La conexión Vercel permite consultar y crear previews desde GitHub, pero no ejecutar esos cambios directos. Detener aquí; requiere reconectar/autenticar el equipo `digitalapp` con permisos de escritura. No desplegar `pazo-app` como alternativa.

## Supabase PAZO (hosted)
- Proyecto: `mrybvqdebbgcayuvgkkr` ACTIVE_HEALTHY.
- Migración F14 A1 aplicada con autorización del PO: `f14_account_blocks_hidden_posts`, versión aplicada Supabase `20261008112333`. SQL corresponde al blob GitHub `ccc5787b071d89889506de50e90baccaf2e73d47` (`supabase/migrations/20261008090000_f14_account_blocks_hidden_posts.sql`); versionado remoto distinto del archivo: **reconciliar antes de futuro release/migration replay**.
- Verificación remota posterior: `public.account_blocks`, `public.hidden_posts`, RLS ambas true, seis políticas de propietario, cuatro políticas restrictivas para Comunidades, nueve triggers y RPC privada de bloques disponible solo a `authenticated`; `anon` sin SELECT privado. No borrar cuentas reales ni realizar resets.
- Backend SQL completo aplicado; UI de código local anterior recibió `npm run verify` PASS, `npm run local:test:f14` PASS y `B01 VISUAL PASS` del PO; GitHub/Vercel previews compilados READY. **Prueba directa API multiusuario A/B/C en entorno hospedado pendiente**, no declarar A1 cerrada.
- Inventario de usuarios reales y datos de prueba en PAZO debe revisarse y eliminarse selectivamente antes de lanzamiento oficial, con atención a backups/logs/CDN/retenciones; no prometer borrado instantáneo.

## Próximo paso exacto
1. Resolver autorización Vercel de escritura del scope `digitalapp` para `pazo-app-t83r` (sin pasos manuales locales).
2. Tras éxito de conexión: deploy target=production de rama/commit aprobados (con producción Supabase ya migrada); comprobar target/URL y build.
3. Validar flujo A/B/C por API directa y smoke hosted; Scope Closure Reconciliation antes de cerrar A1. A2–A4 NO están autorizados.


---

# F14 A2 / MODERATION IMPLEMENTATION CHECKPOINT — 2026-10-08

- Autorización PO vigente: iniciar **Bloque 02 reportes/moderación** directamente en GitHub; decisión aparte permite **postergar Vercel producción**. Esto sustituye el anterior bloqueo por B01 incompleto solo para el inicio de A2, **no** significa que B01 esté aprobado ni completo.
- Rama A2: `f14/block02-moderation-mvp-20261008` creada desde `e75efcbd8c30744c6795a435ef8eae27a75dca43` (rama B01 con handoff hosted-first). Base independiente de `main` y PR #34. Backend A1 sigue aplicado y estructuralmente revisado; API A1 hospedada pendiente.
- A2 frontend propuesto: `ReportDialog`, `reportingService`, `ModeratorQueue`; entradas de denuncia en Feed (post/comentario), perfil, Comunidades (post/comentario); cola accesible solo al verificarse `f14_is_moderator`.
- A2 backend **solo en borrador**: `supabase/drafts/20261008150000_f14_reports_moderation.sql`. No se aplicó SQL A2 a PAZO hosted y no se crearon permisos de moderador. Nunca mover al directorio de migraciones canónicas y aplicar sin autorización independiente.
- Seguridad: reportes privados y 5 tipos validados en servidor, RLS restrictiva con `f14_content_visible`, decisiones auditadas. **Storage público/CDN NO se elimina con el SQL**; queda media_status pending_review. No declarar A2 completo ni que contenido multimedia se retiró totalmente hasta purge efectivo y pruebas.
- Vercel producción: sigue bloqueada por 403 al intentar create/promote en equipo `digitalapp`; sus previews no son producción. No repetir esos intentos sin cambio real de permisos.
- Siguiente paso: validar build preview A2, revisar schema/draft y definir procedimiento de Storage purge y primera concesión de moderator; solicitar autorización específica antes de cualquier DDL hosted A2 o nuevo servicio remoto. A3/A4 no autorizados.


## Adenda A2 — retiro de medios
Se preparó código de Edge Function `f14-moderation-purge` (solo GitHub, sin deploy) y pantalla de revisión de fotografías. El endpoint requiere un JWT de moderador y servicio de Storage, rechaza medios externos y jamás debería marcar `purged` si la operación falla. **No ejecutado ni probado en Supabase hosted**; se necesita autorización y revisión posterior. La prueba de contenido retirado por URL pública/CDN sigue siendo gate obligatorio para cerrar A2.


## A2 adicional — copias históricas de comentarios
Se detectaron 5 duplicados legacy de comentarios en `public.posts.comments`, todos mapeados a `public.post_comments.legacy_id` y ninguno huérfano según auditoría agregada. El SQL A2 borrador fue corregido para retirar copias JSONB públicas de comentarios moderados o asociados a un perfil retirado, conservando las filas fuente normalizadas y otros comentarios. No aplicado; probar lecturas directas REST y las consultas de Feed antes de ejecución hosted.


**Guardia anti-borrado cruzado (A2):** borrador Edge `f14-moderation-purge` valida prefijos `owner/pet` para `post-photos`, `owner` para `pet-avatars` y `community/owner` para `community-post-photos`; los datos se obtienen por RPC verificada desde SQL, no de parámetros del cliente. En caso de ruta inválida se requiere revisión manual. No se probó ni desplegó a Supabase hosted.


---

# F14 A2 — SUPABASE ACTIVADO / MEDIA PURGE BLOQUEADO — 2026-10-08
Este checkpoint más reciente sustituye las referencias anteriores a A2 como no aplicado. El PO **autorizó aplicar A2 a Supabase PAZO y desplegar la función de Storage sin permitir borrados**. Se corrigió el SQL y pasó prueba reversible (transacción ROLLBACK) antes de aplicarse.
- Supabase PAZO `mrybvqdebbgcayuvgkkr`: migración `f14_reports_moderation` versión **`20261008120333`** aplicada exitosamente. SQL aplicado con blob SHA Git `b853f00ad222079021d49dece92e42282e135864`; registrar canónico `supabase/migrations/20261008120333_f14_reports_moderation.sql` (no conservar en drafts).
- Comprobación posterior: cinco políticas RLS restrictivas para lectura de contenido retirado; esquema y tablas `moderation_private` accesibles únicamente a funciones privilegiadas; `anon` sin ejecución de reportes/cola, `authenticated` puede enviar reportes; ningún `authenticated` puede confirmar limpieza media; `service_role` sí; 0 reportes, 0 concesiones de moderador y 0 restricciones de contenido al verificar.
- Edge `f14-moderation-purge`, versión **1**, ACTIVE, **`verify_jwt=true`**. Se publicó deliberadamente una **implementación inerte** que devuelve 503 para cualquier petición, sin credencial elevada, sin borrar ni leer Storage. Código operativo en `supabase/functions/f14-moderation-purge/index.ts`; código amplio futuro solo en `supabase/drafts/f14_moderation_purge_full_proposal.ts`, NO DESPLEGADO.
- Sigue pendiente designar mediante aprobación específica un moderador inicial (no derivarlo de `profiles.is_founder`), pruebas reales REST/RPC entre roles/perfiles/cuentas de prueba, validar eliminación segura de imagen/Storage y propagación CDN, análisis de retención D3-B, y aceptación visual de A2 en frontend desplegado. No afirmar que A2 está cerrado.
- Vercel producción sigue pospuesto por decisión de PO y por permisos 403 del equipo digitalapp; previews GitHub no equivalen a release. No iniciar A3/A4 sin autorización.
- **Integridad de migraciones:** A1 en repo `20261008090000` frente a versión aplicada `20261008112333`; A2 nombre/version en repo coincide con versión aplicada. Reconciliar A1 antes de replays/remotos; no ejecutar migraciones antiguas a ciegas.


---

# F14 A2 — PRIMER MODERADOR ASIGNADO — 2026-10-08

Por aprobación explícita del Product Owner se otorgó el rol de moderador inicial de PAZO a la cuenta Auth verificada `appdigital.corp@gmail.com` exclusivamente mediante `moderation_private.moderator_grants` en Supabase hosted `mrybvqdebbgcayuvgkkr`. La concesión se realizó con DML transaccional e identidad comprobada por correo activo/verificado. **Auditoría posterior:** target_granted=true, moderator_count=1, other_grants=0, moderation_reports=0, content_restrictions=0. No se asignó acceso administrativo general a proveedores, ni se cambió `profiles.is_founder`.

**Próximo gate:** validar con sesiones autorizadas/negadas los RPC y los cinco reportes, deduplicación/rate limit, cola de moderación, RLS y retiros sin afectar otros datos. La limpieza Storage continúa inerte (endpoint devuelve 503), UI solo en preview, A1 pendiente de API hospedada y Vercel producción pospuesto. No declarar A2 cerrado ni iniciar A3/A4 sin autorización.


---

# F14 A2 — RLS PARENT-COMMENT SECURITY CHECKPOINT — 2026-10-08

Se ejecutaron pruebas **solo de lectura o transacciones con ROLLBACK**, simulando contextos PostgreSQL de la cuenta moderadora PAZO y de una cuenta estándar. Resultado PASS: `f14_is_moderator` true para el único moderador y false para usuario estándar; `f14_moderation_queue` accesible a moderador, rechazada para estándar; `f14_review_report` rechazó a estándar y no encontró un ID inexistente para moderador; `anon` no puede enviar denuncias, acceder a cola ni leer `moderation_private.reports`, pero conserva lectura de Feed/perfiles públicos. Se verificaron los cinco tipos de reporte con IDs inexistentes y un motivo inválido; todos rechazados. **Esto no equivale a una prueba de API con JWT reales, ni cubre duplicación, limitación con denuncias persistidas, retiro efectivo de medios, ni experiencia visual. No se crearon reportes ni se retiró contenido.**

**Hallazgo de seguridad:** la política restrictiva de `public.post_comments` no exige actualmente que el post padre sea visible al solicitante. Riesgo de lectura directa de comentarios de publicaciones ocultadas a través de retiro de perfil. `community_post_comments` también carece de comprobación explícita del post padre en su política A2. Se comprobó una corrección con `ALTER POLICY` dentro de una transacción `ROLLBACK` (PASS) y se verificó después que las dos políticas hospedadas NO cambiaron. SQL propuesto en `supabase/drafts/20261008_f14_comment_parent_guard.sql`; **NO APLICADO** a Supabase. Solicitar autorización específica del PO antes de activar el endurecimiento. Mantener A2 ABIERTO.


---

# F14 A2 — PARENT COMMENT RLS GUARD APPLIED — 2026-10-08
**Most recent state superseding the older pending notes:** PO explicitly authorized application of parent-visibility RLS correction to hosted Supabase PAZO. `f14_comment_parent_guard` is **APPLIED**, Supabase migration version `20261008122907`. Source based on draft Git blob `ec26b60c528372d11d7ce0c7b0432e3bdb452a09`; executable SQL unchanged, only header edited in canonical `supabase/migrations/20261008122907_f14_comment_parent_guard.sql`. Old draft path removed. `main`, PR #34 and Vercel production not modified.

**Security checks PASS:** both `f14_moderated_comments_select` and `f14_moderated_community_comments_select` remain `RESTRICTIVE` and require the parent post's RLS-visible existence (correlated `EXISTS`). Transactional smoke using `ROLLBACK` tested anon and authenticated SELECT, then temporarily inserted a `feed_post` restriction on an existing comment-bearing post and confirmed both parent and its comments invisible for anon/authenticated; then restricted a pet profile with a post receiving another pet's comments and confirmed parent and comments invisible for anon/authenticated. All transient restrictions rolled back. Post-check: **1 moderator, 0 reports, 0 restrictions; 14 posts and 8 post_comments preserved.** Community-post-comment runtime scenario could not be data-driven because the hosted dataset has 0 such comments; policy SQL passed review and transaction smoke without data.

**Still pending before A2 closure:** signed JWT REST/RPC tests with permitted and denied accounts; create/deduplicate/rate-limit/review of isolated trial reports with verified cleanup; media purge and CDN safety end-to-end; preview UX approval; A1 API test. Edge media purge remains permanently disabled at this revision, return 503, no Storage deletes. Do not start A3/A4 or change Vercel production without separate explicit authorization.


## F14 A2 — SQL integration smoke with ROLLBACK (2026-10-08)
**PASS, simulated PostgreSQL auth context (not real JWT HTTP):** standard user sent one temporary feed_post report, duplicate pending report rejected with SQLSTATE 23505, initial moderator `f14_moderation_queue` listed report, moderator dismissed it, `moderation_actions` audit row recorded, no content restrictions produced; transaction rolled back. Rate limit created five temporary reports across distinct Feed posts, sixth rejected as expected; rollback. Four types with EXISTING parent data were accepted transiently: `feed_post`, `feed_comment`, `pet_profile`, `community_post`; rollback. **Fifth `community_comment` remains untested positive because hosted dataset has zero community comments**; invalid/missing-target negative tests already PASS. After all tests verify 0 persisted reports, 0 restrictions, 1 moderator. Pending signed API JWT tests, live preview UX, community_comment fixture test, media/CDN cleanup disabled, A1 closure. Do not claim complete Beta or A2 closure.


---

# F14 A2 — COLUMN-LEVEL GRANTS SECURITY RECHECK — 2026-10-08

PO approved preparing and *conditionally* applying a minimal permissions migration only if reversible tests showed one necessary. Audit found **NO MIGRATION REQUIRED**, therefore **NO GRANT/REVOKE/DDL applied**. Earlier `has_table_privilege('authenticated',...,'INSERT')=false` was mistakenly interpreted as blocked writes; hosted PAZO intentionally grants `INSERT/SELECT/UPDATE` on specific **columns**, not on full sensitive tables. Do not broaden table-level privileges. Column-level grants already cover the existing frontend payloads in `src/services/communityService.ts` and the public pet/feed paths; `create_community` is a SECURITY INVOKER RPC using those column grants.

**Transactional tests PASS with real PostgreSQL role `authenticated` and simulated auth.uid claims**: using freshly inserted synthetic Auth users/Profiles and RLS, owner inserted own pet, invoked `create_community` RPC (including owner membership), created Feed and Community posts; second user created own pet, joined community, posted Feed and Community comments. Every test used BEGIN/ROLLBACK; **no permanent test data**. Negative tests PASS: authenticated user could not UPDATE another owner's pet; forged pet owner was denied; `pets.weight` and `profiles.paypal_subscription_id` SELECT denied. Post-check: zero synthetic Auth users/pets/communities/comments; 1 moderator, 0 reports, 0 content restrictions. Public pet ID remains selectable; private fields remain blocked. No Vercel production changes, Storage cleanup remains disabled.

**Gate remaining:** API requests with *genuine signed JWTs*, real UI preview verification and complete Storage/CDN cleanup review; never claim those are covered by SQL-simulated auth context. There is **no permissions migration to apply** from this approval. Original false alarm closed. A2 not closed; A3/A4 not authorized.


---

# F14 A2 — PRUEBA HTTP REAL DE DENUNCIA: FIXTURE ACTIVO (2026-10-08)

**IMPORTANTE: HAY DOS REGISTROS DE PRUEBA REALES/PERSISTENTES QUE DEBEN LIMPIARSE AL TERMINAR.** El PO autorizó crear y eliminar exclusivamente datos de prueba y validó visualmente el formulario `Denunciar` y la cola de moderación en Vercel Preview. Para verificar envío con una sesión de Auth realmente firmada, se insertaron en Supabase PAZO (`mrybvqdebbgcayuvgkkr`) mediante rol `authenticated`/RLS un nuevo perfil temporal de mascota propiedad de la cuenta del PO y una publicación sin foto, después de dry-run transaccional PASS:

- `public.pets.id = 3353cfcd-4737-4f07-a0d4-f0a8021d792a` — nombre literal `PAZO F14 PRUEBA TEMPORAL` y `owner_id` de la cuenta Auth verificada `appdigital.corp@gmail.com`; no se modificaron mascotas previas.
- `public.posts.id = eef68345-f2c0-4ab7-91fe-66337f0f3b9b` — `pet_id` anterior y texto que comienza exactamente `[PAZO F14 TEST LIVE] Publicación temporal para verificar denuncias.`; `photo_url IS NULL`, sin Storage/media.
- Post-inserción: una mascota temporal, una publicación temporal, cero denuncias, cero fotos asociadas. **Ambos registros PERSISTEN a propósito** mientras el PO prueba en Preview. No confundirlos con las pruebas anteriores revertidas.
- Acción inmediata pendiente del PO: actualizar el Feed de Preview, encontrar esa publicación y pulsar `Denunciar` (motivo `spam`). **Solo esta publicación es blanco autorizado para denuncia de prueba.** Las credenciales y JWT no deben compartirse.
- Tras confirmación: consultar en `moderation_private.reports` un registro con `target_kind='feed_post'` y `target_id='eef68345-f2c0-4ab7-91fe-66337f0f3b9b'` y confirmar reporter/Auth y cola visible sin revelar identidad a clientes normales. Puede probarse descartar por UI con el rol de moderador del PO.
- **Limpieza obligatoria:** identificar y eliminar *solo* los reportes/acciones de prueba relacionados con este `target_id`, luego el post de prueba y la mascota temporal por sus UUID exactos; comprobar ausencia de otros registros dependientes/participación ajena ANTES de borrar. No borrar denuncias de usuarios distintos ni comentarios auténticos si aparecieran inesperadamente. Auditar el contenido público y Auth tras limpiar. La autorización de limpieza cubre únicamente los datos que creó el test y sus registros de denuncia, no otros usuarios ni contenido. Los archivos CDN/Storage NO participan en esta prueba.
- Vercel producción NO modificado. Scope Vercel MCP para `digitalapp` sigue 403, pero el commit `72d28d1` tiene CI success en ambos previews; eso no sustituye prueba visual real. Edge `f14-moderation-purge` sigue inerte. No cerrar A2 ni empezar A3/A4.


---

# F14 A2 — LIVE REPORT RECEIVED + MOBILE UX REFINEMENT (2026-10-08)

PO confirmed after using Vercel Preview: clicked `Denunciar` on PAZO F14 disposable Feed post; live Supabase audit found exactly one pending `spam` report `c2b059ae-4d5d-4546-9975-5111837e2a6a`, target `feed_post/eef68345-f2c0-4ab7-91fe-66337f0f3b9b`, reporter has initial moderator grant; no reports against any other post, no withdrawals. Genuine client UI flow was user-confirmed, distinct from prior SQL role simulations. **The test post, test pet and pending report still exist; clean up only after validating queue.**

PO shared Android screenshots and requested UX/UI best practices: primary discovery issue is the `Bloqueos y contenido oculto` link injected *into* Feed, requiring scrolling; post headers also wrap when pet names are long and image-less temporary pets show broken avatar. Scoped frontend-only changes staged on `f14/block02-moderation-mvp-20261008`: move Security/Privacy to `Mi mascota` as a prominent account-menu entry and header shield control; remove Feed navigation link; compact post actions under accessible `Opciones de la publicación` menu, preserving Hide and Report; use paw fallback for missing/broken pet avatar; show report target label in confirmation form. No backend changes, no algorithm or scroll-position change, no production promotion. After CI verify, request PO visual review of changed Preview. Existing preview user-validated report flow must not be invalidated silently. Storage cleanup remains disabled.


---

# F14 A2 — CRITICAL MOBILE REPORT DIALOG OFFSCREEN FIX (2026-10-08)

Product Owner screenshot at a later Preview check showed Feed under a dark overlay with **no report panel** after pressing `Denunciar`. Unlike earlier screenshot where the panel appeared far down the scrolled Feed, this is explained by the component `src/features/moderation/ReportDialog.tsx` rendering `position:fixed` **inside** `HomeView`'s `animate-slide-up` ancestor, which creates a transformed containing block; additionally, the Feed scroll container clips descendants. The overlay appeared but dialog panel was centered inside tall Feed content and therefore outside the phone viewport.

**Frontend correction staged in same A2 branch:** render `ReportDialog` using `createPortal(...,document.body)`, outside transformed and clipped ancestors, with `fixed inset-0 z-[9999]`, max height using `100dvh`, internal scrolling, Escape and Tab keyboard handling, initial close-button focus and focus restoration, and busy-safe close button. Applies to Feed post/comment, pet profile, Community post/comment without changes to backend RPCs. Static test updated to ensure portal invariant.

**Deploy caveat:** commit `1383661` (prior UX improvements) could not build in Vercel because **both Vercel checks failed due to Vercel build rate limit**, not proven code compile errors. This new portal fix must likewise be treated **unverified until CI/build succeeds**. The user's phone screenshot still showed the OLD Feed safety link and `Ocultar | Denunciar` buttons; not a new code build. Do not ask PO to test the portal on the old Preview. No production deploy.

**Confirmed operational live report:** report ID `c2b059ae-4d5d-4546-9975-5111837e2a6a` with `reason=spam`, `status=pending`, exact disposable post `eef68345-f2c0-4ab7-91fe-66337f0f3b9b` and pet `3353cfcd-4737-4f07-a0d4-f0a8021d792a`, reporter is initial moderator, no other reports and no restrictions at verification. It is already in moderator queue; don't request a second report or touch others' posts. **All 3 objects (pet, post, report) persist and must be cleaned ONLY after finishing moderator-queue UI test, using exact IDs and dependency audit.** No DDL, Storage or production release approved.


---

# F14 A2 — DUPLICATE REPORT UX ERROR FIX (2026-10-08)
PO screenshot in mobile Preview shows `No se pudo enviar. Intenta más tarde.` after attempting to re-report the SAME disposable post. Hosted Supabase still had **one pending feed_post/spam report** from the initial real user test; this is expected duplicate-prevention behavior, not evidence the first report failed. Frontend previously extracted error messages only for `instanceof Error`, despite PostgREST possibly returning plain error objects, and ignored reliable SQLSTATE `23505` from `f14_submit_report`. A2 branch now detects duplicate using SQLSTATE `23505` or recognized message and renders `Denuncia pendiente` + explicit "Ya denunciaste este contenido" with only confirmation/close; unrelated errors remain genuine errors. Static guard added. **Do not request another report on existing test post.** The user needs to tap `Cola de moderación` in Safety Settings and `Descartar` for the existing pending test report, then confirm. Afterward clean only exact test records following dependency audit. No Supabase SQL writes, Vercel prod changes, or Storage deletion in this commit. New Preview availability subject to CI success.
