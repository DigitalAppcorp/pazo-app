# PAZO F16 — Ledger multirreembolso: arquitectura aprobada, laboratorio aislado

**Fecha:** 2026-10-14. **Aprobación PO:** arquitectura técnica de refund por ID independiente y vínculo a venta original. **NO aprobó** retención contable, periodo de cobertura, efectos sobre beneficios de reembolsos parciales, SQL alojado, worker, PayPal Live, checkout o merge. PR #44 permanece DRAFT.

## Contrato construido sin desplegar

**SQL DRAFT exclusivamente PostgreSQL 17 descartable:**

- `supabase/queries/f16_refund_multievent_ledger_lab_DRAFT_DO_NOT_APPLY.sql` define `supporter_private.f16_lab_refund_events`: una fila privada por `refund_id` único, con ID de evento de PayPal, `original_sale_id`, `subscription_id`, USD, centavos, estado de PayPal y timestamp verificado. Sin pagador, email, tarjeta ni cuerpo de webhook.
- `supporter_private.f16_lab_refund_sale_holds` mantiene una fila bloqueadora por venta original **y su suscripción exacta**, importe acumulado de refunds únicos, contador de refunds y estado `partial` o `full`. Existe aunque la venta original aún no esté registrada. Un reembolso de otra suscripción BOUND no puede mezclarse con ese hold, y la venta tardía con suscripción ajena también debe fallar atómicamente.
- `public.f16_lab_commit_claimed_refund` exige lease UUID vigente, evento privado verificado `PAYMENT.SALE.REFUNDED`, firma/validación anterior realizada por servidor, intención `bound` a suscripción, moneda/centavos exactos y suma total no superior a 299. `PARTIALLY_REFUNDED` solo si el acumulado es menor a 299; `REFUNDED` solo cuando alcanza exactamente 299. Inserción de refund + hold de venta + bloqueo del ledger antiguo si existe + ACK son **una transacción**.
- `public.f16_lab_commit_claimed_sale_v2` reutiliza la validación lease-bound de venta, y con la misma llave de advisory lock consulta hold previo para finalizar `blocked_reversal` si existió un refund antes que la venta. Las dos funciones financieras LAB antiguas de service_role (sale y reversal) se revocan **dentro de la misma transacción de instalación DRAFT**; no deja una vía para saltarse el bloqueo por refund. Las viejas RPC alojadas continúan sin modificar y son inseguras para un worker.
- Dos lectores privados actualizados en `supabase/queries/f16_refund_multievent_readers_lab_DRAFT_DO_NOT_APPLY.sql`: las consultas de reversos conocidos detectan nuevos refunds y orphan refunds; la revisión de baja de cuenta cuenta los refunds vinculados por intención privada, incluso antes de registrar una venta.
- RLS forzado y acceso directo denegado a `anon`, `authenticated` y `service_role` para ambas tablas. RPCs `SECURITY DEFINER` owner postgres, `search_path` vacío, solo `service_role` autorizado.

**Código server-only preparado:** `privateProviderProofFlow.mjs` conserva el refund ID y centavos obtenidos del GET PayPal Sandbox independiente. El estado de la transacción se interpreta como **acumulado**, no como el importe de ese refund individual. `privateLabRpcStores.mjs` envía `p_refund_id`, `p_refund_minor` y estado exacto al RPC v2, y utiliza la escritura de venta v2. Ninguno se importa en el worker hosted ni concede entitlement.

## Pruebas y límites

- `supabase/tests/supporter/f16-refund-multievent-ledger-synthetic.sql` ensaya refund 100 centavos + 199 centavos, replay de refund ID, exceso sobre 299 bloqueado sin ACK, intento entre suscripciones distintas, refund completo antes de venta, venta tardía bloqueada, lease inválido y RLS, terminando con ROLLBACK.
- `supabase/tests/supporter/f16-refund-multievent-readers-synthetic.sql` protege la lectura de refund previo a venta durante borrado de cuenta; evita retornar un historial falsamente vacío.
- `scripts/f16-refund-multievent-concurrency.mjs` usa exclusivamente la DB PG17 de GitHub Actions para carreras 100+199, reintento seguro tras orden invertido y doce llamadas concurrentes contra el mismo token/refund ID.
- Suites Node verifican payload de refund ID/importe, respuesta `refund_recorded_partial`/`refund_recorded_full`, ausencia de beneficios y sanitización de fallos.

**Este ensayo no comprueba una API PayPal real, no valida credenciales del proveedor, no fija periodos pagados y no reemplaza revisión legal de retención.** Los registros actuales de PayPal alojado siguen pendientes y no vinculados a Auth. La función `PAYMENT.SALE.REVERSED` continúa bloqueada por falta de corroboración externa independiente. Ante errores, devoluciones fuera de orden o historial incompleto, los eventos quedan retenidos para reconciliación, sin autorizar membresías.

## Verificación de HEAD técnico

Commit técnico `6de032f561ce5a6b061c48d7b41321707e3b4ac7`:
[CI general SUCCESS #38644980684](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38644980684) y
[F16 Disposable PostgreSQL Lab SUCCESS #38644980867](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38644980867).

Los test nuevos incluyen concurrencia de refunds, paso parcial → total, deduplicación del mismo refund ID, intento de exceso sobre 299 centavos, error de lease, asociación explícita a suscripción BOUND, prohibición de mezclar dos suscripciones en un mismo hold, refund previo a venta, lectura conservadora de orphans y revisión privada de bajas de cuenta. El lector conserva `NULL` ante incertidumbre global; el test no debe usar SELECT directo sobre `supporter_private` desde service_role. La CI confirma las ACL restrictivas.

Un fallo intermedio fue causado por duplicación de SQL después de `COMMIT` durante edición textual; corregido y validado antes del resultado final. El PG lab muestra que la función SQL está contenida una sola vez. No hubo ninguna operación en Supabase hosted.

## Lo que falta para autorizar hosted

1. Resolver retención/anonimización financiera y bajas, política P06 de cobertura y consecuencias de parcial/total/disputa. Una fila financiera `refund_recorded_partial` **no** concede ni revoca automáticamente beneficios.
2. Confirmar compatibilidad actual de PayPal GET SALE/REFUND, incluidos Payments v1 depreciados, y alcance del historial de disputas. Aprobar un E2E Sandbox **nuevo** con intención Auth realmente vinculada; nunca atribuir los cuatro eventos anteriores a un usuario.
3. Versionar cambios finales mediante Supabase CLI solo con GO de creación de migración y desplegar únicamente bajo **otro GO explícito**, con revocación atómica de RPC financieras antiguas, permisos verificados y observación de errores/retención.
4. Sin checkout real, Live, beneficios, badges, worker, cron, merge ni Vercel hasta sus gates separados.

**F16 EN CURSO — PR #44 DRAFT — beta pública NO-GO.**
