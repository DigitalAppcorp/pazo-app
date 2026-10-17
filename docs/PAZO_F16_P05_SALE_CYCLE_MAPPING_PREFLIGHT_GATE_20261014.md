# PAZO F16-P05 — Comprobación de duplicados y conflictos venta↔ciclo (solo laboratorio)

**Fecha:** 14 de octubre de 2026. **Estado:** ensayo offline de integridad para P05; NO constituye aprobación comercial de `cycle_key`, política de recuperación, fechas de servicio o despliegue en Supabase. PR #44 DRAFT.

> **Actualización de aprobación comercial (14-oct-2026, posterior al texto histórico):** el PO **APROBÓ P05-L**: pagos atrasados/recuperados asignados al ciclo **original** que originó deuda solamente con prueba merchant/contractual independiente; nunca añaden automáticamente otro mes, y sin prueba quedan en revisión sin beneficios. El calendario de cobertura requiere límites contractuales verificados, no `payment +30 días`. **No se aprobó íntegramente la implementación P05**: sigue pendiente `cycle_key` efectivo, ancla de fechas/huso, evidencia E2E Auth BOUND y cualquier activación hosted. Fuente canónica: `docs/PAZO_F16_P05_LATE_PAYMENT_POLICY_APPROVED_20261014.md`. Cualquier marca antigua de «P05/política de pagos atrasados no aprobada» en este archivo es una fotografía anterior y queda sustituida **solo en esta dimensión comercial**.

## Por qué hace falta este control

PayPal permite planes de facturación mensual, reintenta pagos fallidos y puede trasladar saldos impagos al ciclo posterior. La vista actual de `next_billing_time`, `last_payment`, `outstanding_balance` y `failed_payments_count` no demuestra cuál factura/ciclo original recibió una venta concreta. La documentación PayPal señala que el contador de fallos se reinicia tras cobrar correctamente y que un saldo de pago fallido puede agregarse al siguiente ciclo.

Es **inseguro** convertir una lista de dos cobros de USD 2.99 en dos meses acreditados sin probar su destino contable. También es inseguro relacionar automáticamente un cobro recuperado con el ciclo del día del pago o extender cobertura sumando 30 días al timestamp.

**Referencias oficiales:** [PayPal: payment failures/recovering balances](https://developer.paypal.com/subscriptions/payment-failure-retry/), [PayPal Subscriptions v1](https://developer.paypal.com/api/subscriptions/v1), [PayPal billing cycle](https://developer.paypal.com/api/subscriptions/v1/definitions/billing_cycle/).

## Implementación OFFLINE, sin SQL oficial ni mutaciones

`supabase/functions/f16-paypal-webhook/p05CycleMappingPreflightLab.mjs` recibe **proyecciones privadas** de dos validaciones anteriores: la verificación merchant/owner/venta del analizador P05 y la clasificación conservadora de retries/saldos. Comprueba una propuesta de correspondencia `sale_id → cycle_key` con fechas independientes de inicio/fin y señal del origen, sin inferir nada de timestamps de venta.

Rechaza explícitamente:
- Venta utilizada en más de un ciclo; dos ventas asignadas al mismo `cycle_key`; venta duplicada en el historial; venta ausente o no completada.
- Un pago de 598 centavos reclamado como una única mensualidad de 299 (podría contener saldo de más de un ciclo; no se divide por intuición).
- Intervalos propuestos inválidos, solapados o anidados, incluidos cruces de fecha y el problema de un intervalo largo que contiene otros más cortos.
- `originProof` ausente o meramente contractual sin corroboración merchant; registros adicionales del historial no mapeados; reintentos, captura de deuda y clase desconocida.
- Entrada contaminada con identidad personal, fechas imposibles, excesos de resultados o afirmaciones privadas incompletas.

Los pares de períodos contiguos [inicio, fin) pueden superar **solo la revisión sintáctica**, no la atribución real. Aunque `originProof` diga `provider_cycle_reference`, **el algoritmo no certifica que PayPal suministró tal referencia**: sigue siendo un dato sujeto a comprobación independiente desde adaptadores service-only y política P05 aprobada. El analizador jamás genera acreditación, fecha `paidThrough` ni badge.

**Invariantes de salida:** `needsManualReview:true`, `cycleAttributionConfirmed:false`, `mayCreatePaidPeriod:false`, `mayGrantBenefits:false`, `mayCountCommemorativeMonth:false`, `mayRevokeBenefits:false`, `mayChangeBilling:false`, `entitlement:false`, `periodStart:null`, `periodEnd:null`, `paidThrough:null`. Las respuestas solo incluyen categoría del bloqueo y conteos, sin IDs de pago, UID, emails, PII o fechas.

Pruebas automáticas `src/features/supporter/testing/f16P05CycleMappingPreflightLab.test.mjs`: ciclos distintos y contiguos aún sin habilitación; sale duplicada, dos ventas por ciclo, un pago para dos ciclos, cobro recuperado, fechas 28/29/30/31, overlap/anidamiento, venta reembolsada, dueño sin prueba, IDs contaminados y **120 combinaciones**. Incluidas en `npm run test:f16:synthetic` mediante patrón del repositorio. No se hacen requests a PayPal ni SQL alojado.

## Gate específico aún pendiente con el PO

**Propuesta (NO APROBADA):** asignar cada venta a un identificador privado de ciclo **únicamente** con evidencia merchant + reglas contractuales que determinen ese periodo; los pagos atrasados se imputarían al ciclo histórico que originó la deuda, sin generar mes adicional, solo cuando exista prueba suficiente. Las ventas sin atribución fiable quedarían en revisión; tampoco se restituirían beneficios retroactivamente sin política explícita.

Faltan: prueba E2E con nueva suscripción Sandbox vinculada a PAZO Auth, validación de soporte real para referencias de factura/ciclo en PayPal, comportamiento de suspensiones/atrasos, ancla del calendario mensual y manejo de saldo acumulado/meses 29/30/31. Cada ensayo PayPal real exige GO separado; crear/aplicar migración hosted/Edge/cron/worker, PayPal Live, checkout, entitlement, merge y Vercel también requieren sus permisos respectivos. La retención de ledger/intents/refunds/bajas sigue pendiente; solo inbox reconciliado tiene regla previa de 90 días.

**Estado:** P06-A–E ya aprobada comercialmente; P05 sigue SIN decidir, F16 EN CURSO, PR #44 DRAFT, beta pública NO-GO.
