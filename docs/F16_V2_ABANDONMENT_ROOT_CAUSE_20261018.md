> **CORRECCIÓN 19-oct-2026 — tercera reproducción QA:** conteo Supabase read-only actual: tres intentos de inicio V2 (17–19 oct UTC), los tres reclamados/vinculados, cero reintentos y grants; ninguna entrada de pago para las cuentas V2. La página de oferta, antes bloqueada con jerga técnica, ahora pregunta al servidor si puede reanudar la misma aprobación, muestra CTA «Continuar con PayPal» únicamente para `approval_resumable`, y ofrece asistencia si el intento ya no existe en PayPal (404) o falta enlace. Se conservaron los controles de idempotencia, propietario y no-entitlement. **Esto resuelve el obstáculo de navegación/copy cuando existe un enlace válido, NO el 404 ni el candado de segundo intento.** Para lanzar el flujo a usuarios reales falta: (1) reconciliar estado PayPal y cobros/eventos de cada solicitud, (2) confirmar terminal/cancelada/no-cobrable con autoridad de proveedor antes de permitir otra, (3) habilitar nueva `requestKey` y consentimiento en servidor tras terminal **sin duplicados** mediante mecanismos V2 de reintento, (4) pruebas de abandono → retorno → reanudación o cancelación validada → nuevo intento → pago único real Sandbox; (5) revisión de coste, privacidad y QA. No modificar Supabase alojado ni desplegar Edge sin gate/GO. PR #44 solo frontend y pruebas. 

# PAZO F16 — Auditoría de causa raíz de abandono PayPal V2

**Fecha:** 2026-10-18 · **Ámbito:** Sandbox QA, PR #44 DRAFT. No merge, sin cambios en PayPal Live, no se creó otra suscripción, sin grants administrativos.

## Resumen de conclusiones separadas por certeza

### Confirmado: defecto de recuperación en PAZO, no un cobro confirmado

1. El primer `begin` registra el consentimiento privado y un intent; su flujo solo vincula el ID externo si la API PayPal confirmó mediante GET el `plan_id`, `custom_id` y estado `APPROVAL_PENDING`. Código: `supabase/functions/f16-paypal-webhook/p06SandboxVerifiedCheckout.mjs`. El resultado tiene `entitlement:false`, `paidThrough:null` y no registra pago por redirección.
2. La función **actualmente alojada** `public.f16_qa_v2_begin_checkout` verifica `EXISTS ... f16_sandbox_qa_v2_checkout_attempts WHERE owner_id=p_owner_id` y lanza `One v2 attempt per owner` antes de cualquier nueva alta. Esa prohibición es independiente de activación o pago: **defecto UX de bloqueo permanente en el flujo original** para una cuenta que salió sin pagar.
3. La repetición de la misma `requestKey` se considera intento ya vinculado y deliberadamente no efectúa otro POST. La segunda `requestKey` en el flujo viejo se rechaza. La nueva ruta `retry_begin` usa tabla append-only y un grant privado; el frontend solo la muestra si `retry_status` devuelve elegibilidad. Actualmente hay **0 grants**, por lo que está bloqueada aun sin un período pagado.
4. SQL read-only de 2026-10-18: **1 intento V2**, creado/bound el 2026-10-17 ~19:41Z con provider-create claimed; **0 registros de `paypal_payment_entries`, 0 `f16_sandbox_qa_paid_periods`, 0 `paypal_verified_activation_bindings`**, 0 retry intents/grants. Hay **un webhook `BILLING.SUBSCRIPTION.CREATED`**, verificado desde creación V2, `processing_state=pending` y no ligado a venta. Un `CREATED` no es prueba monetaria; este pending no debe marcarse artificialmente completado.
5. El PO confirmó reiteradamente credenciales y merchant Business Sandbox SIN cambios. Su cuenta muestra **0 suscripciones activas, 0 no pagadas, 3 canceladas**; ninguna de esas 3 corresponde al external subscription ID del primer V2 (2 sí coinciden con suscripciones históricas en PAZO). La actividad del 17–18 oct con archivo y tipo “Todos” aparece vacía. El GET del ID original arrojó HTTP **404**; el GET de inventario en la misma cuenta no lo encuentra.

### No confirmado: por qué PayPal devuelve 404 después de GET inicial válido

Se desconoce si PayPal retiró o no indexa ese objeto tras abandono, si hubo una diferencia de alcance interno del proveedor o cualquier otra razón. **No afirmar que PayPal no creó el objeto**: creación y validación inicial GET sí se ejecutaron. **No afirmar que existe un pago**: no hay tal evidencia. Que el inventario sea vacío para V2 tampoco constituye certificación de no-cobrabilidad futura de PayPal.

## Reproducción sintética automatizada

`src/features/supporter/testing/f16AbandonedV2RootCause.test.mjs`:
- Primera `requestKey`: `APPROVAL_PENDING`, vinculada, `paidThrough:null`, ningún beneficio.
- Abandono del navegador: sin aprobar ni registrar venta.
- Segunda `requestKey` con guard del SQL histórico reproducido en el stub: `BLOCKED`, razón `durable_consent_or_idempotency_unavailable`, PayPal provider POST **sigue en 1**.
- Replay del mismo consentimiento vinculado: `ALREADY_LINKED_NOT_PAYMENT_VERIFIED`, **0 POST** adicionales.

**Límite de la prueba:** valida conducta del código ante la regla SQL alojada, **NO demuestra la causa de PayPal 404** ni acredita ausencia global de pagos. La función SQL original fue inspeccionada por solo lectura, no modificada.

## Remediación por etapas

- **Solución arquitectónica para futuros usuarios:** usar estados separados `intent_created` / `approval_pending` / `approved_unpaid` / `paid_verified` / `terminal_reconciled`; abandonar la ventana del navegador NUNCA equivale a cancelar ni pagar. Recuperar la URL segura del mismo intento si el merchant confirma `APPROVAL_PENDING`; si éste es terminal, habilitar un nuevo consentimiento/intent solo con prueba comercial reconciliada y controles de concurrencia.
- **Para caso V2 actual:** las migraciones append-only, APIs multiintento y CTA de reintento YA están instaladas, pero dependen de `f16_sandbox_qa_v2_retry_grants`, aún vacío. Falta reconciliar el evento `CREATED` pendiente, alcance de PayPal y posibilidad de cargos tardíos para una evaluación de grant **sin inventar evidencia**.
- **No ejecutar:** crear manualmente un segundo PayPal POST, resetear la fila V2, declarar `CANCELLED` en base de datos sin confirmación del proveedor, introducir un grant de prueba como si fuese comercial real o activar Live.

## Gate

**F16_ROOT_CAUSE_SPLIT_CONFIRMADO_PAzo_LEGACY_ONE_ATTEMPT_LOCK_PAYPAL_404_CAUSE_UNKNOWN**.

Siguiente trabajo: definir un SOP read-only que resuelva la evidencia de `BILLING.SUBSCRIPTION.CREATED` y el origen/alcance mercantil con el mínimo de datos y sin exigir que el PO vuelva a revisar las mismas credenciales. No declarar la causa externa hasta contar con una prueba verificable.
