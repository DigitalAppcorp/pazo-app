# PAZO F16 — PWA callback late-load fix (2026-10-21)

## Scope and observed defect
`src/main.tsx` dynamically imports `App.tsx` before calling `registerPazoPwa()`. The previous PWA implementation registered exclusively via `window.addEventListener('load', ...)`. On slower phones, the document can reach `readyState='complete'` before the async module finishes. Adding a `load` listener after that event is silent: `/sw.js` never registers. This is relevant to cold starts and returning from PayPal in an ordinary tab or installed PWA.

## Change
- `registerPazoPwa()` now registers immediately if `document.readyState==='complete'`; otherwise installs a one-time load listener.
- A module-local guard prevents duplicate registrations in the same app boot.
- Retains `import.meta.env.PROD`, `scope:'/'`, `/sw.js`, network-only navigation and rejection handling. No caching of auth/payment/API data, no change to PayPal state.
- Extended existing `scripts/pwa-check.mjs` with executable VM-based deterministic tests for both ordering cases, checking one registration in each.

## Evidence boundaries
This is a **CODE/CI** correction only until GitHub Actions confirms the SHA. It is not evidence of HTTPS/PWA installation on `pazo-app-t83r.vercel.app`, where the latest previous public check found `/paypal/return`, `/paypal/cancel`, `/manifest.webmanifest` and `/sw.js` returning 404 from the stale deployment.

**Controlled release remains NO-GO:** no new preview or deployment, no code in `main`, no PayPal Live credential or transaction, no changes to Supabase flags. P4 financial release, updated checkout/webhook bundles, real PWA callback deployment + browser smoke and PO canary remain prerequisites.

## Integration
This change is based on Codex's `f16/beta-completion-20261021` / PR #67 without overwriting the ongoing PR67 author. Integrate as a small separate stacked PR after green CI; preserve the PO requirement to publish every change with its documentation. Neither branch alone is READY_FOR_PO_CREDENTIALS or a beta release.
