# PAZO F16 — Gate de lectura mínima del inbox de PayPal (2026-10-14)

## Problema

Después de comprobar el E2E de 4 eventos firmados, el inbox sigue protegido con FORCE RLS y cero SELECT en roles Data API. En el backend solo existe la RPC de inserción `f16_paypal_record_verified_event`. El futuro procesador necesita consultar exclusivamente una fila de evento persistida sin exponer registros financieros o datos de compradores.

## Implementación SOLO PREPARADA

- SQL no versionado **DRAFT/NO APLICAR**: `supabase/queries/f16_read_verified_inbox_rpc_DRAFT_DO_NOT_APPLY.sql`. RPC `public.f16_paypal_read_verified_inbox(text)` con función definer de dueño postgres y `search_path=''`, GRANT EXECUTE solo `service_role`, y sin permisos SELECT nuevos a la tabla.
- Respuesta con cuatro claves: `provider_event_id`, `event_type`, `processing_state`, `retention_hold`; sin email, payload PayPal, tarjeta, tokens, owner UUID ni precio.
- Adaptador `supabase/functions/f16-paypal-webhook/privateInboxReadAdapter.mjs`, únicamente del servidor, host PAZO estático, credencial local no incorporada al repositorio, errores saneados, forma de respuesta exacta. Compone `createF16ServerInboxGate` para rechazar estados procesados o inválidos.
- Tests `f16PrivateInboxReadAdapter.test.mjs`, `f16-private-inbox-read-rpc-synthetic.sql`. El workflow F16 ejecuta el SQL **solo en PostgreSQL 17 descartable**, comprueba permisos `anon`/`authenticated`, schema privado, RLS, cuatro campos y cero pagos. El último test revierte sus filas de prueba con ROLLBACK.

## Límites y siguiente gate

La RPC **no existe** en Supabase hosted; no usar el adaptador contra producción ni publicar endpoint cliente. No se preparó una migración versionada porque el proyecto exige generarla mediante Supabase CLI y requiere GO antes de aplicarla. No se procesaron los cuatro webhooks reales. Ninguna membresía o cobro se activó.

Siguiente fase técnica: diseñar y ejecutar **claim/lease/retry ACID** en PostgreSQL descartable, protocolo de recuperación ante fallos, y separar reversos confirmados del lifecycle. Solo entonces solicitar autorización específica para alojar nuevas RPC y desplegar worker limitado. Los 90 días de retención del inbox empiezan únicamente tras conciliación definitiva; retención de ledger/intent continúa pendiente.
