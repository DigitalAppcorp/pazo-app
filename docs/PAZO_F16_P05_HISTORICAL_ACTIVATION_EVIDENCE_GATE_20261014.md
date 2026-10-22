# PAZO F16-P05 — Evidencia del webhook de activación para calendario mensual

**Fecha de revisión:** 2026-10-14 (UTC de transacción 2026-10-15). **Gate:** lectura histórica de solo lectura; sin acreditación. **Rama:** `f13/section-titles-20261012`, PR #44 DRAFT.

## Evidencia real ya corroborada

- Único intent privado `BOUND` con Auth QA y suscripción PayPal Sandbox original; buyer aprobado, estado posterior `CANCELLED`.
- Venta de USD 2.99 virtuales `COMPLETED` el 2026-10-15T03:20:33Z.
- Comparador local con evento original recuperado de PayPal devolvió `MATCH` exacto para IDs venta, suscripción y webhook, pero **el operador suministró el event ID desde el inbox por SQL**; esa comparación no reconstruye por sí misma la firma web original.
- Snapshot posterior de la suscripción: `start_time=2026-10-15T02:03:31Z`, un ciclo `REGULAR` completado, plan `MONTH/1` USD 2.99, `plan_overridden=false`, cantidad 1, última venta USD 2.99, `next_billing_time` ausente, `setup_fee` ausente, saldo no informado, cero fallos consecutivos.
- Ningún `paidThrough`, `periodStart`, `periodEnd` ni `cycle_key` certificado. `paginationMetadataComplete=false` en consulta de transacciones; la ventana limitada no prueba cobertura histórica global ni ausencia de reembolsos/disputas.

## Fuente PayPal y límites semánticos

Documentación de Subscriptions v1:
- https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/
- https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/
- https://developer.paypal.com/subscriptions/webhooks/
- https://developer.paypal.com/api/webhooks/v1/webhooks-events-get/

`cycle_executions.cycles_completed` = contador de ciclos ejecutados, **no** identificador contractual de ciclo de la venta. `transaction.time` = hora de procesamiento, no inicio/fin de cobertura. `next_billing_time` = próxima fecha de facturación y es opcional; en la suscripción ya cancelada no se informó. El GET del evento histórico `BILLING.SUBSCRIPTION.ACTIVATED` puede aportar una fotografía de `resource.billing_info.next_billing_time` anterior a la cancelación, pero su disponibilidad y estabilidad **todavía no se han observado en este caso**.

No debemos usar datos de **Braintree Recurring Billing** como si fueran los campos de la API de **PayPal Subscriptions v1**: son sistemas distintos; el `paidThroughDate` de Braintree no aparece como garantía en esta API.

## Implementación acotada (no operativa, sin mutaciones)

1. `f16P05HistoricalActivationEvidence.mjs`: analizador puro que exige mismo evento de activación y suscripción/plan/intención cuando estén presentes, no muestra IDs ni PII, y clasifica una fecha futura reportada en el recurso histórico únicamente como `HISTORICAL_SCHEDULE_CANDIDATE`. Si está ausente, mal fechada o contradictoria: `INCONCLUSIVE` / `MISMATCH`.
2. `scripts/f16-sandbox-activation-schedule-readonly.mjs`: operador local lee una sola vez un ID de evento de activación previamente firmado (SELECT del inbox), OAuth Sandbox para autenticación y un GET fijo del evento desde PayPal. **Sin GET de datos del pagador ni escritura**. No vuelve a aprobar ni cancelar.
3. `src/features/supporter/testing/f16P05HistoricalActivationEvidence.test.mjs`: pruebas sintéticas de fecha histórica disponible/ausente, IDs diferentes, no-Bound, PII y no-grants.

Todos los caminos conservan `cycleVerified:false`, `periodStart:null`, `periodEnd:null`, `paidThrough:null`, `mayCreatePaidPeriod:false`, `mayRecordPayment:false`, `mayGrantBenefits:false`.

**Una fecha futura históricamente observada no cierra automáticamente P05.** Necesitamos prueba de que esa fecha es fin del ciclo específico pagado, de que esa venta liquidó ese ciclo (no deuda/recobro de otro), ausencia de incidencias financieras pertinentes y política comercial aprobada del período.

## Próximo paso único

Product Owner, checkout local limpio y credenciales Sandbox preexistentes: primero `node --test src/features/supporter/testing/f16P05HistoricalActivationEvidence.test.mjs`; luego, si PASS, introducir **localmente** `provider_event_id` del último `BILLING.SUBSCRIPTION.ACTIVATED` procedente del inbox firmado mediante SQL READ ONLY y ejecutar `node scripts/f16-sandbox-activation-schedule-readonly.mjs`. No pegar ID ni token en chat. Informar JSON saneado. Si falta evidencia, cerrar investigación con `INCONCLUSIVE` sin atribución y decidir prospectivamente captura del calendario merchant en momento de activación para futuros pagos. La recuperación del recurso antiguo no justifica otra compra.

**Prohibiciones intactas:** ninguna migración, worker, ledger, cron, webhook replay, extensión automática, beneficios, Live, nuevo checkout, cancelación, merge o Vercel. F16 EN CURSO, beta pagos NO-GO.
