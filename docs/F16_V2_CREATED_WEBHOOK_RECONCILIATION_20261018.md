# F16 — Correlación real del webhook PayPal V2 CONFIRMADA por QA (2026-10-18)

**Nuevo resultado posterior al deploy Edge Sandbox v13**: el Product Owner ejecutó el botón owner-scoped **«Verificar origen de solicitud»** desde PAZO local y compartió captura del estado exacto: **«El evento firmado de creación corresponde a esta solicitud de PayPal. Esto no verifica un pago ni permite iniciar otra suscripción.»** La ruta `audit_created_webhook` devuelve ese mensaje SOLO para `created_event_matches_bound_subscription` con `correlated:true`, luego de consultar `GET /v1/notifications/webhooks-events/{id}`, verificar el ID del evento con el inbox firmado y cotejar `resource.id` exacto con el ID de la suscripción privada; coteja también `custom_id` y `plan_id` cuando el proveedor los incluye. Esta evidencia elimina la hipótesis de que PAZO hubiera inventado una creación no existente en PayPal. **No confirma aprobación, cobro, estado actual ni cancelación.** No usar la captura para atribuir cobros.

**Postflight SQL read-only** ejecutado tras el resultado: 1 intento V2 original; 0 reintentos, 0 grants, 0 `paypal_payment_entries`, 0 períodos QA pagados, 0 activaciones verificadas, **0 eventos `PAYMENT.SALE.%` recibidos desde la creación V2**, 1 `BILLING.SUBSCRIPTION.CREATED` continúa `pending`. La ausencia de sales webhooks no acredita cobertura completa contra cobros tardíos, otros webhooks o registros de comercio. El GET del recurso subscription original continúa dando 404 y el inventario por plan no lo muestra bajo las credenciales Business que el PO reiteradamente confirmó como las mismas. Nada de esto constituye prueba terminal o no-cobrabilidad.

**Referencia de semántica PayPal**: `APPROVAL_PENDING` significa creada pero aún no aprobada por el comprador (https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/). PayPal distingue `BILLING.SUBSCRIPTION.CREATED` de `BILLING.SUBSCRIPTION.ACTIVATED` y de `PAYMENT.SALE.COMPLETED` (https://developer.paypal.com/subscriptions/webhooks/). El 404 en `GET /v1/billing/subscriptions/{id}` no debe tratarse como evento terminal. La próxima tarea es conciliación comercial y de inbox **separada**; preservar evidencia y evitar consultas/repeticiones inútiles al PO.

**Gate:** `F16_V2_ORIGINAL_SIGNED_CREATED_EVENT_PROVIDER_EXACT_MATCH_CONFIRMED_NO_PAYMENT_OR_RETRY_GRANT_404_UNRESOLVED`. No se modifican datos financieros, grants, PayPal ni Live. PAZO PR #44 DRAFT, main intacta. **No pedir de nuevo pulsar «Verificar origen de solicitud»**: ya pasó el diagnóstico; siguiente fase debe construir evidencia de estatus cobrable/no cobrable y cierre del inbox con garantías de integridad antes de ofrecer reintento. No marcar `processing_state=processed` manualmente.

---

## Postflight autorizado y aplicado — 2026-10-18

Tras GO explícito del PO se **aplicó** la migración read-only `f16_v2_created_webhook_candidate_readonly` a Supabase `mrybvqdebbgcayuvgkkr` y se **desplegó** `f16-paypal-supporter-v2-qa` como **v13 ACTIVE, verify_jwt=true**, 18 archivos, nuevo route owner-only `audit_created_webhook` habilitado. Los 15 módulos antiguos no cambiaron frente al código hospedado de v12. La UI en rama PR #44 contiene el botón «Verificar origen de solicitud» que consulta esa ruta, pero el Vite local no se ha sincronizado automáticamente.

ACL postflight: anon/auth no pueden ejecutar RPC, service_role sí. Resultados: 1 candidato de evento CREATED, 0 nuevos reintentos, 0 grants, 0 pagos, 0 períodos, 0 activaciones, 1 inbox CREATED sigue `pending`. CI + 4 PG labs **SUCCESS** (39141841083/39141841057/39141841209/39141841135/39141841067, commit `e1d62816`). **El GET real del evento PayPal está PENDIENTE de que el owner QA invoque el botón desde su sesión**; no se ha atribuido la identidad por fecha ni se ha inventado resultado. Ningún nuevo checkout, pago, cierre de inbox o Live autorizado.

---

# PAZO F16 — Conciliación de webhook CREATED y solicitud V2 abandonada

**Fecha:** 2026-10-18 · **Ámbito:** solo Sandbox, PR #44 DRAFT · **Estado:** preparación técnica aprobada en CI, NO instalada en Supabase alojado.

## Evidencia existente

- El PO confirmó que la misma app/credenciales PayPal Sandbox y la misma Business se mantuvieron. No volver a pedir comprobación de credenciales.
- `f16_sandbox_qa_v2_checkout_attempts` aloja un V2 original `bound` con `provider_create_claimed_at`, pero ningún período pagado ni pago.
- Lectura SQL read-only: **exactamente un evento firmado `BILLING.SUBSCRIPTION.CREATED` con `processing_state=pending`** dentro de los 30 minutos siguientes al alta; llega aproximadamente **9.32 segundos** después del V2. Ningún otro evento firmado en esa ventana.
- Supabase guarda ID/tipo/fecha del webhook, **no el payload completo**. Por ello correlación temporal no prueba identidad de suscripción.
- `GET /v1/billing/subscriptions/{id}` del objeto V2 devuelve 404, e inventario por plan no lo muestra; PayPal Business UI cuenta 0 activas/no pagadas, 3 históricas canceladas. No deducir estado `CANCELLED` ni no-cobrabilidad futura solo por estos elementos.
- Los eventos de ciclo `CREATED` **no prueban aprobación ni cobro**. El sistema de procesamiento financiero P21 sigue cerrado; el inbox `pending` no se debe marcar `processed` manualmente.

## Solución preparada y todavía no desplegada

1. **Migración solo lectura:** `supabase/migrations/20261018190000_f16_v2_created_webhook_candidate_readonly.sql` crea `public.f16_qa_v2_read_created_webhook_candidate(owner_uuid,intent_text)`. `SECURITY DEFINER`, lectura privada de la solicitud **owner-bound**, solo QA enable, evento previamente verificado, `pending`, `retention_hold`, 30 segundos antes a 5 minutos después del alta; devuelve candidato **solo si hay exactamente uno**. Ejecutable por `service_role`, sin permiso público/Auth/anon, sin DML ni nuevas tablas. **NO instalada:** AGENTS exige nuevo GO explícito para aplicar migración.
2. **Verificador PayPal:** `pazoSandboxV2CreatedEventAudit.mjs` solicita OAuth de servidor y hace exclusivamente `GET /v1/notifications/webhooks-events/{eventId}` por candidato privado. Compara `event.id`, `event_type=CREATED` y `resource.id===subscriptionId` exacto; `resource.custom_id` / `resource.plan_id`, cuando presentes, deben coincidir con intent/plan privados. Diferente ID o payload ambiguo no correlaciona. Respuesta binaria sin IDs, PII ni secretos. Un `404` al leer el evento NO afirma cancelación.
3. **Edge QA preparada:** acción `audit_created_webhook` solo propietario Auth con allowlist; primero consulta cuenta privada, después referencia privada y GET PayPal, sin aceptar IDs comerciales del navegador. **Deshabilitada** por `QA_V2_CREATED_WEBHOOK_AUDIT_RELEASE_APPROVED=false`; no desplegada. Solo cuando RPC instalada, auditada y PO apruebe habilitación read-only podrá ejecutarse. El resultado `correlated:true` mantiene `eventReconciled:false`, `mayRetry:false`, `paidThrough:null`, sin beneficio ni registro financiero.
4. **Cobertura:** `src/features/supporter/testing/f16SandboxCreatedWebhookAudit.test.mjs` valida identidad, discrepancias, 404, privacidad y acceso dueño; `scripts/f16-v2-created-webhook-candidate-lab.sql` y workflow PG17 comprueban dueño, cardinalidad única, eventos anteriores/posteriores, no-pending y ACL. `CI` y **4 laboratorios PostgreSQL 17** **SUCCESS** en SHA `d576e1517007d7a152119694672ce67df4e5bf5c`: CI `39140987566`; F16 `39140987623`; Retry `39140987602`; Multiattempt `39140987606`; Created Event Readonly `39140987732`.

## Gate siguiente — NO cobrar / NO desplegar todavía

**Se solicita GO separado del PO** para aplicar *solo* la nueva RPC read-only alojada y luego desplegar y habilitar la acción read-only en Edge Sandbox QA. Antes/después de instalar: verificar DDL exacto/ACL y cero cambios al ledger/eventos. La posterior consulta al PayPal real solo acredita `CREATED` vinculado; **no** es permiso para marcar `webhook_inbox_reconciled` verdadero, insertar `retry_grants`, hacer PayPal POST, activar Live o conceder beneficios. Para reintento remunerado seguirá haciendo falta cierre mercantil/contable de no-cobrabilidad e inbox, documentado en `F16_SANDBOX_V2_RETRY_GATE_20261018.md`.

**Marcador:** `F16_CREATED_WEBHOOK_EXACT_CORRELATION_PREPARED_5_CHECKS_PASS_MIGRATION_NOT_APPLIED`.
