# PAZO F16-P05 — Regla de primer período Amigo de PAZO aprobada

**Decisión PO:** 14-oct-2026, respuesta explícita «sí» a la propuesta de definir el primer período de servicio desde la activación y el pago confirmados por PayPal hasta la siguiente fecha de facturación observada y registrada por PAZO como límite contractual. **Alcance:** regla de producto prospectiva para futuras suscripciones, diseño e implementación/pruebas **offline**. No autoriza SQL hosted, retención de consentimientos, nuevas compras, PayPal Live, ledger, benefits, publicación de términos, despliegue, ni merge. PR #44 DRAFT; F16 NO-GO.

## Semántica aprobada

1. **Antes del checkout:** PAZO presenta precio USD 2.99/mes, renovación automática, ventajas opcionales, cancelación y reglas de períodos; el usuario acepta expresamente una versión trazable de las condiciones. La app general sigue siendo gratuita.
2. **Primer período de servicio contractual:** una vez corroborados servidor a servidor Auth propietario → intent BOUND → contrato PayPal, evento firmado de activación y **venta COMPLETED identificada y asociada al primer cobro regular**, PAZO utilizará como comienzo contractual el instante de activación PayPal validada; el límite de servicio será la **próxima fecha de facturación PayPal observada en la fotografía merchant de esa activación**, como regla contractual expresa de PAZO y no como prueba emitida por PayPal sobre un período pagado.
3. **Acceso efectivo:** nunca antes de verificar **ambos** eventos y la titularidad, ausencia de reversals relevantes, y autorización backend futura. Si la confirmación llega tarde, mantener la solicitud en revisión hasta resolver cómo evitar pérdida de servicio injusta; no reescribir timestamps contractuales sin acuerdo. La fórmula de fechas no es autorización de entitlement.
4. **Intervalo:** `[activation_time, observed_next_billing_time)`; fin exclusivo. El límite debe ser explícito, posterior a la activación y capturado del merchant con proveniencia verificada. No sumar 30 días ni generar meses calculados por zona horaria de ubicación del usuario.
5. **Renovaciones:** requieren **nuevo** snapshot merchant y vínculo auditable venta↔obligación concreta, sin crear intervalos superpuestos ni acreditar un ciclo dos veces. No se aprobó un algoritmo general para todos los ciclos; la ausencia de correlación queda en revisión.
6. **Cancelación y reembolsos:** P06-A–E ya aprobado: cancelar detiene renovaciones futuras, no revoca un primer período **comprobado**; devolución/disputa se maneja por las reglas financieras y revisiones específicas. Deudas recuperadas se imputan a su **ciclo original** solo con prueba P05-L, nunca crean otro mes.
7. **Falta de datos/contradicciones:** `next_billing_time:null`, setup fee desconocida, una fuente sin firma/GET merchant, `owner/intent` diferente, pago `PENDING`, deuda, retry, importe incorrecto, refund/disputa/historia incompleta, condiciones no aceptadas o discrepancia de calendario => `REVIEW_REQUIRED` y **ningún** beneficio.

## Alcance retrospectivo explícitamente excluido

La única suscripción de prueba Sandbox ya CANCELLED, con venta USD 2.99 y evento histórico de activación, **no recibió este contrato aceptado de forma previa**, ni prueba financiera completa o del ciclo liquidado. Su `next_billing_time` de 2026-11-14T10:00:00Z es un dato observado, **nunca `paidThrough` acreditado**. `cycleVerified:false`, `periodStart:null`, `periodEnd:null`, `paidThrough:null`, ledger 0, benefits 0. No repetir checkout para reconstruirlo.

## Nuevas tareas técnicas autorizadas solo offline

- Construir un evaluador fail-closed de **candidato contractual de primer ciclo** con Auth, aceptación versionada, snapshot de activación, venta regular, fin merchant y revisión financiera; separar fechas internas del diagnóstico público. Ninguna salida puede otorgar beneficios ni registrar pagos.
- Preparar mapeo de futuras fuentes, idempotencia y claves únicas de `saleId`, `subscriptionId`, `cycle`, sin tablas/DDL ejecutables hasta cerrar revisión de privacidad, retención y gate PO de mutación.
- Resolver legalmente texto ES/EN, confirmación conservable, cancelación online y avisos conforme ley de California: `docs/PAZO_F16_P05_CALIFORNIA_RENEWAL_AND_RETENTION_DECISION_20261014.md`.
- Determinar plazos de retención financiera P01–P04/P09, backups/baja, reconciliación de reembolsos y disputas y conducta ante retrasos de notificación. **Pendiente PO y revisión legal.**

Esta decisión resuelve el principio de ancla de primer ciclo para diseño prospectivo, **NO** certifica fechas PayPal para otros ciclos ni existencia de implementación real.
