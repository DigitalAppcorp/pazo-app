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
