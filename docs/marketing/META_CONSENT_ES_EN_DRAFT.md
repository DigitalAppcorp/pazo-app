# PAZO / Meta Conversion Consent — ES/EN candidate (NOT PUBLISHED)

**Status:** Copy and product-flow candidate, awaiting legal and Design OS review.
The live [privacy policy](../../src/features/legal/legalCopy.ts) still says **no individual conversions are sent to Meta**. It MUST be updated, published and date-stamped **before** Meta is activated. Do not claim that draft text is already the user's current privacy policy.

## Proposed first verified session UX (without interrupting first-party signup)
1. Continue existing anonymous ad-landing + email signup + email-confirmation flow unchanged. `signup_requested` is never a Meta conversion.
2. At the first **authenticated, confirmed** PAZO session, when the server still considers confirmation recent (laboratory upper bound 15 minutes) and paid Meta attribution was captured, optionally offer a separate, **unchecked** purpose-specific choice. The user can continue without permission; there is no reduction in free PAZO functionality.
3. If the user voluntarily grants and no GPC/other opt-out is present, an authenticated Edge endpoint checks Auth settings, exact notice version, recent verified account, QA exclusion and server-side eligibility, then persists a grant under the **server** timestamp. Do not send a Meta event in this step.
4. Existing first-party acquisition remains independent. The private DB candidate creates **at most one** outbox conversion event via a shared idempotent helper, either when acquisition arrives after the fresh grant or when the grant arrives after fresh acquisition. Only registrations verified and acquired within the same short window qualify. Older accounts and registrations outside the window are **not backfilled**.
5. The browser Pixel and server CAPI remain independently OFF until matching-field approval and Meta Events Manager verification, even if the purpose record is granted. On withdrawal, suppress future operations and unsent records. Do not claim events already transmitted to Meta can be un-sent.
6. Under `navigator.globalPrivacyControl` true or `Sec-GPC: 1` suppress the grant and all Meta delivery. A denial or withdrawal must never block PAZO login, QR, or Care tools.

**Note:** Capturing purpose consent after confirmation rather than before solves the difficulty of having no authenticated account before email confirmation, but it also means that registrations verified long before the first return session intentionally will NOT count. A measurable cohort-completeness trade-off requires Product Owner review; never conceal missing conversions as zero business registrations.

## Candidate user-facing copy

### ES
**Título:** Tu privacidad, tu decisión.

**Texto:** ¿Permites que PAZO comparta con Meta la confirmación de tu registro para medir nuestros anuncios? Meta podría recibir identificadores técnicos y datos de coincidencia autorizados, además de la señal de registro.

**Casilla (DESMARCADA):** Sí, permito esta medición con Meta.

**Acción principal / sin permiso:** Continuar sin permitirlo.

**Acción secundaria / opt-in explícito:** Permitir medición.

**Aclaración:** Es opcional. PAZO funciona de la misma manera si no lo permites.

**Privacidad:** Ver cómo se usan mis datos.

**GPC:** Tu navegador solicita no compartir datos para publicidad. Respetaremos esa preferencia.

### EN
**Title:** Your privacy, your choice.

**Text:** Do you allow PAZO to share your confirmed registration with Meta to measure our ads? Meta may receive technical identifiers and approved matching data as well as the registration signal.

**Unchecked choice:** Yes, I allow this measurement with Meta.

**Primary / without permission:** Continue without allowing.

**Secondary / voluntary opt-in:** Allow measurement.

**Clarification:** This is optional. PAZO works the same way if you do not allow it.

**Privacy:** How my data may be used.

**GPC:** Your browser asks websites not to share data for advertising. We will respect that preference.

## Publication / implementation gates

- Design OS: accessible ES/EN UX (minimum text size 15px in consent UI, no coercive color or prechecked checkbox, focus return, small mobile viewport, no pressure or account blocking); compare against PAZO visual system. **NOT_TESTED** with actual browser.
- Legal counsel/product owner: determine California CCPA applicability and disclosure obligations, GPC & opt-out, data minimization, treatment of potential hashed email (still personal information), allowed Meta match fields, retention and dataset ownership. **PENDING**. California CPPA reference: https://cppa.ca.gov/faq .
- Supabase: apply **reviewed** migration via safe CLI workflow only after GO. Current candidate SQL is in `supabase/tests/marketing/meta-outbox-candidate.sql` and is NOT deployable.
- Auth: authenticated grant only (new `grantCore.mjs` and `grantAdapter.mjs` are OFF; `pazo-meta-grant/index.ts` is OFF). Existing Auth and first-party measurement must continue on failed Meta permission.
- Meta: no data sharing, SDK, CAPI requests or Meta Test Events until separate privacy and deployment authorization. Pixel `eventID` and CAPI `event_id` must match.
- No advertising spend or publication of the three creatives under this work.

## Security cases to verify
No consent; GPC; anonymous visitor; unverified/auto-confirmed account; duplicate registration; return after 15 minutes; switched account; wrong-origin form; bad notice version; admin/test account; opt-out after grant; opt-out before grant; stolen JWT/CSRFI scenario; retry after consent withdrawal; idempotent lease; challenge replay; no leakage into logs or GitHub; regression of MFA and PayPal.

Sources:
- [California CPPA FAQ](https://cppa.ca.gov/faq)
- [California CCPA statute as of Jan 1, 2026](https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf)
- [Official Supabase secrets guidance](https://supabase.com/docs/guides/functions/secrets)
