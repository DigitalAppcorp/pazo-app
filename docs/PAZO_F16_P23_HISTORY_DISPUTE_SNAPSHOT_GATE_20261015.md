# PAZO F16-P23 — Venta original, ventanas de transacciones y disputas

**2026-10-15.** PR #44 DRAFT. Product Owner instruyó avanzar desarrollo y pruebas, **sin** desplegar nuevo worker, adquirir un buyer de PayPal, acreditar pagos o habilitar beneficios. Todas las respuestas PayPal en esta fase fueron sintéticas mediante transporte inyectado: NO existe todavía una validación real de que PayPal haya cobrado USD 2.99.

## Fundamento y límites del API

La API oficial [List transactions for subscription](https://developer.paypal.com/api/subscriptions/v1/subscriptions-transactions) usa GET `/v1/billing/subscriptions/{id}/transactions` con `start_time` y `end_time` y expone `total_items`, `total_pages`, `transactions` y `links`. Los metadatos solo dicen algo sobre el **rango solicitado**, no sobre el pasado anterior al contrato ni futuros refunds. El código P23 usa por política propia ventanas consecutivas de hasta 30 días y máximo 14 segmentos por ejecución. Ventanas más grandes u operaciones multianuales no quedan implícitamente cubiertas, sino en REVIEW.

La API oficial [List disputes](https://developer.paypal.com/api/customer-disputes/v1/disputes-list) permite filtrar por `disputed_transaction_id`, con paginación `page/page_size`. Una lista de longitud cero es un **snapshot temporal**, no prueba de ausencia de chargebacks futuros o casos fuera de la búsqueda. Los reembolsos requieren una consulta/seguimiento independiente de su estado; la API [Show refund details](https://developer.paypal.com/api/payments/v2) no puede usarse sin identificar antes el refund ID real. PayPal actualiza estados a posteriori.

## Entrega implementada

1. `p23SandboxHistoryWindowReader.mjs`: obtiene por callbacks inyectados un evento firmado previamente reclamado y consultado al comerciante, una suscripción merchant vinculada, e intervalo contractual aprobado (los callbacks no son autenticados por P23; reemplazarlos con lecturas reales bajo lease es trabajo posterior). Consulta OAuth Sandbox mediante POST token de credenciales, luego solo GET a `/transactions` para ID de suscripción derivado del evento. Usa fechas UTC, ventanas de 30 días, metadatos de página, ausencia de enlaces next, detección de IDs duplicados y respuesta de venta única a USD 2.99 `COMPLETED`. Ante estados reembolsados/parciales, entrada alterada, fecha fuera de intervalo, páginas desconocidas, timeout o token ausente se niega; aun en ruta limpia termina `WINDOWS_CHECKED_REVIEW_ONLY`. Nunca registra crédito.
2. `p23SandboxDisputeSnapshot.mjs`: a partir de una venta obtenida con claim válido, llama al filtro de disputas por ID de transacción con `page_size=50` y una sola página; estado desconocido, `next`, máximo de página o dispute existente ⇒ REVIEW. Lista vacía ⇒ `DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY`. Ningún correo, mensaje, contenido de disputa ni identidad salen de su respuesta.
3. `f16P23SandboxHistoryWindowReader.test.mjs` y `f16P23SandboxDisputeSnapshot.test.mjs`: Node test runner detecta casos positivos exclusivamente *review-only*, transporte mock, orígenes HTTPS Sandbox, OAuth, paginación extra, duplicados, timestamps, scopes inválidos, transacciones REFUNDED/PARTIALLY_REFUNDED, fallas del proveedor, disputa detectada y revisión sin exponer datos sensibles.

## Verificación de CI y hosted

Commit técnico [731e688](https://github.com/DigitalAppcorp/pazo-app/commit/731e6886410ca812f3370c2f33794f3e4b75ff09): **CI SUCCESS y F16 Disposable PostgreSQL Lab SUCCESS**. No se instaló ninguna RPC P23, no se desplegó Edge/cron ni se invocó PayPal real. Consultas Supabase de solo lectura confirman: **gate P21 OFF**, cutoff NULL, **8 eventos QA pending sin token**, 0 ledger payments, 0 reversos, 0 ofertas y 0 aceptaciones P06; RPC P22 todavía no instalada. PR sigue DRAFT. Previews automáticos por push autorizados, no deploy manual.

## Dependencias que impiden acreditar una mensualidad todavía

- Resolver propietario y contrato original `P06` desde servicio real; no usar `ownerId`, `contractStart`, `acceptedAt` ni evidencia de PayPal suministrada por el navegador o por callbacks no autenticados.
- Probar el intervalo contractual mensual (no 30 días fijos), ciclos de facturación, saldo atrasado y reintentos; comprobar tanto historia PayPal completa como eventos firmados, refunds, disputes, reversals y registros contables de ventas anteriores.
- Diseñar asiento contable privado **bajo lease vigente**, idempotencia e integridad doble entrada cuando corresponda, con reversos y control de acceso; revisar retención y entrega automática de términos ES/EN.
- Después de auditoría y GO específico del PO: instalar solo RPC P22 si procede, probar GET verdadero con credenciales Sandbox en worker server-only, y en gate posterior activar cutoff estrictamente prospectivo bajo aprobación aparte. Nuevo buyer/checkout, beneficios y Live también GO aparte.

**Resultado de P23:** cobertura técnica más estricta, pero `mayRecordPayment:false`, `mayGrantBenefits:false`, `paidThrough:null`. Los paquetes no son prueba de pago ni de cumplimiento financiero/legal.
