# PAZO F16-P05 — Cobertura de ventanas PayPal, sin interpretar ausencia como inexistencia

**Fecha:** 2026-10-14. **Estado:** implementación OFFLINE de revisión sintética de historia de transacciones. **NO** resolución de política P05, evidencia E2E del proveedor, migración alojada, acceso a beneficios ni autorización de PayPal Live. PR #44 DRAFT.

## Hallazgo y alcance

El endpoint oficial `GET /v1/billing/subscriptions/{id}/transactions` **requiere** `start_time` y `end_time` y expone `transactions`, `total_items` y `total_pages`. Devuelve **pagos** visibles en el intervalo solicitado, no prueba por sí solo que conozcamos el ciclo contable de cada pago, que tengamos todo el historial anterior ni que no haya refunds/disputas pendientes fuera del intervalo. El servicio actual `paypalSandboxTransactions.mjs` limita a **31 días por consulta como guardia de seguridad local**, rechaza páginas múltiples/metadatos incompletos y elimina nombre/email del pagador de sus resultados. No afirmar que PayPal garantiza el historial total de toda una suscripción por ese número de días.

Fuentes oficiales: [PayPal Subscriptions API — List transactions](https://developer.paypal.com/api/subscriptions/v1) y [PayPal Transaction Details](https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/). La API oficial no autoriza tomar `total_items=0` en una búsqueda limitada como certificado global de cero reembolsos/chargebacks. El endpoint de refunds/disputes requiere evidencias independientes.

## Auditoría OFFLINE implementada

`supabase/functions/f16-paypal-webhook/p05TransactionWindowCoverageLab.mjs` acepta únicamente un paquete sintético/server-owned de **1 a 24 ventanas** con ID de suscripción y rango solicitado, identificadores de transacción, UTC y metadatos de página. Es puro: sin red, OAuth, SQL, cuentas, billing, UI, PII o entitlements.

- Valida ID de suscripción y fechas UTC canónicas; cada ventana de tamaño mayor a 31 días queda bloqueada por la regla actual local, y no se inventan intervalos no consultados.
- Exige misma suscripción y éxito/merchant scope de todas las respuestas; requiere `total_pages` y `total_items` coherentes con el número de transacciones. Cuando PayPal indique páginas adicionales, rechaza toda la evaluación sin simular pagination.
- Comprueba que las ventanas declaradas cubran exactamente el rango solicitado **sin huecos**, rechaza solapamientos sin deduplicación auditada, IDs repetidos entre ventanas y transacciones fechadas fuera del rango.
- Limita volumen de entradas y no devuelve IDs/timestamps, email o payload proveedor; salida solo con razón y contadores.
- Aun para un tramo completo de transacciones del proveedor, conserva `globalFinancialCoverage:false`, `canConcludeNoRefunds:false`, `canConcludeNoDisputes:false`, `mayAssignBillingCycle:false`, `mayGrantBenefits:false`, `mayCountPaidMonth:false`, `entitlement:false`, `paidThrough:null`.
- `requestedWindowCovered:true` **solo** informa cobertura técnica del tramo solicitado, no cobertura del ciclo ni del historial de toda la vida. No se conecta aún al read-only reconciler ni a worker alojado.

Pruebas `src/features/supporter/testing/f16P05TransactionWindowCoverageLab.test.mjs`: intervalos contiguos de 31+30 días, huecos, solapes, duplicate IDs, páginas incompletas, rango sin datos, respuesta de otra suscripción, fechas/IDs inválidos, entradas excesivas y **48 combinaciones** adversariales de metadatos, scope y HTTP. Incluidas automáticamente mediante el patrón `src/features/supporter/testing/*.test.mjs` en la CI general.

## Bloqueos pendientes para P05 y beta

**No aprobada P05.** Hacen falta evidencia de inicio/fin contractual de cada ciclo, atribución de pagos tardíos y conciliación multireembolso/disputas independientes antes de acreditar un mes y antes de contar insignias conmemorativas. La implementación de P06 ya fue aprobada comercialmente, pero **no** puede resolver P05 ni habilitar pagos por sí sola.

El siguiente gate de decisión del Product Owner puede adoptar **provisionalmente como principio** que la ausencia de transacción/refund en un intervalo incompleto nunca permita activar o prolongar cobertura; asignar pago atrasado al ciclo histórico solo con evidencia verificable. Eso no determina automáticamente un `cycle_key` ni una fecha. Para comprobar el API real con nueva suscripción Sandbox PAZO Auth BOUND se requiere autorización separada y específica. Tampoco están autorizados cambios hosted, migraciones, Edge/worker/cron, checkout, Live, beneficios, merge o Vercel. Retención financiera P01–P04/P09 continúa pendiente; 90 días se aplica solo a inbox ya conciliado y liberado de hold.

**F16 EN CURSO, PR #44 DRAFT, beta pública NO-GO.**
