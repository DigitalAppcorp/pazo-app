# PAZO F16-P05 — Fenced finish de inbox: RETRY o revisión (DRAFT)

**Fecha:** 2026-10-15. **Product Owner:** «ok sigue», alcance autorizado: avanzar sólo SQL de laboratorio/CI, no ejecutar en hosted ni operar contra PayPal. **Rama:** `f13/section-titles-20261012`, [PR #44](https://github.com/DigitalAppcorp/pazo-app/pull/44) DRAFT; F16 pagos NO-GO. Producto base gratuito; Amigo de PAZO opcional.

## Qué quedó implementado

El borrador protegido `supabase/drafts/f16_p05_inbox_claim_v1_DO_NOT_APPLY.sql` (fuera de `supabase/migrations`, guardado explícitamente a PostgreSQL desechable `f14_synthetic`, usuario `f14_admin`, rol `postgres`) contiene un tercer procedimiento, exclusivamente de servicio:

`public.f16_p05_draft_finish_claimed_event(p_event_id,p_claim_token,p_outcome,p_reason_code)` → boolean.

**Fencing real del resultado:** sólo modifica la fila si coinciden event ID + token actual, está `processing`, la reserva no ha vencido, rollout habilitado y `verified_at >= not_before`. De lo contrario retorna `false` sin atribución ni escrituras. La transición es atómica en PostgreSQL; tokens caducados o reclamados por otro trabajador no son válidos.

**Resultados permitidos en ESTA etapa:**

| Resultado | Comportamiento | Motivos autorizados |
|---|---|---|
| `retry` | Devuelve `pending`, borra token, fija reintento con backoff `min(60,2^attempt_count)` minutos, conserva `retention_hold=true`. Al llegar al quinto intento se convierte en `quarantined` con `retry_exhausted` | `merchant_unavailable`, `read_unavailable`, `temporarily_incomplete` |
| `review` | Pasa a `quarantined`, borra token, mantiene `retention_hold=true` y registra código fijo sin PII | `foreign_reference`, `missing_evidence`, `reversal_possible`, `cycle_unproven`, `manual_review` |

Cualquier otro outcome, razón arbitraria, email en error o `NULL` se rechaza. **No existe** outcome `processed/success` en este borrador, ni se escribe `processed_at`, `reconciled_payment_id`, `paypal_payment_entries`, `paypal_payment_reversals`, `paidThrough` ni entitlement. Una correlación merchant favorable sigue siendo candidata y se revisa, sin conceder beneficios.

**Seguridad:** función `SECURITY DEFINER` con `search_path=''`, `EXECUTE` sólo para `service_role` después de `REVOKE ALL FROM PUBLIC/anon/authenticated` dentro de la misma transacción; tabla privada sin SELECT/UPDATE directo. Para futura instalación, evaluar ejecutar desde esquema no expuesto y con identidad de servicio específica, no exponer la clave `service_role` al navegador. El rollout está **apagado** por defecto y un `not_before` prospectivo excluye todos los eventos históricos de prueba.

## Pruebas y límites de verificación

- `supabase/tests/supporter/p05-inbox-finish-synthetic.sql` verifica reintentos, espera futura, re-clamación con UUID distinto, stale finish, review, quinto intento, lease vencido, gate apagado, código arbitrario/`NULL`, cero registros contables o beneficios.
- `supabase/tests/supporter/p05-inbox-claim-security.sql` exige **tres** RPC de servicio con search_path fijado y sin privilegios para usuarios públicos; conserva RLS.
- `.github/workflows/ci.yml` ejecuta todo en el PostgreSQL efímero, además de `scripts/f16-p05-inbox-claim-concurrency.mjs` con dos sesiones reales (la prueba de concurrencia se refiere a claim/lock; la prueba de finish usa casos SQL secuenciales).
- **CI SUCCESS y F16 Disposable PostgreSQL Lab SUCCESS** verificados en commit [c5d83398](https://github.com/DigitalAppcorp/pazo-app/commit/c5d83398b0d8881f0dbbb7fc41b5e9b77f567d3a). El primer intento falló por sintaxis introducida en código; se reconstruyó el SQL desde la última versión aprobada y se corrigió después la continuación de comandos de CI. No ocultar estos fallos en el historial.

## Bloqueos vigentes y siguiente gate

1. **ACK de conciliación exitosa NO implementado:** antes de marcar `processed` debe existir prueba autenticada/evento PayPal ↔ merchant sale ↔ sub/intent BOUND ↔ obligación PAZO primer período, con cobertura confiable de reintentos/deudas, refunds/disputes e idempotencia transaccional. El nuevo finish sólo controla **retry/review**, de forma deliberada.
2. Una cola at-least-once no garantiza entrega completa, orden temporal ni ausencia de webhook perdido. Necesitamos definir captura/alertas/reconciliación futura desde alta, reglas de out-of-order y reversals.
3. Retención P01–P04/P09 de evidencia contractual, contabilidad, disputa, eliminación de cuenta y backups; términos CA bilingües, cancelación online y acuse conservable siguen pendientes de revisión legal/PO.
4. No existe worker desplegado: lectores PayPal/Supabase siguen inactivos; ninguna llamada PayPal real se hizo en este gate. La única compra Sandbox anterior permanece cancelada y **no** se procesa el inbox histórico.
5. La siguiente entrega técnica permitida es un **contrato offline de orquestación fail-closed** entre `claim`, GET PayPal, validación y `finish(retry|review)` con mocks y guardias contra pagos. Convertir a migración formal/despliegue requiere **GO PO independiente**, pruebas de carga/bloqueo/RLS, aprobación de retención y security review; Live/pagos/beneficios requieren gates adicionales.

**Estado financiero:** `cycleVerified:false`, `periodStart:null`, `periodEnd:null`, `paidThrough:null`, `mayRecordPayment:false`, `mayGrantBenefits:false`.
