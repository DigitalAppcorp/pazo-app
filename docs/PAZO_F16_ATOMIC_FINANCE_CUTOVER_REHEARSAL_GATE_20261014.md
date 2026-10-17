# PAZO F16 — Ensayo de transición financiera atómica

**Fecha:** 2026-10-14. **Estado:** PASS en PostgreSQL 17 descartable, **NO-GO alojado**. PR #44 sigue DRAFT.

## Hallazgos de auditoría alojada (solo lectura)

En Supabase proyecto `mrybvqdebbgcayuvgkkr`, las funciones `public.f16_paypal_commit_verified_sale` y `public.f16_paypal_commit_verified_reversal` todavía conceden ejecución a `service_role`, aunque no verifican token de lease. `anon` y `authenticated` no pueden ejecutarlas; las tablas privadas de inbox, intents, pagos y reversiones tienen RLS habilitado y forzado. Estado leído: inbox 4 registros, todos pendientes; intents 0, payment_entries 0, reversals 0, wall_consents 0. Las funciones `f16_lab_*` aún no existen en alojado. **Ningún cambio ni webhook procesado.**

## Código y evidencia

- `supabase/queries/f16_finance_cutover_preflight_READ_ONLY.sql`: inventario reproducible de ACL, funciones, RLS y conteos agregados sin identificadores personales; `minimum_legacy_cutover_hardening_pass` es deliberadamente falso mientras permanezcan las funciones antiguas ejecutables. Es una señal mínima de permisos, **no** una certificación de readiness de pagos.
- `supabase/tests/supporter/f16-finance-cutover-transaction-rehearsal.sql`: corre solo si base `f14_synthetic`, usuario `f14_admin` y PG17. Dentro de una única transacción recrea **solo en laboratorio** los permisos inseguros, los revoca, comprueba que service_role ya no puede usar los endpoints legacy y verifica propietario, search_path vacío y ACL restringido de las RPC seguras. Genera un único evento/pago sintético para probar claim + ledger + ACK atómico; conserva el hold y ninguna entitlement. `ROLLBACK` restaura la base descartable.
- `.github/workflows/f16-postgres-inbox-lab.yml` ejecuta el ensayo después de la instalación exclusiva de contratos DRAFT, con guardas que bloquean conexiones alojadas.

**Commit técnico `18f63b0d9e7a396c6aa2b6e5ce832c1c8b3cbad6`:** [CI general SUCCESS #38639178499](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38639178499), [F16 Disposable PG17 SUCCESS #38639178815](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38639178815).

## Contrato de despliegue aún pendiente

Una futura migración **oficial generada con Supabase CLI** debe envolver en una misma transacción los nuevos campos de lease, funciones hardened, propietarios/ACL y la **revocación de las dos vías financieras antiguas**; en caso de error, no se debe dejar una instalación parcial. Evitar conceder SELECT/UPDATE directo a `supporter_private`; ejecutar inventario antes/después y verificar denegación de llamadas legacy. No abrir worker, cron o checkout mientras no exista prueba de merchant auténtico PayPal, Auth owner vinculado, intención BOUND, saldo de refunds/disputas, semántica de cobertura y retención.

**Limitaciones:** el ensayo prueba semántica SQL en PG17 descartable. No demuestra comunicación PostgREST real, credenciales PayPal compatibles con APIs Payments v1 depreciadas, retención legal de ledger/tombstones, políticas de borrado o reconciliación real. La RPC vieja de hosted continúa accesible a service_role hasta aplicar un cambio autorizado; no la conectar al worker. Los cuatro eventos PayPal firmados de la prueba anterior se preservan sin procesar.

**Siguiente gate:** completar la matriz de decisiones para retención de información financiera y eliminación de cuenta, confirmar la estrategia de refund/reversal/cobertura, decidir la prueba real Auth + PayPal Sandbox con nueva compra de usuario vinculado y pedir **GO específico del Product Owner** antes de crear/aplicar migración hosted, ejecutar PayPal de nuevo o desplegar Edge/worker/cron. No merge ni Vercel. F16 EN CURSO y beta pública NO-GO.
