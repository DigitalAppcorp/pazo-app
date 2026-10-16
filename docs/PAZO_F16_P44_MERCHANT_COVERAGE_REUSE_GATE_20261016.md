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
