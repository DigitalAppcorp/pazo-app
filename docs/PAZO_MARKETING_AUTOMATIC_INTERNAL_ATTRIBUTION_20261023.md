# PAZO F17 — Automatic first-party campaign attribution (PO decision)
Decision: UTM attribution is automatic without any new signup consent checkbox. This is first-party internal measurement only, not Meta Pixel/CAPI or individual conversion sharing. This document supersedes the checkbox proposal in earlier PR #91 privacy drafts.

## Prepared flow (all release gates OFF)
1. Only allowlisted Meta paid_social UTM campaign+creative and timestamp are staged in first-party localStorage, with 72h TTL, allowing different tabs on same origin. No fbclid, raw URL, cookies of third parties, GPS, IP, or email in staging.
2. Signup requested is not conversion. Once Auth confirms a newly created account, the browser prepares 4 allowlisted UTM fields and first_touch_at; sends to Supabase Edge through current authenticated session. No checkbox.
3. Edge verifies token against Supabase Auth and takes owner ID from Auth, not browser; rejects stale accounts and unexpected fields. SQL excludes QA/founder/admin and stores one attribution per Auth ID.
4. First pet within seven days and D7 navigation are derived server-side. D7 is only a screen-activity proxy, not meaningful retention. No reliable anonymous visit counter in this PR.
5. Gates stay closed: PAZO_MARKETING_COLLECTION_ENABLED=false (browser), MARKETING_INTAKE_RELEASED=false (Edge), collection_gate.enabled=false and retention_days=0 (SQL).

## Privacy and retention prerequisites
Inform users in published Privacy Policy ES/EN before activation: PAZO may internally associate campaign/creative, first-touch time, verified signup and first-pet status with an account; no individual conversions are sent to Meta. Provide access/deletion request mechanism through existing privacy support. Do not claim that automatic analytics universally exempts PAZO from California privacy laws. Confirm applicable obligations and provider backups/PITR first.

Proposed notice ES: "PAZO puede medir internamente de qué anuncio llegaste y si completaste el registro o creaste tu primera mascota. Usamos identificadores limitados de campaña vinculados temporalmente a tu cuenta. No enviamos tus conversiones personales a Meta. Puedes solicitar acceso o eliminación mediante el contacto de privacidad."
Proposed notice EN: "PAZO may internally measure which of our ads brought you here and whether you completed registration or created your first pet profile. We temporarily associate limited campaign identifiers with your account. We do not send individual conversions to Meta. You can request access or deletion using our privacy contact."

30-day retention is a RECOMMENDATION, not an approved period. SQL hard ceiling is 90 days, initially 0; purge is not scheduled. Separate GO needed to install DDL with gates OFF; later GO to update notices, retention and enable collection; and independent GO for Meta ad spend. $0/$350.
