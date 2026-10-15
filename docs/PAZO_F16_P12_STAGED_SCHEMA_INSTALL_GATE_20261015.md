# PAZO F16-P12 — SQL staging para instalación alojada (todavía NO autorizada)

**Fecha:** 2026-10-15. PO: «ok sigamos» = preparar y probar, **NO** ejecutar SQL alojado ni activar PayPal. PR #44 DRAFT, PAZO core gratuito, Amigo opcional $2.99/mes.

## Entregables

- `supabase/drafts/f16_p12_staged_install_REQUIRES_PO_GO.sql`: candidato transaccional que une exactamente P06/P07, P08 y P10. Por defecto **ABORTA** excepto en PostgreSQL `f14_synthetic` con bandera descartable o, después de GO independiente, PostgreSQL alojado con bandera de operador. Esta bandera no demuestra autorización legal o técnica; tampoco hay versión de migración Supabase CLI todavía.
- `scripts/f16-p12-build-staged-install.mjs --verify`: prueba determinista de que el candidato coincide con los borradores revisados y rechaza cambios de código SQL sin revalidación.
- `.github/workflows/ci.yml`: job totalmente aislado con PostgreSQL 17.11, restauración de catálogo y base privada sintética, ejecución del SQL candidato y pruebas P06 y P10. Ningún acceso remoto.
- Condiciones de entrada instalador: contexto PostgreSQL correcto, roles postgres/admin, RLS/tabla privada e índice único de IDs PayPal, extensión pgcrypto; sin funciones/tabla P06 instaladas. Condiciones de salida: tablas nuevas RLS/FORCE, ningún `EXECUTE` anon/auth, funciones solo service-role, ninguna oferta legal publicada, cero intentos nuevos y guard `wall_has_verified_entitlement=false`. Ejecuta todo o revierte todo (una transacción).

## Verificación hospedada solo lectura anterior

Proyecto `mrybvqdebbgcayuvgkkr`, PostgreSQL 17.11, pgcrypto en `extensions` y constraint de ID PayPal único. P06 offers/checkout no instaladas, 1 intent BOUND histórico, 8 eventos PENDING, 0 ventas en ledger, 0 reversos. Edge `f16-paypal-webhook` v13 sin worker financiero. No se ejecutó el instalador alojado.

## Condiciones todavía exigidas ANTES DE APLICAR

1. Revisión final legal/retención P01–P09 y texto de Amigo PAZO ES/EN. El candidato deja tablas de ofertas **vacías** y NO habilita checkout.
2. GO explícito PO para alterar la base alojada con nombres y versión exacta, aprobación de retención y plan de copia/rollback; ejecutar `supabase migration new` mediante Supabase CLI y versionar artefacto antes de SQL real, no inventar timestamp.
3. Después de GO, comparar catálogo de funciones y revocaciones, confirmar sin gastos, revisar el usuario administrador técnico con menor alcance posible y registrar versión/resultado aplicado. Nunca ejecutar directamente la forma `DO_NOT_APPLY`.
4. GO distinto para Edge Auth + rate-limit, buyer PayPal Sandbox y conciliación refund/dispute, cancelación y ledger/paidThrough. No habilitar Live con un éxito de CI.

**Gate de producto:** el sistema todavía NO puede cobrar ni acreditar períodos: el worker de conciliación y la cobertura de disputas no están conectados. Queda prohibido tratar una suscripción ACTIVE, una coincidencia `custom_id` o 8 eventos históricos como pago periodificado.

**Producto:** PAZO siempre gratis; Amigo voluntario $2.99/mes, renovable y cancelable tras aprobación final de términos.
