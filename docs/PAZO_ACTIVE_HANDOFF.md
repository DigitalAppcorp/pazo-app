# PAZO — ACTIVE HANDOFF

**Project Brain OS:** v1.3.0  
**Canonical OS:** `DigitalAppcorp/project-brain-os`  
**Product Owner:** Brandon  
**Current state:** Fase 8 COMPLETADA  
**Active product module:** Fase 12 — Global Search / Explore  
**Gate:** Gate 8 — implementación SIGUIENTE  
**Decision:** MVP REDUCIDO  
**Supabase production mutation authorization:** NO — solicitar antes de apply

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
- `docs/PAZO_PHASE_12_EXPLORE_MVP_SPEC.md`
- `docs/PAZO_PHASE_12_EXPLORE_ARCHITECTURE.md`.

Product decisions:
- Search = búsqueda global transversal;
- identity = mascotas/perfiles públicos, not human accounts;
- MVP providers = Pets + Communities + Places;
- Communities becomes a primary bottom-nav module;
- Search moves to Header beside global actions;
- Search routes to the owning module/entity;
- Events only when a real Events module exists;
- Posts excluded from MVP;
- no heavy/external search engine;
- no raw query analytics by default.

Lifecycle:
- Gate 0: CLOSED;
- Gate 1: CLOSED;
- Gate 2: CLOSED;
- Gate 2.5: CLOSED;
- Gate 3: CLOSED without extra code;
- Gate 5: MVP REDUCIDO;
- Gate 6: CLOSED;
- Gate 7: CLOSED;
- Gate 8: NEXT.

Architecture:
`docs/PAZO_PHASE_12_EXPLORE_ARCHITECTURE.md`

Exact next action:
**Implement Gate 8 in a feature branch. Prepare telemetry migration but do not apply it until Brandon explicitly authorizes the Supabase mutation.**

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
