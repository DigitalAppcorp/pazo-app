# PAZO · ACTIVE HANDOFF — 22-oct-2026 · visual F17

> **Source of truth:** remote GitHub branch + actual provider state. This concise live snapshot replaces the former 113 KB chronological handoff, recoverable **verbatim through Git history at commit `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`**. Earlier statements about pending SQL or old production domain are historical.

## Identity, authority and controls
- **PO:** user; ChatGPT is primary implementer, per `DigitalAppcorp/project-brain-os` SKILL v1.4.1 and `AGENTS.md`. No Codex or other AI needed.
- **Repo:** `DigitalAppcorp/pazo-app`, base `main` `a99f05d2dab3baf5a4bc26b8fb64d790e7c4be2d`. Active F17 branch `f17/beta-final-mobile-support-admin-20261022`, PR **#81 DRAFT**. Code snapshot preceding this doc: `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`. Do not merge to main without PO approval.
- **Canonical app URL:** `https://pazo-app.vercel.app/`, Vercel project **`pazo-app`** `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI` (different from `pazo-app-t83r`). Production alias still points to previous stable deployment `dpl_7rPxM5BzSaz3YJrDDu6NMpY1bfWT`, code `a8624a0b`. **DO NOT claim the new visual corrections are live.**
- **Preview of visual corrections:** `dpl_ByL8WxEEQYkmrxMsNdPo1U95Gq93` READY, code `b1cbcd355ed33ce25602f2cb8531729afc13ed2c`, `https://pazo-52wyg1fcj-digitalapp.vercel.app/` (may require Vercel-authenticated browser; MCP bypass permission denied).
- **GitHub CI:** new commit `b1cbcd355ed33ce25602f2cb8531729afc13ed2c` workflows `CI` 39800270518 and `F17 beta isolated backend security` 39800270447 were QUEUED at inspection; **NOT PASS**. Prior CI failures pinpointed outdated tests for installation banner / mapbox vector style; corrections made in `scripts/f17-beta-extension-contract.test.mjs`. Do not claim released, visually accepted or finished until latest SHA passes. GitHub CI was sometimes backlogged; do not rerun duplicative jobs blindly.

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
- Previous Vercel visual preview built successfully; it is a **build**, not a physical device proof.
- GitHub synthetic/local past: 1,818 general, 16 extra, 40 mocked-browser checks for previous F17 baseline; not proof for this latest visual SHA.
- Policies updated ES/EN and `docs/PAZO_DATA_INVENTORY.md` to disclose OSMF direct tile requests/location-area technical metadata. See `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`.
- **NEXT STEP:** check current remote branch HEAD + its 2 workflows, fix any remaining CI failures, then validate protected preview in authorized browser against PO checklist: A01 viewport 640–850px, actual corgi resolution, PWA install in/standalone, **visible street tiles**, centered dialogs. PO decides visual acceptance. **Only after explicit visual/release GO**, replace canonical production `pazo-app.vercel.app` with the validated commit. No production deploy by mere doc/CI success.
- Local Antigravity working tree/unpushed commits: **unknown**; do not infer clean local state. Avoid duplicate tests and backend changes.

## Activation for new chat
"Activa Project Brain OS v1.4.1; lee `DigitalAppcorp/pazo-app/AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_F17_VISUAL_MAP_FIX_20261022.md`; revalida PR #81 HEAD/CI, Vercel preview/production alias. Continúa exactamente la aceptación visual F17 sin tocar main, SQL, PayPal ni producción sin GO."
