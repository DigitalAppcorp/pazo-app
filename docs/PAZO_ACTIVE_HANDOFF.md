# PAZO — ACTIVE HANDOFF

**Project Brain OS:** v1.3.0  
**Canonical OS:** `DigitalAppcorp/project-brain-os`  
**Product Owner:** Brandon  
**Current state:** Fase 12 COMPLETADA  
**Active product module:** Production Hardening — infraestructura obligatoria  
**Gate:** Production Hardening Gate 8 — PR #30 MERGED / EXTERNAL HARDENING PENDING  
**Decision:** MVP REDUCIDO  
**Supabase production mutation authorization:** Fase 12 aplicada y verificada

## Startup protocol

Before acting:
1. activate/read Project Brain OS v1.3.0 from `DigitalAppcorp/project-brain-os`;
2. read `AGENTS.md`;
3. read this file;
4. read `docs/PAZO_MASTER_ROADMAP.md`;
5. read `docs/PAZO_MODULE_LIFECYCLE.md`;
6. audit the real current `main` and open PRs before changing code.

Do not reconstruct project state from chat memory when repository evidence exists.

## Working model

- Brandon is Product Owner.
- ChatGPT owns product reasoning, architecture, implementation, backend, security, tests, Git/PR and durable docs.
- Antigravity/local is execution + visual validation only.
- Never mutate Supabase without explicit Product Owner authorization.
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
