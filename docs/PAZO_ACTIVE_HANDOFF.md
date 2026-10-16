# F16 — Cierre técnico P22 (composición aislada de revisión) 2026-10-16

**Avance de integración (no otro laboratorio financiero):** commit `6424dc265409b3fcefcb29e7be5ba69bc693cb91` añade `createP22SandboxPrivilegedReviewComposition` en `supabase/functions/f16-paypal-webhook/p22SandboxReviewWorker.mjs`. Reutiliza literalmente (sin tablas ni endpoints nuevos) `p22PrivateLeaseRpcAdapter.mjs` (RPC P21 claim/read/finish + P22 owner/intent) y `p05SandboxClaimScopedMerchantReaders.mjs` (PayPal OAuth Sandbox + GET evento y suscripción) a través de `createP22SandboxReviewWorker`. El resultado más favorable **solo cuarentena REVIEW** por ciclo no probado, nunca `processed` ni pago/entitlement. Importante: simula llamadas de mutación claim/finish por mocks; no ejecutar contra Supabase alojado sin gate específico. **Gate defecto DISABLED**, alcance alternativo exclusivo `OFFLINE_SYNTHETIC_TEST_ONLY`, requiere `fetchImpl` inyectado; no lo importa ningún Edge activo/cron/frontend. No autoriza usar credenciales reales con el seam sintético.

Commit `d8fa77785dd0c745d27a85f989f9f1f7ae221fcb` añade cuatro tests dirigidos al archivo P22 existente: default sin red, solo RPC privados + OAuth/GET merchant (fixture sintética), inbox idle sin PayPal, y falla de RPC bloquea proveedor. Consultar CI/PG17 de ese SHA antes de declarar PASS; no repetir transacciones ni 889 tests manuales. Seguridad alojada comprobada READ ONLY: `P21=false`, `P42=false`, ledger 0, bindings 0 y signing keys 0. Sin PayPal invocado, sin SQL de escritura, sin despliegue, sin compra.

**Trabajo técnico siguiente con GO separado** (no autorizado por «ok go» general): revisión de fuente atestiguada de activación P37 (contrato SQL todavía incompleto), período contractual con consentimiento real y reversos/disputas; política jurídica P02/P03; aprobación para migraciones/Edge y custodia de secret P42. El P22 del repositorio **NO está conectado a un worker alojado**, y la presente composición simulada **NO prueba** marcha real. P44 es histórico REVIEW_REQUIRED, no repetir. PAZO gratuita no depende de habilitar esta oferta, PR #44 continúa DRAFT.

---

# F16 — Términos prospectivos ES/EN y alcance de disputas: gate de revisión 2026-10-16

**Entregado solo en rama, ningún release:** `src/features/supporter/offerCopyDraftP13.mjs` ahora incorpora en español e inglés la condición P05 aprobada `[activación PayPal validada, siguiente facturación merchant observada en activación)`, sujeta a cargo regular y primera obligación auténticos; no usa `COMPLETED+30 días`. Las recompensas aún no están operativas. Se añadieron **dos tests** en `f16P13OfferCopyDraft.test.mjs`; status de borrador y todos los flags de checkout/benefits continúan en `false`. Documentado en `docs/PAZO_F16_P13_BILINGUAL_OFFER_AND_RETENTION_REVIEW_20261015.md`. No reusar como oferta P06 publicada, ni alterar `pazo-supporter-sandbox.qa20261016-v1` ya aceptada sin beneficios.

**No recrear trabajo P03:** existe diseño y código offline de scope de disputas `p05SandboxDisputeMerchantReaders`, `p05OfflineDisputeScopeResolver`, `p05ServerOnlyDisputeLedgerReaders`, y RPC read-only en `f16_p05_dispute_private_ledger_read_DO_NOT_APPLY.sql`. Ledger alojado = 0 => no se puede corroborar que una disputa corresponda a PAZO; `unknown`, no ACK `outside_pazo`. El receptor alojado aún no conserva eventos `CUSTOMER.DISPUTE.*` y no debe deployarse sin política+gate. Reglas P06-A–E **ya aprobadas**, inbox 90d **solo conciliados sin hold**, CA ARL §17602(a)(6) consentimiento (si aplica) 3 años desde aceptación o 1 tras término, plazo mayor. P02/P03 ledger/disputas/backup y retención fiscal **sin plazo aprobado**. El registro de decisiones JSON y firmas siguen pendientes, no se cambiaron.

**Checklist consolidado, NO autorizado:** `docs/PAZO_F16_P05_RETENTION_DECISION_PACKET_20261015.md`. La corrección útil fue precisar copy y próximos gates de firma de G1; **no activar captura, borrado, PayPal Live, P21/P42, transacciones ni beneficios**. El siguiente paso operativo no es código duplicado: (1) confirmar revisión legal/contable y producto de términos/retención; (2) disponibilidad técnica de beneficios/cancelación/acuse; (3) solo con GO específico revisar migración RPC mínima P03 y captura Sandbox ya diseñadas. P44 permanece `REVIEW_REQUIRED`; PR #44 DRAFT.

---

# PAZO F16 — Gate de ejecución prospectiva (2026-10-16)

**Hallazgo central:** la suscripción histórica excluida por P05 no es idéntica a la compra QA de P44. El entorno alojado **sí** contiene 2 ofertas ES/EN publicadas `pazo-supporter-sandbox.qa20261016-v1` y 1 aceptación P06 con SHA y provider-create claim. Pero **los términos QA aceptados excluyen cualquier período pagado o beneficio**, no adoptan la fórmula prospectiva de servicio. No negar el consentimiento QA; conservarlo como evidencia de seguridad y PayPal, sin acreditar `paidThrough`.

**Contrato de ejecución documentado y fuente prioritaria:** `docs/PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md`, sección `Gate de ejecución prospectiva P44→P26` añadida en commit `8a74e522`. Reutilizar `p05ProspectiveEvidenceContractLab.mjs`, `p26OfflineProvenanceGate.mjs`, `p27OfflineProvenanceReview.mjs` y suites existentes; no recrearlos. Son laboratorios NO autenticadores. La prueba P44 v2 `merchant_refs_correlated_pagination_incomplete` conserva evidencia de sale/intent, pero nunca crea período ni contrato prospectivo.

**Inventario confirmado read-only en Supabase:** P22 RPC instalada; P28 audit RPC instalada; P42 RPC instalada pero no habilitada; P24/P25/P26 RPC y tablas P25/P26 ausentes. P21 worker OFF; P42 writer OFF; ledger/reversals/P40/P42 keys = 0. Webhook v18 carece de eventos `CUSTOMER.DISPUTE.*`. 2 intents bound, 12 eventos inbox, 2 ofertas publicadas QA, 1 checkout con consentimiento/hashing. No hubo PayPal GET nuevos, compras, Edge deploy, SQL de escritura, ni alteración financiera.

**Punto pendiente realmente bloqueante:** fuente auténtica `provider plan/activation/sale/transaction window` y manejo de refunds/disputas **as-of + compensación futura** bajo retención/scope aprobados; aceptación de términos **de servicio** previo a primer cargo prospectivo. Una ausencia de disputas futuras es imposible de certificar en el presente: documentada propuesta de ventana `coverageAsOf` + monitoreo y reversos idempotentes, **NO aprobada**. No aceptar snapshot vacío como certificación global. La función diagnóstica v2 expira el 2026-10-17T00:00:00Z; no repetirla ni extenderla.

**Siguiente gate:** preparar política de retención/alcance de disputas y contrato ES/EN prospectivo antes de cualquier integración financiera alojada, y validar adaptadores existentes mediante ensayos dirigidos. Se precisa GO separado para cualquier SQL, captura/Edge, worker, prueba nueva, ledger, beneficios o Live. PR #44 DRAFT, F16 NO-GO.

---

# F16-P44 — Auditoría de fuentes y cobertura 2026-10-16

**Resultado:** `REVIEW_REQUIRED` conservado; no nuevos lectores, no nuevos tests duplicados, no nuevos GET PayPal, no invocar P44 otra vez. **Informe canónico actual:** [`docs/PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md`](PAZO_F16_P44_MERCHANT_COVERAGE_REUSE_GATE_20261016.md).

Se revisaron los componentes reales P05, P23, P24, P29, P32 y sus pruebas existentes, y la fuente de la función Edge P44 v2. La correlación comercial del diagnóstico proviene de una consulta que cubrió solamente `2026-10-16T00:00:00Z` hasta su momento de ejecución: **no es historia total**. Los totales de paginación ausentes no permiten certificar cobertura. No hay evidencia independiente de ciclo REGULAR, ancla contractual o cobertura reembolsos/disputas. El `core.mjs` de `f16-paypal-webhook` alojada v18 tampoco reconoce `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED`, confirmando brecha de alcance. Reglas originales P05 de primer período y pagos tardíos se conservan.

SQL READ ONLY post-auditoría: **ledger 0, reversals 0, P40 0, signing keys P42 0, P21 OFF, writer P42 OFF**. PR #44 continúa DRAFT; no se desplegó, no se compró nada, no hubo writes ni invocaciones. Cualquier futura consulta alojada necesita contrato concreto de procedencia/cobertura y GO específico del PO. **No se permite evadir la expiración del diagnóstico P44 v2.** Siguiente trabajo: diseño documental/validación offline de evidencia faltante, no recrear infraestructura.

---

# PAZO F16 — QA local publicada y verificada (2026-10-16)

**Integración QA P06/P18 CERRADA — reutilización, no recreación.** HEAD verificado en GitHub `bb1d57c01ff01092ef3c7bd96df2d35240150ce6` (rama `f13/section-titles-20261012`, PR #44 sigue OPEN/DRAFT). Este último commit publica **únicamente** `src/features/supporter/testing/f16P06QaAccountOrigin.test.mjs`, con **10** casos. La salida local de Codex reporta 19/19 PASS en suite dirigida y clon limpio, 11 archivos candidatos equivalentes tras imports, 3 casos previamente cubiertos por P18 y 1 conservado como evidencia histórica. El informe detallado local `RESULTADO_F16_QA_TEST_PUBLICATION_20261016.md` no está montado en el repositorio; no afirmar que se leyó íntegro. La verificación independiente en GitHub del commit `bb1d57c` confirmó que **CI = SUCCESS** y **F16 Disposable PostgreSQL Lab = SUCCESS**. NO repetir ejecución local o tests de compra.

**Código QA reconciliado:** helper `supabase/functions/f16-paypal-supporter-account/p06QaAccountOrigin.mjs` y gestión de cuenta `index.ts` coinciden en lógica con runtime v10, conservando imports canónicos en GitHub. El checkout `supabase/functions/f16-paypal-supporter/index.ts` en GitHub mantiene `QA_CHECKOUT_RELEASE_APPROVED = false`; la función QA alojada v7 se había desplegado con latch restringido `true` durante pruebas; divergencia **intencional** hasta gate separado y nunca motivo de redeploy automático. No se desplegó código, no se modificaron datos SQL/financieros.

**Siguiente fase técnica: F16-P44 REVIEW_REQUIRED.** En una única ejecución previa `review` HTTP 200 hubo correlación entre venta Sandbox y evento original, pero `merchant_refs_correlated_pagination_incomplete`: las transacciones por ventanas, períodos contractuales y evidencia de reembolsos/disputas NO están exhaustivamente acreditados. Los componentes P05/P23/P24/P29/P31/P32 ya existen para reutilizar, en gran parte OFFLINE/SYNTHETIC; distinguir tests sintéticos de prueba merchant real. No volver a llamar P44 ni repetir pagos. La función aislada `f16-paypal-sandbox-sale-review` v2 tiene caducidad `2026-10-17T00:00:00Z`; su vencimiento NO autoriza ampliación/redeploy. Resolver por análisis contractual y diseño de cobertura independiente de solo lectura, con nueva aprobación específica si requiere una operación alojada. Mantener P21 OFF, P42 OFF, ledger/paidThrough/beneficios sin habilitar, PayPal Live OFF.

---

# PAZO F16 — Reconciliación QA de prueba aislada (2026-10-16)

**GO vigente:** PO aprobó consolidar únicamente trabajo ya verificado de QA y evitar duplicados. NO autoriza despliegue, nueva compra, habilitar P21/P42, ledger, Live ni beneficios.

**Evidencia local remitida por operador:** `LOCAL_COMPARE_COMPLETED`: clon principal limpio, HEAD local `870ea27d2cd80757585e0973f07e60e9df146c90`; baseline de aquel inventario `e8a56d8b20cf77ccaefd3f4e8dbbbc3f96120202`. **883 archivos idénticos; 3 diferencias F16 eran actualizaciones remotas**, no código local nuevo. Directorios operativos fuera de Git contienen helper `p06-live-qa/account-qa-candidate/p06QaAccountOrigin.mjs`, pruebas `account-qa-origin.test.mjs` con 14 casos, fuentes de gestión/checkout QA y seis informes P06/P43/P44. NO se revisó aquí el texto completo de esos archivos locales: no inferir equivalencia total ni recrear las 14 pruebas. Una única ejecución previa del auditor; NO repetirla.

**Intervención en rama posterior al baseline:**
- `8de00b08`: guard `supabase/functions/f16-paypal-supporter-account/p06QaAccountOrigin.mjs` recuperado de la Edge Function alojada v10, con import reubicado al guard canónico existente `../f16-paypal-supporter/p06SandboxQaGate.mjs`. El contenido lógico coincide con runtime; no duplica el guard.
- `f04f6572`: `f16-paypal-supporter-account/index.ts` versiona la lógica QA de selección de origen y autenticación de único propietario ya desplegada; preserva imports canónicos del repositorio.
- `e99b7ab2`: actualiza el test P18 para reconocer la nueva firma de `createRuntime`. No sustituye ni repite los 14 tests aislados.
- **NO se cambió** `supabase/functions/f16-paypal-supporter/index.ts`: el checkout en GitHub conserva `QA_CHECKOUT_RELEASE_APPROVED=false`; en runtime Sandbox v7 está `true` por la prueba restringida. No sincronizar esos flags sin GO específico.
- Código de rama exclusivamente: **NO se desplegaron** funciones ni se ejecutaron pagos o pruebas E2E. CI del HEAD `e99b7ab2` se vio queued/in_progress, consultar conclusión antes de declarar PASS.

**Gate local siguiente y único:** en PC/Codex, verificar `git status --porcelain` vacío, rama `f13/section-titles-20261012`, HEAD local esperado `870ea27d2cd80757585e0973f07e60e9df146c90` y remoto aprobado; entonces `git fetch origin f13/section-titles-20261012` + `git merge --ff-only origin/f13/section-titles-20261012`. Si hay drift, STOP. Después comparar exactos `p06-live-qa/account-qa-candidate/` y `account-qa-origin.test.mjs` con nuevos archivos remotos, deduplicar esos 14 tests y adaptar rutas/imports solamente si hace falta; hacer tests dirigidos SOLO tras verificar la diferencia. Preservar informes operativos P06/P43/P44 sanitizados. **No ejecutar scripts de compra, no redeploy, no escribir DB, no push automático de fuentes QA con latch true.** Si el contenido local difiere del guard alojado, clasificar REVIEW_REQUIRED y documentar before/after antes de mezclar.

---

# PAZO — F16-P44 correlación comercial (actualización 2026-10-16)

**Resultado de ejecución único reportado por operador:** `REVIEW_REQUIRED — merchant_refs_correlated_pagination_incomplete`, HTTP 200, una llamada `review` sin reintentos; venta Sandbox y evento original correlacionados. Se conserva la distinción: sin cobertura completa del historial, períodos, refund/dispute, ni permiso de ledger/beneficios.

**Corrección branch-only, NO desplegada:** `87d42357` añade evidencia explícita de paginación opcional y marca revisión independiente cuando PayPal omite `total_pages`/`total_items`; `5fe0bcc5` incorpora dos tests offline para metadatos ausentes y totales coherentes. **No eleva evidencia incompleta a PASS**. CI/PostgreSQL estaban queued al observarse; comprobar resultados antes de declarar validación. Función alojada v2 no cambiada; cero compras nuevas, cero nuevas invocaciones, P21/P42/ledger/beneficios/Live OFF. Siguiente paso: verificar CI y preparar un procedimiento independiente de cobertura histórica y reembolsos/disputas sin saltarse controles. La ventana diagnóstica de v2 expira el 2026-10-17 00:00 UTC: no repetirla.

---

# PAZO — ACTIVE HANDOFF | punto de recuperación F16-P44
**Última verificación:** 2026-10-16, Supabase/GitHub leídos directamente en esta conversación.  
**Product Owner:** usuario; autoriza ejecución técnica por ChatGPT/Codex dentro de gates aprobados.  
**Project Brain OS:** `DigitalAppcorp/project-brain-os`, v1.4.1.  
**Repositorio:** `DigitalAppcorp/pazo-app`. **Rama:** `f13/section-titles-20261012`. **PR:** [#44](https://github.com/DigitalAppcorp/pazo-app/pull/44) OPEN/DRAFT.  
**Último HEAD de rama inspeccionado ANTES de escribir este handoff:** `870ea27d2cd80757585e0973f07e60e9df146c90`. **main observado:** `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`. Después de leer este archivo, obtener el HEAD remoto actual; no inferir que este SHA sea el último.

## INSTRUCCIÓN PRIORITARIA para quien retoma

**Continuar EXACTAMENTE en F16: comprobación privada, autenticada y de SOLO LECTURA de la primera venta de la suscripción PayPal Sandbox que el PO acaba de aprobar y cancelar.** El PO dijo **«sí»** al plan de **preparar, desplegar y ejecutar una función privada de diagnóstico read-only** sobre esa venta específica. Este GO no autoriza credenciales nuevas, pagos adicionales, reconciliación con escrituras, activar workers P21, escritor/keys P42, beneficios, PayPal Live, despliegues Vercel, cambiar la oferta ni repetir el buyer E2E.

**¡Hallazgo nuevo y de precedencia máxima!** En Supabase ya aparece `f16-paypal-sandbox-sale-review` **v2 ACTIVE, verify_jwt=true**. Se leyó el archivo `index.ts` directamente desde el runtime alojado; contiene un diagnóstico restringido a **un único Auth UID allowlisted**, origen QA exacto, plan Sandbox `P-14V25407JP6850922NLHMDKI`, `PAZO_F16_P06_QA_ENABLE`, consulta al servicio merchant Sandbox y contrato de salida `REVIEW_REQUIRED`, sin escrituras financieras ni beneficios. Tiene un **evento de venta fijado en fuente** (NO divulgarlo) y ventana de diagnóstico limitada a `2026-10-17T00:00:00Z`. **Su código NO figura en el HEAD GitHub inspeccionado**: fuente de runtime y rama divergen. No atribuir autoría ni inferir fecha de despliegue/ejecución; tampoco re-desplegar esta función ni crear una segunda antes de auditar runtime y registros. **No se ha verificado una ejecución autenticada que correlacione venta y PayPal.** El último informe Codex anterior decía `REVIEW_REQUIRED — LOCAL_PAYPAL_CREDENTIALS_UNAVAILABLE`; se detuvo sin GET PayPal ni P22–P29. Ese informe NO prueba que el runtime v2 haya fallado ni pasado.

**Paso siguiente único:** revisar la función alojada v2, límites temporales y logs/metadatos de ejecución **sin secretos**, y confirmar si ya existe resultado read-only de merchant. Si no lo hay, ejecutar **una vez** el diagnóstico owner-only previamente aprobado por canal autenticado adecuado, sin transmitir JWT/cookies en chat ni exponer datos de pago; exigir confirmación de identidad server-side y de origen HTTPS. Si el endpoint expira, está roto, no puede invocarse con seguridad o no existe canal autorizado, clasificar `REVIEW_REQUIRED` y proponer la corrección mínima dentro del GO del PO, sin declarar verificada la venta. Las herramientas en chat Supabase/GitHub normalmente leen fuente y SQL pero NO extraen secretos ni JWT del navegador. Codex local tiene acceso a la computadora, pero el informe constató ausencia de credenciales comerciales PayPal LOCALES; deben usarse de manera privada las credenciales **ya configuradas en Supabase**, sin copiarlas.

## Estado REAL de la prueba PayPal Sandbox (última comprobación)

- PO usó frontend QA local servido mediante **enlace HTTPS temporal Cloudflare Tunnel** `https://titanium-strategy-lead-singh.trycloudflare.com/#/account/supporter` (enlace efímero; puede expirar o variar). El panel `Abrir prueba Sandbox` mostró términos ES/EN del plan simulado **US$2.99/mes** y consentimiento opt-in.
- PO aceptó personalmente en PayPal Sandbox **UNA** suscripción. La pantalla PAZO informó `ACTIVE` tras consultar proveedor y luego `CANCELLED`, mostrando que PayPal confirmó la cancelación de **renovaciones futuras**. Esas capturas prueban el flujo de gestión, NO un ciclo pagado.
- Supabase SQL READ ONLY, sobre la única cuenta QA autorizada (sin publicar su UID): **1 Auth QA**, **1 consentimiento/intento**, **1 intent `bound`** al plan correcto, **4 eventos verificados** en ventana de prueba `2026-10-16 20:38–20:48 UTC`: `BILLING.SUBSCRIPTION.CREATED`, `ACTIVATED`, `PAYMENT.SALE.COMPLETED`, `CANCELLED`. Todos **4 `pending`**, **0 claims**, **0 eventos procesados/vinculados a ledger**. Hay **8 eventos históricos** previos de otras pruebas; deben excluirse sin reinterpretarlos como pagos nuevos.
- **Ledger `supporter_private.paypal_payment_entries`: 0 registros en TODO el proyecto.** **P21 `p05_inbox_worker_gate.enabled=false`** y cutoff `not_before=NULL`; **P42 writer OFF** y **0 claves P42**. Prohibido inferir paidThrough/periodStart/periodEnd, premium, beneficios, badges o cobros reales de SALE/ACTIVE/CANCELLED.
- En este chat se comprobaron `public.f16_p05_draft_claim_next_verified_event`, `f16_p05_draft_read_claimed_event`, `f16_p05_draft_finish_claimed_event` y `f16_p22_resolve_bound_under_claim`: `service_role EXECUTE=true`, `authenticated EXECUTE=false`. Tener RPCs instaladas **NO significa** procesamiento completo ni permiso de encender el gate.
- Funciones Supabase observadas ACTIVE: `f16-paypal-webhook` **v18** JWT false (recepción verificada), `f16-paypal-supporter-account` **v10** JWT true (estado/cancelación), `f16-paypal-operator-read` **v6** JWT false (código **enabled=false**, no usar como sustituto), `f16-paypal-supporter` **v7** JWT true (checkout QA de un owner), `f16-paypal-sandbox-sale-review` **v2** JWT true (diagnóstico comercial SOLO LECTURA). Reinspeccionar versiones por posible actividad concurrente.
- El lector v2 puede comparar `subscription`, `custom_id`, `sale`, `inbox event`, importe/moneda y paginación. Incluso `merchant_refs_correlated_review_only` deja `cycleVerified=false`, `refundsCoverageComplete=false`, `disputesCoverageComplete=false`, `mayRecordPayment=false`, `mayGrantBenefits=false`: **NO es autorización financiera**.
- CI/QA: Codex reportó previamente **889 tests PASS** y build normal/QA PASS **en copia local aislada**; NO demuestra conciliación merchant de esta venta. Branch GitHub y runtime Supabase pueden divergir. No repetir 889 pruebas salvo modificación de código que realmente lo exija.

## Gates no completados (sin saltos ni atajos)

- Prueba mercantil autenticada pendiente de resultado verificable: evento GET original + sale GET + subscription/transactions GET, propietario `owner` e intent `bound`, condiciones P06, plan fijo 2.99 USD, historial de reembolsos/disputas y cobertura de historial. PayPal `PAYMENT.SALE.COMPLETED` recibido no basta.
- Ruta financiera P21–P30: reclamo con fencing/cutoff prospectivo, obligaciones contractuales y período de cobertura probado, reembolsos/reversos/disputas, idempotencia, ledger ACID, retención/privacidad y autorización explícita de PO para escritor/entitlements. `P42` provisión criptográfica sin comenzar: NO generar ni depositar clave para simplificar este diagnóstico.
- Código de revisión P28 v6 está estáticamente deshabilitado; **NO** activarlo o reciclarlo de forma oportunista. No mezclar 8 eventos históricos con el nuevo buyer.
- PR #44 sigue DRAFT, `main` sin merge de esta fase; F16 **NO COMPLETADA** ni autorizada para cobros reales. No crear gasto, hosting nuevo ni previews Vercel; PO pidió evitar retrasos/despliegues. El Vercel team `digitalapp` ha devuelto 403 a este conector y varios commits dispararon previews automáticos/rate limiting. Para diagnosticar Sandbox se reutiliza Supabase; mantener la app gratis.
- **Documentos técnicos del gate:** `docs/PAZO_F16_PAYPAL_RECONCILIATION_MODEL_20261013.md`, `docs/PAZO_F16_P27_HOSTED_SANDBOX_MERCHANT_READ_PREFLIGHT_20261015.md`, `docs/PAZO_F16_P28_LAUNCH_DEPENDENCY_RECONCILIATION_20261015.md`, `docs/PAZO_F16_P30_FINANCIAL_GATE_RECONCILIATION_20261015.md` y `docs/PAZO_F16_P42_MANUAL_OPERATOR_PREFLIGHT_20261016.md`. Leer `AGENTS.md` y `docs/PAZO_MASTER_ROADMAP.md` al retomar.

## Autorización, criterios para cierre y evidencia

**Autorizado por PO:** preparar, desplegar y ejecutar diagnóstico PRIVADO `Sandbox` de la venta probada **solo lectura**; no repetir compra. El usuario pidió ahora exclusivamente crear el **handoff y continuar en otro chat**, así que en la presente conversación no volver a invocar nada con efectos de pago o despliegue. Siguiente chat debe comprobar primero runtime v2, evidencia de GET comerciante e invocación, y pedir nueva autorización solo si la siguiente acción excede el GO definido. No solicitar passwords, JWT, keys ni IDs de compradores en chat. Sin logs crudos, PII, datos de pago ni secretos en GitHub/CI.

**Estado para retomar:** `F16_P44_HOSTED_SINGLE_OWNER_SANDBOX_SALE_REVIEW_V2_PRESENT_EXECUTION_UNVERIFIED_LEDGER_ZERO_P21_P42_OFF`.

## Historia conservada (NO reemplaza estado actual)

El archivo `docs/PAZO_ACTIVE_HANDOFF.md` anterior (195 KB de historia) se conserva íntegro por Git en el commit `870ea27d2cd80757585e0973f07e60e9df146c90`: [archivo histórico](https://github.com/DigitalAppcorp/pazo-app/blob/870ea27d2cd80757585e0973f07e60e9df146c90/docs/PAZO_ACTIVE_HANDOFF.md). Los archivos técnicos y las migraciones permanecen en la rama. Este snapshot prevalece sobre los checkpoints cronológicos antiguos, sin borrar decisiones históricas.

## Mensaje recomendado para nuevo chat

> Activa Project Brain OS desde `DigitalAppcorp/project-brain-os` y retoma PAZO en `DigitalAppcorp/pazo-app`. Lee `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md` y `docs/PAZO_MASTER_ROADMAP.md`. Continúa **F16-P44**: función alojada `f16-paypal-sandbox-sale-review` v2 ya existe; verifica si se ejecutó el diagnóstico privado de lectura mercantil Sandbox, y si falta, ejecuta el control owner-only dentro del GO previamente aprobado. Sin credenciales en chat, nuevas compras, ledger, P21/P42, beneficios, PayPal Live ni Vercel. No repitas los 889 tests ni pasos concluidos. Antes de actuar compara branch HEAD, runtimes y las cuatro evidencias QA `pending`. Dame siguiente gate real y avanza solo si es seguro.
