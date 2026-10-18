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
