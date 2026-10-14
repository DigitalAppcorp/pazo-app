# PAZO F16-P05 — Evidencia de periodos de facturación, sin conceder cobertura

**Fecha:** 14 de octubre de 2026. **Estado:** evaluación técnica LAB de solo lectura; política y periodos P05 **NO APROBADOS**, sin cambios en PayPal/Supabase alojado. PR #44 DRAFT.

## Resultado de auditoría de documentación PayPal

La API oficial de suscripciones expone GET plan `/v1/billing/plans/{id}`, GET subscription `/v1/billing/subscriptions/{id}`, y GET transaction history `/v1/billing/subscriptions/{id}/transactions`. El plan contiene `billing_cycles[].frequency.interval_unit` e `interval_count`, `tenure_type` y `pricing_scheme.fixed_price`. La suscripción puede aportar `start_time`, `billing_info.last_payment.time`, `billing_info.next_billing_time`, deuda pendiente y reintentos; las transacciones contienen pago, importe, estado y marca de tiempo. **Ninguno de estos valores aislados prueba qué ciclo fue liquidado por una venta histórica concreta.**

Casos que impiden deducir `paid_through` automáticamente:
- Una suscripción `CANCELLED` puede no tener `next_billing_time`; no significa reembolso del periodo previo ni fecha final explícita de servicio.
- Reintentos y saldo pendiente: un pago atrasado puede ocurrir después de la fecha original de facturación o liquidar deuda acumulada; `sale.completedAt + 30 días` y `next_billing_time` no prueban el ciclo al que se aplicó.
- PLAN mensual define *frecuencia comercial*, no que cada operación individual de importe USD 2.99 corresponda al siguiente mes, ni que un pago en octubre termine 30 días después. Los meses calendario tienen duración variable; trial, setup fee, cambios de plan/precio, pausa/reanudación y cobros fuera de orden requieren verificación separada.
- El campo `last_payment` es una fotografía del pago más reciente, no un vínculo permanente a cada venta del historial. Una búsqueda temporal parcial no representa automáticamente todo el historial de reembolsos/chargebacks.

Fuentes oficiales revisadas:
- [PayPal Subscriptions v1 API](https://developer.paypal.com/api/subscriptions/v1)
- [PayPal Show Subscription Details](https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/)
- [PayPal Billing Cycle definitions](https://developer.paypal.com/api/subscriptions/v1/definitions/billing_cycle/)
- [PayPal Payment failures and recovering balances (sep-2026)](https://developer.paypal.com/subscriptions/payment-failure-retry/)
- [PayPal Customize subscriptions](https://developer.paypal.com/subscriptions/customize)

## Contrato de verificación LAB implementado

`supabase/functions/f16-paypal-webhook/p05BillingEvidenceLab.mjs` es **puro, server-only, no ejecutor y no desplegado**. Evalúa un conjunto de hechos que, únicamente desde lectores merchant privados y Auth:
- Confirma Sandbox y procedencia merchant de plan, suscripción, transacciones y prueba original de venta.
- Compara la intención privada realmente BOUND con `subscription.id`, `custom_id` y `plan_id`, y exige Auth owner previamente verificado por un servicio independiente.
- Exige plan conocido con único ciclo REGULAR mensual USD 2.99 y sin setup fee no contabilizado; no confunde trial/plan anual o plan de importe cambiado con contrato ya corroborado.
- Confirma un único ID de venta en el tramo de transacciones consultado, estado `COMPLETED`, USD 2.99, fecha e importe concordantes con lectura de venta original independiente.
- Valida fechas ISO UTC de snapshot y rechaza inconsistencias evidentes. Registra **solo señales booleanas sanitizadas**, sin UID, payer/email, cuerpo original, ID de pago o token.
- El resultado **SIEMPRE** mantiene `coverageReady:false`, `entitlement:false`, `periodStart:null`, `periodEnd:null`, `paidThrough:null`, `commemorativeMonths:null` y `needsCycleAttribution:true`. Incluso los pagos perfectamente conciliados son solo **evidencia financiera**, no autorización para beneficios.

Pruebas `src/features/supporter/testing/f16P05BillingEvidenceLab.test.mjs`: pago correcto sin intervalo, cancelación sin próxima fecha, deuda pendiente/cobro atrasado, varios pagos, venta duplicada, estado de pago no completado, propietario/merchant falso, trial/plan anual, otros importes/cargos, fecha imposible, falta de datos y rechazo de PII. Corre en `test:f16:synthetic` sin acceso al proveedor ni credenciales.

## Decisión P05 aún necesaria — no inferir

La opción conservadora recomendada es definir **un identificador de ciclo único y comienzo/fin sustentados por reglas contractuales explícitas + evidencia del proveedor**. Eso requiere resolver cómo se asignan ventas a ciclos, pagos tardíos, meses de diferente duración, suspensión, trial, saldos de recuperación y duplicados; definir cómo se prueba exhaustivamente la ausencia de refund/disputa para ese ciclo. No crear una tabla `paid_periods` alojada ni contabilizar insignias hasta tener esos criterios aprobados y probados con nuevo Sandbox Auth realmente BOUND.

La aprobación anterior P06 sobre cancelación/reembolsos **no autoriza P05**. P06 solo aplica consecuencias a un ciclo cuando P05 haya identificado de forma fiable **cuál** es el ciclo.

## Estado, permisos y próximos gates

Última lectura Supabase alojado: inbox PayPal firmado 4, todos `pending`, intenciones privadas 0, pagos 0, reversos 0, consentimientos de muro 0, RPC LAB nuevas no instaladas. Los cuatro eventos proceden de una compra Sandbox personal sin correlación Auth PAZO, no pueden reutilizarse para acreditar.

**Siguiente gate:** concretar decisión PO P05 de modelo de ciclos, especialmente pagos atrasados/recuperados y cancelación; y autorizar por separado, si procede, nueva verificación PayPal Sandbox con Auth BOUND. Retención de registros P01–P04/P09 aún pendiente; solo inbox definitivamente conciliado con autorización puede purgarse a los 90 días. Ninguna migración hosted, Edge, worker/cron, nuevo pago, entitlements, Live, merge o Vercel queda aprobada por avanzar offline.

**F16 EN CURSO — beta pública NO-GO — PR #44 DRAFT.**
