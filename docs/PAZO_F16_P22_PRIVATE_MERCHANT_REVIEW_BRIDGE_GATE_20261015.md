# PAZO F16-P22 — Worker privado de revisión, compuesto y comprobado offline

**Fecha:** 2026-10-15. **PR #44 DRAFT.** El Product Owner indicó «ok sigamos», sin nueva autorización de ejecutar operaciones financieras alojadas. P21 instalado con gate OFF, sin cron ni buyer nuevo; PAZO completamente gratis, Amigo opcional US$2.99/mes todavía no contratable.

## Cambio técnico real

1. **`p22PrivateLeaseRpcAdapter.mjs`:** transporte PostgREST con credencial `service_role` confinada a servidor. Llama exclusivamente a `f16_p05_draft_claim_next_verified_event`, `f16_p05_draft_read_claimed_event`, `f16_p05_draft_finish_claimed_event` y, **en laboratorio** (no existe todavía en Supabase alojado), `f16_p22_resolve_bound_under_claim`. Comprueba contratos de respuesta, UUID, fecha UTC, suscripción PayPal y plan, campos exactos, eventos y estados esperados. No incluye DML directos ni consulta general de usuarios; ninguna credencial llega al cliente.
2. **`supabase/drafts/f16_p22_claim_scoped_bound_intent_DO_NOT_APPLY.sql`:** función propuesta `SECURITY DEFINER, search_path=''`, EXECUTE únicamente a service_role. Bajo gate P21 enabled con cutoff explícito, exige reserva vigente de un evento SALE.COMPLETED verificado, estado processing, retention_hold y coincidencia exacta con un intent BOUND de proveedor y plan correcto. Devuelve solo la relación owner/intent/sub para el worker interno; no contacto ni payer email. Tiene guard que **impide instalación hosted** sin migración y GO separado. No altera pagos ni concede beneficios.
3. **`p22SandboxReviewWorker.mjs`:** reusa tres módulos auditados P05, obliga a modo explícito de prueba `OFFLINE_SYNTHETIC_TEST_ONLY` y retorna DISABLED por defecto. La lectura merchant llama OAuth token POST, GET de webhook y GET de suscripción en `api-m.sandbox.paypal.com` sin POST de compra ni cancelación. Una coincidencia válida es **sale correlated candidate**, no mensualidad pagada. El último estado de orquestación es `review/cycle_unproven`, RETRY cuando la evidencia no está disponible o REVIEW si hay referencia ajena/reverso. No existe worker desplegado, cron, scheduler ni ledger writer.

## Evidencia automatizada

- **Node:** `src/features/supporter/testing/f16P22SandboxReviewWorker.test.mjs`: default no-op, credencial y rutas RPC permitidas, transacciones PayPal solo GET tras OAuth, identidad BOUND exacta, muestra de venta 2.99 USD que se envía a revisión, foreign binding bloqueada, y diagnósticos sin secretos.
- **PostgreSQL:** `supabase/tests/supporter/p22-claim-scoped-bound-intent-synthetic.sql`: RPC instalada exclusivamente en base descartable con P21; no funciona cuando gate OFF ni ante token falso, intent ajeno o sub ajena; devuelve relación exacta solo bajo claim vivo; al finalizar review no puede volver a leer la reserva; ledger en cero. Job de CI `f16-p21-worker-schema-rehearsal` instala el draft bajo PG17 desechable.
- **Checkpoint técnico [21662dd](https://github.com/DigitalAppcorp/pazo-app/commit/21662dd098bd08ee43c0e6c78ce139cdf43a758b):** CI general SUCCESS; F16 Disposable PostgreSQL Lab SUCCESS; job F16 P21/P22 rehearsal SUCCESS.

## Estado real (consulta solo lectura)

Supabase `mrybvqdebbgcayuvgkkr`: `enabled=false`, `not_before=NULL`, 8 eventos pending sin lease, 0 pagos, 0 reversos, 0 ofertas y 0 aceptaciones nuevas. RPC P22 **no instalada**. No han cambiado los webhooks, Edge Function ni Vercel manualmente.

## Trabajo siguiente y criterios de liberación

**No instalar / no desplegar automáticamente** este módulo ni presentar prueba sintética como corroboración de comercio real. Antes de cualquier sale ledger es imprescindible un contexto server-owned de contrato/owner/consentimiento, PayPal original transaction history completo, atribución inequívoca de obligación contractual, verificación de reembolsos, disputas y reversos, idempotencia y retención financiera/legal aprobada. El mecanismo actual no procesa ni remunera; es un **puente seguro de revisión**.

Un futuro GO de PO para instalar P22 solo RPC read-only tampoco sería GO para habilitar P21 worker, comprador Sandbox, checkout, beneficios o Live; esas autorizaciones son separadas.
