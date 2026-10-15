# PAZO F16-P05 — Contrato prospectivo de evidencia de ciclos (laboratorio offline)

**Estado:** DISEÑADO / NO DESPLEGADO. Product Owner autorizó continuar el diseño y pruebas offline tras el resultado real `HISTORICAL_SCHEDULE_CANDIDATE`. **No existe autorización para almacenamiento hosted, migraciones, procesamiento de pagos, período pagado ni beneficios.** PR #44 DRAFT y F16 EN CURSO.

## Problema demostrado por el Sandbox vinculado

La venta PayPal Sandbox de USD 2.99, el evento de venta firmado y la suscripción Auth BOUND coincidieron (MATCH). El contrato de facturación mensual tenía `plan_overridden:false`, cantidad 1, ciclo REGULAR completado y último pago USD 2.99. El evento histórico `BILLING.SUBSCRIPTION.ACTIVATED` devolvió `next_billing_time:2026-11-14T10:00:00Z`, pero la fecha no certificó un `cycle_key` ni el intervalo de servicio de esa venta. `setup_fee` y saldos omitidos son desconocidos; la respuesta de transacciones omitió totales de paginación. La atribución real sigue BLOQUEADA.

## Contrato propuesto, nunca prueba por sí mismo

**Archivo:** `supabase/functions/f16-paypal-webhook/p05ProspectiveEvidenceContractLab.mjs` (función pura `auditF16P05ProspectiveEvidence`).

La entrada al evaluador se debe formar exclusivamente desde adapters privados/servicio y nunca de UI, localStorage o afirmaciones del navegador. Cada esquema declara una versión y lista cerrada de campos: valores extra, nombres de cliente o tokens son rechazados.

### 1. `contract` — foto de las condiciones iniciales

Incluye `schemaVersion`, `environment`, `subscriptionId`, `intentId`, `planId`, `source`, `capturedAt`, `billingStartTime`, `billingFrequency`, `currency`, `monthlyPriceMinor`, `quantity`, `planOverridden`, `setupFeeMinor`.

- Origen declarado `MERCHANT_PLAN_AND_SUBSCRIPTION_GET`. En una futura implementación, habrá que probar con GET autenticado que coincide con la intención BOUND verificada para el usuario Auth, conservando identidad humana **solo** donde es imprescindible, no en logs.
- `setupFeeMinor:null` implica **no verificado**, jamás USD 0. No se aceptan overrides ni importes/cantidades ajenos al plan aprobado. Cambios de condiciones requerirán versiones y reconciliación, no sobrescritura silenciosa.
- El evento `capturedAt` es la hora de la consulta, no el inicio del ciclo.

### 2. `activation` — fotografía tras la activación

Incluye IDs ligados a contrato, `source:SIGNED_ACTIVATION_EVENT_AND_MERCHANT_GET`, `eventId`, `eventType`, `capturedAt`, `eventCreatedAt`, `nextBillingTime:null|UTC`.

- El evento debe corresponder a `BILLING.SUBSCRIPTION.ACTIVATED`; en producción, su firma debe corroborarse desde el inbox; el código **no verifica criptográficamente** que la etiqueta `source` sea verdadera.
- `nextBillingTime` es **próximo intento programado de facturación** observado, nunca `periodEnd`. Ausente queda `null`; tampoco puede usarse para sintetizar `cycleKey`.

### 3. `sales` y `proposedCycles` — ventas vs períodos sugeridos

- Cada `sale` guarda exclusivamente referencias opacas PayPal, fecha de procesamiento, USD, monto en centavos y estado. Su origen declarado exige merchant GET + evento firmado, pero la función offline no autentica esas llamadas.
- Cada ciclo propuesto requiere `saleId`, `cycleKey`, `start`, `end`, `allocationKind` (`regular`, `retry`, `outstanding_capture`, `unknown`) y `originProof`. La etiqueta `provider_cycle_reference` **no sustituye prueba independiente del proveedor**.
- Duplicados de venta, un mismo ciclo reclamado más de una vez, reutilización de venta, períodos superpuestos, venta ausente, cobros de importe distinto y cobros pendientes/reembolsados se detienen sin crédito.
- Cobros atrasados siguen **P05-L aprobada**: se refieren al ciclo histórico original solo con evidencia adicional; este laboratorio los deja en revisión. Nunca asignar ciclo por fecha de venta +30 días. Fechas 28/29/30/31 y cambios de horario se prueban como datos de entrada, sin fabricar anclas.

### 4. `financialReview` — conciliación separada de reversals

`refunds`, `disputes`, `transactionsWindowComplete`, `historicalCoverageAttested`. Cualquier estado `unknown`, incidencia abierta o historial incompleto obliga revisión. Incluso si se declaran completos, **no son atestaciones** si no llegan por consultas autenticadas con cobertura suficiente.

## Salida e invariantes

El resultado solo incluye estados y conteos saneados; **nunca** IDs internos, email, owner, tokens, fechas exactas ni payloads del pagador.

La salida más favorable del laboratorio es `phase:CANDIDATE_ONLY`, `reason:self_reported_evidence_chain_consistent_not_provider_attested`, con `sourceValidationRequired:true`. **No existe camino a `cycleVerified:true`, `periodStart`, `periodEnd`, `paidThrough`, `mayGrantBenefits`, `mayCreatePaidPeriod` ni `mayRecordPayment`.** No usa red, SQL, filesystem ni secretos.

Test: `node --test src/features/supporter/testing/f16P05ProspectiveEvidenceContractLab.test.mjs`; escenarios de integridad, PII, calendarios de 28/29/30/31 y año bisiesto, plus matriz adversarial de 120 casos.

## Política de datos propuesta (sin recolección activada)

- **Clasificación:** privado sensible de pago, no datos sociales. Solo en el backend autorizado con RLS forzada y superficie SQL mínima cuando exista una migración aprobada.
- **Datos mínimos:** IDs opacos de contrato/venta/eventos, vínculo Auth interno verificado, plan+versión de términos, fechas merchant observadas y proveniencia de verificación, referencias de ciclo y evidencias de reversals/disputas necesarias. No conservar JSON bruto de PayPal, nombres, email de pagador, dirección, tarjetas, JWT o secretos.
- **Inmutabilidad:** capturas append-only/versionadas, idempotencia y unique constraints en claves de venta/ciclo; corregir agregando evidencia nueva/reconciliación, no sobrescribir historia.
- **Retención:** NO definida; requiere revisión P01–P04/P09, supresión de cuenta y obligación legal aplicable antes de cualquier escritura. No reutilizar 90 días del inbox firmado para ledger/capturas.
- **Terceros:** PayPal Sandbox (ensayo) / Supabase para la implementación hipotética; no analytics ni exportación pública. Los test locales son datos sintéticos y no recolectan nada.
- **Autorizaciones futuras:** diseño físico de tablas/DDL, migración, backend, cron/worker, acceso Live, ledger, entitlements, PR merge y verificación en producción: gates separados del Product Owner.

## Gate siguiente

Auditar en laboratorio el origen verificable del `cycleKey` y contrato de ancla del calendario (incluidos atrasos, cambios de precio y zonas horarias), además de resolver falta de historia completa, devoluciones/disputas, fee opcional y retención. **No adaptar el laboratorio como autorizador operativo**: crear un nuevo boundary servidor bajo otro GO y revisión de seguridad. La venta Sandbox histórica sigue solo como evidencia auxiliar, no como período pagado.
