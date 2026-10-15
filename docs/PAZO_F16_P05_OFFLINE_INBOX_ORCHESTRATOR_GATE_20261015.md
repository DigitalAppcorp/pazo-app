# PAZO F16-P05 — Orquestador OFFLINE de inbox con salida fail-closed

**Fecha:** 2026-10-15. **Estado:** código de laboratorio + pruebas sintéticas, **NO DESPLEGADO**. Product Owner respondió «ok go» para conectar en *laboratorio* claim → lectura → validación merchant → finish(retry|review), no para hacer cambios hosted, reconciliar dinero, cobrar al buyer, crear ledger/beneficios, desplegar workers o mergear PR #44 DRAFT. Núcleo PAZO gratuito; Amigo de PAZO opcional.

## 1. Componente nuevo

`supabase/functions/f16-paypal-webhook/p05OfflineInboxOrchestrator.mjs` exporta `createP05OfflineInboxOrchestrator(adapters)`, con único método `runOnce()` **sin argumentos**. Todos los adapters son objetos de **mock** o dependencias inyectadas que el módulo NO autentica. El archivo no se importa en la Edge Function activa, un cron ni una ruta UI. **NO se realizaron llamadas PayPal/Supabase** en estas pruebas.

Flujo de una única iteración:

```text
claimNextVerifiedEvent() -> idle / error / claim {eventId,eventType,leaseToken}
    -> verificar forma del claim, procesamiento y timestamps UTC PostgreSQL
    -> readClaimedEvent({eventId,claimToken}) -> cotejar MISMO id/tipo/verifiedAt
    -> revisar clase de evento; refund/disputa/fallo -> REVISIÓN
    -> sólo SALE.COMPLETED: inspectMerchantEvidence({eventId,eventType})
       (el callback del laboratorio no autentica los datos del merchant)
    -> clasificar resultado a destino permitido
    -> finishClaimedEvent({eventId,claimToken,outcome:'retry'|'review',reasonCode})
       -> success boolean true o FINISH_UNCONFIRMED
    -> resultado mínimo SIN evento, venta, sub, dueño, token ni correo
```

El comparador inyectado puede clasificar **sólo** `sale_correlated_candidate`, `reversal_signal`, `foreign_reference`, `insufficient_evidence`, `retryable_outage`, `read_error`, `temporarily_incomplete`. Clases desconocidas/objetos con campos de más van a revisión. Una venta aparentemente concordante se envía a revisión con `cycle_unproven`; **nunca** a `processed`. Fallo transitorio devuelve `retry` y el motivo autorizado. Si `finish` indica false o arroja error, retorna `FINISH_UNCONFIRMED`, no afirma ningún ACK.

**No se usan argumentos del navegador para seleccionar evento, sub o reserva.** La función acepta `runOnce()` sin entradas. Toda derivación real desde el event ID hasta la suscripción debe ocurrir en el entorno de servicio restringido.

## 2. Evidencia y seguridad

- Antes de merchant: `readClaimedEvent` valida la reserva vigente según el contrato; la protección *real* frente a lease vencido queda en la RPC SQL de `finish` que compara token+fecha y puede devolver false. Ningún status financiero depende de un resultado positivo del mock.
- Admitidos timestamps UTC canónicos `Z` o `+00:00`, con hasta seis dígitos decimales, como serialización real `jsonb_build_object(timestamptz)` de PostgreSQL; rechaza offset distinto, segundos/fechas imposibles o microsegundos excedentes. Valida igualdad exacta de `verifiedAt` entre claim/read.
- Tipos `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`, `CUSTOMER.DISPUTE.CREATED` → revisión `reversal_possible`, sin enviarlos al evaluador del primer pago. Eventos de fallo, suspensión o reactivación → revisión `cycle_unproven`. Otros eventos de ciclo → `missing_evidence`, sin cobro.
- Salidas siempre incluyen `sourceAttestedByThisCode:false`, `providerSignatureVerifiedByThisCode:false`, `cycleVerified:false`, `originalRegularCycleProven:false`, `paidThrough:null`, `mayRecordPayment:false`, `mayGrantBenefits:false`, `mayCreatePaidPeriod:false`, `dbWrites:0`, `networkPaymentWrites:0`, `deployAuthorized:false`. No expone referencias identificables ni payload proveedor.
- La función **NO** implementa `processed`, `ACK` positivo, `payPal POST`, pagos reales, retención o historial financiero. `finish` conserva `retention_hold` según el borrador SQL ya probado.

## 3. Pruebas

Archivo `src/features/supporter/testing/f16P05OfflineInboxOrchestrator.test.mjs` ejecutado por `npm run test:f16:synthetic` en CI:

- candidato de venta → `review/cycle_unproven`; refund/dispute/fail → revisión, no crédito;
- sin eventos y rollout apagado, claim/read inválidos, fallo del servicio, clasificación maliciosa (`processed`, `paid`), payload con datos personales;
- error o excepción en `finish`, stale lease simulada, salida sin IDs ni claves privadas;
- timestamps UTC del JSONB PostgreSQL con microsegundos y `+00:00`;
- combinaciones adversariales siempre niegan pago, período o beneficio.

El código reutiliza como interfaz el contrato de `supabase/drafts/f16_p05_inbox_claim_v1_DO_NOT_APPLY.sql` y `p05SandboxMerchantEvidenceReader.mjs`, pero **todavía no existe conexión a funciones deployed ni a PayPal real**. Este resultado es una simulación de orquestación, no auditoría de estado de pago.

## 4. Bloqueos antes de instalación

**BLOQUEO PRINCIPAL — falta un puente de identidad verificable:** el inbox sólo conoce `eventId` y `eventType`; el lector merchant existente pide `intentId`. El worker requiere primero recuperar por GET PayPal el `resource.billing_agreement_id` firmado en evento en su origen, luego resolver ese subscription ID a una intención privada **BOUND** mediante función restringida y comprobar `custom_id/plan/owner/sale`. Actualmente existe `f16_paypal_read_private_intent(p_intent_id)` pero **no** un lector inverso autorizado `subscriptionId→intentId` con claim y provenance. No usar una lista pública de intenciones ni aceptar intent ID de cliente como atajo.

Además faltan: prueba de historial merchant completo (fallos/retry/deudas), revisiones de reembolsos y disputas, idempotencia contable, retención P01–P04/P09, términos legales/consentimiento/acuse durable, cancelación online y gate explícito de migración/worker. Los ocho eventos QA anteriores están excluidos; no reconstruir retrospectivamente su contrato.

**Siguiente paso recomendado**: diseñar y probar en PostgreSQL desechable la función mínima de lectura privada por `external_subscription_id` asociada a un `eventId/claimToken` bajo `service_role`, junto a un mock del refetch merchant, con resultado DENY en caso de divergencia. Preparar toda migración como DRAFT, sin instalarla sin GO específico.
