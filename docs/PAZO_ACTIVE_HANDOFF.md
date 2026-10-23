## ACTUALIZACIÓN F17 — Lugares y Feed, 22-oct-2026 (RAMA, NO PRODUCCIÓN)

**Scope aprobado por PO y versionado en PR #81**, revisión de código anterior `a12579c1fd59`: contenedor exterior de búsqueda/filtros transparente, fade lateral en scroll de categorías, botón **Cómo llegar** desde detalle de lugar (iOS Apple Maps; Android/enlace web Google Maps), iconos circulares mayores para like/comentarios/guardado en Feed. Los handlers y métricas existentes se preservan. Foto genérica de carretera eliminada: cada tarjeta solo muestra `pet_places.photo_url` real o indica que todavía no hay foto. **Los 6 lugares alojados tienen `photo_url` vacío**: no declarar fotos de establecimientos ya resueltas.

**Google Places Photos NO activo:** Google Places API/Place IDs de esos establecimientos no están configurados en PAZO; requiere servicio con facturación y atribución/uso compatibles. Prohibido generar cargos, añadir claves cliente, copiar imágenes de Google Maps manualmente o fingir fotos sin autorización adicional del PO. Alternativa con costo fijo controlable: fotos autorizadas por negocio y Storage existente. Regla cero contornos respetada; ningún SQL/Edge/Vercel modificado. La versión publicada en `https://pazo-app.vercel.app/` **no incluye todavía estos cambios**. Validación requerida: CI exacto del último SHA, prueba móvil/Preview aprobada por PO, decisión sobre fotos; NO despliegue ni merge a `main` sin GO.

**Implementación y detalles:** `docs/PAZO_F17_PLACES_FEED_POLISH_20261022.md`. Mantener estado financiero previo en el historial inferior (sin alteraciones de PayPal).

---

# PAZO · PAYPAL LIVE — ESTADO HOSPEDADO AL 22-OCT-2026 (ACTUAL)

> Fuente de verdad vigente. El historial F17 visual debajo es anterior a la reparación de pagos y **no debe usarse** para decidir nuevos cambios financieros.

- **Producto:** https://pazo-app.vercel.app/ , proyecto Vercel `pazo-app` `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, producción **READY** `dpl_8uDfwTYrqYqGDfjeFwWg3W4KXTxT`, SHA real frontend `1b2340523b80234a41a0a6ffac489bc32f5a2937`. PR #81 **DRAFT**, rama `f17/beta-final-mobile-support-admin-20261022`, main sin merge.
- **Supabase:** `mrybvqdebbgcayuvgkkr`. Instaladas migraciones **`20261022220000`** (origin canónico transaccional) y **`20261022222000`** (A03 onboarding completado tras mascota realmente creada). Ambas pasaron ensayos ROLLBACK y COMMIT, con postflight alojado. No reinstalar.
- **PayPal Live:** la configuración certificada y la única dirección de regreso válida ahora es `https://pazo-app.vercel.app`. El antiguo `pazo-app-t83r.vercel.app` ya no figura en las cinco funciones financieras en PostgreSQL. Artefacto con CHECK estricta y validación actual `true`; precio `299` centavos USD mensual, credenciales Vault válidas e INALTERADAS, webhook sin cambios, control `mode=canary` revisión 1, switch Live TRUE / kill FALSE, **0 intents/0 períodos pagados**. No activar público sin primera venta firmada, confirmación de cancelación y GO del PO.
- **Edge desplegado:** `pazo-paypal-live-account` v6 (JWT), `pazo-paypal-live-checkout` v4 (JWT), `pazo-admin-paypal-release` v2 (JWT); `pazo-admin-paypal-bootstrap` v7 (JWT), `pazo-admin-paypal-live-inspect` v5 (JWT), `pazo-admin-paypal-vault` v3 (JWT). Ajustadas CORS/guards de origen exacto sin wildcard, MFA permanece obligatorio, sin rotar credenciales. Webhook y worker financieros NO redeplegados.
- **Comprobaciones:** HTTP público real de 7 rutas oficiales incluidas `/paypal/return` y `/paypal/cancel` PASS en GitHub run **39856221792**. CI + F17 security PASS para la última implementación de onboarding `5fe2ea56e04be0f7cc8d2b9f6df07e4f4be3c3d3` (runs **39859246850**, **39859246887**); bootstrap preflight **39859246846** PASS. Artefacto certificado + worker activo/heartbeat reciente + canary original operator permitido = TRUE al último check SQL, pero **NO** hubo pago Live real.
- **Onboarding:** antes todos los 5 perfiles tenían `onboarding_completed=false` pese a existir mascotas; 4 perfiles con mascotas reales se reconciliaron a TRUE, el perfil sin mascota quedó FALSE; `public.create_pet_profile` ahora actualiza el propio perfil tras la creación satisfactoria sin modificar RLS/privilegios.
- **Panel Live:** frontend publicado ofrece pantalla limpia de estado/precio/retorno/webhook/MFA/control y herramientas avanzadas separadas. Esta iteración corrigió conexión y visibilidad, no implementó una **rotación completa** de plan/credenciales ni hizo editable un precio de una suscripción existente. PayPal requiere plan nuevo para otro importe; proteger generaciones históricas. No volver a pedir credenciales ya válidas.
- **Siguiente gate REAL:** la cuenta original del operador canary (no cuenta normal) debe iniciar desde la app, aprobar personalmente **una suscripción Live de $2.99** y regresar; el asistente verifica webhook firmado, período pagado, beneficios, conciliación y cancelación. NO fabricar transacciones ni poner `mode=public` hasta cumplir toda la evidencia y GO específico del PO. Una cuenta normal seguirá bloqueada correctamente en canary. No prometer que el flujo PayPal extremo-a-extremo está PASS solo por las pruebas HTTP.
- **Módulos no financieros:** F17 Soporte/cortesías/mantenimiento instalados con RLS; mantenimiento OFF. Mapa y corgi pendientes de aceptación visual final del PO en Android. No modificar main sin aprobación.

---

# PAZO · ACTIVE HANDOFF — 22-oct-2026 · visual F17

> **Source of truth:** remote GitHub branch + actual provider state. This concise live snapshot replaces the former 113 KB chronological handoff, recoverable **verbatim through Git history at commit `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`**. Earlier statements about pending SQL or old production domain are historical.

## Identity, authority and controls
- **PO:** user; ChatGPT is primary implementer, per `DigitalAppcorp/project-brain-os` SKILL v1.4.1 and `AGENTS.md`. No Codex or other AI needed.
- **Repo:** `DigitalAppcorp/pazo-app`, base `main` `a99f05d2dab3baf5a4bc26b8fb64d790e7c4be2d`. Active F17 branch `f17/beta-final-mobile-support-admin-20261022`, PR **#81 DRAFT**. Code snapshot preceding this doc: `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`. Do not merge to main without PO approval.
- **Canonical app URL:** `https://pazo-app.vercel.app/`, Vercel project **`pazo-app`** `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI` (distinct from `pazo-app-t83r`). User-approved F17 beta UI fixes are **published technically**: production `dpl_CJ1vpxTdSQ5QBZ8w5GDSNPUnYCtr` READY, exact code `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`. Domain alias was verified to point to that deployment. Prior production `dpl_7rPxM5BzSaz3YJrDDu6NMpY1bfWT` is rollback reference. **Physical Android/Mapbox visual acceptance is still NOT confirmed**.
- **Preview of visual corrections:** `dpl_ByL8WxEEQYkmrxMsNdPo1U95Gq93` READY, code `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`, `https://pazo-52wyg1fcj-digitalapp.vercel.app/` (may require Vercel-authenticated browser; MCP bypass permission denied).
- **GitHub CI:** **PASS for production code SHA `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`**: `CI` SUCCESS run 39800270518 and `F17 beta isolated backend security` SUCCESS run 39800270447. Prior CI failures were stale tests still demanding intrusive banner/Mapbox vector style; corrected without disabling protections. Newer commits modify only documentation and should not be mistaken for distinct published code. Do not claim physical browser validation from CI.

## Backend F17 hosted — ALREADY INSTALLED, not part of current visual patch
- Supabase `mrybvqdebbgcayuvgkkr`. Migrated with approved reversible preflight + one transactional COMMIT: `20261022103706` private support, `20261022103707` gifted benefits, `20261022103708` maintenance guards. 3 registered migrations, 5 FORCE RLS tables, daily `pazo_support_retention_daily` deletes resolved cases after 90 days. DO NOT reinstall.
- Edge `f16-paypal-supporter-v2-qa` v27 active with JWT verification. No further Edge changes needed for UI-only iteration. Mantenimiento OFF revision 0 last inspected; do not enable. PayPal Live **canary**, revision1, `live_enabled=true`, `kill_switch=false`, 0 Live paid periods last read. Credentials already valid in metadata. Do not request secrets or run a real sale. No changes to financial switch or main.
- Support, gifting and maintenance were code/runtime installed in previous release; do not accidentally invalidate them. Their operational physical QA remains independent from this visual ticket.

## PO screenshots / F17 visual task
Exact requested repairs after physical Android screenshots:
1. Welcome A01 excessive top/bottom gaps and internal scroll clipped corgi card: reduced paddings, hero flexible `min-h-0`, static footer actions; outer app shell now `h-full min-h-0` nested under `100dvh` rather than `h-screen`.
2. Preserve **same** smiling orange-white seated corgi, closed eyes, tongue out, green collar/yellow tag; SVG holds **one complete local WebP scene** (no separately animated head, tail, mouth). **IMPORTANT:** still raster 295×310; not a genuine hi-res redraw/vector; PO quality acceptance remains open. Do not silently replace with generic dog.
3. Removed intrusive Home install banner. Discreet opt-in `PazoInstallControl placement="welcome"` on A01 AND login; device display-mode installation detection; settings control persists.
4. Broken/blank real Mapbox streets: temporary Mapbox GL style using visible OSM raster tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, existing PAZO places/3D-models and camera retained; attribution visible above place cards. **OSMF community tile endpoint only for very small beta**, best-effort/no SLA; must switch provider or resolve Mapbox API token/styles before scale/public ad campaign. Cannot claim real tile visibility on Android until PO screenshot.
5. Removed Comunidades intro subtitle and the overlines `PAZO · COMUNIDAD` / `PAZO · TU COMUNIDAD` from Messages/Notifications.
6. Geometrically centered titles Cuidados de mascota, Pasaporte de mascota, Crear y Compartir with matched 32px spacer/close grid. New regression tests in `scripts/closure-ui.test.mjs` plus aligned `scripts/f17-beta-extension-contract.test.mjs`.

## Evidence and next gate
- Vercel PREVIEW `dpl_ByL8WxEEQYkmrxMsNdPo1U95Gq93` and PRODUCTION `dpl_CJ1vpxTdSQ5QBZ8w5GDSNPUnYCtr` were READY for production code SHA `b1cbcd35`. Both are build/runtime deployment evidence, not physical device proof.
- GitHub synthetic/local past: 1,818 general, 16 extra, 40 mocked-browser checks for previous F17 baseline; not proof for this latest visual SHA.
- Policies updated ES/EN and `docs/PAZO_DATA_INVENTORY.md` to disclose OSMF direct tile requests/location-area technical metadata. See `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`.
- **NEXT STEP:** user tests the already-published F17 beta at `https://pazo-app.vercel.app/` on the **actual Android phone**: A01 no scroll/clipping at 640–850px CSS, corgi quality/likeness, discreet PWA install on Welcome/Login and hidden in standalone, **real visible street tiles under pins in Lugares**, center-aligned modal titles and removed text. Evidence is a screenshot or a bug report; PO decides visual acceptance. If streets still gray, inspect real tile requests/token/network, do not invent a PASS. Before **formal beta sign-off or merging main**, obtain PO visual GO; public scale requires a paid/tile provider or Mapbox root-cause repair. Keep PayPal/DB unchanged.
- Local Antigravity working tree/unpushed commits: **unknown**; do not infer clean local state. Avoid duplicate tests and backend changes.

## Activation for new chat
"Activa Project Brain OS v1.4.1; lee `DigitalAppcorp/pazo-app/AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`; revalida PR #81 HEAD/CI, Vercel preview/production alias. Continúa aceptación visual del F17 publicado; no reimplementes SQL ni PayPal ni hagas más despliegues/merge a main sin el siguiente GO."
