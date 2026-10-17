# PAZO F16 — Reversal evidence gate (2026-10-14)

## Alcance

F16 recibió 4 webhooks Sandbox firmados reales, incluida una venta y cancelación. **No hubo ningún evento real de refund/reversal en esa prueba**: este gate se prueba exclusivamente mediante datos sintéticos, sin transacción adicional ni cambios PayPal.

El código `supabase/functions/f16-paypal-webhook/sandboxReversalEvidence.mjs` prepara una decisión **pura**, solo en memoria, que falla cerrado. Nunca escribe SQL, ejecuta APIs, concede cobertura ni procesa inbox por sí solo. Aprobación PO «ok go» permite ingeniería offline de la reconciliación, pero no despliegue ni mutación de recursos alojados.

## Atribución segura a transacción original

Una notificación `PAYMENT.SALE.REFUNDED` / `REVERSED` no se usa por sí sola para inventar el ID de venta. Se exige lo siguiente, verificado por fuentes privadas e independientes:

1. Inbox privado previamente persistido después de la validación de firma PayPal, `pending` y `retention_hold=true` (gate previo).
2. Entorno `sandbox`, app merchant realmente autenticada contra PayPal, evento y tipo exactos.
3. Evidencia obtenida mediante lectura PayPal merchant (adaptador **no conectado todavía**) que relacione el evento con **originalSaleId** exacto y suscripción.
4. Otra lectura PayPal merchant de esa venta original que coincida en id, suscripción, plan `P-14V25407JP6850922NLHMDKI`, USD 299 centavos. No se admite solo monto, email, fecha o identificador de un reembolso distinto.
5. Estado remoto inequívoco: `REFUNDED`, `PARTIALLY_REFUNDED` o `REVERSED` según el tipo; `PENDING` o desconocido se bloquea.

Con evidencia válida solo produce un `candidateForTombstone` con ID de **pago original**, tipo y fecha verificada, sin nombre/email ni derecho premium. Una devolución parcial también exige bloqueo conservador de acreditación completa. La decisión **no exige una venta ya escrita en el ledger**: así, al conectar una transacción ACID, un tombstone legítimo podrá impedir que una venta llegue tarde y otorgue acceso. **No hay escritura alojada ni gate de retención legal concluido**.

## QA

`src/features/supporter/testing/f16SandboxReversalEvidence.test.mjs` contempla refund, partial refund, reversal, órdenes fuera de secuencia, ambiente Live, inversión de IDs, suscripción ajena, plan incorrecto, monto erróneo, fecha imposible y no divulgación de datos del comprador. El resultado del workflow CI debe verificarse por SHA; estos mocks no prueban la forma real de refund payload de PayPal ni su API de reembolso.

Referencia de tipos reconocidos por PayPal: https://developer.paypal.com/subscriptions/webhooks/ .

## Sigue pendiente

Adaptador merchant autorizado para verificar refund y venta, política de vencimiento/cobertura, atomicidad SQL, retención de ledger y recuperación operativa. Sin ellos, **no ejecutar este candidato contra `f16_paypal_commit_verified_reversal`** ni alterar los cuatro eventos reales pendientes.
