# PAZO F16 — Gate de ledger financiero aislado

**ACTUALIZACIÓN VERIFIED HOSTED (2026-10-14 UTC):** el Product Owner autorizó y se aplicaron únicamente las dos migraciones F16 en Supabase `mrybvqdebbgcayuvgkkr`; tablas privadas de eventos, intenciones, pagos y reversos están instaladas, vacías (0 filas), con RLS forzada y RPC de servidor restringidas. Versiones alojadas: `20261014042616_f16_private_verified_event_inbox.sql` y `20261014042646_f16_private_intents_financial_ledger.sql`. NO se desplegaron Edge Functions, NO se modificó PayPal/webhook ni se activaron cobros, períodos pagados o membresías. Las afirmaciones históricas inferiores «NO APLICADAS» se refieren al momento anterior a este gate; NO se deben tratar como estado actual. Retención de ledger e intenciones pendiente.


**Estado:** PASS en PostgreSQL 17 descartable, **solo laboratorio**; NO aplicado al Supabase alojado, no migration, no worker deploy, no entitlement, no cobros Live. Product Owner autorizó continuar ingeniería local, **no** mutaciones alojadas. PR #44 DRAFT, rama `f13/section-titles-20261012`.

## Alcance de laboratorio implementado

- `supabase/tests/supporter/f16-financial-ledger-lab-draft.sql`: SQL de laboratorio con guardia `f14_synthetic`/operador `f14_admin`/PG17 y verificación de inbox previa. Crea dos tablas exclusivamente en `supporter_private`: `paypal_payment_entries` con ID de pago como PK y `paypal_payment_reversals` con tombstone por ID de pago. **Sin emails, tarjetas, tokens, payload de PayPal, cuentas públicas, cobertura ni fechas de renovación.**
- El ledger valida plan Sandbox `P-14V25407JP6850922NLHMDKI`, USD 299 centavos, UUID del titular de fixture, suscripción e ID de pago, fecha. Las únicas situaciones del candidato son `uncredited` y `blocked_reversal`; ninguna confiere beneficio.
- Dos funciones internas del laboratorio: `supporter_private.f16_lab_record_payment(...)` y `f16_lab_record_reversal(...)`. Son `SECURITY INVOKER` y no tienen `EXECUTE` concedido a `PUBLIC`, `anon`, `authenticated` ni `service_role`. No son endpoints accesibles por Data API; sus tablas tienen RLS habilitada y forzada, sin políticas de acceso, con permisos directos revocados.
- `pg_advisory_xact_lock` por ID de pago serializa escrituras concurrentes de pago/reversión. Un reverso llegado antes se almacena y bloquea el pago futuro; si llega después cambia el estado del candidato a bloqueado. Repetir el mismo ID y evidencia es idempotente; repetirlo con suscripción, titular o evidencia contradictoria falla cerrado.
- Se descartan futuras acreditaciones hasta contar con consentimiento, titularidad verificada por backend y período de cobertura de PayPal probado. No existe proceso automático de purga o `DELETE` del ledger; **retención financiera está pendiente de la decisión separada y revisión legal**. La decisión de 90 días corresponde **solo** a IDs de webhooks conciliados, no a este ledger.

## QA real

- `supabase/tests/supporter/f16-financial-ledger-synthetic.sql`: casos de pago/reembolso en ambos órdenes, conflictos de ID, importe/plan inválidos, RLS/grants y nula cobertura. Ejecutado en transacción con `ROLLBACK`.
- `scripts/f16-postgres-ledger-concurrency.mjs`: 25 llamadas simultáneas mediante conexiones separadas, dos IDs únicos de pago y dos tombstones; comprueba estado final bloqueado.
- Workflow `.github/workflows/f16-postgres-inbox-lab.yml` integra los scripts **después** de la prueba del inbox y vista previa de retención aprobada.
- **Evidencia:** GitHub Actions `F16 Disposable PostgreSQL Lab` #38507542554, `completed/success`, log `PASS F16 lab ledger: exact amount, dedup, reversal before and after payment, no coverage`; log `PASS F16 ledger: 25 concurrent payment/reversal calls; two unique payments, two tombstones, no credits`.
- La prueba fue únicamente en contenedor descartable de GitHub, sin URL de DB alojada, sin credenciales PayPal reales.

## Gate pendiente (bloqueante)

1. Reconciliar el **vínculo de titularidad de Auth** mediante una intención privada previamente creada y ligada al ID de suscripción PayPal en servidor; los parámetros sintéticos del laboratorio **NO son prueba de identidad**.
2. Verificar evidencias de devoluciones/chargebacks a través de la API de PayPal, incluso transacciones fuera de orden; construir un worker idempotente con reintentos, fallos explícitos y transacciones ACID.
3. Definir y aprobar retención/borrado separado del ledger, metadatos de reclamaciones y preflight de eliminación de cuenta; no asumir 90 días ni purgar tombstones.
4. Diseñar la extensión versionada oficial mediante **Supabase CLI**, repetir QA de permisos/concurrencia para la migración nueva y presentar gate de autorización PO antes de instalar.
5. No actualizar `supporter_private.wall_has_verified_entitlement`, `profiles.is_founder`, webhook Sandbox ni PayPal Live hasta completar pago real Sandbox E2E y gates de seguridad/producto.

**Regla:** Un pago legítimo confirmado genera inicialmente un **candidato privado no acreditado**. Solo una evidencia válida de cobertura podrá convertirse en beneficio, nunca el estado ACTIVE ni la entrega del webhook por sí solos.
