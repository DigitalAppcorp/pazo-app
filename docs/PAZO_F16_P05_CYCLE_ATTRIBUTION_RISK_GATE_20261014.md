# PAZO F16-P05 — Riesgos de atribución de ciclo, retries y saldo recuperado

**Fecha:** 14 de octubre de 2026. **Estado:** ingeniería offline, NO decisión de cobertura P05, NO creación de migración oficial ni cambios alojados. PR #44 DRAFT.

> **Actualización de aprobación comercial (14-oct-2026, posterior al texto histórico):** el PO **APROBÓ P05-L**: pagos atrasados/recuperados asignados al ciclo **original** que originó deuda solamente con prueba merchant/contractual independiente; nunca añaden automáticamente otro mes, y sin prueba quedan en revisión sin beneficios. El calendario de cobertura requiere límites contractuales verificados, no `payment +30 días`. **No se aprobó íntegramente la implementación P05**: sigue pendiente `cycle_key` efectivo, ancla de fechas/huso, evidencia E2E Auth BOUND y cualquier activación hosted. Fuente canónica: `docs/PAZO_F16_P05_LATE_PAYMENT_POLICY_APPROVED_20261014.md`. Cualquier marca antigua de «P05/política de pagos atrasados no aprobada» en este archivo es una fotografía anterior y queda sustituida **solo en esta dimensión comercial**.

## Hallazgo auditado

La guía oficial PayPal sobre reintentos, actualizada **14-sep-2026**, documenta que, después de fallar, PayPal puede reintentar cada cinco días, **hasta dos veces en un ciclo**, y si no logra cobrar, suma el monto pendiente al siguiente ciclo. Configuraciones de `auto_bill_outstanding` pueden cobrar saldos acumulados; después de ciertos fallos una suscripción se suspende. Una transacción posterior (aunque su importe sea USD 2.99) puede liquidar saldo histórico en vez de abrir un nuevo mes de servicio.

`billing_info.failed_payments_count` es estado reciente y puede reiniciarse después de un pago exitoso; `last_failed_payment`, `next_payment_retry_time`, `cycle_executions`, `outstanding_balance`, `last_payment` y `next_billing_time` son señales operativas, **no una prueba de correspondencia invoice/venta/ciclo** ni un historial garantizado completo. Ausencia de saldo en una fotografía tampoco demuestra ausencia de pagos recuperados.

Fuentes verificables:
- [PayPal — Payment failures and recovering balances (14-sep-2026)](https://developer.paypal.com/subscriptions/payment-failure-retry/).
- [PayPal — Subscription definitions](https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/).
- [PayPal — Subscription API / List transactions](https://developer.paypal.com/api/subscriptions/v1).
- [PayPal — Billing cycle definitions](https://developer.paypal.com/api/subscriptions/v1/definitions/billing_cycle/).

## Implementación técnica fuera de producción

Nuevo **clasificador puro no ejecutable** `supabase/functions/f16-paypal-webhook/p05CycleAttributionRisksLab.mjs`. Recibe la auditoría previa `assessF16P05BillingFacts` (merchant + Auth BOUND + venta original de 299 centavos verificada) y una fotografía de facturación/tramo de transacciones **server-only**. No hace lecturas PayPal, consultas DB, cobros, grants ni llamadas externas.

Reporta, con metadatos agregados sin ID/PII:
- `outstandingBalanceMinor`: centavos USD exactos, **`null` si desconocido**; no equiparar ausencia a saldo cero.
- `failedPaymentsCount`: contador actual o `null`; 0 **no** certifica que jamás hubiera un fallo.
- `paymentRetryScheduled`, `autoBillOutstanding`, `billingExecutionsObserved`: señales opcionales/triestado.
- `paymentWindowComplete:false` siempre: un GET histórico acotado no es prueba de una secuencia contable completa.
- `multipleCycleSettlementPossible`: bandera de incertidumbre conservadora; no asigna ni un mes.

**Invariante de seguridad en TODAS las salidas:** `needsCycleAttribution:true`, `cycleVerified:false`, `mayCreatePaidPeriod:false`, `mayGrantBenefits:false`, `mayCountCommemorativeMonth:false`, `mayChangeBilling:false`, `entitlement:false`, `paidThrough:null`, `periodStart:null`, `periodEnd:null`. Incluso con 0 deuda/0 fallos y una sola venta, no se confunde historial incompleto con ausencia de riesgos.

Pruebas `src/features/supporter/testing/f16P05CycleAttributionRisksLab.test.mjs`: reintentos, deuda, `CANCELLED`, datos ausentes, precio igual con dos ventas, evidencias manipuladas, formato/moneda inválida y matriz de **72 combinaciones** de deuda/contador/rebill/cancelación. Incluidas automáticamente en `npm run test:f16:synthetic`. No se requieren credenciales ni se ejecuta PayPal.

## P05 — Opciones de política a resolver por Product Owner

| Caso | Opción segura propuesta (NO aprobada) | Por qué permanece pendiente |
|---|---|---|
| Cobro normal con relación inequívoca a ciclo | Registrar `subscription_id + cycle_key + [start,end)` con prueba merchant/contrato, idempotente por `external_payment_id` y `cycle_key` | PayPal no ofrece necesariamente un campo individual que vincule cualquier venta a ese ciclo |
| Cobro recuperado de un periodo anterior | Asociarlo al **periodo histórico que originó la deuda**, sin inventar un nuevo mes ni extensión retroactiva | Decidir si beneficio pasado puede restituirse, cómo comunicar pago atrasado y qué evidencia lo confirma |
| Saldo combinado de 2 o más periodos | Mantener sin crédito automático hasta reconstruir qué parte corresponde a cada ciclo | El importe total podría exceder USD 2.99; el contrato actual de venta solo admite importe 299 |
| Dos ventas del mismo ciclo | Detectar cobro duplicado o recuperación independiente antes de asociar beneficios | No contar dos insignias/meses por duplicados |
| Cancelación después de pagar | Preservar solo el período efectivamente atribuido, conforme a P06 aprobada | P05 necesita demostrar inicio/fin exactos y ausencia de reversión del ciclo |
| Disputa / refund parcial o total | Aplicar P06 exclusivamente al ciclo identificado con evidencia; no afectar otros ciclos | Resolver identidad del ciclo y evidencia completa de reembolsos/chargebacks |
| Meses cortos, 29/30/31 días y ajustes de aniversario | Usar un calendario contractual explícito + zona horaria de proveedor, **nunca sumar 30 días a timestamp de pago** | Reglas de ancla mensual, día 29/30/31 y pausas requieren aprobación |

La recomendación técnica es **no acreditar un mes ni un badge a partir de una transacción aislada**. Definir en un próximo gate cuál es el documento/autorización que prueba cada `cycle_key` y cómo mapear pagos tardíos. Un test Sandbox auténtico nuevo con cuenta PAZO Auth BOUND requiere **GO específico adicional**; NO reutilizar los cuatro webhooks antiguos sin owner.

**No permitido por el avance de hoy:** retención financiera P01–P04/P09, creación/aplicación de migración oficial, worker/Edge/cron, pagos nuevos, entitlements, insignias, checkout, PayPal Live, merge ni Vercel. Solo los webhooks reconciliados y sin hold podrán cumplir la retención inbox ya acordada de 90 días. PR #44 DRAFT y beta NO-GO.
