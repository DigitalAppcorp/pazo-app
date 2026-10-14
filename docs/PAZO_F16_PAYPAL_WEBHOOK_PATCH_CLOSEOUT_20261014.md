# PAZO F16 — PayPal Sandbox webhook PATCH: cierre operativo (2026-10-14)

## Resultado confirmado por script local, aportado por PO

El Product Owner ejecutó UNA SOLA VEZ el comando PowerShell `scripts/f16-paypal-sandbox-plan.ps1 -Check ApplyWebhook` en el checkout local `C:\Users\osori\PAZO-F13-preview` con credenciales Sandbox guardadas solo durante el proceso. Aportó esta salida redactada, que es **evidencia del preflight, PATCH y GET postflight del script**, no una consulta PayPal realizada independientemente por ChatGPT:

```json
{
  "environment": "sandbox",
  "webhookIdMatches": true,
  "status": "updated_and_verified",
  "detail": "same_webhook_eleven_events_f16_destination",
  "readOnly": false,
  "changesLive": false,
  "checkoutEnabled": false,
  "entitlementsEnabled": false
}
```

La función `scripts/f16-paypal-update-webhook-once.mjs` solo emite `updated_and_verified` tras (1) OAuth Sandbox, (2) validar plan e ID/URL previa exacta y ocho eventos, (3) reconsultar ausencia de drift, (4) **PATCH del webhook existente** `6N7889790V1467139`, (5) verificar su respuesta, (6) GET postflight coincidente con la URL y 11 eventos. Se conservaron los ocho `BILLING.SUBSCRIPTION.*`, incluidas `BILLING.SUBSCRIPTION.CREATED` y `BILLING.SUBSCRIPTION.RE-ACTIVATED`, y se añadieron exclusivamente los tres `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`.

**Destino final exacto:** `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-webhook`.
**URL anterior confirmada por PO:** `https://supabase.com/dashboard/project/mrybvqdebbgcayuvgkkr/functions`, panel de administración, no listener. Contrato de PATCH exigía igualarla para prevenir redirección de otro consumidor.

El PATCH de Sandbox **NO habilita cobros**, creación de suscripciones, checkout, Live, contabilidad real ni prestaciones de pago. NO crear otro webhook, NO reejecutar ApplyWebhook si ya está `updated_and_verified`.

## Postflight Supabase independiente, READ ONLY, posterior a la salida

- Proyecto `mrybvqdebbgcayuvgkkr`; SQL F16 `f16_preserve_two_subscription_lifecycle_events`, versión `20261014094349`, **ya aplicada**.
- Edge `f16-paypal-webhook` **v13 ACTIVE**, `verify_jwt=false` por verificación de firma PayPal en código, únicamente Sandbox.
- Consultas alojadas read-only en 2026-10-14: `paypal_verified_event_inbox=0`, `paypal_subscription_intents=0`, `paypal_payment_entries=0`, `paypal_payment_reversals=0`, `f16_webhook_request_budget.admitted=0`, `wall_has_verified_entitlement(NULL::uuid)=false`.
- Pruebas negativas HTTP reales previas GET 405 / POST sin firma 400 PASS; CI General y disposable PG tras cambio de URL antigua estricta también PASS en commit `4a36b749`.
- Estos ceros son **snapshot**. No prueban entregas PayPal auténticas, ni firma, ni procesamiento de eventuales eventos futuros.

## Nuevo gate: evento REAL firmado de Sandbox, no prueba mock

**ESTADO: PREPARACIÓN SOLAMENTE / NO AUTORIZADO A GENERAR EVENTO NI COBRO**.

El receptor real utiliza verificación PayPal **postback** `/v1/notifications/verify-webhook-signature` y, si firma válida, almacena solamente `provider_event_id` y `event_type` en inbox privado sin otorgar membresías o modificar ledger.

PayPal documenta que el [Webhooks Simulator](https://developer.paypal.com/api/rest/webhooks/simulator/) genera eventos mock con webhook ID `WEBHOOK_ID`, no asociados a la aplicación y **no verificables por el endpoint de postback**. Por ello, una simulación desde el panel **no será criterio PASS** y no debe enviarse mientras no exista un protocolo aislado explícitamente autorizado.

Criterios futuros de aceptación, antes de habilitar pagos/entitlements:
1. Autorizar aparte un único evento real del **entorno Sandbox**, originado desde la **misma REST app** con la que se registró el webhook. No usar cuentas Live ni dinero real. No crear ni autorizar transacciones/suscripciones sin GO expreso.
2. Obtener prueba de entrega PayPal (sin exponer datos del pagador, URLs privadas o tokens) y correlacionarla con respuesta firmada `202 verified_event_queued`, o duplicado posterior `200 duplicate_verified_event`. Si se rechaza `401/503`, diagnosticar antes de repetir.
3. Read-only postflight para verificar **solo metadatos mínimos** de ese evento en inbox privado y que siguen sin modificarse premium/entitlements, perfiles, pagos/reversiones o flujos Live, salvo autorización explícita posterior de procesamiento.
4. Asegurar que replay/idempotencia y fallos permanecen fail-closed. **No ejecutar Resend ni repetir transacciones** sin GO separado. Validar consumo de cuota / costos y evitar múltiples pruebas.
5. Solo después de verificar recepción genuina planear ledger, reconcile y beneficios con gates y permisos distintos.

## Límites de ejecución

- El PO es Product Owner, ChatGPT ejecutor técnico directo; sin Codex.
- PR #44 continúa Draft en `f13/section-titles-20261012`. No merge, deploy Vercel ni cambios de plan/budget sin autorización.
- Gate actual cerrado = **configuración del webhook PayPal Sandbox**; F16 completo NO cerrado.
