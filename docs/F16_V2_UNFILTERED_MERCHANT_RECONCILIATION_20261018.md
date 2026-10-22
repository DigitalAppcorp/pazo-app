# PAZO F16 — Auditoría de inventario sin filtro y bloqueo de recurrencia

**Fecha:** 2026-10-18 · **Ámbito:** Sandbox QA de Amigo de PAZO US$2.99/mes · **Estado:** reader v14 ACTIVO, no se ha consultado el resultado real desde sesión Auth nueva.

## Por qué era necesaria

- Correlación real por `GET /v1/notifications/webhooks-events/{id}` confirma que el `BILLING.SUBSCRIPTION.CREATED` firmado corresponde exactamente a la suscripción original `bound` de V2. Esto acredita **creación**, no aprobación, pago, cancelación ni no-cobrabilidad.
- `GET /v1/billing/subscriptions/{original}` devolvió `404`.
- La auditoría anterior en `pazoSandboxV2InventoryRead.mjs` hacía `GET /v1/billing/subscriptions?plan_ids=...&page_size=20&page=N`, filtrando por el plan V2. Podía concluir únicamente ausencia **en ese inventario filtrado**.
- PayPal documenta la consulta de inventario **sin** `plan_ids` ni `statuses`, con paginación y filtros opcionales: https://developer.paypal.com/api/subscriptions/v1/subscriptions-list/. Por eso añadimos un segundo alcance independiente en lugar de asumir que la primera lista cubría todo.
- El PO confirmó varias veces que nunca cambió credenciales y Business Sandbox. No volver a solicitar esa comprobación ni repetir captura de transacciones/suscripciones históricas.

## Trabajo realizado

1. Nuevo lector `supabase/functions/f16-paypal-webhook/pazoSandboxV2UnfilteredInventoryRead.mjs`: solo `POST /v1/oauth2/token` + `GET /v1/billing/subscriptions?page_size=20&page=N`. No envía filtros de plan ni estado; compara solo el ID original owner-bound. Pagina hasta máximo 25 páginas (500 filas) y distingue falta de cobertura, estado exacto encontrado, ausente, respuesta rota o errores. Rechaza filas sin IDs verificables y contradicciones de paginación. El `404` y las ausencias **nunca** habilitan pagos. No persiste datos del comerciante, ni devuelve IDs, payer PII, payload ni secretos.
2. Ruta owner-authenticated `audit_retry_inventory` existente ahora consulta el inventario filtrado **y** el inventario general. Respuesta de categorías `unfilteredCode`, `unfilteredProviderStatus` y `unfilteredInventoryEnumerated` sin identificadores de PayPal. Si falla la segunda consulta, conserva resultado del primer alcance y falla cerrado.
3. UI `SandboxV2AccountPanel.tsx` usa el mismo botón **«Investigar suscripción en PayPal»** y distingue `original_found` vs `original_absent` vs `partial` en la segunda lectura. Un inventario sin original refuerza la evidencia pero NO prueba que no haya posibilidad de cobro en el futuro.
4. `src/features/supporter/testing/f16SandboxUnfilteredMerchantInventory.test.mjs` comprueba ausencia de filtros, `APPROVAL_PENDING`, paginación, duplicados, ausencia de consentimiento financiero por snapshot y privacidad.

**CI + cuatro laboratorios PG17 5/5 SUCCESS**, SHA `f2de49dd6bef3d2dd41f4d297dd0f59cfb61c8b7`, incluido CI `39143572546` y laboratorios `39143572547/39143572559/39143572617/39143572612`.

**Despliegue:** PO `ok go` para continuar la conciliación técnica; Edge `f16-paypal-supporter-v2-qa` v**14 ACTIVE / verify_jwt=true**; 19 archivos, se añadió solo helper unfiltered y actualizó `index.ts`. No se alteraron endpoints de PayPal Live ni webhook receptor. UI queda en PR #44 DRAFT hasta que el PO sincronice Vite local.

## Inbox y exposición a pagos tardíos

- Lectura SQL postflight: 1 original V2, 0 `f16_sandbox_qa_v2_retry_attempts`, 0 grants, 0 pagos, 0 períodos, 0 activation bindings; 1 `BILLING.SUBSCRIPTION.CREATED` `pending`.
- `supporter_private.p05_inbox_worker_gate.enabled=false`. El procesador actual P05 de eventos financiero no trata `CREATED` como una venta y **no debe activarse para forzar cierre**. El evento firmado no puede marcarse `processed` manualmente ni servir como cheque de conciliación financiera.
- Incluso si la nueva auditoría responde `unfiltered_inventory_original_absent`, ello **no certifica irrevocabilidad de la URL original**, cancelación ni incapacidad futura de cobro. No introducir un grant administrativo por ausencia de inventario, error 404, ausencia de sale webhook o actividad cero.
- Pendiente: resultado real de la consulta sin filtros desde la cuenta Auth QA + criterio administrativo verificable de terminal/no cobrable con reconciliación de transacciones, eventos y recurrencia. Si la plataforma no lo puede certificar, registrar `merchant_noncollectibility_unverified` y escalar sin simular evidencia.

**Siguiente acción:** actualizar la rama local `f13/section-titles-20261012`, abrir PAZO QA y pulsar una sola vez el botón existente **«Investigar suscripción en PayPal»** (READ ONLY), compartir mensaje del inventario general. No volver a pulsar «Verificar origen de solicitud», esa correlación ya se validó. No pulsar ningún botón de pago.

**Gate:** `F16_UNFILTERED_MERCHANT_CENSUS_V14_DEPLOYED_CI_5PASS_ZERO_FINANCIAL_WRITES_WAIT_OWNER_READ`.
