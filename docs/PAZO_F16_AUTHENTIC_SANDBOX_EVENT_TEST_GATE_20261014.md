# PAZO F16 — Gate de evento genuino PayPal Sandbox (histórico + cierre de recepción real)

> **SUPERADO PARCIALMENTE — 2026-10-14 UTC:** la prueba autorizada se ejecutó en PayPal Personal Sandbox por el PO: aprobó y canceló. ChatGPT comprobó alojado en Supabase **4 eventos firmados y persistidos** con **4 POST HTTP 202** de Edge v13 (`CREATED`, `ACTIVATED`, `PAYMENT.SALE.COMPLETED`, `CANCELLED`), todo pendiente y sin contabilidad ni membresía. **Recepción real E2E PASS**. El GET REST final de la suscripción **no fue ejecutado** por ChatGPT; no simular evidencia PayPal. El protocolo previo a continuación es solo historial; NO pedir volver a crear suscripción. Ver `docs/PAZO_F16_GENUINE_SANDBOX_WEBHOOK_E2E_PASS_20261014.md`.


**Estado (2026-10-14): AUTORIZADO / EJECUCIÓN PENDIENTE.**

## Alcance expresamente aprobado por Product Owner

El PO respondió «si» al procedimiento de una única prueba con comprador **PayPal Sandbox**: crear una suscripción descartable del plan Sandbox de PAZO, comprobar entrega auténtica de un webhook con firma verificada por el servidor e inbox privado, y cancelar la suscripción de prueba. No habilitar checkout de la app, cobros Live, entitlements, is_founder, miembros premium, reenvíos, despliegues ni nuevas migraciones.

## Condición y bloqueo presentes

- PayPal merchant API **no está conectado a ChatGPT** como cuenta ejecutable, y su Client Secret no debe transferirse al chat ni a GitHub.
- Existe un creador/flujo de checkout F16 **solo en código y tests offline**: no está desplegado como endpoint público, por razones explícitas de seguridad de propietario/intención/idempotencia.
- Se intentó preparar y publicar un ejecutor de prueba de una sola suscripción desde este entorno, pero la operación de publicación **fue bloqueada por controles de seguridad**. No se ejecutó ni se creó un flujo alternativo. No repetir el intento de manera encubierta.
- No se ha llamado al API de PayPal para crear o cancelar suscripciones en este gate. No generar nuevas suscripciones desde una cuenta Live o una tarjeta real.
- PayPal Webhooks Simulator no sustituye una entrega genuina verificada por postback: los eventos mock no tienen el webhook ID real y no pueden verificarse mediante el endpoint `verify-webhook-signature`. Referencia: https://developer.paypal.com/api/rest/webhooks/simulator/
- Referencia API para operaciones futuras aprobadas: https://developer.paypal.com/api/subscriptions/v1/subscriptions-create/ y https://developer.paypal.com/api/subscriptions/v1/subscriptions-cancel/

## Auditoría de solo lectura tras la autorización

- Proyecto Supabase `mrybvqdebbgcayuvgkkr`, Edge `f16-paypal-webhook` **v13 ACTIVE**.
- Inbox `supporter_private.paypal_verified_event_inbox` = **0**; intenciones = **0**; entradas de pagos = **0**; reversos = **0**; presupuesto admitido = **0**. Consulta alojada, solo lectura, del 2026-10-14.
- Migración 11 eventos `20261014094349_f16_preserve_two_subscription_lifecycle_events.sql` ya PASS. Webhook PayPal existente `6N7889790V1467139` se reportó `updated_and_verified` mediante postflight del operador y apunta a receptor F16, con 11 eventos. No repetir PATCH.
- PR #44 abierto Draft; no se introdujo infraestructura nueva ni efectos financieros.

## Próximo requisito práctico

El PO debe disponer de una **cuenta compradora personal de Sandbox**, distinta de la cuenta comerciante Sandbox, que pueda iniciar sesión en `sandbox.paypal.com`. Se puede inspeccionar su existencia desde **PayPal Developer → Testing Tools → Sandbox Accounts** sin divulgar el correo/contraseña en chat.

Hasta contar con un canal local de ejecución aislado permitido y una forma segura de garantizar la cancelación, **NO generar la suscripción**. Se puede seguir trabajando en código y pruebas sintéticas no mutantes sin depender de esa confirmación.

## Criterio futuro de PASS

1. Una sola suscripción real de Sandbox creada con plan fijo y cuenta compradora de prueba, sin dinero real.
2. Evento firmado que recibe `f16-paypal-webhook` y se inserta en el inbox privado, con respuesta de aceptación 2xx, sin payload del comprador persistido.
3. Suscripción de prueba cancelada y estado `CANCELLED` confirmado por PayPal.
4. Ningún registro financiero, beneficio premium, alteración de perfiles, PayPal Live o checkout público.
5. Si la cancelación o entrega falla: estado BLOCKED, investigar sin duplicar suscripciones ni reenvíos.

**El GO anterior se conserva para la prueba delimitada; no se amplía a otro checkout ni a gastos o recursos nuevos.**
