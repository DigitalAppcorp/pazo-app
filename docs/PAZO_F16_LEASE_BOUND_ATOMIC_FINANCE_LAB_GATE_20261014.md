# PAZO F16 — Financial commit must own the lease (PG17 LAB ONLY)

Fecha: 2026-10-14. PR #44 DRAFT; rama `f13/section-titles-20261012`. Estado: **PASS en laboratorio**, **NO-GO alojado**.

## Qué se construyó

- `supabase/queries/f16_lease_bound_finance_lab_DRAFT_DO_NOT_APPLY.sql` crea dos funciones PostgreSQL **exclusivas del laboratorio descartable**: `public.f16_lab_commit_claimed_sale` y `public.f16_lab_commit_claimed_reversal`. Requieren evento previamente firmado en inbox privado, estado `processing`, `retention_hold=true`, token UUID exacto y `lease_expires_at>clock_timestamp()`. Su `SELECT ... FOR UPDATE` bloquea la fila a través del asiento financiero y el cierre de estado. El token se elimina al cerrar.
- Venta: valida intención privada `bound` con owner/plan/subscription, USD 299 centavos y moneda exactos. Reusa la operación privada existente `f16_private_record_payment`, que serializa por ID de pago e impide duplicados y sobrescrituras. Resultado `uncredited` o `blocked_reversal`, nunca entitlement.
- Refund/reversal: comprueba tipo del evento y usa `f16_private_record_reversal` con idempotencia y tombstone incluso cuando todavía no apareció la venta original. **No sustituye** la verificación de venta original por PayPal hecha en el worker.
- Solo en LAB revoca `EXECUTE` a service_role en las antiguas RPC sin lease y concede nuevas RPC service_role-only, owner postgres y `search_path=''`. No expone tablas privadas ni modifica RLS. Ambas conservan `retention_hold=true`. Ninguna función publica cobertura, insignia ni cambia la decisión de `wall_has_verified_entitlement`.

## Evidencia

- GitHub HEAD técnico `f81eb173ea2a368a8775a04e3e9d146a5d45bfe1` — [CI general SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38566150248), [F16 Disposable PostgreSQL Lab SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38566150262).
- `supabase/tests/supporter/f16-lease-bound-finance-synthetic.sql`: null/wrong/expired/replayed token, owner ajeno, monto incorrecto, lifecycle ≠ pago, bloqueo de antigua RPC, finalización de dos ventas con refund/reversal, reversal antes de venta, fallo antes del commit con rollback de subtransacción, recuperación tras expiración/backoff, privacidad, idempotencia y no-entitlement.
- `scripts/f16-lease-bound-finance-concurrency.mjs`: 32 intentos paralelos sobre cuatro eventos, un commit válido por evento, cuatro asientos; dos eventos adicionales que apuntan al **mismo** pago producen un solo asiento adicional. Total cinco IDs financieros únicos, cero beneficios; contra PostgreSQL descartable de CI.
- Falla anterior de QA [workflow #38565917313](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38565917313): un test intentaba leer la tabla privada directamente bajo service_role y PostgreSQL lo denegó como corresponde. Se corrigió **el test, sin elevar privilegios**; el HEAD técnico posterior pasó PG+CI.

## Lo que NO prueba

No se conectó PayPal ni se pidió checkout o usuario de prueba nuevo, no se confirmó merchant ni propietario Auth mediante API real, no se hizo una caída física de worker/REST ni se autorizó retención financiera. Las salidas de PayPal y los IDs de venta son exclusivamente fixtures. El gate verifica atomicidad local de base, no cumplimiento final de pago/contabilidad.

**Alojado es distinto:** la RPC real `public.f16_paypal_commit_verified_sale` actualmente acepta estados `pending/processing` sin lease; el DRAFT no la cambia en Supabase. No conectar worker a ella, ni a su equivalente de reversal, ni procesar los cuatro webhooks firmados de Sandbox previos. Deberá prepararse una migración versionada con CLI y GO específico PO para retirar la vía legacy junto al alta de contratos nuevos.

## Único gate siguiente

Construir/adaptar offline componente **server-only** que obtenga confirmación de pago original, merchant, subscription/plan, owner verificado por Auth, importe USD 2.99, refund/reversal original y correlación por intención `bound`, después complete lease-bound. Pruebas sintéticas de incertidumbre y caída del proveedor/worker antes de plantear un hosted worker. Decisiones legales de retención, cobertura y cancelación siguen pendientes. F16 NO CERRADA.
