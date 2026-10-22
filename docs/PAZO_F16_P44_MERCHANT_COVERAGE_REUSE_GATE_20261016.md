# PAZO — F16-P44: conciliación de cobertura merchant y reutilización de P05/P23/P24/P29

**Fecha:** 2026-10-16. **Estado:** `REVIEW_REQUIRED`, auditoría de solo lectura y diseño; **NO-GO financiero**. Rama `f13/section-titles-20261012`, PR #44 DRAFT. Sin comprador, invocación PayPal, despliegue Edge, SQL de escritura ni cambio de flags.

## Evidencia realmente confirmada

- El Product Owner remitió el resultado de **una** llamada autenticada `review` HTTP 200 a la función QA alojada `f16-paypal-sandbox-sale-review` v2: `merchant_refs_correlated_pagination_incomplete`. Venta Sandbox, transacción y evento original se correlacionan, **pero no** prueba exhaustividad del historial ni primer período regular.
- Se leyó el código de la función Edge **alojada** (no confundirlo con el árbol Git): su `reader.read()` consulta la única suscripción acotada desde `2026-10-16T00:00:00Z` hasta la hora del diagnóstico. La ventana no empieza en la creación/activación ni se extiende más allá del instante observado. La función no hace `GET plan`, no acredita snapshot histórico de activación, no reúne todo el historial de reversos/disputas y siempre responde `mayRecordPayment:false`, `mayGrantBenefits:false`, `cycleVerified:false`, `paidThrough:null`.
- El archivo de rama `paypalSandboxTransactions.mjs` es **más reciente** que su copia del runtime v2; distingue `paginationMetadataComplete` y `requiresIndependentHistoryCoverage`. No está desplegado en el diagnóstico P44. No reinterpretar un `HTTP 200`, `COMPLETED` o un total ausente como alcance global.
- El código alojado `f16-paypal-webhook` v18 recibe `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED` y `PAYMENT.SALE.REVERSED`, pero su `core.mjs` **no incluye** `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED`. Una ausencia de disputas en su inbox no demuestra que no existan. Está identificado desde `PAZO_F16_P05_RUNTIME_WEBHOOK_DISPUTE_COVERAGE_AUDIT_20261015.md`.
- Lectura SQL solo lectura de `supporter_private`: **ledger 0, reversals 0, vínculos P40 0, claves P42 0, P21 OFF, writer P42 OFF**.
- P06 QA y 10 tests de origen/owner quedaron versionados; QA integrada. La ejecución local completa 19/19 PASS fue reportada por operador, y CI + PostgreSQL de `bb1d57c` ya resultaron SUCCESS.

## Inventario de contratos reutilizables

| Código ya existente | Lo que **sí** comprueba | Lo que **NO** comprueba |
| --- | --- | --- |
| `paypalSandboxTransactions.mjs` | GET merchant de suscripción y transacciones de un rango; anonimización de PII; rechazo de páginas contradictorias | Historia anterior/posterior, incertidumbre si PayPal omite totales, refunds/disputes completos, período |
| `p05TransactionWindowCoverageLab.mjs` + **11 tests** | Ventanas contiguas, sin huecos/solapes/duplicaciones, con totales y merchant scope coherentes | Retornos PayPal reales: solo evaluador puro; evidencia global financiera |
| `p23SandboxHistoryWindowReader.mjs` + **7 tests** | Consulta por ventanas derivadas de callback contractual bajo claim de prueba | Solo `OFFLINE_SYNTHETIC_TEST_ONLY`; callbacks no atestiguados; requiere totales y no sirve como worker alojado |
| `p23SandboxDisputeSnapshot.mjs` + **5 tests** | Snapshot simulado por venta; ausencia o presencia de disputa siempre queda en revisión | Compleción de disputas futuras/históricas, webhook ausente |
| `p24RefundLineageLab.mjs` + **5 tests** | Aritmética de refunds vinculados al `sale` original, sin doble conteo | Descubrimiento completo de refund IDs, fuente histórica merchant real |
| `p29MerchantSaleReader.mjs`, `p29ProspectiveEvidenceReconciler.mjs` + **tests existentes** | Venta original/evento/subscripción, revisión conservadora de reversos | Claim alojado habilitado, cobertura externa y prueba contractual suficiente |
| `p05FirstRegularObligationLab.mjs`, `p32FirstPeriodContractLab.mjs` | Reglas *offline* de primera obligación y ancla contractual | Prueba PayPal autenticada del cargo REGULAR o permiso de crear `paidThrough` |

**No duplicar** lectores, tablas ni tests que ya ejercitan estos rechazos. No cambiar P05/P23 para que la ausencia de `total_pages`/`total_items` produzca un falso resultado de cobertura.

## Qué evidencia falta — separada por fuente y gate

1. **Ventana confiable:** justificar `startAt` desde P06 original/alta contractual y `endAt` desde observación merchant/fecha de revisión, con suscripción y owner exactos; verificar cada respuesta de ventana sin huecos, dobles IDs ni truncado. Metadatos de página ausentes no son prueba de exhaustividad; mantener `REVIEW_REQUIRED` o conseguir una atestación independiente adecuada del proveedor antes de declarar cobertura.
2. **Cargo REGULAR y contrato del primer período:** comprobar `GET plan` y `GET subscription` en la vinculación owner/intent P06, tarifa mensual, sin trial/setup fee/override incompatible, `cycle_executions`, fallidos/saldo, activación firmada, timestamp de activación, `next_billing_time` merchant contemporáneo a la activación y venta de la primera obligación. La regla PO aprobada es `[activation_time, observed_next_billing_time)`, no `completed_at + 30 días`. El registro histórico de una cuenta cancelada no suple un acuse original que hubiera faltado.
3. **Refunds/reversals:** descubrir y contrastar las referencias reales y estados PayPal de la venta original (legado SALE, no confundir con refund de CAPTURE v2), eventos verificados, total parcial/acumulado y ausencia de contradicciones. `0` filas de ledger/reversals alojado **no** significa que PayPal carezca de ellos.
4. **Disputas:** obtener evidencia merchant por venta y definición de alcance/retención para eventos `CUSTOMER.DISPUTE.*` sin capturar disputas de otros compradores. Un snapshot de `items:[]` únicamente prueba un instante y un filtro. Cambios a doble allowlist (Edge `core.mjs` + RPC inbox), webhook y retención requieren **gate propio**, no parche aislado.
5. **Integración autorizada:** la lectura histórica P28 y la ruta prospectiva P21/P22 tienen controles y scopes diferentes. No recuperar eventos históricos como si fueran nuevos; no abrir leases ni P21 para resolver P44. P25/P26/P42 y beneficios continúan bloqueados sin prueba financiera y autorización específica.

## Corrección mínima tras esta auditoría

**CERO código nuevo y CERO consultas mercantiles ahora.** La limitación no es la ausencia de un evaluador sino **procedencia/cobertura incompleta de datos auténticos**. El camino de menor riesgo consiste en reutilizar P05/P23/P24/P29/P32 al preparar un *contrato de evidencia read-only* con identidad server-side, límites temporales y salida saneada, que permanezca `REVIEW_REQUIRED` ante cualquier laguna.

Antes de otra operación alojada: auditar versiones desplegadas, alcance/retención, owner y origen permitido, qué PayPal GET serán necesarios y el mecanismo de ejecución sin copiar credenciales. Obtener aprobación PO específica para esa ejecución. **No repetir P44 v2** (ventana hard-coded hasta `2026-10-17T00:00:00Z`), ni emitir otra compra, ni crear un endpoint alternativo para saltar el timeout.

### Criterio para el gate siguiente (documental / OFFLINE)

Un checklist de pruebas sintéticas debe demostrar que falta de totales, `next` presente, rango incompleto, refund desconocido, disputa sin cobertura, trial/setup/deuda o activación sin fuente independiente siempre retornan `REVIEW_REQUIRED`, `mayRecordPayment:false`, `mayGrantBenefits:false` y `paidThrough:null`. Gran parte de esas pruebas **ya existen** en P05/P23/P24/P29/P32: reutilizarlas. No afirmar que un test sintético es un GET comercial auténtico.

## Fuentes revisadas

- `docs/PAZO_F16_P05_TRANSACTION_WINDOW_COVERAGE_GATE_20261014.md`
- `docs/PAZO_F16_P05_RUNTIME_WEBHOOK_DISPUTE_COVERAGE_AUDIT_20261015.md`
- `docs/PAZO_F16_P05_FIRST_SERVICE_PERIOD_POLICY_APPROVED_20261014.md`
- `docs/PAZO_F16_P23_HISTORY_DISPUTE_SNAPSHOT_GATE_20261015.md`
- `docs/PAZO_F16_P30_FINANCIAL_GATE_RECONCILIATION_20261015.md`
- PayPal Developer: https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/ ; https://developer.paypal.com/subscriptions/webhooks ; https://developer.paypal.com/api/subscriptions/v1

---

## Gate de ejecución prospectiva P44→P26 — conciliación de fuentes (2026-10-16)

**Precedencia sobre la interpretación del caso:** Esta sección se basa en lectura directa del runtime, documentos canónicos y metadatos alojados de Supabase. Diferenciar la compra histórica previa de la **prueba QA reciente**:

1. La exclusión de contrato retrospectivo en `PAZO_F16_P05_FIRST_SERVICE_PERIOD_POLICY_APPROVED_20261014.md` se refiere a la **primera suscripción histórica**, no prueba ausencia de consentimiento en el comprador QA posterior.
2. Supabase alojado contiene `paypal_p06_offers` **2 filas publicadas** para `pazo-supporter-sandbox.qa20261016-v1` (ES/EN), y `paypal_p06_checkout_attempts` **1 aceptación con digest SHA256** y claim de creación proveedor. Hay 2 intents `bound`, 12 eventos inbox, 3 eventos SALE y ledger 0. Estos conteos no vinculan por sí solos el único consentimiento a un `saleId` concreto. P44 v2 verificó el vínculo owner/intent y el acuse en la ejecución autorizada previa; su resultado final siguió `REVIEW_REQUIRED`.
3. El **texto QA aceptado** en `src/features/supporter/sandboxQaOfferCopyP06.mjs` declara expresamente *«Esta prueba no activa ... un período pagado ... ni otros beneficios»*; tampoco adopta explícitamente `[activation_time, observed_next_billing_time)` como período de servicio de pago. **Aceptar la suscripción QA sí ocurrió; aceptar el contrato prospectivo de prestaciones NO se deduce de ello.** No intentar aplicar a esta prueba la regla destinada a contratos de servicio futuros.
4. Los informes de correlación comercial y la QA siguen siendo evidencia válida de consentimiento, seguridad de checkout/cancelación y origen PayPal. No descalificar su valor técnico ni crear otra compra solo para reproducirlos.
5. La función alojada `f16-paypal-sandbox-sale-review` v2 es un diagnóstico **de una sola ejecución** con expiración `2026-10-17T00:00:00Z`; ya produjo `merchant_refs_correlated_pagination_incomplete`. **No repetir, renovar ni ampliar** ese endpoint para superar una política contractual.

### Contrato de fuente auténtica para el primer ciclo — ya cubierto por módulos offline

| Evidencia | Fuente auténtica requerida | Implementación existente | Estado / fallo que bloquea |
| --- | --- | --- | --- |
| Owner, intención y aceptación original | `supabase.auth.getUser`, RPC P06 de aceptación con SHA/versión, private `bound` server-side | P06 checkout + `p26OfflineProvenanceGate.mjs` | Confirmado para una prueba QA, pero términos específicos no autorizan prestaciones; nueva aceptación necesaria para oferta con derechos |
| Evento SALE original firmado | Inbox verificada y `GET /v1/notifications/webhooks-events/{event_id}` | Webhook firmado, P22 RPC instalada, `p27OfflineProvenanceReview.mjs` | P21 worker y lease prospectivo OFF; eventos históricos no pasan cutoff |
| Sale merchant correlacionada | `GET /v1/payments/sale/{sale_id}`, confirmar venta, monto/moneda, subscription | `p29MerchantSaleReader.mjs`, P44 v2 | Identidad reciente correlacionada, no cargo REGULAR/atribución de obligación |
| Plan, suscripción y activación | `GET /v1/billing/plans/{plan_id}`, `GET /v1/billing/subscriptions/{id}`, evento firmado ACTIVATED, **snapshot contemporáneo** | `p05OriginalBillingSummary.mjs`, P34–P36, `p05FirstRegularObligationLab.mjs` | No inferir desde `next_billing_time` de una suscripción ya cancelada; setup fee/override/deuda/trial a comprobar |
| Transacciones del ciclo | `GET /v1/billing/subscriptions/{id}/transactions?start_time&end_time`, rangos server-owned y sin huecos | `paypalSandboxTransactions.mjs`, P05 ventanas, P23 | P44 v2 solo consultó el 16-oct; `total_pages`/`total_items` ausentes o `next` requieren REVIEW; nunca global por una página |
| Refunds/reversos | Eventos firmados + fuente de refunds correspondiente a SALE original (legado v1, no simular CAPTURE v2) | P24 y P29; ledger multireembolso en laboratorio | Ninguna prueba de cobertura total; 0 reversos locales ≠ 0 refunds merchant |
| Disputas | `GET /v1/customer/disputes?disputed_transaction_id={sale}` y detalles si las hay, seguimiento de webhooks scoped | P23 snapshot, `p05SandboxDisputeMerchantReaders.mjs` | Receptor alojado `core.mjs` **no** procesa `CUSTOMER.DISPUTE.*`; falta política alcance/retención |
| Primera obligación y adjudicación | Fuente contractual y lease activo con cutoff prospectivo, reserva única P25, revalidación atómica para ledger | P25 draft, P26 draft/PG17, P26/P27 offline | P25/P26 **no instalados**; P42 escritor OFF/sin claves; ninguna autorización de pago |

**Consideraciones API oficiales:** `List transactions for subscription` documenta `start_time`/`end_time` como parámetros de rango; no inventar un parámetro `page` de transacciones. `List disputes` acepta `disputed_transaction_id` y sus propias reglas de paginación. `GET /v1/payments/sale/{id}` pertenece a API PayPal v1 **deprecated** pero se usa para esta SALE original; no reemplazarlo ingenuamente por `GET /v2/payments/captures/{id}` sin cambiar el modelo y validar compatibilidad.

### Regla de revisión temporal: lo imposible no puede bloquear para siempre sin decisión

La **ausencia de disputas o reembolsos FUTUROS nunca se puede demostrar hoy**. Evitar exigir una constancia de «ninguna disputa en toda la vida futura», que no existe. Propuesta técnica para futura aprobación de producto/compliance: definir `coverageAsOf` (instantánea autenticada y acotada al instante), más ingesta continua firmada, reconsultas controladas, holds y **asientos compensatorios** ante refunds/disputas posteriores, sin convertir nunca un snapshot vacío en certeza global. Esta semántica **NO está aprobada aquí** y no autoriza beneficios ni revoca automáticamente períodos. Antes de activarla, resolver los dos allowlists de disputa (Edge y RPC), retención, exclusión de terceros y reversos idempotentes.

### Ruta mínima para habilitar más adelante una prueba prospectiva (SIN ejecutarla ahora)

1. **Cerrar oferta de servicio aplicable y retención:** diferenciar los términos ES/EN para una suscripción que sí conceda derechos, incluyendo inicio/fin `[activation_time, observed_next_billing_time)`, privacidad, cancelación, consentimiento durable y retención legal. No modificar retrospectivamente la versión QA inmutable.
2. **Auditar fuentes y permisos existentes:** reutilizar P06/P22 (ya instalada)/P23/P24/P25/P26/P27, conectar únicamente funciones nuevas indispensables para procedencia real; no crear una segunda tabla de pagos. Mantener RPC P42 inaccesible a service_role mientras no haya custodia de claves aprobada.
3. **Decidir captura/retención de disputas:** scope por sale, registrar solo datos mínimos e ingesta verificada, monitoreo/compensación posterior; revisión legal/comercial por PO. La modificación coordinada del receptor y RPC necesita GO de migración + GO de deploy, por separado.
4. **Preparar ensayos dirigidos en laboratorio** que reutilicen suites existentes; un primer ciclo futuro con consentimiento correcto, evento firmado y merchant GET; negativos de refund, disputa, deuda, retry, paginación omitida, owner y lease. No repetir 889 tests por ritual.
5. **Sólo tras cerrar esos gates**, solicitar permiso específico para una única prueba prospectiva Sandbox *nueva*, si continúa siendo indispensable. El GO genérico «ok go» de este gate no autoriza esa compra ni PayPal Live, altas reales, worker, SQL, entitlements, cron ni despliegue.

### Inventario alojado leído el 2026-10-16 (sin cambios)

- Public RPC: `f16_p22_resolve_bound_under_claim` **instalada**, `f16_p28_draft_ack_historical_audit` instalada, `f16_p42_register_authenticated_activation` instalada pero sin derecho de EXECUTE a `service_role`.
- No aparecen RPC P24/P25/P26 instaladas, ni tablas privadas P25/P26. La tabla de auditoría P28 sí existe.
- `p05_inbox_worker_gate.enabled=false`, `p42_activation_writer_gate.enabled=false`; ledger 0, reversos 0, P40 0, claves P42 0. Una comprobación read-only de conteos no constituye un dictamen exhaustivo de seguridad ni prueba de saldo merchant.

**Resultado de este gate:** `P44_REVIEW_REQUIRED_HISTORICAL_CORRELATION_RETAINED; PROSPECTIVE_EVIDENCE_EXECUTION_CONTRACT_DOCUMENTED; NO_HOSTED_ACTION`. La próxima intervención técnica debe centrarse en preparar la **captura atestiguada de evidencia prospectiva**, empezando por política de disputas/retención y términos de período; NO otra P44 de la suscripción QA cerrada.
