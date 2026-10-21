# PAZO F16 — Adaptadores RPC privados en laboratorio

**Fecha:** 2026-10-14. **Estado:** PASS offline / NO-GO hosted. PR #44 Draft.

## Implementación y resultados

- `supabase/functions/f16-paypal-webhook/privateLabRpcStores.mjs`: implementa `leaseStore`, `financeStore`, `loadPrivateBoundIntent` y `loadKnownReversalIds` con un cliente RPC inyectado. Usa exclusivamente nombres `f16_lab_*` y requiere selección explícita de la base descartable `f14_synthetic`. No hay fallback a RPC antiguas sin lease.
- `supabase/queries/f16_private_proof_reads_lab_DRAFT_DO_NOT_APPLY.sql`: dos lectores service_role-only para intención `bound` por suscripción y reversos conocidos. Devuelve `NULL` cuando hay tombstones sin pago original o webhooks REFUNDED/REVERSED aún pendientes. `NULL` significa estado desconocido, **nunca** ausencia de reversos.
- `src/features/supporter/testing/f16PrivateLabRpcStores.test.mjs`: verifica contrato exacto, token vigente, monto USD 2.99, propietario, resultados permitidos, errores saneados y denegación sin consentimiento financiero.
- `supabase/tests/supporter/f16-private-proof-reads-synthetic.sql`: verifica ACL, row projection, rechazo de referencias ilícitas, reversos huérfanos y eventos pendientes, con ROLLBACK en PostgreSQL 17 descartable.

**Evidencias de HEAD técnico `7b50298f4653cfb4862e586645e8ce32b20f04a1`:** [CI general SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38574613614) y [F16 PostgreSQL 17 SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38574613732). Hubo un fallo anterior en el validador UTC del propio adaptador; corregido sin ampliar permisos, con ambas suites posteriormente PASS.

**Supabase alojado READ ONLY:** 4 eventos PayPal firmados pendientes; intents, pagos, reversos y consentimientos = 0. Ninguna RPC `f16_lab_*` está instalada allí. No se procesó ni modificó ningún evento real.

## Límites y próximo gate

Los tests Node utilizan un cliente RPC simulado y respuestas falsas de PayPal/Auth; la base PG17 sí ejecuta SQL real en un entorno aislado. Esto NO es una conciliación PayPal real ni una prueba de PostgREST alojado. La lista vacía de reversos del ledger tampoco garantiza que PayPal no haya emitido un reembolso. Las RPC financieras antiguas instaladas en Supabase continúan sin exigir lease; NO conectarlas al worker.

Antes de cualquier worker/alojado hacen falta un plan de migración atómica que revoque rutas antiguas, validación real PayPal + Auth vinculada, revisión de API Payments v1 depreciada, tratamiento de disputas y reversos, retención de intents/ledger/tombstones, borrado de cuentas y cálculo del periodo pagado. Solicitar GO específico al Product Owner antes de generar/aplicar migración hosted, Edge/cron, prueba financiera adicional, checkout, Live, entitlements o merge. F16 sigue EN CURSO, PR #44 DRAFT.
