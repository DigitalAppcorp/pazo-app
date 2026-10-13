# PAZO F16 — Contrato privado PayPal-first y matriz de pruebas aisladas

**Estado: DISEÑO TÉCNICO, NO DESPLEGADO.** 2026-10-13. PR #44 DRAFT, rama `f13/section-titles-20261012`. El Product Owner ha elegido PayPal como proveedor inicial; Stripe será un proveedor adicional futuro. Precio confirmado: USD 2.99 al mes. **No constituye permiso para crear tablas, planes, secretos, webhooks, funciones ni cobros.**

## 1. Principios de seguridad

- Una aprobación del navegador, `BILLING.SUBSCRIPTION.ACTIVATED`, un identificador de suscripción o un webhook no acreditan pago por sí solos.
- Únicamente un **cobro completado, conciliado contra PayPal en servidor, atribuible al titular y al plan, importe y moneda correctos** puede generar cobertura.
- El esquema de consentimiento `supporter_private.wall_consents` ya está instalado y `wall_has_verified_entitlement()` continúa con retorno intencional `false`. No sustituir ese guard hasta un gate autorizado, pruebas y Privacy/Terms.
- Nunca exponer datos de pago en los perfiles públicos, ni usar `profiles.paypal_subscription_id` o `is_founder` como prueba de entitlement.
- Preferir identificadores de proveedor opacos, índices de unicidad y restricciones explícitas; ninguna credencial, token, tarjeta, email de facturación, payload completo ni IP debe estar en la tabla de entitlements.

## 2. Entidades privadas candidatas (DISEÑO; NO SQL INSTALADO)

| Entidad lógica | Campos mínimos propuestos | Restricciones y propósito |
| --- | --- | --- |
| `subscription_intents` | `id` UUID interno, `owner_id`, `provider` (inicial `paypal`), `internal_plan_key`, `external_subscription_id` nullable, `status` pendiente, `created_at`, `updated_at` | La cuenta propietaria se toma exclusivamente de Auth en servidor. No confiar en `owner_id` recibido en navegador. `(provider,external_subscription_id)` único si existe. Intentos no dan cobertura. |
| `provider_event_inbox` | `provider`, `external_event_id`, `event_type`, `received_at`, `verified_at`, `processing_state`, `attempt_count`, `reference_id` opcional | `UNIQUE(provider,external_event_id)`; aceptación solo tras firma verificada. Cola durable, saneada y privada. Política de retención pendiente. |
| `verified_payment_entries` | `id`, `provider`, `external_payment_id`, `owner_id`, `subscription_id`, `amount_minor_units`, `currency`, `provider_completed_at`, `payment_status`, `reversal_reference` opcional | `UNIQUE(provider,external_payment_id)`. Moneda USD y monto de plan verificados en servidor. Devolución/reversión no se borran silenciosamente ni se ignoran. |
| `coverage_periods` | `owner_id`, `source_payment_id`, `period_start`, `period_end`, `coverage_status` | Solo derivado de pagos conciliados; impedir traslapes que dupliquen meses y extensiones sin respaldo de proveedor. Plan de cálculo del `paid_through` sujeto a confirmación de semántica de ciclo de PayPal. |
| `supporter_entitlement` | Proyección/función privada: `owner_id`, `is_active`, `paid_through`, `renewal_state`, `verified_at` | Estado derivado, no editado por cliente. `is_active` se revalida con tiempo actual y cobertura no revertida. `renewal_state` no equivale a `is_active`. |
| `provider_links` (futuro, solo si necesario) | `provider`, `external_account_reference`, `owner_id` | Diseño extensible a Stripe sin migrar ni reemplazar suscripciones PayPal. No implementar Stripe todavía. |

Los nombres son **candidatos de contrato**, no nombres prometidos de tablas. Antes de implementar, consolidar para minimizar tablas duplicadas y evaluar FK, borrado/retención, índices, restricciones, concurrencia, RLS/ACL, SECURITY DEFINER y caminos de rollback. No hay una política legal aprobada de retención de eventos o consentimientos revocados.

## 3. Máquina de estados propuesta

```text
intent_created
  -> provider_pending
  -> subscription_approved (NO ENTITLEMENT)
  -> payment_verified (cobertura confirmada)
  -> renewal_pending / renewal_canceled
  -> expired / refunded / reversed

invalid_signature / unknown_owner / amount_mismatch / no_provider_confirmation
  -> rejected_or_quarantined (NO ENTITLEMENT)
```

La cancelación impide renovaciones futuras, pero no revoca automáticamente un período **efectivamente pagado y no invalidado**. La expiración y la reversión deben reflejarse incluso si los webhooks se retrasan. Reactivación tras pérdida de elegibilidad no republica mascotas: requiere permiso individual nuevo.

## 4. Contrato de transacciones e idempotencia

1. Autenticar al usuario desde el servidor y crear intento con referencia no adivinable.
2. PayPal entrega eventos al endpoint HTTPS protegido; verificar firma usando el Webhook ID oficial y atributos de transmisión; prohibir confianza ciega en URLs/certificados del payload.
3. Deduplicar por par `(provider,event_id)`. Un webhook duplicado recibe un resultado idempotente, no una segunda cobertura.
4. Reconciliar detalle del pago y de la suscripción contra API de PayPal; comprobar merchant, titular vinculado, importe/moneda, suscripción/plan esperado y estado definitivo.
5. Deduplicar por `(provider,payment_id)`; actualizar ledger y períodos dentro de una transacción consistente. Eventos fuera de orden no deben reabrir pagos revertidos ni extender cobertura de forma ficticia.
6. En incertidumbre, registrar estado de reintento/conciliación sin conceder entitlement (`fail closed`). La recuperación de webhook debe poder reintentar sin duplicar.
7. Exponer al cliente exclusivamente estado de apoyo y fecha de cobertura permitidos; listado público del muro exige además consentimiento vigente, titularidad de mascota y moderación.
8. Para futura coexistencia PayPal + Stripe, normalizar por proveedor y transacción. No sumar dos veces beneficios ni meses por pagar simultáneamente; política comercial exacta se aprobará antes de implementar el segundo proveedor.

## 5. Casos de prueba aislados (NO ejecutados todavía)

| Caso | Entrada sintética | Aserción |
| --- | --- | --- |
| T01 | Suscripción aprobada, cero pagos | Entitlement falso |
| T02 | Evento de pago con firma inválida | Rechazo, cero writes de pago |
| T03 | Pago USD 2.99 confirmado contra proveedor y dueño correcto | Una sola entrada y cobertura sustentada |
| T04 | T03 repetido 5 veces con igual event ID/payment ID | Una entrada, una cobertura |
| T05 | Mismo pago con dos event IDs | Una entrada, una cobertura |
| T06 | Otro owner, merchant/plan erróneo o moneda distinta | Cero cobertura |
| T07 | Payment failed, pending o subscription activated sin pago | Cero extensión |
| T08 | Cancelación con período confirmado vigente | Cobertura solo hasta paid_through |
| T09 | Fecha posterior al vencimiento, aunque webhook de expiración no llegue | Entitlement falso |
| T10 | Reembolso/reversión tras una cobertura inicial | Retiro de cobertura inválida; sin publicación |
| T11 | Eventos T10/T03 recibidos fuera de orden | Estado final consistente y conservador |
| T12 | Usuario A intenta consultar/aprobar el pago de usuario B | Denegado |
| T13 | Mascota con consentimiento revocado y cuenta pagada | No aparece en muro |
| T14 | Membresía reactivada tras expiración | Muro requiere nuevo consentimiento |
| T15 | Eventos PayPal y un futuro adaptador Stripe para el mismo titular | Sin doble acreditación de meses |

Ejecutar primero con fixtures sintéticos aislados, sin cuentas existentes, sin servicios pagados ni Supabase alojado. Las pruebas no se consideran PASS hasta existir implementación y resultados capturados de CI.

## 6. Gates de ejecución

**A — Diseño:** este documento, auditado y versionado. **B — Revisión técnica:** retención/legal, tarifas y elegibilidad de PayPal Business, definición de fecha de período, API y política de devolución, RLS/roles/Storage. **C — Autorización separada PO:** crear migración y/o recursos PayPal (producto, plan, claves, webhook, Edge, cualquier consumo). **D — Pruebas:** entorno aislado y sandbox autorizado, escenarios anteriores, callbacks, permisos y rollback. **E — Activación:** gate adicional antes de habilitar cobros reales y publicación del muro.

**Referencias:** `docs/PAZO_SUPPORTER_WALL_BACKEND_DESIGN_PREFLIGHT_20261013.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`, `docs/PAZO_DATA_INVENTORY.md`, `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`, y migración aplicada `20261013215221_f16_supporter_wall_consents_foundation.sql`. Documentación PayPal: https://developer.paypal.com/subscriptions/integrate, https://developer.paypal.com/api/rest/webhooks/rest/ .
