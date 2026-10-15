# PAZO — F16-P21 instalado en Supabase alojado, worker OFF

**15 de octubre de 2026. Aprobación del Product Owner:** «autorizado», exclusivamente para la instalación de esquema P21 con trabajador desactivado.

## Qué ocurrió realmente

Proyecto Supabase `mrybvqdebbgcayuvgkkr`. Se ejecutó con `apply_migration` de Supabase (transacción PostgreSQL) la migración **`20261015190239_f16_p21_private_inbox_worker_schema_off`**. Archivo canónico en `supabase/migrations/20261015190239_f16_p21_private_inbox_worker_schema_off.sql`. El CLI de Supabase no estaba instalado en este entorno; la herramienta Supabase generó y registró la versión antes de versionar la misma transacción en GitHub. El borrador original con guard de laboratorio `DO_NOT_APPLY` permanece sin modificar como material de pruebas; **no** ejecutar ese borrador contra hosted.

La migración original adaptada verificó el rol/postgres, la presencia del catálogo privado, RLS forzada, esquema de columnas, la ausencia de token/gate previo y que los 8 eventos existentes siguieran `pending`, `attempt_count=0`, `retention_hold=true` sin pago conciliado. Verificó además 0 entradas ledger, 0 reversos, 0 ofertas y 0 aceptaciones. Bajo lock_timeout/statement_timeout instaló:

- Columna nullable `p05_claim_token uuid` en el inbox de eventos firmados.
- Tabla de configuración `supporter_private.p05_inbox_worker_gate` RLS FORCE con una única fila `id=1`, `enabled=false`, `not_before=NULL`; sin acceso SELECT/UPDATE de `anon`, `authenticated`, `service_role`.
- Tres funciones `public.f16_p05_draft_claim_next_verified_event`, `f16_p05_draft_read_claimed_event`, `f16_p05_draft_finish_claimed_event`; SECURITY DEFINER/search_path vacío, EXECUTE **solo `service_role`**. Se revocó el privilegio público antes de COMMIT. Con gate OFF, ninguna puede reclamar eventos; no se han llamado para procesar datos.

## Postflight real

Consulta alojada confirmó: `gate_rows=1`, `worker_enabled=false`, `cutoff_unset=true`, `gate_forced_rls=true`, `inbox_forced_rls=true`, `safe_functions=3`, tabla gate sin SELECT directo a los roles relevantes; **8 eventos históricos pendientes intactos**, `payments=0`, `reversals=0`, `offers=0`, `consents=0`. Consultar Security Advisor mostró `rls_enabled_no_policy` en tablas privadas sin políticas abiertas, condición intencional para denegar SELECT, no prueba de filtración.

No se creó suscripción, no hubo OAuth PayPal, no se tocaron los webhooks ni Vercel, no hay scheduler/worker de conciliación activo, ni pagos/beneficios atribuibles.

## Gates aún pendientes

1. Worker server-only con scope PayPal Sandbox GET, lease atómico/expiración, comparación de signature+intent BOUND+plan, cubrir ventana de transacciones completa, reembolsos/disputas y aceptación P06 prospectiva.
2. Calcular obligación contractual del primer período y conciliación financiera idempotente; no inferir ciclo de `ACTIVE` ni de `next_billing_time` aisladamente. Revisión legal de términos ES/EN, cancelación, entrega del acuse, retención, disputas y backups.
3. Nueva aprobación del PO para habilitar `p05_inbox_worker_gate.enabled` con cutoff prospectivo exacto (históricos no aptos). GO separado para new Sandbox buyer, acreditación de pagos/beneficios, Live y merge.
4. No publicar compra de Amigo hasta la validación completa. Núcleo PAZO gratuito, precio opcional previsto US$2.99 mensuales.

**Estado final de esta autorización:** `workerEnabled:false`, `paidThrough:null`, `mayGrantBenefits:false`; PR #44 DRAFT.
