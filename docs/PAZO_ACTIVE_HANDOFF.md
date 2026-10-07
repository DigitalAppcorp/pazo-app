# PAZO — ACTIVE HANDOFF

**Project Brain OS:** v1.3.0  
**Canonical OS:** `DigitalAppcorp/project-brain-os`  
**Product Owner:** Brandon  
**Current state:** Fase 8 COMPLETADA  
**Active product module:** Fase 12 — Global Search / Explore  
**Gate:** Gate 8 — implementación + backend QA EN CURSO  
**Decision:** MVP REDUCIDO  
**Supabase production mutation authorization:** APROBADA Y APLICADA

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

## Active module — Fase 12 Global Search / Explore

Canonical docs:
- `docs/PAZO_PHASE_12_EXPLORE_MASTER.md`;
- `docs/PAZO_PHASE_12_EXPLORE_MVP_SPEC.md`;
- `docs/PAZO_PHASE_12_EXPLORE_ARCHITECTURE.md`.

Lifecycle:
- Gate 0–7: CLOSED;
- Gate 5 decision: MVP REDUCIDO;
- Gate 8: IN PROGRESS.

Active Git:
- branch: `feat/phase-12-global-search`;
- PR: #28 — Draft;
- current audited HEAD: pendiente de refrescar tras checkpoint de backend;
- branch divergence: pendiente de refrescar tras checkpoint de backend;
- Vercel statuses currently fail because of daily deployment/build quota, not a demonstrated code-build failure.

Implemented on PR #28:
- Search moved to Header;
- Communities promoted to bottom navigation;
- old Explore container removed;
- standalone `CommunitiesView`;
- `GlobalSearchView`;
- federated Pets / Communities / Places providers;
- deterministic per-provider ranking;
- 300ms debounce;
- stale-response protection;
- partial provider failure handling;
- Search → public pet profile;
- Search → Community;
- Search → Map Place;
- Map deep-link consumed once to avoid repeated reopening;
- manual tab navigation clears consumed Search targets;
- no human public profile search;
- no Posts or fake Events;
- privacy-safe Search telemetry wired in frontend.

Security / privacy:
- Pets Search selects only `id,name,species,breed,photo_url`;
- existing column grants block client reads of private legacy columns such as `zone`, `interests`, and `weight`;
- no raw Search query is persisted;
- no new SECURITY DEFINER / service-role client path;
- `search_usage_events` exposes no SELECT/UPDATE/DELETE to client roles;
- authenticated client has column-level INSERT only;
- RLS insert policy requires `user_id = auth.uid()`.

Applied Supabase migrations:
- `20261007102632 phase_12_search_telemetry`;
- `20261007102748 index_search_usage_events_user`.

Current verification:
- product spec: PASS;
- architecture: PASS;
- static diff/reference audit: PASS;
- pre-telemetry TypeScript/Vite build: PASS — confirmed by Product Owner;
- final post-telemetry TypeScript/Vite build: PENDING;
- runtime Search QA: PENDING;
- visual Product Owner acceptance: PENDING;
- telemetry migration: APPLIED;
- telemetry FK index correction: APPLIED;
- backend grants/RLS/constraints QA: PASS;
- Security Advisor: no new Phase 12 security findings;
- Performance Advisor: unindexed-FK finding corrected; new index currently reports expected INFO "unused_index" immediately after creation.

Exact next action:
1. refresh PR #28 HEAD after this checkpoint;
2. Product Owner pulls `feat/phase-12-global-search`;
3. run final `npm run build`;
4. run Search runtime/visual QA for Pets + Communities + Places;
5. verify telemetry events exist without raw query text;
6. Scope Closure Reconciliation;
7. PR #28 ready/merge only after all required evidence passes.

Do not:
- merge PR #28 yet;
- mark Fase 12 complete before final build/runtime/product acceptance;
- store raw Search query text;
- infer final build PASS from the earlier pre-telemetry build or Vercel quota failures.

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
