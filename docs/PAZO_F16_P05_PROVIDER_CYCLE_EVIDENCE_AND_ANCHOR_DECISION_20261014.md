# PAZO F16-P05 — Matriz verificable de capacidades PayPal y decisión de ancla

**Estado:** auditoría documental externa + laboratorio OFFLINE, **sin activación de períodos ni mutación backend**. Revisado el 2026-10-14. La única compra de prueba Sandbox original está terminada y cancelada; no repetir.

## 1. Qué afirma realmente PayPal

Se consultó documentación oficial de **PayPal Subscriptions REST v1**, no Braintree Recurring Billing:

| Fuente | Campo | Qué acredita si es una respuesta merchant auténtica | Lo que NO acredita |
|---|---|---|---|
| `GET /v1/billing/plans/{id}` | `billing_cycles[].frequency` / `pricing_scheme` | frecuencia y esquema/precio observado en esa versión | venta aplicada a un ciclo contractual específico |
| `GET /v1/billing/subscriptions/{id}` | `start_time` | inicio de la suscripción | inicio del período que pagó una venta |
| mismo endpoint | `billing_info.next_billing_time` | próximo cobro programado, si viene presente | fin de servicio pagado / `paidThrough` |
| mismo endpoint | `billing_info.cycle_executions[].cycles_completed` | contador de ejecuciones | `cycle_key`, cobro conciliado ni intervalos exactos |
| mismo endpoint | `billing_info.last_payment` / `outstanding_balance` | última venta/saldo comunicado en snapshot | historial completo, cierre de deuda, ausencia de reembolsos |
| `GET /v1/billing/subscriptions/{id}/transactions` | `id`, `time`, `status`, `amount_with_breakdown` | pago merchant, procesamiento, estado e importe dentro del rango devuelto | **inicio-fin** del servicio pagado, ni ausencia de conflictos financieros fuera de la ventana |
| `GET /v1/notifications/webhooks-events/{id}` para `PAYMENT.SALE.COMPLETED` | `resource.id`, `resource.billing_agreement_id` | correlación evento↔venta↔suscripción | ciclo pagado y su período |
| evento `BILLING.SUBSCRIPTION.ACTIVATED` original | `resource.billing_info.next_billing_time`, si disponible | fotografía histórica de siguiente fecha programada | prueba única de período ni de pago asignado |

Fuentes oficiales:
- https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/
- https://developer.paypal.com/api/subscriptions/v1/definitions/billing_cycle/
- https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/
- https://developer.paypal.com/api/subscriptions/v1
- https://developer.paypal.com/platforms/subscriptions/customize/update-plan-pricing
- https://developer.paypal.com/subscriptions/payment-failure-retry/

**Alcance negativo preciso:** en los campos revisados de estas APIs no aparece un ID de ciclo por venta o par `periodStart/periodEnd` específico de esa venta. Esto **no** demuestra que PayPal no pueda dar evidencia de facturación mediante otra API, extracto o soporte; solo significa que **no podemos derivar ni acreditar un ciclo** a partir de esas consultas.

## 2. Hallazgo en la prueba original

- Venta `COMPLETED` USD 2.99, vinculada por identificadores con evento PayPal firmado previamente en el inbox; sub posteriormente `CANCELLED`.
- Plan REGULAR MONTH/1, `cyclesCompleted=1`, `subscriptionStart=2026-10-15T02:03:31Z`.
- Webhook original de activación observó `nextBillingTime=2026-11-14T10:00:00Z`, solo **candidato de próxima facturación**, sin `cycleKey`.
- `setupFee` y balances omitidos permanecen desconocidos. La consulta transaccional no tenía totales de paginación, así que no concluir historia ni ausencia de reembolso/disputa.
- No fecha exacta de cobertura probada. Persistir `cycleVerified:false`, `paidThrough:null`; no convertir PayPal `nextBillingTime` en fin de membresía.

## 3. Control de código implementado (OFFLINE)

`p05ProviderFieldCapabilitiesLab.mjs` contiene allowlist cerrada `source+field` con capacidades concretas. Rechaza tanto campos inventados (`transactions[].cycle_key`, `billing_info.paid_through`) como cualquier uso de `next_billing_time`, `cycles_completed`, venta o ID de transacción para afirmar `cycle_interval`, `sale_cycle_allocation` o `paid_through`.

Las salidas `SOURCE_CAPABILITY_REVIEWED` y `REVIEW_REQUIRED` **siempre** niegan creación de período, grants y cambios de billing; también omiten IDs y timestamps sensibles. Esto no verifica el proveedor, no recibe secretos, no es servicio en ejecución y NO sustituye `p05ProspectiveEvidenceContractLab.mjs`.

Pruebas sintéticas en `src/features/supporter/testing/f16P05ProviderFieldCapabilitiesLab.test.mjs`: sobreafirmaciones, fuentes desconocidas, PII, duplicados, contraejemplos y combinaciones adversariales; ejecución CI es evidencia de ese commit exclusivamente.

## 4. Alternativas de producto para atribución futura

**A. Período declarado por PayPal:** solo viable si identificamos una fuente auténtica e inequívoca de venta→ciclo→límites; **NO disponible en los campos comprobados**. No programar usando nombres inventados.

**B. Período de servicio definido contractualmente por PAZO (recomendación técnica para evaluar):** PAZO podría comunicar y conservar un contrato de cobertura propio por ciclos mensuales, ancla y zona horaria aprobadas, con snapshots versionados y relación de venta a obligación mediante reconciliación merchant independiente; PayPal administra cobros, PAZO administra servicio. Debe decidirse **antes de nuevas suscripciones**, aceptar la política de cancelación y gestionar reintentos, deuda, versiones, DST, 28/29/30/31 y cambios de plan. *Un calendario auto-declarado por PAZO no prueba por sí solo la venta que lo liquidó.* Riesgo de desalineación con fechas reales de cobro, requiere soporte y reconciliación.

**C. Revisión manual (fallback obligatorio):** si los datos no permiten comprobar que la venta liquidó un ciclo, conservar sin crédito en cola privada, solicitar evidencia o resolver contrato nuevo. No inventar fechas ni hacer un segundo cargo para cubrir el faltante.

### Decisiones que requieren Product Owner antes de implementación operativa

- ¿Los beneficios PAZO dependen de los ciclos comerciales de PayPal o de un contrato propio de servicio mensual declarado al usuario?
- Si contrato propio: ¿cuál es el ancla horaria/zona, cómo funcionan fechas 29–31, DST, pagos recuperados, cancelación, suspensiones, cambio de tarifa y reactivaciones?
- ¿Qué ventanas de reconciliación y documentación financiera se exigirán ante reembolsos y disputas? ¿Qué datos se retienen, durante cuánto tiempo y cómo interactúan con eliminación de cuenta?

**NO PROPONER UNA MIGRACIÓN HOSTED hasta cerrar reglas de negocio, retención/privacidad y source attestation operativa.** P05-L aprobó deuda imputada al ciclo original solo con prueba; P06-A–E aprobó reglas de cancelaciones/refunds como política, pero no habilitó ni ledger ni benefits.

## 5. Próximo gate

Hacer **propuesta explícita de política de servicio** con alternativas y matriz de riesgos para decisión del PO. Con aprobación, construir en otra rama o dentro de F16 un evaluador offline de intervalos contractuales y atribución idempotente, mantener denegación hasta señales merchant reales y gates de backend/retención. No repetir prueba PayPal Sandbox, ni mutar Supabase/worker, ni habilitar PayPal Live, checkout o merge.
