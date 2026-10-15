# PAZO F16-P05 — Revisión del esquema SQL privado v1 (DRAFT / NO APLICAR)

**Fecha de trabajo:** 2026-10-14. **Product Owner:** «ok go» autorizó preparar el diseño versionado para revisión, **no aplicación alojada**. **Rama:** `f13/section-titles-20261012`; PR #44 DRAFT, F16 beta de pagos NO-GO.

## Entregable exacto

- `supabase/drafts/f16_p05_private_prospective_evidence_v1_DO_NOT_APPLY.sql` — **borrador real de DDL, no una migración instalable**. Ubicación intencional fuera de `supabase/migrations`; incluye guardia de `current_database='f14_synthetic'`, `session_user='f14_admin'`, `current_user='postgres'` para rechazar cualquier intento de aplicarlo en otro destino.
- `supabase/tests/supporter/p05-disposable-parent-fixture.sql` — reconstrucción desechable de las claves alojadas auditadas, sin datos reales.
- `supabase/tests/supporter/p05-draft-security-metadata.sql` — comprueba propietarios, RLS activada y FORCED, ausencia de policies/grants a `anon`, `authenticated` y `service_role`, restricciones FK, índice único de venta y ausencia de campos de beneficio.
- `supabase/tests/supporter/p05-draft-synthetic-cases.sql` — inserta ejemplos sintéticos en transacción con `ROLLBACK`, verifica idempotencia, relaciones, intervalos positivos, prevención de reutilización de una venta y estados de revisión fail-closed.
- `.github/workflows/ci.yml` — añade exclusivamente un paso dentro del PostgreSQL desechable `f14_synthetic`; **nunca** establece conexión al Supabase alojado.

## Las tres tablas nuevas (aún no existen en PAZO hospedado)

| Tabla | Evidencia mínima | Claves/gates |
|---|---|---|
| `paypal_terms_acceptances` | `intent_id` FK, versión, SHA256 de contenido aceptado, versiones de avisos, idioma, canal, presentación/aceptación servidor | PK por intento, retención segura con FK `ON DELETE RESTRICT` para no eliminar inadvertidamente prueba legal |
| `paypal_activation_schedule_evidence` | `external_subscription_id`, evento activación, activación, fecha merchant observada y siguiente facturación original | PK por suscripción, `activation_event_id UNIQUE` + FK, checks de cronología |
| `paypal_first_period_reviews` | `external_subscription_id`, `external_payment_id`, `sale_event_id`, límites candidatos y motivo de revisión | PK suscripción, UNIQUE venta, UNIQUE evento de venta, estado restringido a `pending/requires_review/rejected` |

**Diseño de privacidad:** no se duplican las tablas reales `paypal_subscription_intents`, `paypal_verified_event_inbox`, `paypal_payment_entries` o `paypal_payment_reversals`. No se almacenan tarjetas, nombres/correo PayPal, cuerpos webhook, IP, ni credenciales. No existe campo `paidThrough`, `approved`, indicador de beneficios, nueva función SECURITY DEFINER, políticas permisivas, triggers, worker ni borrrado automático. Las tres tablas están protegidas por `ENABLE + FORCE ROW LEVEL SECURITY`, sin policies y con `REVOKE ALL FROM PUBLIC,anon,authenticated,service_role`.

**Orden futuro correcto:** servidor autentica al usuario → crea intent pendiente → guarda aceptación expresa versionada con fuente confiable → *solo entonces* crea sub PayPal → BOUND verificado → activation merchant event + snapshot → sale merchant verificado → una fila de revisión sin crédito. No utilizar los 8 eventos históricos pending para crear coberturas.

## Qué NO garantiza este borrador (bloqueos antes de producir migración instalable)

1. **Integridad intertabla de identidad:** FKs separadas comprueban existencia de suscripción/venta/evento pero **NO prueban que esas tres referencias pertenecen al mismo contrato** ni el tipo del evento. El futuro servidor debe validar `owner_id` del intento, plan y `custom_id`, y certificar `saleId + external_subscription_id + original cycle` mediante GET merchant/firmas. Antes de cualquier GO hosted se debe revisar si añadir índices compuestos/constraints atómicos al esquema real para que la DB también haga cumplir esas relaciones. No es aceptable conceder beneficios basándose solo en la inserción de `paypal_first_period_reviews`.
2. **Procedencia criptográfica:** un FK a `paypal_verified_event_inbox` únicamente prueba que el evento tiene un ID registrado, no su payload firmado ni la asignación de venta a ciclo. El inbox hosted guarda `provider_event_id, event_type,verified_at` mínimos. Si refetch merchant no basta para conocer ciclo regular/deuda, `REVIEW_REQUIRED`.
3. **Inmutabilidad:** una tabla no expuesta no garantiza append-only para administradores. La nueva RPC (futuro GO) deberá usar inserción idempotente y prohibir UPDATE a evidencia contractual. Nada se ha instalado aún.
4. **Retención y eliminación:** verificación de consentimiento aplicable CA BPC §17602(a)(6) requiere `max(acceptedAt+3 años,terminatedAt+1 año)` mínimo, sujeto a interpretación legal. No se ha definido conservación fiscal del ledger, reversals, backups, desligar identidad tras eliminación de cuenta o manejo de holds. La FK `ON DELETE RESTRICT` puede bloquear borrado de un intento; **debe existir procedimiento de disociación/archivo autorizado antes de habilitar recopilación**, no simplemente borrar la FK ni purgar aceptación.
5. **Producto y cumplimiento:** contratos ES/EN definitivos, cancelación online, acuse durable, recordatorios, aviso cambios de precio y renovación posterior siguen abiertos. No ejecutar PayPal Sandbox buyer de nuevo.
6. **Migración formal:** la skill Supabase requiere crearla con `supabase migration new <nombre>` y reconciliar el esquema contra live bajo autorización **posterior**. Este archivo NO tiene timestamp ni ruta de migraciones precisamente para no aplicar inadvertidamente. Probar migración real en un proyecto/DB desechable y pasar security advisors antes de pedir el GO de hosted.

## Gates finales de aprobación

**Hecho:** SQL DRAFT y pruebas en PostgreSQL disposable; CI del commit con integración confirma solo sintaxis, constraints y seguridad **en el entorno sintético**, no instalación en hosted.

**Pendiente para migración alojada:** políticas legales/retención P01–P04/P09 y forma de eliminación; contrato de source attestation y relación sale-subscription-firstCycle; verificar que límites de fecha contractuales están explícitos en Terms; un DDL definitivo con claves de identidad fuertes; autorización explícita PO de aplicación; auditoría read-only preflight y verificación posterior. Ni el PO «ok go» actual ni un CI PASS validan esos gates automáticamente.

**La app central continúa gratuita y Amigo de PAZO permanece opcional.**
