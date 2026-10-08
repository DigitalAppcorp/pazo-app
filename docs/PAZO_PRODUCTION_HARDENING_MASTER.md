# PAZO — Production Hardening

**Estado:** EN CURSO — Gate 8  
**Tipo:** I — Infraestructura / seguridad / operación  
**Autorización:** Product Owner autorizó ejecutar el hardening necesario  
**Fecha:** 2026-10-07

## 1. Motivo

PAZO tiene una base sólida de RLS, ownership, migraciones, QA y control de cambios, pero la auditoría pre-Beta detectó deuda operacional que no debe esperar al lanzamiento público.

Esta fase NO cambia el concepto funcional de PAZO. Protege lo ya construido.

## 2. Hallazgos que abren esta fase

P0:
- webhook PayPal público con `verify_jwt=false` sin verificación criptográfica del remitente;
- webhook legacy intentaba modificar `pets.is_founder`, columna que ya no es la fuente de verdad;
- frontend mostraba el pitch de Founder en el primer uso real, sin demostrar uso recurrente;
- frontend activaba visualmente Founder en `onApprove` antes de confirmación segura del backend.

P1:
- sin Error Boundary global;
- sin CI de GitHub;
- sin error monitoring remoto tipo Sentry;
- frontend todavía usa legacy Supabase `anon` key;
- Leaked Password Protection desactivado;
- no existe política documentada de alertas/costos para Vercel/Supabase/Mapbox.

P2:
- observabilidad depende demasiado de revisión manual de logs;
- hay ruido operacional conocido en flujos de Documents y telemetría deduplicada;
- rate limiting/anti-abuse es parcial.

## 3. Decisión sobre membresía de apoyo

La monetización NO se elimina.

Intención aprobada:
- membresía de bajo costo;
- no cobrar por usar el núcleo de PAZO;
- presentar el apoyo solo después de que exista evidencia de uso real;
- mensaje principal: ayudar a mantener PAZO activo y sostenible;
- evitar una experiencia tipo paywall o “llegaste, págame”.

Aún NO decidido:
- precio definitivo;
- beneficios definitivos;
- umbral exacto de elegibilidad para mostrar el pitch;
- frecuencia de reaparición;
- nombre definitivo del programa;
- política de cancelación/gracia desde UX.

Regla:
**no volver a activar el pitch hasta cerrar esas decisiones y tener confirmación server-side del entitlement.**

## 4. Gate 8 — tranche 1

Implementado en `infra/production-hardening-1`:
- pitch automático Founder eliminado;
- activación local de Founder eliminada;
- webhook PayPal preparado para:
  - POST only;
  - límite de payload;
  - fail-closed cuando faltan secretos;
  - OAuth server-to-server;
  - verificación con PayPal `verify-webhook-signature`;
  - validación de plan;
  - lectura del estado real de la suscripción;
  - actualización de `profiles.is_founder`;
  - persistencia de `profiles.paypal_subscription_id`;
  - cancelación/suspensión/expiración reflejadas como no activo;
- Error Boundary global;
- GitHub Actions: `npm ci` + lint + build.

## 5. Configuración privada requerida para PayPal

La Edge Function requiere secretos privados:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID`
- `PAYPAL_ENV` = `sandbox` o `live`

No guardar secretos en Git ni en variables `VITE_*`.

Mientras falte cualquiera, el webhook debe responder 503 y NO mutar membresías.

## 6. Verification checkpoint

Current branch evidence:
- GitHub Actions CI: PASS;
- Product Owner runtime validation: PASS — login, Feed/Communities navigation and repeated reloads no longer show the premature PayPal pitch;
- `npm ci`: PASS;
- production build: PASS;
- lint step: visible/non-blocking because the pre-existing repository baseline contains 114 lint problems;
- new PayPal webhook `any` lint debt corrected;
- old Founder modal state: absent;
- old `pitch_seen_*` bootstrap: absent;
- PayPal buttons in active App: absent;
- client-side `is_founder: true` mutation: absent;
- browser Supabase client migrated from legacy `anon` key to modern publishable key;
- production `paypal-webhook` deployed as Edge Function version 3;
- Security Advisor: no new database findings attributable to this tranche;
- existing Leaked Password Protection warning remains open.

Runtime PayPal signature verification still requires real PayPal secrets + a genuine Sandbox/Live subscription webhook delivery before membership may be re-enabled. PayPal's webhook simulator does not support postback verification through the verify-webhook-signature endpoint.

## 7. Tranches siguientes

P1:
- Sentry/error monitoring y release tracking;
- migración frontend a Supabase publishable key moderna;
- variables de entorno por deployment;
- Leaked Password Protection;
- preparación de CAPTCHA/Turnstile para Beta;
- revisar branch protection/check requerido;
- alertas de salud/costo.

P2:
- rate limiting general para writes sensibles;
- reducir ruido de errores esperados;
- backup/restore drill;
- analytics mínimos de producto;
- regla server-backed para elegibilidad del pitch.


## 8. Hardening checkpoint — 2026-10-07

### Implemented + verified
- Product Owner runtime validation of the supporter-pitch removal: PASS.
- GitHub Actions CI exists and production build passes.
- Critical hardening regression smoke test added to CI:
  - premature PayPal pitch must remain absent;
  - browser-side Founder grant must remain absent;
  - legacy Supabase JWT anon key must remain absent from browser client;
  - service-role key must remain absent from browser client;
  - global Error Boundary + observability bootstrap must remain wired;
  - PayPal webhook signature/plan verification must remain present;
  - inactive PayPal frontend SDK must remain absent.
- Browser Supabase client uses modern publishable key.
- Inactive `@paypal/react-paypal-js` SDK removed from bundle/lockfile.
- Global Error Boundary implemented.
- Privacy-minimal frontend observability service implemented:
  - app boot;
  - auth success/failure/session events;
  - global browser errors;
  - unhandled promise rejections;
  - React Error Boundary exceptions;
  - email/JWT/query-secret redaction;
  - no email/password/pet content/GPS/search text sent intentionally.
- PostHog integration contract added through:
  - `VITE_POSTHOG_PROJECT_TOKEN`;
  - `VITE_POSTHOG_HOST`;
  - `VITE_APP_RELEASE`.
- PostHog app is installed in ChatGPT, but its actions are not exposed in this session; project/token/event ingestion are therefore NOT yet externally verified.
- Signup baseline hardened:
  - minimum 8 characters;
  - uppercase + lowercase + digit required by UI/local config;
  - secure password change enabled in local Supabase config;
  - fake Google/Apple buttons no longer bypass authentication and are disabled as "coming soon".
- Hosted Supabase organization confirmed on Free tier.
- Leaked Password Protection remains unavailable on current tier and is intentionally not used as a reason to force an upgrade.
- Social-write rate limiting deployed:
  - migration `20261007123638_production_hardening_social_write_rate_limits`;
  - communities: 3 / 24h / user;
  - posts: 30 / hour / user;
  - comments: 60 / hour / user;
  - community posts: 30 / hour / user;
  - community comments: 60 / hour / user;
  - place suggestions: 10 / 24h / user;
  - internal SECURITY DEFINER trigger function is outside the exposed schema;
  - `anon` and `authenticated` cannot execute it directly;
  - transactional rollback verification: PASS;
  - Security Advisor produced no new warning from this limiter.
- Documents operational-noise fix deployed:
  - migration `20261007124041_idempotent_pet_document_delete_finalize`;
  - expected Storage propagation delay now returns `false` rather than HTTP 400;
  - client retries without generating expected-error noise;
  - finalization is idempotent;
  - transactional rollback verification: PASS.
- Expected telemetry conflict noise reduced:
  - repeated map-open write skipped within the same session;
  - module validation views use duplicate-ignore upsert;
  - DB uniqueness constraints remain intact.

### Still pending / external
- PayPal:
  - private Edge Function secrets still need secure configuration;
  - real Sandbox/Live webhook delivery must be verified before supporter membership returns;
  - price/benefits/eligibility are still product decisions.
- PostHog:
  - actual project token/host configuration;
  - first live event + first controlled exception ingestion verification;
  - alert/dashboard setup.
- Vercel:
  - app is installed in ChatGPT, but connector actions are not exposed in this session;
  - production project/env/usage/spend settings remain unverified.
- Mapbox:
  - usage/budget alert configuration remains unverified.
- CAPTCHA/Turnstile:
  - not enabled; defer until production signup domain/configuration is ready.
- Remote hosted Auth minimum-password/secure-change settings still require dashboard/Management API verification; repo/local baseline alone is not proof of hosted state.
- Leaked Password Protection remains an Advisor warning while PAZO stays on Supabase Free.
- Full lint cleanup remains separate technical debt.
- Backup/restore drill remains pending.

### Rescue SECURITY DEFINER hardening
- migration `20261007124633_move_rescue_security_definers_private` deployed;
- privileged rescue/founder implementations moved to non-exposed `rescue_private`;
- public RPC signatures preserved as `SECURITY INVOKER` wrappers;
- anon/authenticated grants preserved according to original product behavior;
- anonymous public-rescue wrapper transactional test: PASS;
- authenticated rescue wrapper transactional test: PASS;
- Security Advisor after migration: all exposed SECURITY DEFINER warnings removed;
- remaining Security Advisor warning: Leaked Password Protection only.

### Cost governance
- canonical guardrails: `docs/PAZO_COST_GUARDRAILS.md`;
- `AGENTS.md` now forbids paid-plan/resource/add-on/spend-cap changes without explicit PO approval;
- current Supabase tier confirmed Free;
- no plan upgrade authorized.

### PostHog protocol verification
- current PostHog docs confirm public event ingestion through `/i/v0/e` using the project token;
- `$exception` / `$exception_list` structure confirmed;
- frontend exception payload now includes redacted structured JavaScript stack frames in bottom-up order;
- no session replay/autocapture SDK has been enabled.

## 9. Scope Closure Reconciliation — PR #30

**Resultado del tranche implementado:** PASS / MERGED (ver cierre en §13).

Product Owner final runtime validation on branch `infra/production-hardening-1`:
- login/session + repeated reload: PASS;
- premature PayPal pitch remains absent: PASS;
- weak-password rejection and strengthened signup UX: PASS;
- Google/Apple fake auth bypass removed: PASS;
- Feed / Communities / Map / My Pet navigation: PASS;
- private Documents upload/delete flow after idempotent-finalize change: PASS;
- Rescue/public profile smoke path: PASS;
- no product regression reported by PO.

Engineering/backend evidence:
- final GitHub Actions hardening smoke test: PASS;
- final TypeScript + production build: PASS;
- branch is mergeable;
- social write rate limiter transactional test: PASS;
- document finalize transactional test: PASS;
- anonymous Rescue wrapper transactional test: PASS;
- authenticated Rescue wrapper transactional test: PASS;
- Security Advisor: only Leaked Password Protection remains, tied to current Supabase Free tier;
- no paid-plan/resource change authorized or performed.

Reconciliation against PR #30 approved scope:
- PayPal premature pitch/browser entitlement: CLOSED;
- webhook hardening code + production v3 deployment: CLOSED, but membership remains intentionally OFF pending real PayPal secrets/webhook verification;
- React crash containment: CLOSED;
- CI/build gate: CLOSED;
- modern public Supabase key: CLOSED;
- Auth/signup baseline cleanup: CLOSED for repo/local UX; hosted config verification remains external;
- social anti-abuse baseline: CLOSED;
- Documents/telemetry expected-error noise: CLOSED;
- Rescue SECURITY DEFINER exposure: CLOSED;
- cost-governance rule: CLOSED;
- PostHog-compatible instrumentation code: CLOSED; external project/token/live ingestion remains explicitly pending;
- Vercel/Mapbox spend-control verification, CAPTCHA and backup/restore drill remain outside this PR's completed deliverables and stay in Production Hardening backlog.

**Historical note:** PR #30 was later merged after explicit Product Owner authorization.

Production Hardening as a whole remains **EN CURSO** after this tranche because external provider configuration/verification still remains.

## 10. Definition of Done

No cerrar hasta que:
- webhook desplegado y rechace requests no verificadas;
- secretos PayPal de producción/sandbox estén configurados antes de reactivar membresía;
- build final PASS;
- CI PASS;
- runtime principal PASS;
- Advisors revisados;
- observabilidad/error monitoring P1 resuelta o explícitamente separada con gate activo;
- Scope Closure Reconciliation PASS;
- merge a main y main verificado.


## 11. Architecture / Privacy Reconciliation — video audit

**Estado:** EN CURSO.

A second audit triggered by two external engineering/privacy videos re-opened PR #30 after its previous reconciliation.

### Changes introduced

Architecture:
- added `docs/PAZO_ARCHITECTURE_CONTRACT.md`;
- new feature/domain code defaults to `src/features/<domain>/`;
- current `src/services`, `src/components/views`, `src/components/modals` are treated as legacy baseline, not as templates for future growth;
- no mass refactor authorized;
- CI architecture check rejects new domain files in those global legacy folders unless the architecture baseline is consciously updated.

Privacy/data governance:
- added `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`;
- added `docs/PAZO_DATA_INVENTORY.md`;
- PostHog product events/properties are now allowlisted;
- session replay/autocapture/direct third-party tracking are blocked by policy + CI unless explicitly reviewed;
- age attestation is not preselected;
- onboarding no longer claims acceptance of unpublished Terms;
- no DOB/ID collection added;
- no precise-location analytics added.

Pre-Beta impact:
- F14 now explicitly owns UGC reporting/blocking, copyright/IP process, account deletion, underage-known-account handling, provider/data inventory, retention matrix, Privacy Policy/Terms and tracking audit;
- F15 now explicitly owns restore drill, live observability verification, spend controls and client-storage/cookie audit.

### Rationale

The goal is not to turn Production Hardening into a legal-document or folder-migration project.

The goal is:
- prevent new implicit architecture debt;
- ensure public policies later reflect real implementation;
- minimize data collection;
- make risky tracking/provider changes fail CI until consciously reviewed.

### Closure rule

The previous PR #30 Scope Closure Reconciliation is superseded.

Before PR #30 can return to merge-ready:
- governance CI PASS;
- TypeScript/build PASS;
- Product Owner verifies the visible 18+ onboarding behavior and a basic navigation smoke test;
- final reconciliation is recorded again.


### Architecture/privacy CI evidence
- governance suite: PASS;
- architecture guard: PASS;
- privacy guard: PASS;
- hardening smoke: PASS;
- TypeScript/build: PASS;
- lint: PASS;
- Product Owner visible onboarding validation: PENDING.


## 12. Final Architecture / Privacy Reconciliation

**Resultado:** PASS / MERGED.

Product Owner validation on HEAD `595e7720fbea8bc0f81c7168bbe0a7d1e8143615`:
- 18+ checkbox defaults unchecked: PASS;
- signup is blocked until 18+ is actively confirmed: PASS;
- onboarding copy no longer claims acceptance of unpublished Terms: PASS;
- basic navigation smoke test after signup/login: PASS.

Automated evidence:
- hardening regression checks: PASS;
- architecture contract check: PASS;
- privacy/data-governance check: PASS;
- TypeScript + production build: PASS;
- lint: PASS;
- PR remains mergeable.

Final decision for this mini-tranche:
- no mass folder refactor;
- no session replay/autocapture;
- no DOB/ID age collection;
- no precise-location analytics;
- architecture/privacy/data-governance controls are now permanent and enforced by CI.

**Scope Closure Reconciliation: PASS.**

PR #30 was merged to `main` after explicit Product Owner authorization.


## 13. PR #30 merge closure

**Status:** MERGED / MAIN VERIFIED.

- PR #30 merged after explicit Product Owner authorization.
- merge commit: `c179182c79c587c7727277a966cc09704002ce10`;
- `main` contains the hardening code and governance documents;
- premature PayPal pitch remains absent on `main`;
- architecture contract present on `main`;
- privacy/data-governance contract present on `main`;
- data/provider inventory present on `main`;
- Production Hardening as a whole remains **EN CURSO** because external provider configuration/verification is still pending.

Remaining active backlog:
- PayPal real secrets + genuine Sandbox/Live webhook verification;
- PostHog live project/token/event ingestion + alerts;
- Vercel project/env/usage/spend controls;
- Mapbox usage/budget alerts;
- hosted Auth settings verification;
- CAPTCHA/Turnstile timing before public Beta;
- backup/restore drill;
- final provider/privacy reconciliation before public Beta.


## 14. External hardening tranche — 2026-10-07

Branch: `infra/external-hardening-2`

### PostHog
- active project resolved successfully;
- project had 0 ingested events at audit;
- Product Owner explicitly authorized privacy-setting changes;
- applied + verified:
  - `anonymize_ips=true`;
  - `autocapture_opt_out=true`;
  - `capture_console_log_opt_in=false`;
  - `capture_performance_opt_in=false`;
  - `session_recording_opt_in=false`;
  - `heatmaps_opt_in=false`;
  - timezone `America/Los_Angeles`;
- integrations: 0;
- error-tracking alerts: 0;
- live ingestion remains pending until PAZO runtime receives the public project token through environment config;
- do not enable replay/autocapture to solve ingestion.

### Vercel
- connector/tools are reachable;
- authenticated context currently returns 0 teams and 0 projects;
- do not create or link a new production project without confirming the correct Vercel account/team;
- production env/spend/log audit remains pending.

### Supabase
- plan: Free;
- database baseline: ~17 MB;
- Storage baseline: ~26 MB;
- Security Advisor remains at Leaked Password Protection only;
- PayPal webhook v3 ACTIVE and has 0 observed webhook calls at this checkpoint;
- Free-tier backup strategy documented in `docs/PAZO_BACKUP_RESTORE_RUNBOOK.md`;
- local Storage backup utility added at `scripts/backup-storage.mjs`.

### Mapbox
- frontend uses only `VITE_MAPBOX_ACCESS_TOKEN`;
- no Mapbox token is hardcoded in source;
- current vendor docs confirm URL restrictions for dedicated public web tokens;
- Mapbox has usage notifications but no configurable hard spending cap;
- account-level token restrictions/notifications remain pending because no Mapbox account connector is available in this session.

### Still pending
- first real PostHog event + controlled exception;
- notification destination + low-noise error alert;
- correct Vercel team/project connection;
- Mapbox token restriction + usage notification confirmation;
- PayPal Edge Function secrets + genuine Sandbox/Live webhook;
- real DB + Storage off-site backup and non-destructive restore drill.


### PostHog live ingestion checkpoint
- Product Owner started PAZO locally with temporary environment variables; no token was committed to Git.
- PostHog switched from `ingested_event=false` to `true`.
- `app_boot` is confirmed as a real recently ingested event.
- verified fields:
  - `app=pazo`;
  - `environment=development`;
  - `pazo_release=local-hardening-test`;
  - random PAZO session id.
- PostHog still exposed GeoIP-derived property names even with IP anonymization enabled.
- PAZO now sends `$geoip_disable=true` on every event to disable GeoIP enrichment at ingestion.
- CI privacy guard enforces that opt-out.
- controlled `$exception` runtime verification: PENDING.


### PostHog controlled exception verification
- controlled browser ErrorEvent executed by Product Owner;
- PostHog received two `$exception` events;
- exception type: `Error`;
- message: `PAZO_OBSERVABILITY_TEST`;
- source: `window.error`;
- release: `local-hardening-test`;
- `$geoip_disable=true`;
- no GeoIP city attached to verified exception events;
- Error Tracking grouped both occurrences into one active issue;
- error-tracking ingestion/grouping: PASS.

### Documents recovery bug found during observability validation
- repeated console warning was not random noise;
- 4 rows remain in `pet_documents.status='deleting'` while their Storage objects still exist;
- 3 belong to the current test user; 1 belongs to another account;
- Storage SELECT RLS currently exposes only `active` document objects;
- authenticated transactional visibility test for the current owner's deleting objects returned 0 visible rows;
- this conflicts with reliable client-side Storage cleanup during the `deleting` lifecycle;
- migration applied in production after explicit PO authorization:
  - `20261008010424_fix_pet_document_delete_storage_visibility.sql`;
  - owner-only Storage SELECT expands from `active` to `active|deleting`;
  - DELETE ownership policy remains unchanged;
- authenticated visibility verification: current test user changed from 0 to 3 visible deleting objects;
- after Product Owner reload/recovery:
  - current test user deleting rows: 0;
  - current test user deleting Storage objects: 0;
  - one stale deleting row/object remains for a different account and should self-recover when that account next runs the recovery flow;
- Documents recovery fix: PASS for current test user.
