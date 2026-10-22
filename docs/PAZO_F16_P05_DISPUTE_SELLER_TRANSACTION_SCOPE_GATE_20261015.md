# PAZO F16-P05 — Atribución de disputas por venta real (NO-GRANT)

**Fecha:** 2026-10-15 · **Rama:** `f13/section-titles-20261012`, PR #44 DRAFT. Producto PAZO gratis; apoyo Amigo de PAZO opcional, pagos Beta NO-GO.

## Verificación de fuente pública

PayPal Disputes API v1 documenta `GET /v1/customer/disputes/{id}` y en su respuesta `disputed_transactions[].seller_transaction_id`, que es la **transacción del vendedor**. Esta referencia es más específica que cotejar solo un `dispute_id` o un `payer_id`. La respuesta puede contener datos personales, mensajes, documentos y enlaces; deben descartarse completamente del resultado proyectado.

Referencias: https://developer.paypal.com/api/customer-disputes/v1/disputes-get ; https://developer.paypal.com/api/disputes/ (actualizado julio de 2026).

## Código implementado, sin deploy

**`supabase/functions/f16-paypal-webhook/p05SandboxDisputeMerchantReaders.mjs`** crea un lector de servicio inactivo. Usa host fijo `https://api-m.sandbox.paypal.com`, OAuth `POST /v1/oauth2/token` para autenticación, luego **solo** `GET /v1/notifications/webhooks-events/{eventId}` y `GET /v1/customer/disputes/{disputeId}`; no follow de links devueltos, no POST de compra/captura/disputa/cancelación/reembolso.

Se proyectan exclusivamente `event.id/event_type/resource.dispute_id`, `dispute_id` y `disputed_transactions[].seller_transaction_id` con importe original si está disponible. Se descartan `buyer`, `seller`, emails, `messages`, `documents`, `extensions`, URLs y tokens. Los errores se transforman en códigos fijos sin volcar payloads. **El adaptador no verifica por sí solo la firma del webhook original**: debe ejecutarse exclusivamente después del verificador PayPal instalado. No hay credenciales reales en GitHub; las pruebas usan `fetchImpl` simulado.

**`supabase/functions/f16-paypal-webhook/p05OfflineDisputeScopeResolver.mjs`** conecta por inyección cuatro pasos:

1. Refetch autenticado del evento exactamente en el `eventId,eventType` verificados en el ingreso, y extracción de su `resource.dispute_id`.
2. GET autenticado del mismo dispute ID. Para esta primera versión, exactamente **una** `disputed_transactions[]` con seller transaction ID válida; cualquier caso de transacciones múltiples o ambiguas → `unknown` y revisión externa, nunca asignación arbitraria.
3. Búsqueda **privada** de la venta por `seller_transaction_id` en `supporter_private.paypal_payment_entries.external_payment_id`. Sólo válido con el mismo ID, plan Amigo de PAZO, owner UUID, sub ID, USD 299 unidades menores y estado `uncredited` o `blocked_reversal`. **NO** se exige que haya sido acreditada como mensualidad: sigue siendo solo prueba de pertenencia de un pago.
4. Comprobación de la intención BOUND por sub ID en `supporter_private.paypal_subscription_intents`, con propietario, plan, provider e `intent_id` concordantes.

Solo si **todo coincide** devuelve el token interno `confirmed_pazo`. Todos los demás caminos, incluyendo ausencia de ledger, error de red, disputa parcial o ajena, datos incompletos o mismatch entre owners, devuelven `unknown`: **la ausencia de un registro PAZO no prueba que la operación pertenezca a otro comercio**. No se emite `outside_pazo`, `paidThrough`, `cycleVerified`, beneficio ni escritura financiera. La capacidad de resolver scopes fuera de PAZO deberá justificarse por evidencia distinta antes de habilitar un ACK sin almacenamiento.

La función `core.mjs` sigue con `disputeCaptureApproved=false` y `assessTrustedDisputeScope` sin configurar: el único flujo real desplegado permanece igual que antes. El lector y el resolutor NO están importados en una función alojada.

## Límites actuales estrictos

La base alojada tiene **0 filas en `paypal_payment_entries`** (según última auditoría read-only). Por lo tanto, el resolvedor no puede producir un resultado `confirmed_pazo` contra los datos reales hoy, aunque existan una suscripción BOUND y ocho eventos de pruebas. No rellenar artificialmente un ledger para pasar esta prueba, no reabrir compra cancelada ni inventar evidencia de ciclo regular.

Los callbacks `readPrivatePazoPaymentBySaleId` y `readPrivateBoundIntentBySubscription` permanecen **inyectados y simulados**: no se dispone de una RPC alojada de lectura de ledger acotada. Exponen UUID interno al propio servicio y jamás al navegador. Obtenerla requeriría auditar permisos y crear una RPC service-only con propósito/retención y aprobación de migración propia. Los GET de PayPal también se probaron solo con respuestas simuladas; no se ha habilitado OAuth real desde el worker.

**Pruebas:** `f16P05OfflineDisputeScopeResolver.test.mjs` (múltiples dispute types, pagos ausentes/ajenos, cross-owner, gross, estado reversado, múltiples transacciones, errores y conexión con receptor), `f16P05SandboxDisputeMerchantReaders.test.mjs` (OAuth/GET fijos, retorno mínimo, no PII, inputs maliciosos y unión con scope). CI general y PG desechable no alteran datos reales. Verificar ambos workflows para el último commit técnico antes de declarar PASS.

## Gate operativo siguiente

1. Aprobar propósito y retención legal de disputa (P01–P04/P09), alertas por `503`, manejo de disputas ajenas al comerciante y autorización de acceso al detalle desde PayPal.
2. Revisar una **RPC read-only, service-role-only** para ledger+BOUND intent, sin introducir nuevo acceso público, con auditoría y pruebas de autenticidad/permisos.
3. Solo con GO específico, aplicar migración privada necesaria a Supabase Sandbox; por separado aprobar deploy del receptor, activación de callbacks, webhook PayPal y, al final, captura. Reversos y disputa bloquean beneficios; nunca son un criterio de activación.
4. Aún faltarían primera cuota regular demostrada, debt/retry/refund history completo, términos legales y consentimiento explícito antes de cualquier cobro público.

**Estado:** F16 NO-GO, checkout/entitlements desactivados, ninguna nueva compra ni modificación alojada.
