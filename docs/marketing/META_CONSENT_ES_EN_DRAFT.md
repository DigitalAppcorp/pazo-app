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

## Draft privacy disclosure for legal/product review (NOT PUBLIC)

**Scope of this text:** proposed addendum to the currently published PAZO privacy policy, not a legal conclusion or authorization to launch. It must replace or qualify the current ES/EN statements that PAZO does not disclose individual conversions to Meta **before** third-party requests can occur. Do not set a new publication date until it is actually public.

### Español — propuesta de divulgación

**Medición opcional de registros mediante Meta**

Si llegas a PAZO desde una campaña publicitaria, después de confirmar tu cuenta podremos ofrecerte una elección opcional y separada para medir ese registro con Meta. Solo si autorizas esa finalidad, y no existe una preferencia de exclusión aplicable, PAZO podrá transmitir a Meta un evento llamado `CompleteRegistration` asociado a esa confirmación y un identificador aleatorio de evento que evita contabilizar dos veces la misma acción.

La medición puede utilizar dos vías: Meta Pixel en el navegador y Conversions API desde el servidor. **Al cargar Meta Pixel, tu navegador se conecta a servicios de Meta y puede comunicarles datos técnicos de esa conexión, como la dirección IP y el agente de usuario, incluso sin identificación avanzada.** Los datos usados para que Meta reconozca una conversión —por ejemplo, un resumen criptográfico SHA-256 del correo electrónico— **requieren una revisión y aprobación específica antes de incluirse**. Un correo convertido a hash sigue siendo información personal a efectos de análisis de privacidad; no debe describirse como anónimo.

La finalidad propuesta es medir registros confirmados originados en campañas y evaluar anuncios. PAZO no enviará nombres ni datos de mascotas, ubicaciones precisas, publicaciones, contenidos de cuidado, documentos ni datos de pago como parte de esta integración. La aceptación es voluntaria: puedes continuar utilizando PAZO sin permitirla. Puedes retirar el permiso y solicitar que se detengan futuros envíos; retirarlo no puede revertir automáticamente datos ya transmitidos. Respetaremos señales de exclusión aplicables, incluido Global Privacy Control. La política definitiva debe explicar el periodo de conservación de la preferencia, el tratamiento por Meta, los derechos aplicables y las vías de oposición y contacto.

### English — proposed disclosure

**Optional Meta registration measurement**

If you arrive at PAZO through an advertising campaign, after your account is confirmed we may offer a separate, optional choice to measure that registration with Meta. Only if you authorize this purpose, and no applicable opt-out preference is present, PAZO may transmit a `CompleteRegistration` event linked to the verified registration and a random event identifier used to avoid counting the same event twice.

The proposed measurement uses two channels: Meta Pixel in your browser and the server-side Conversions API. **Loading Meta Pixel connects your browser to Meta services and may disclose technical connection information, including IP address and user-agent, even when advanced matching is off.** Any information intended to help Meta match the conversion — for example, a SHA-256 hash of your email address — **must be reviewed and specifically approved before it is included**. A hashed email is not anonymous merely because it has been hashed.

The proposed purpose is to measure confirmed registrations originating from ad campaigns and evaluate advertising. PAZO will not include pet names or records, precise locations, posts, care content, documents, or payment data in this integration. Consent is optional: you can continue using PAZO without it. You can withdraw permission and ask us to stop future transmissions, but withdrawal cannot automatically undo past transmission. We will respect applicable opt-out preferences including Global Privacy Control. The final published policy must detail preference retention, Meta's role, applicable rights, opt-out and contact methods.

### Mandatory review before publication

- Verify **whether PAZO is a business subject to the CCPA/CPRA and/or other applicable law**; do not assume automatic applicability or exemption from being in California.
- Verify Meta's contractual status/role for this specific use, notices and processing purposes.
- Approve each actual match/technical field, including what the Pixel SDK transmits automatically; keep CAPI identifiers blocked until approved.
- Specify whether the optional choice satisfies legal requirements for each audience and how GPC/opt-out is honored **across devices**. A one-time browser check and an older database snapshot are not sufficient evidence of future compliance.
- Approve the retention schedule for Meta-specific preference and outbox, its withdrawal behavior, how users can request deletion/opt-out, and policy contact handling.
- Verify the versioned ES/EN wording with legal counsel and Design OS. This is not the released text and must not be presented as effective.

Official reference points (not an opinion about PAZO's applicability): https://cppa.ca.gov/faq and https://oag.ca.gov/privacy/ccpa/gpc .

## Revisión de Design OS y GPC — 31-oct-2026 (candidata, OFF)

**Hallazgo S1 de privacidad (corregido solo en candidato):** ocultar el botón positivo cuando `navigator.globalPrivacyControl` es verdadero no guarda por sí solo una retirada durable. El cliente previamente vetaba `requestGrant` y `requestReceipt`, de modo que no llegaba necesariamente una solicitud con `Sec-GPC:1` a los endpoints candidatos. No se debe declarar que la señal se respetó en la cuenta únicamente porque el checkbox desapareció.

**Solución candidata aislada:**
- `src/features/marketing/metaGpcSync.mjs` sincroniza una señal GPC después de contar con JWT de cuenta verificada, invocando solo el **endpoint first-party de retirada**, sin depender de Pixel/CAPI/grant. Distingue `withdrawn` confirmado de `unconfirmed` por fallo de red o cambio de identidad y no se importa desde el runtime productivo.
- `src/features/marketing/MetaConsentChoice.tsx` mantiene el checkbox **desmarcado**, ofrece omitir sin castigo, y exige un callback `onWithdraw` para registrar la decisión negativa. Ante GPC, no permite grant, intenta persistir la retirada y muestra `guardado` solo tras confirmación del servidor; cuando falla, muestra error y botón de reintento. Continuar en PAZO no debe bloquearse por una caída de medición.
- El texto no debe disfrazar un hash de correo como anonimización. El aviso candidato menciona señal de registro confirmado, datos técnicos de conexión (IP/navegador) y que cualquier identificador derivado de email requiere autorización específica. `metaConversion.mjs` aún exige un hash de correo en CAPI, cuyo origen/consentimiento está **BLOCKED**. Por tanto esta pantalla **no** puede publicarse todavía como consentimiento definitivo.

**UX sobre la pantalla real — estado `NOT_TESTED`:** no se ha montado esta candidata en `App.tsx` ni en el onboarding de PAZO. Hay pruebas unitarias de React para ES/EN, checkbox inicial, omisión, GPC/retirada, error y reintento, pero falta prueba visual de 390/430px, foco y retorno, contraste medido y revisión humana del copy. No usar `DESIGN_QA_PASS` por el hecho de compilar o aprobar tests unitarios.

**Regla de producto:** ofrecer esta decisión, si se aprueba, sin desviar al usuario que llegó por el QR de su tarea principal. El límite laboratorio de 15 minutos puede reducir la cobertura de registros de anuncios y necesita evaluación del PO con datos reales; nunca falsear tasas por excluir el segmento que no consintió. Un consentimiento dado para medir anuncios NO autoriza otra finalidad social ni datos de mascotas.

**Documentación vinculada:** [inventario de datos y controles NO-GO](META_DATA_MINIMIZATION_REVIEW_20261031.md). Los criterios legales, política efectiva, preferencias permanentes, requisitos de Meta y destino del contacto de privacidad requieren revisión independiente antes de publicación.
