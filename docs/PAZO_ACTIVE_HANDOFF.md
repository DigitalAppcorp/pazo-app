# PAZO — ACTIVE HANDOFF

**Project Brain OS:** v1.3.0  
**Canonical OS:** `DigitalAppcorp/project-brain-os`  
**Product Owner:** Brandon  
**Current state:** Fase 12 COMPLETADA  
**Active product module:** Production Hardening — infraestructura obligatoria  
**Gate:** Production Hardening Gate 8 EN CURSO  
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
- `infra/production-hardening-1`

Current scope:
- PayPal webhook security;
- supporter pitch safety;
- React crash containment;
- CI baseline;
- observability/auth/key/cost hardening next.

Monetization intent remains valid, but supporter membership is temporarily hidden until secure backend confirmation plus product eligibility/price/benefits are defined.


### Production Hardening checkpoint
- PR #30: Draft;
- CI production build: PASS;
- legacy lint debt: 114 problems discovered; currently informational/non-blocking;
- supporter pitch removed from active frontend;
- browser-side Founder activation removed;
- Supabase browser key migrated to modern publishable key;
- PayPal webhook v3 deployed to production with fail-closed + PayPal signature verification logic;
- PayPal private secrets/runtime verified delivery: PENDING;
- Error Boundary global: implemented;
- Security Advisor: baseline only; Leaked Password Protection still pending.
