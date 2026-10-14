# PAZO F16 — Preflight para esquema privado de pagos (sin aplicar)

**Fecha:** 2026-10-13. **Estado:** diseño propuesto, no migración, no autorización SQL. Rama `f13/section-titles-20261012`, PR #44 DRAFT. No publicar, desplegar ni conceder entitlement.

## Evidencia READ ONLY del Supabase alojado

- Proyecto `mrybvqdebbgcayuvgkkr`. `supporter_private` contiene **solo** `wall_consents` (RLS habilitada, 0 filas a la hora de lectura). No hay tablas `pay*`, `subscr*`, `entitle*`, `ledger*` o `webhook*` en esquemas `public` o `supporter_private`.
- Funciones relevantes en esos dos esquemas: solamente `supporter_private.wall_has_verified_entitlement(p_owner_id uuid)`. Es el guard intencional F16 que permanece devolviendo FALSE. No existe `public.f16_paypal_record_verified_event`.
- Auditoría hecha con lectura de tablas, catálogo `information_schema.tables` y `pg_proc`; no se ejecutó DDL, DML ni secrets.

## Propuesta mínima de datos (NO es migración)

| Objeto privado propuesto | Claves/columnas mínimas y controles | Alcance |
| --- | --- | --- |
| `supporter_private.subscription_intents` | UUID de correlación opaca única que PayPal recibe en `custom_id`, `owner_id` de Auth servidor, provider `paypal`, Plan ID `P-14V25407JP6850922NLHMDKI`, `external_subscription_id` único no nulo cuando ya se enlazó, estado, timestamps | No tomar owner/email/cantidad del navegador; la intención no concede cobertura |
| `supporter_private.paypal_verified_event_inbox` | `provider_event_id` único y no nulo, `event_type` enum/controlado, `verified_at`, `processing_state`, `attempt_count`, `next_attempt_at`, marca de error sanitizada | Atomic INSERT ON CONFLICT DO NOTHING en RPC con respuesta booleana; sin payload/email/tokens |
| `supporter_private.paypal_payment_entries` | `external_payment_id` UNIQUE, `external_subscription_id`, `owner_id`, `gross_minor_units`, `currency`, `provider_completed_at`, estado verificado, timestamps | Fuente única de cobro **cuando** conciliado desde PayPal; no deduplicar solo por webhook |
| `supporter_private.paypal_payment_reversals` | `external_payment_id` UNIQUE/PK con `verified_reversal_at`, `reason_code` limitado, `provider` | Tombstone independiente del cobro: reverso recibido antes del cobro bloquea acreditación posterior |
| `supporter_private.coverage_periods` | `owner_id`, `external_payment_id`, `period_start`, `period_end`, `state`; índice contra solapamientos indebidos | **DIFERIDO** hasta decisión y prueba de reglas de período exacto; no crear calendario por suposición |
| Proyección privada de entitlement | Solo desde períodos no revertidos y tiempo actual, ownership, consentimiento por mascota | **DIFERIDA**; no reemplazar guard `wall_has_verified_entitlement()=false` antes del gate GO |

## Contrato SQL previsto para el inbox (NO ejecutado)

- `public.f16_paypal_record_verified_event(p_provider_event_id text, p_event_type text) RETURNS boolean`.
- Función restringida `SECURITY DEFINER` **solo** cuando absolutamente necesaria para escribir en esquema privado, `SET search_path = ''`, nombres de esquema totalmente calificados, validación de longitudes/formato/tipos; acceso a servicio autenticado exclusivamente vía backend.
- En la misma migración versionada: `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated`; `GRANT EXECUTE ... TO service_role`; revocar privilegios sobre tablas al cliente; RLS habilitada + FORCE RLS como defensa adicional según operación/owner; ninguna API de cliente sobre tablas de pago.
- Escritura atomic/idempotente por `provider_event_id`: `INSERT ... ON CONFLICT DO NOTHING RETURNING ...` para distinguir nuevo (TRUE) de duplicado (FALSE). Estado `pending`, reintentos y registro de procesamiento en transacciones independientes según el worker.
- Índices únicos para `external_subscription_id` y `external_payment_id`; si llega reversión antes del cobro, registrar tombstone sin conceder beneficios. Operaciones ledger + state + períodos con una sola transacción ACID, no insert independientemente desde Edge y luego suponer atomicidad.
- Impedir que el inbox llegue a `completed` sin conciliación real server-side y estado registrado; una función de recepción no puede asignar `profiles.is_founder`.
- NO crear ACLs, políticas RLS o FKs especulativas; antes del DDL confirmar con `pg_catalog` las claves de `auth.users`, políticas existentes, y consideraciones de eliminación de cuenta. Retención de comprobantes de pagos/reversos y privacidad requieren decisión específica antes de crear tablas.

## Próximos gates obligatorios

1. Decidir **retención de referencias** (eventos, transacciones y reversos), respuesta a eliminación de cuenta y unidad comprobable para `paid_through` (PayPal `next_billing_time` no sustituye evidencia de cobro y período).
2. Crear migración **usando `supabase migration new` en el CLI del repositorio local**, no inventar timestamp de archivo. Ensayar en Postgres **descartable**, nunca en alojado sin permiso del PO. Verificar ACL/RLS, concurrencia y conflicto de reversos fuera de orden.
3. Tras resultados de CI y revisión, solicitar autorización PO explícita antes de aplicar migración, configurar secrets, desplegar Edge Function o cambiar destino/eventos del webhook PayPal existente.
4. Conectar nuevo worker a intents y ledger, mantener reconciliación de períodos sin falsas extensiones; solo después un Sandbox end-to-end con comprador de prueba, verificación del webhook y del pago. Live/muro/fundador fuera de alcance.

**Costos:** este preflight se ejecuta mediante herramientas existentes y no crea recursos facturables. SQL alojado y Edge Function podrían generar uso/cuota según plan; comprobar antes de solicitar GO de ejecución.

**Referencias:** `docs/PAZO_F16_PAYPAL_RECONCILIATION_MODEL_20261013.md`, `docs/PAZO_F16_EXISTING_SUPABASE_PAYPAL_WEBHOOK_AUDIT_20261013.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`, `docs/PAZO_DATA_INVENTORY.md`, `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`.

## Avance de laboratorio — inbox privada de eventos, NO desplegada (2026-10-13)

Se preparó el código SQL de ensayo en `supabase/tests/supporter/f16-payment-inbox-lab-draft.sql`, **NO** bajo `supabase/migrations/`. El script incluye un bloqueo explícito: solo puede abrir una transacción en la base descartable `f14_synthetic`, con sesión de operador `f14_admin`, PostgreSQL 17 y la cimentación previa del muro. Esto impide reutilizarlo accidentalmente como DDL hospedado; **no constituye una migración Supabase**.

### Alcance exacto del borrador

- Crea únicamente `supporter_private.paypal_verified_event_inbox`, con ID de evento PayPal único, tipo de evento aprobado, instante de verificación, estado de procesamiento, intentos y siguiente reintento. Sin pagos, datos de tarjeta, payload completo, correos, secretos, `profiles.is_founder` ni entitlement.
- Activa **RLS forzada**, sin políticas permisivas y sin acceso directo a la tabla o al esquema privado para `anon`, `authenticated` ni `service_role`.
- Crea `public.f16_paypal_record_verified_event(text,text)` como `SECURITY DEFINER` con propietario `postgres`, `search_path=''`, argumentos validados, `EXECUTE` exclusivamente para `service_role`. Un ID nuevo retorna TRUE; el mismo ID/tipo retorna FALSE sin modificar el estado; ID igual/tipo distinto falla.
- **No** define caducidad ni limpieza automática de eventos, porque la política de retención, reembolsos y derechos de supresión necesita decisión expresa. **No desplegar este borrador** antes de resolver esa política y diseñar el worker/operaciones.

### Evidencia y límites de tests

- `supabase/tests/supporter/f16-payment-inbox-metadata.sql`: pruebas de metadatos RLS, owner, grants y `search_path` en PostgreSQL descartable.
- `supabase/tests/supporter/f16-payment-inbox-synthetic.sql`: pruebas con roles `anon`, `authenticated` y `service_role`, caso único, repetición, rechazo de tipos maliciosos y preservación de estados; concluye en ROLLBACK.
- `scripts/f16-postgres-inbox-concurrency.mjs`: 32 solicitudes RPC en ocho sesiones paralelas por lote (cuatro IDs), verifica exactamente un INSERT por ID. Exige entorno GitHub Actions y PostgreSQL descartable.
- `src/features/supporter/testing/f16PostgresInboxSqlStatic.test.mjs`: guardas estáticas ejecutadas por la suite F16 ya enlazada a CI; no representan certificación de funcionamiento SQL.
- **Estado histórico superado:** la integración inicial fue bloqueada; se creó un workflow de laboratorio independiente y PostgreSQL real PASS en #38505266445. Ver sección de gate verificado.

Antes de convertir este borrador en migración se debe utilizar `supabase migration new f16_private_verified_event_inbox` con CLI oficial sobre un checkout local limpio, revisar el archivo resultante y probarlo en una base desechable. Luego solicitar GO del Product Owner ANTES de aplicar al proyecto `mrybvqdebbgcayuvgkkr`. La configuración PayPal existente sigue sin cambios.

## Gate de ejecución único para PostgreSQL aislado

**Ejecutado y aprobado en PostgreSQL descartable con el workflow #38505266445:** `scripts/f16-postgres-inbox-lab.sh`. Reutiliza exclusivamente el servicio PostgreSQL 17 desechable de las pruebas F14 de GitHub Actions (`127.0.0.1:55441`, base `f14_synthetic`, rol `f14_admin`), y verifica ambiente `GITHUB_ACTIONS=true`, contraseña pública de fixture de CI, ausencia de variables de conexión a Supabase alojado y cimentación previa F16 de consentimientos.

Orden de ejecución del gate, tras `supabase/tests/f14/catalog-baseline.sql` y el DDL de consentimiento F16 cargados **solo en ese laboratorio**:

```bash
bash scripts/f16-postgres-inbox-lab.sh
```

El ejecutor usa el SQL de prueba de inbox con `SET ROLE postgres`, audita permisos/RLS, ejecuta las pruebas sintéticas transaccionales y 32 solicitudes paralelas al RPC. El ejecutor y el script de concurrencia tienen guardas contra ejecución en otro entorno. Este procedimiento no emplea servicios pagados nuevos, ni Supabase hospedado ni credenciales reales.

La prueba de **sintaxis y rechazo fuera del laboratorio** fue comprobada separadamente; la suite estática F16 cubre también estas guardas. El workflow de laboratorio independiente **superó la ejecución PostgreSQL real** (#38505266445). El PASS del laboratorio **no autoriza** una migración alojada.

**Criterio de cierre:** evidencia del job con estado SUCCESS para DDL, metadatos, pruebas de roles y 32 llamadas concurrentes. Después comparar la revisión SQL con el contrato F16 y solo entonces crear archivo de migración auténtica mediante CLI local. La decisión de retención/propósito y autorización del Product Owner son gates separados previos a cualquier SQL hospedado.

## Gate verificado: PostgreSQL 17 aislado PASS — 2026-10-13

**Resultado comprobado en GitHub Actions:** [F16 Disposable PostgreSQL Lab, ejecución #38505266445](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38505266445) — `completed/success` para el commit `8165b6be`. Se creó el workflow `.github/workflows/f16-postgres-inbox-lab.yml` con un contenedor PostgreSQL 17 propio y efímero de CI, sin conexiones a Supabase alojado ni a PayPal.

La etapa `Execute F16 inbox RLS, RPC and 32-call concurrency lab` terminó `success`. Los logs del job confirman:

```text
PASS F16: 32 concurrent RPC calls across 4 unique IDs; exactly 4 rows, no duplicate credit
PASS F16: disposable PostgreSQL inbox permissions, idempotency and concurrency
```

Quedaron realmente ejecutados en la base aislada: borrador SQL de inbox, tests de metadatos RLS/ACL/owner/`search_path`, operaciones desde `anon`, `authenticated` y `service_role`, idempotencia, rechazo de tipos inválidos e IDs conflictivos, preservación del estado ante reintentos y las 32 llamadas concurrentes. El workflow utiliza `actions/checkout@v7`, PostgreSQL `17.11` y el fixture `f14_synthetic`; no instaló migraciones en PAZO alojado.

**Alcance de PASS:** valida **solo** el diseño SQL de laboratorio y su comportamiento en PostgreSQL 17. No certifica retención legal, procedimiento de eliminación, procesamiento duradero de pagos, reversos transaccionales, cobertura, estados de usuario, ni seguridad de un listener realmente desplegado. La tabla alojada y la RPC de pagos siguen ausentes; el guard de entitlement F16 continúa bloqueado. La ejecución de prueba **no es** autorización para desplegar.

**Próximo gate:** decidir retención/borrado de referencias y reconciliación ante reversos, generar con CLI un archivo real `supabase migration new` sin inventar timestamp, portar el DDL revisado fuera del guard de laboratorio, ensayar la migración y política de rollback; solicitar GO del Product Owner **antes** de toda mutación Supabase o PayPal.
