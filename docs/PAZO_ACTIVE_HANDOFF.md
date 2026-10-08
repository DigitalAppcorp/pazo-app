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
