# PAZO — F16-P42: postflight de infraestructura criptográfica desactivada

**Fecha de aprobación PO:** «sí», para instalar únicamente infraestructura
P42 INERTE: tablas de claves y gate privados, RPC sin permisos de ejecución.
**Fecha de aplicación:** 2026-10-16 (versión asignada por Supabase).

## Instalación autorizada y verificada

- Proyecto: `mrybvqdebbgcayuvgkkr`.
- Migración alojada: `20261016062849_f16_p42_keys_and_writer_inert`.
- Ruta canónica versionada:
  `supabase/migrations/20261016062849_f16_p42_keys_and_writer_inert.sql`.
- `supporter_private.p42_activation_signing_keys`: tabla creada,
  **0 filas/0 claves**, RLS ENABLE + FORCE, sin permisos de DML directos
  para anon/authenticated/service_role.
- `supporter_private.p42_activation_writer_gate`: tabla creada con
  fila única **id=1, enabled=false, not_before=NULL**, RLS FORCE, sin DML
  de los roles de aplicación.
- `public.f16_p42_register_authenticated_activation(...)`: existe con
  SECURITY DEFINER y `search_path=''`; permiso EXECUTE **FALSE** para
  anon/authenticated/service_role (y revocado a PUBLIC).
- `supporter_private.paypal_verified_activation_bindings` (P40):
  **0 filas**.
- `supporter_private.p05_inbox_worker_gate.enabled=false` (P21).
- `supporter_private.paypal_payment_entries`: **0 filas**.
- Inbox **8 eventos** e intents **1**, sin cambios respecto al preflight.
- Ningún secreto criptográfico real generado, almacenado o entregado
  por el chat. Ningún webhook/Edge desplegado ni PayPal invocado.
- Verificaciones previas: CI general `38861314593` PASS y
  PostgreSQL desechable `38861314423` PASS; postflight SQL alojado PASS.

## Bloqueos explícitos que continúan

1. **No autorizar escritura real todavía.** Aprobación de infraestructura
   sellada no equivale a permiso para insertar claves, activar gate,
   otorgar EXECUTE, desplegar Edge o registrar eventos.
2. Custodia y rotación de secretos reales con revisión específica de
   acceso administrativo, backups y procedimiento de compromiso.
   La política `docs/PAZO_F16_P42_HOSTED_DISABLED_KEYS_ROTATION_PROPOSAL_20261016.md`
   sigue propuesta hasta aprobación operativa.
3. Ingesta firmada PayPal en el receptor autorizado, pruebas
   operacionales fuera del laboratorio y conciliación de callback.
4. Revisión legal/contable de conservación P40-P41, cierre contractual,
   legal holds, eliminación de registros, backups y solicitud de
   eliminación de cuenta.
5. Contratos P06, PayPal Merchant GET, refunds/disputes, ciclo contractual,
   ledger idempotente y gates separados de Sandbox buyer/worker/checkout.
6. P28 histórico sigue **DIFERIDO**; F16 **NO-GO**, PR #44 DRAFT.

No habilitar prestaciones o pagos sobre la sola existencia de la RPC.
