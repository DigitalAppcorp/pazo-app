# PAZO F16 — Public HTTPS/PWA Release Gate

**Scope:** deterministic, read-only release evidence. No deployment, payment, authentication or secrets.

## What is checked

Run `node scripts/f16-public-pwa-http-gate.mjs` **after a specifically approved Vercel Preview/public beta deployment**. Targets only the previously approved canonical origin `https://pazo-app-t83r.vercel.app` and uses `GET` without cookies or credentials. Every response is limited to 1 MiB and checked without following redirects.

Seven required observations: homepage HTML with Vite app shell, PayPal return SPA route, PayPal cancel SPA route, standalone manifest with the 192/512 icons, network-only service worker, and both published PNG icons. The callback probes include **obviously synthetic nonfinancial query tokens** solely to ensure the server does not reflect them. They are never printed in output and never sent to PayPal.

Return JSON `{source, origin, ready, checks:[{id,code}]}` with machine-readable fail reasons. CLI exits nonzero if any route is wrong. A redirect to Vercel login/SSO is explicitly a failure. `npm run test:pwa` includes a fully mocked seven-route PASS and 404/SSO/reflected-token NEGATIVE tests, with no external fetch.

## Evidence

- **CODE**: CLI + offline tests committed in PR stacked on `f16/beta-completion-20261021`; GitHub CI required before integration.
- **HOSTED HTTP**: ***NOT yet PASS***. Existing postflight in `docs/PAZO_CLOUD_ACCESS_AND_HTTPS_POSTFLIGHT_20261021.md` shows old public deployment returning 404 for `/paypal/return`, `/paypal/cancel`, `/manifest.webmanifest` and `/sw.js`.
- **PWA E2E**: requires a real device to install and open PAZO, complete return/cancel with a login session, verify no second PayPal CREATE, and confirm membership only from reconciled paid periods. This script does not assert any of those real-user outcomes.

## Release constraints

`vercel.json` intentionally keeps `git.deploymentEnabled=false`; do not remove it to force an automatic deployment. Do not merge `main`, promote production, release payment Edge checkout/webhook, enable the worker ledger, or ask for real provider credentials on the strength of this test. Only the PO's explicit Preview/Live canary authorizations may open those gates.

The script is not scheduled or continuously monitoring. Run it deliberately when a public deployment exists.
