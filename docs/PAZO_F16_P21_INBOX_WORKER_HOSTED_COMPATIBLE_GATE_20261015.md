# PAZO — F16-P21: worker de reconciliación preparado para esquema real

**Fecha:** 2026-10-15. Rama `f13/section-titles-20261012`, PR #44 DRAFT. El PO autorizó continuar desarrollo, no desplegar un worker financiero ni cobrar. PAZO core gratis; Amigo voluntario US$2.99/mes permanece desactivado.

## Hallazgo real

La subscripción antigua estaba vinculada a una cuenta descartable `@example.com` sin consentimiento P06 ni mascota. No requiere recuperar esa cuenta ni procesar los 8 eventos QA. En Supabase alojado el inbox contiene **8 eventos pendientes**, **0 ofertas publicadas**, **0 consentimientos P06**, **0 entradas de pagos**. No existen en hosted ni `p05_claim_token` ni `p05_inbox_worker_gate`.

## Entrega tangible

El nuevo borrador `supabase/drafts/f16_p21_hosted_compatible_inbox_worker_DO_NOT_APPLY.sql` verifica que ya existan las columnas de reintentos, holds y estado propias de hosted, añade exclusivamente el campo UUID de lease, instala un gate de despliegue cerrado por defecto y RPCs privilegiadas solo `service_role` para reclamar/leer/finalizar mediante retry o review. Una transacción SQL de laboratorio implementa aislamiento, validación previa y revocación de privilegios. Este **NO ES un archivo de migración apto para ejecutar directamente en hosted**: su guard impide salir de `f14_synthetic`.

El script `scripts/f16-p21-verify-staged-worker.mjs` confirma equivalencia exacta de las RPCs con las previamente auditadas en P05. La fixture `p21-existing-hosted-inbox-fixture.sql` solo simula el catálogo alojado; la tabla auxiliar de reviews es exclusivamente necesaria para aserciones heredadas. `p21-no-historical-processing-synthetic.sql` introduce ocho eventos antiguos sintéticos y uno nuevo: comprueba bloqueo OFF, cutoff temporal, lease único, fallo de token falso, cuarentena y ledger cero.

**Verificación:** commit [d4aeac5](https://github.com/DigitalAppcorp/pazo-app/commit/d4aeac5ff0061071e93c1e7f458a5018c23a3c55) con **CI general SUCCESS + laboratorio F16 SUCCESS + job `f16-p21-worker-schema-rehearsal` SUCCESS**. Las dos correcciones previas fueron de un nombre ambiguo PL/pgSQL y la fixture del período; nunca se ejecutaron sobre la base real.

## Operación pendiente para una suscripción cobrable

1. PO debe dar un **GO explícito solo para instalar el esquema P21 en Supabase Sandbox con gate OFF**, previa migración versionada con Supabase CLI y auditoría de bloqueo/privilegios. Escribir esquema NO significa activar el worker.
2. Conectar de manera privada claim con event GET/transaction GET OAuth Sandbox, comprobar el vínculo owner+intent+custom_id y los refund/reversal/dispute y evidencia del período, y persistir de forma atómica y con idempotencia. El worker P05 actual solo produce REVIEW/RETRY, nunca `processed` o pagos.
3. Antes de buyer nuevo: finalizar términos ES/EN, entrega del acuse, cancelación, calendario de conservación, obligación contractual de primer mes, pruebas de saldo pendiente y cobertura global. No retroacreditar la QA antigua.
4. GO independiente para activar en Sandbox con cutoff prospectivo, para buyer descartable, para acreditar beneficios y posteriormente para Live/merge. Ninguna de esas autorizaciones fue otorgada en P21.

`paidThrough=null`; `mayGrantBenefits=false`. Los previews automáticos permanecen permitidos.
