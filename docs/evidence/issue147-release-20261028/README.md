# Release142/147 — 2026-10-28

[Report](../../PAZO_ISSUE147_RELEASE_20261028.md). Exact production deploymentGRz / Git4ce38450, canonical pazo-app.vercel.app.

- release.json: authorization, merges, final production, SQL installation/activation, privacy/roles, flags, aggregate log observation, residual limits and rollback.
- install-map.json and history-before.json: canonical20261028075145 maps to hosted20261028185856, exact SHA256;132 pre-existing records were preserved.
- visual/, short/, utility/, navigation/: exact production assets with explicitly controlled Auth/data. Actual disposable PostgreSQL17 persistence; no hosted test accounts/cohorts. Full raw PNGs and results.
- canonical/: real public browser welcome and privacy screenshots, no signup submission; canonical-browser.json51PASS, privacy-browser.json ES/EN PASS.
- public-postflight.json: real public endpoints and unauthorized denials, no valid financial requests.
- prepromotion.json, canonical-assets.json: production configuration presence, non-secret match booleans and six immutable compiled asset hashes, matching canonical after promotion. No environment secrets, JWTs or browser sessions are stored.
- sha256.json: all evidence files except itself; original PNGs, LF text preserved by scoped attributes.

Permission probes intentionally produced401/403 responses and SQLSTATE42501. SQL aggregate checks simulate a scoped database claim without creating a human browser/MFA session; this is not claimed as positive end-to-end admin MFA. Share simulated, no purchase/physical-device/real-cohort/conversion/performance claim.
