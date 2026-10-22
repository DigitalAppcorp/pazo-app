# PAZO F16-P05 — Inbox privado, claim y lectura con fencing (DRAFT / NO APLICAR)

**Fecha:** 2026-10-15. **Fase:** F16-P05; rama `f13/section-titles-20261012`, PR #44 DRAFT. **NO-GO** para PayPal buyer/Live, SQL alojado, ledger, beneficios, deploy y checkout. La aprobación del PO fue continuar el diseño y verificación; no autoriza escritura en base real. PAZO core sigue gratis.

## Evidencia de la auditoría hosted, de solo lectura

Tabla existente `supporter_private.paypal_verified_event_inbox`, sin SELECT/DML directo para `anon`, `authenticated` ni `service_role`, protegida por RLS + FORCE RLS. Columnas verificadas:
`provider_event_id` PK, `event_type`, `verified_at`, `processing_state` (`pending`, `processing`, `quarantined`, `processed`), `attempt_count >= 0`, `next_attempt_at`, `processed_at`, `retention_hold`, `retention_released_at`, `reconciled_payment_id`, `last_error_code`. Los ocho eventos existentes estaban **pending** en la última lectura del proyecto; el auditor no modificó ninguno.

El inbox conserva ID, tipo y verificación de ingreso del webhook, **no** `resource.billing_agreement_id`, `subscriptionId`, `saleId` ni propietario. Por eso **no es posible filtrar un evento por dueño/suscripción sin una segunda consulta PayPal autenticada**. Nunca permitir que el navegador seleccione una referencia a otro usuario.

## Código preparado

- `supabase/drafts/f16_p05_inbox_claim_v1_DO_NOT_APPLY.sql`, **fuera de `supabase/migrations`**, con un guard de `current_database='f14_synthetic'` + `session_user='f14_admin'` + `current_user='postgres'`. Imposible aplicar directamente en el proyecto alojado sin cambiar conscientemente el documento, generar una migración con CLI y pasar otra aprobación.
- Agrega *solo en la base de prueba* una columna `p05_claim_token uuid` al inbox. Una ficha de reserva es imprescindible para **fencing** de trabajadores obsoletos. Amplía la fixture sintética para reflejar las columnas relevantes que ya existen en hosted; no duplica ledger.
- Tabla privada de configuración `supporter_private.p05_inbox_worker_gate` (1 fila), **deshabilitada por defecto**, fecha `not_before` inicialmente null. Ningún evento es reclamable hasta que el operador active explícitamente este gate en una futura política. Si se activara con fecha prospectiva, los 8 eventos Sandbox antiguos no deben reclamarse.
- `public.f16_p05_draft_claim_next_verified_event()`: RPC de servicio **sin argumentos**, no permite escoger un event ID del navegador. Filtra eventos por `verified_at >= not_before` y `next_attempt_at <= now`, estados pending/processing con lease vencido y `attempt_count < 5`; selección determinista y `FOR UPDATE SKIP LOCKED`; marca `processing`, incrementa intentos, rota un UUID de lease y fija expiración a los 5 minutos. Devuelve **una** referencia mínima de evento e información temporal de la reserva, nunca payload.
- `public.f16_p05_draft_read_claimed_event(p_event_id,p_claim_token)`: solo devuelve ID, tipo, verificación y estado si el lease específico sigue vigente, el rollout gate está abierto y corresponde al mismo evento. Un trabajador con token viejo no puede leerlo cuando otro lo reclama.
- Ambas funciones: `SECURITY DEFINER`, `search_path=''`, acceso por `service_role` exclusivamente, `REVOKE ... FROM PUBLIC,anon,authenticated` dentro de la misma transacción que crea la función. Ninguna nueva RLS policy expone directamente el inbox. En una versión formal habrá que valorar colocar estos RPC en esquema no expuesto y llamar por conexión privada; mientras tanto la exposición vía `public` está restringida a `service_role`, lo cual **no sustituye** la obligación de proteger esa clave.

**Esta cola es AT-LEAST-ONCE, no EXACTLY-ONCE.** El trabajador puede caer después del claim y antes de completar una consulta; el lease expira y otro trabajador reclama con token diferente. Para efectos financieros futuros se requieren idempotencia atómica y verificación de token **también en el ACK/finish**, que aún NO existe. Evitar marcar eventos `processed`, `retention_released_at` o `reconciled_payment_id` de modo improvisado.

## Pruebas en CI desechable (sin datos de usuario)

- `supabase/tests/supporter/p05-inbox-claim-security.sql`: ausencia de privilegios directos a roles cliente/service, funciones sólo `service_role`, RLS + FORCE, disabled gate.
- `supabase/tests/supporter/p05-inbox-claim-synthetic.sql`: no reclamar con gate apagado, cutoff futuro bloquea, exclude evento viejo, único claim, renovación tras caducar, no leer con token viejo, quarantined/max attempts se excluyen, sin modificaciones ledger.
- `scripts/f16-p05-inbox-claim-concurrency.mjs`: **dos conexiones PostgreSQL reales**; A reclama evento y mantiene lock; B prueba SKIP LOCKED sin doble claim; A COMMIT; B no reclama lease activo; confirma históricos intocados, denegación al rol `anon` y limpia sólo la fixture sintética.
- `.github/workflows/ci.yml` usa `f14_synthetic` PostgreSQL puerto 55441; **nunca una URL ni credenciales de Supabase alojado**.

## Siguiente gate aún abierto

1. Crear y validar, en un futuro worker exclusivo server-only, el contrato `claimed event → merchant GET event → merchant GET subscription → intent BOUND`; eventos con datos incompletos entran en revisión, no grant.
2. Diseñar ACK/finish con lease-token fencing, reintentos/backoff de falla, cuarentena, out-of-order, historial completo de fallos, reembolsos/disputas y retention hold. No deducir cobertura histórica sólo por una lectura del inbox.
3. Confirmar política legal/contable P01–P04/P09 por categoría (aceptación, deuda, registros financieros, reembolsos, borrado de cuenta, backup) y terminar términos de California, acuse durable y cancelación en línea.
4. Generar migración formal con Supabase CLI y pruebas de locks, grants y seguridad **solamente tras autorización específica PO**. Aprobación de instalación, PayPal Sandbox buyer nuevo, LIVE y beneficios requieren GO independientes. No repetir el buyer histórico cancelado.

La lectura privada NO está desplegada y **F16-P05 todavía NO certifica `paidThrough` ni primer período acreditado**.
