# PAZO F16 — Gate de referencia inbox y reversiones (2026-10-14)

**Alcance autorizado (GO del Product Owner):** continuar implementación de F16 vinculaciones y conciliación, con cambios **solo en GitHub, offline y CI** hasta que haya un gate concreto de despliegue. No habilitar operaciones financieras alojadas ni atribuir los 4 webhooks reales de la compra sin Auth.

## Contratos agregados

- **Fuente de verdad de eventos:** `createF16PrivateInboxDecisionGate({loadVerifiedInbox})` recibe una referencia de evento y vuelve a consultarla contra un lector privado server-only, que deberá obtener solo `provider_event_id,event_type,processing_state,retention_hold` de `supporter_private.paypal_verified_event_inbox`. Ningún cliente de PAZO puede proporcionar el row ni indicar que la firma fue verificada. El adaptador de producción de lectura todavía **no se ha conectado**.
- **Rechazos deterministas:** si proveedor o ID no válido, tipo no suscrito, referencia no presente, cambio de tipo, estado distinto de pending, `retention_hold` no verdadero o DB no disponible, se bloquea; el mensaje de error no transmite IDs privados, PII ni información de DB.
- **Pago de suscripción:** solo `PAYMENT.SALE.COMPLETED` puede ir a conciliación adicional de PayPal; el worker ahora exige primero `inboxGate.inspect`. Una venta legítima sin intención privada de PAZO Auth **bound** sigue bloqueada, no acredita.
- **Cancelaciones y ciclos:** `BILLING.SUBSCRIPTION.CANCELLED`, `EXPIRED`, `SUSPENDED`, `PAYMENT.FAILED` y demás eventos BILLING se etiquetan como lifecycle, nunca pago ni beneficio; cancelar una renovación no equivale a reembolsar un período pagado.
- **Reembolsos y reversiones:** `PAYMENT.SALE.REFUNDED` y `REVERSED` permanecen con decisión `reversal_requires_independent_original_payment_proof`. PayPal confirma que ambos son eventos posibles para suscripciones, pero un ID de evento/payload por sí solo **no establece el ID del pago original o monto revertido**. Resolver y comprobar por API de merchant y ledger transaccional antes de escribir un tombstone. <https://developer.paypal.com/subscriptions/webhooks/>

## No desplegable en su estado actual

La dependencia `loadVerifiedInbox` es por inyección: solo tests usan un fixture, NO hay gateway/scheduler/RPC para entregar los eventos privados en hosting. Tampoco está resuelto el proceso ACID de claim/retry de estados `pending`, reverso antes/después de venta, reconcilación del período de facturación, retención financiera y eliminación de cuenta. No inventar plan de pagos ni exponer a `anon`/ `authenticated` el inbox.

## Pruebas

- `f16PrivateInboxDecisionGate.test.mjs`: once tipos de eventos, falsificación, estados y errores, refund y cancelación, sin writes.
- `f16SandboxSaleWorker.test.mjs`: gate obligatorio antes de PayPal/ledger, fail-closed sin Auth y errores.

CI General y PostgreSQL descartable confirman solamente comportamiento de pruebas; registrar sus resultados al comprobarlos. No ejecutar pruebas de Live ni reenvíos de eventos reales, no procesar los cuatro eventos reales pendientes.

## Siguiente gate

Auditar/crear adaptador mínimo lector service-only y candidato de reversos verificados en LAB, con pruebas de concurrencia. Antes de habilitar en hosted: autorizar independientemente RPC/Edge/scheduler, reconciliar retención legal de ledger e inbox, y garantizar bloqueo de acceso premium en cualquier fallo.
