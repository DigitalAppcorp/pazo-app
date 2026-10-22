# PAZO F16 — Independent PayPal original payment / Auth owner proof (OFFLINE)

**Estado:** PASS de código y pruebas sintéticas; **NO-GO** para hosted y pagos. 2026-10-14. Rama `f13/section-titles-20261012`; PR #44 DRAFT.

## Cambio realizado

1. `supabase/functions/f16-paypal-webhook/paypalSandboxOriginalProof.mjs`: peticiones fijas al host `https://api-m.sandbox.paypal.com` con credenciales solamente server-side. OAuth `client_credentials`; GET venta original `/v1/payments/sale/{id}`, GET reembolso `/v1/payments/refund/{id}`, GET evento `/v1/notifications/webhooks-events/{id}` para vincular reembolso con su identificador. Valida datos mínimos sin retener payload, comprador, tokens o emails. Aceptación automática NINGUNA: HTTP no-2xx, JSON incompleto, timestamp inválido o id discrepante fallan.
2. `privateAuthOwnerGuard.mjs`: `auth.admin.getUserById(ownerId)` para comprobar que la cuenta privada/BOUND aún existe y no es anónima ni borrada. No interpreta JWTs no validados, `user_metadata`, email ni claims del navegador. Importante: consultar Auth Admin no comprueba identidad del comprador; la identidad de PAZO deriva exclusivamente de la creación autorizada de un intent privado y el binding anterior con `custom_id` confirmado mediante PayPal.
3. `privateProviderProofFlow.mjs`: recibe referencias desde un claim de inbox privado ya verificado, con token UUID y expiración; confirma evento GET PayPal, consulta historial de transactions/subscription, intención privada `bound`, owner en Auth y venta original por separado; exige mismo plan fijo y USD 2.99. Solo después obtiene un candidato y pide a `financeStore` un commit **lease-bound**, que debe cerrar fila y ledger atómicamente. Reembolso requiere corroboración de evento, ID del refund, ID de SALE original, historial del proveedor y owner; reembolsos parciales generan solo candidato conservador de tombstone, nunca cobertura pagada. Fallo de proveedor/confirmación requiere `release` con token; fallo de `release` dispara recuperación privada; respuestas ambiguas no se marcan PASS.
4. `PAYMENT.SALE.REVERSED` no se procesa hasta contar con fuente de confirmación independiente compatible con el tipo de disputa; jamás se deduce de webhooks o timestamps. El reader de Payments v1 se usa sólo porque el tipo webhook es `PAYMENT.SALE.*`. PayPal la marca **deprecated** y puede rechazar la operación; en ese caso no hay conciliación, sin fallback inseguro.
5. **Incompleto intencionalmente:** `leaseStore`, `financeStore`, `loadPrivateBoundIntent` y `loadKnownReversalIds` son dependencias inyectadas en tests; NO hay worker/scheduler/endpoint nuevo. Ningún módulo React importa esos lectores.

## Evidencia de pruebas

- Commit técnico `7a8de60fa01e130b94d11d8266539857ae45487a`: [CI SUCCESS #38570031697](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38570031697), [F16 PG17 PASS #38570031920](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38570031920).
- `f16OriginalMerchantProof.test.mjs` valida endpoints permitidos, Basic/Bearer sin exposición, supresión de PII, ID/timestamp/monto/moneda y autenticación de owner con errores saneados.
- `f16PrivateProviderProofFlow.test.mjs` valida dueño privado, Auth, subscription/plan, original sale, refund completo/parcial, token vencido, token erróneo, reverse sin fuente, fraude/SSRF, caída, pérdida de ACK y reversos en venta.
- La CI anterior [#38569705403](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38569705403) falló por una expresión UTC defectuosa con grupo adicional de segundos; corregida en `5c80f210`. Se validó nuevamente la CI posterior. No se debilitaron las comprobaciones.
- Auditoría Supabase **READ ONLY** del 14 oct: 4 inbox `pending`, intent=0, payments=0, reversals=0, wall_consents=0, false para entitlement nulo y funciones LAB ausentes. Edge alojada y PayPal Live no se modificaron en este gate.

## Límites y siguiente gate

Estos tests usan **mocks** de PayPal y Auth, no un GET de credenciales Sandbox real; no prueban merchant efectivo, compatibilidad de la API deprecated, sesión del pagador ni dinero. La función hosted anterior `public.f16_paypal_commit_verified_sale` **todavía carece de lease**, por lo que no se puede usar. La suite PG de atomicidad que pasó anteriormente sigue siendo solo laboratorio.

**Próximo gate:** adaptar de forma concreta y **server-only** acceso a RPCs privadas y credenciales para claim/release/commit lease-bound, lectura de intents y reversos, y asegurar comportamiento fail-closed en fallos reales de transporte, antes de preparar una migración con Supabase CLI y someter hosted a autorización PO. Mantener los cuatro eventos Sandbox reales intactos. Retención financiera, cobertura y reversión siguen pendientes de decisión.

Documentación proveedor: [Subscriptions GET/list transactions](https://developer.paypal.com/api/subscriptions/v1), [Payments v1 sale GET (deprecated)](https://developer.paypal.com/api/deprecated/payments/v1/sale-get), [Payments v1 refund GET (deprecated)](https://developer.paypal.com/api/deprecated/payments/v1/refund-get).
