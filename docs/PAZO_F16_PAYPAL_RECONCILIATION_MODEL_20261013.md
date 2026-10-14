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

## 7. Contrato de integración PayPal Subscriptions — próximo gate (2026-10-13)

**Estado:** definido para implementación futura, NO implementado. El CI 38481610859 del modelo sintético PASS; esos tests no comprueban una firma real, persistencia transaccional, PayPal sandbox ni permisos reales. PayPal inicial; Stripe adicional futuro. Ningún pago ni proyecto PayPal creado.

### Entradas autorizadas y separación de responsabilidades

- `POST /supporter/subscriptions/start` (nombre **ilustrativo**, sujeto a routing final): requiere sesión de PAZO validada por servidor; crea intento privado ligado a `auth.uid()`, producto/precio interno fijo USD 2.99 mensual; respuesta solo contiene lo necesario para continuar en PayPal. No acepta `owner_id`, merchant ID ni importe del navegador.
- `POST /supporter/webhooks/paypal` (nombre ilustrativo): endpoint HTTPS sin sesión PAZO, autenticado **mediante verificación de firma PayPal**, no mediante JWT del usuario. Recibir cuerpo bruto original y headers de transmisión, validar tamaño/método/content-type y limitación de tasa. Nunca colocar `service_role` ni secretos en React.
- `GET /supporter/membership` (nombre ilustrativo): autenticado, devuelve solamente entitlement propio y vencimiento permitido; no devuelve registro de otros usuarios ni payloads PayPal.
- `POST /supporter/subscriptions/cancel` (nombre ilustrativo): dueño autenticado, resuelve suscripción vinculada en backend, pide cancelar futuras renovaciones a PayPal, reconcilia resultado, sin revocar automáticamente cobertura pagada válida. Retries idempotentes y respuesta de error comprobable.
- `public.pazo_wall_consent_enable/disable` ya existe con autorización positiva intencionalmente bloqueada por `wall_has_verified_entitlement()=false`. NO conectar checkout a estas funciones.

### Verificación de webhook: requisitos oficiales confirmados

1. Guardar `webhook_id` asociado a la **app y entorno** que suscribió la URL (sandbox/live distintos).
2. Verificar firma siguiendo la documentación de PayPal usando ID, fecha, firma, algoritmo y certificado correspondiente, sobre **el cuerpo exacto** recibido. Para verificación criptográfica local, PayPal documenta la cadena `transmissionId|timeStamp|webhookId|crc32(rawBody)` (sin cambiar bytes del cuerpo). Alternativa: API `verify-webhook-signature` con `webhook_event` original. No admitir un simple booleano `signatureValid` del cliente; ese campo solo existe en fixtures sintéticos.
3. Bloquear SSRF, redirecciones a destinos arbitrarios y uso de certificados no confiables: restringir URLs/host oficial PayPal y validarlas; no descargar certificados de ubicaciones sin allowlist. Limitar cabeceras y payload.
4. Firma válida autoriza **recepción de un evento**, no beneficios. Persistir identificador de evento y estado de trabajo en inbox privado, con respuesta HTTP 2xx solamente después de aceptación durable o duplicado idempotente. PayPal puede reintentar entregas fallidas (la documentación indica hasta 25 intentos en tres días).
5. Confirmar transacción/suscripción mediante API PayPal del entorno correcto y verificar merchant, usuario vinculado, plan, precio, moneda, cobro y reembolsos antes de acreditar.
6. Event IDs no garantizan deduplicar la misma venta descrita en eventos distintos: mantener índice único también para ID de transacción verificada. Eventos fuera de orden y reembolso previo a la conciliación requieren tombstone/pending-reversal, o reconsulta de estado PayPal antes de acreditar.
7. PayPal distingue webhooks simulados (no pertenecen a app) y sandbox reales; la **verificación por postback no funciona con eventos simulados**. Separar pruebas del listener y pruebas reales en sandbox.

### Preflight pendiente antes de escribir código real

- Confirmar merchant PayPal Business y disponibilidad de Subscriptions/cargos para USD 2.99.
- Elegir la infraestructura privada donde residirá el endpoint, sin exponer secretos y bajo el contrato de arquitectura PAZO.
- Acordar semántica verificable de período de cobertura frente a fechas de pago y refunds: NO sumar un mes calendario a cada notificación sin documentación del billing cycle.
- Definir tratamiento de reversión recibida antes del pago, auditoría de webhook, política de expiración de inbox y retención de comprobantes.
- Integrar tests adversariales de firma/cuerpo bruto, replay, firma mock vs sandbox, event reversal antes de completed, concurrencia y duplicados persistidos.
- Obtener autorización del PO para crear recursos PayPal, SQL, endpoints, secretos y probar sandbox. Gate distinto para pagos en vivo y publicación en muro.
- Los tests `syntheticLedger` prueban **solo el modelo en memoria**, no el receptor real. No registrar `integration PASS` hasta completar sandbox y seguridad.

Fuentes oficiales: https://developer.paypal.com/api/rest/webhooks/rest/ (última revisión 2026-06-18) y https://developer.paypal.com/subscriptions/integrate/ .

## 8. PayPal Sandbox — recursos existentes comunicados por PO (2026-10-13)

**Estado: REPORTADO POR EL PRODUCT OWNER, NO VERIFICADO VIA API.** El PO confirmó que su cuenta empresarial ya dispone de credenciales/API Sandbox, que **ya creó la suscripción** y **configuró los métodos de pago admitidos** en PayPal. No tratar esos recursos como pendientes de creación y **no duplicarlos**. Esto no confirma aún que exista una suscripción de prueba aprobada/cobrada, que el plan coincida con USD 2.99 por mes, que haya webhook configurado ni que el acceso del agente esté conectado.

**Preflight no sensible para reutilizar lo que existe:** identificar el **Plan ID Sandbox** (habitualmente prefijo `P-`), el entorno exacto, la frecuencia e importe/moneda del plan y si existe **Webhook ID** de una app Sandbox; verificar IDs y configuraciones por API solo cuando haya una conexión segura autorizada. No solicitar Client Secret, access token, contraseña ni capturas con esas credenciales; el Client ID tampoco debe incrustarse en el repositorio. La configuración de métodos de pago no equivale a comprobación de un cobro recurrente exitoso.

**Próximo gate real:** asociar la implementación a recursos Sandbox existentes, preparar credenciales únicamente mediante gestor de secretos en infraestructura autorizada, validar factura/cobro en Sandbox, y comprobar webhook real/verificación firma e idempotencia. **No modificar Supabase alojado, crear nuevos recursos PayPal ni activar Live sin autorización separada.** CI offline hasta commit `24b061c`: SUCCESS, run `38483616902`.

## 9. Plan ID Sandbox recibido y preflight de solo lectura — 2026-10-13

**ID de plan proporcionado por PO:** `P-14V25407JP6850922NLHMDKI`. Formato coherente con un *billing plan* (`P-`), **pero sus propiedades NO han sido verificadas contra PayPal**. El PO afirma que la aplicación Sandbox, plan y métodos de pago ya están creados. **No crear otro plan.** Nunca registrar aquí OAuth tokens, Client Secret o credenciales.

**Contrato implementado en rama:** `src/features/supporter/testing/paypalSandboxPlanContract.mjs` y tests unitarios sintéticos; `scripts/f16-paypal-verify-plan-readonly.mjs` usa únicamente los endpoints oficiales Sandbox `POST https://api-m.sandbox.paypal.com/v1/oauth2/token` y `GET https://api-m.sandbox.paypal.com/v1/billing/plans/P-14V25407JP6850922NLHMDKI`, siempre de solo lectura. Se ejecuta expresamente con `npm run verify:f16:paypal:sandbox:plan`. Las credenciales se obtienen de `PAYPAL_SANDBOX_CLIENT_ID` y `PAYPAL_SANDBOX_CLIENT_SECRET` del entorno seguro LOCAL, no de React, GitHub, el chat ni código fuente. Salida filtrada: estado, precio/moneda, periodicidad y advertencias, nunca cuerpo completo del proveedor ni secretos. No se ha realizado llamada real en esta ejecución.

**Criterios:** plan `ACTIVE`, un ciclo `REGULAR` cada 1 `MONTH`, precio fijo `USD 2.99`, `total_cycles=0` y ningún setup fee inesperado; avisar si hay cantidad variable/impuestos para revisión. Errores de autenticación, plan no encontrado, plan distinto, tarifas distintas o temporales deben **bloquear** el pase a integración hasta resolver discrepancias; no modificar el plan automáticamente.

**Siguiente paso operativo:** ejecutar verificación autenticada en un entorno con credenciales Sandbox seguras y compartir **solo** el resultado sanitizado del comando, nunca el secreto/token. Después revisar plan, aplicación y Webhook ID Sandbox existentes; PayPal Sandbox y producción permanecen separados. La consulta a la API no aprueba por sí sola despliegue, cobros Live, SQL de entitlements ni publicación del muro.

## 10. Plan Sandbox PASS y siguiente gate webhooks — 2026-10-13

**Plan verificado por ejecución local del Product Owner**, que proporcionó la salida saneada de `npm run verify:f16:paypal:sandbox:plan`: `environment=sandbox`, `ok=true`, `issues=[]`, `warnings=[]`, `P-14V25407JP6850922NLHMDKI`, `ACTIVE`, `USD 2.99`, `MONTH/1`. La consulta autenticada la realizó el PO en su Windows; el agente **no recibió ni observó credenciales o token**. **Gate de existencia/términos de plan: PASS**, no repetir diagnóstico OAuth ya resuelto. No atribuir al PASS evidencia de entrega webhook, una suscripción individual, pago, estado merchant Live o derecho a membresía.

**Nuevo preflight solo lectura preparado**: `npm run verify:f16:paypal:sandbox:webhooks`, accesible con el runner PowerShell existente pasando `-Check Webhooks`. Autentica con la misma app Sandbox local usando OAuth y únicamente realiza `GET /v1/notifications/webhooks`. Muestra solo IDs no secretos de webhook, presencia de HTTPS y los tipos de evento ausentes; **no muestra las URLs de callback, secretos, tokens, correo ni cuerpos íntegros de PayPal**. Si no existen webhooks, informa `needs_webhook_configuration`, sin crear uno. Si hay webhook con eventos relevantes, informa `subscriptions_configured`, pero eso **no significa** que el endpoint esté accesible ni que se puedan acreditar cobros.

Eventos mínimos a revisar: `BILLING.SUBSCRIPTION.ACTIVATED`, `CANCELLED`, `EXPIRED`, `SUSPENDED`, `UPDATED`, `PAYMENT.FAILED`, y `PAYMENT.SALE.COMPLETED`, `REFUNDED`, `REVERSED`. Los nombres exactos proceden de https://developer.paypal.com/subscriptions/webhooks . Los eventos son insumos de conciliación, no fuente suficiente de entitlements.

**Gate posterior**: identificar webhook existente o diseñar/autorizar listener seguro y su registro en app Sandbox; ejecutar flujo auténtico con cuenta de comprador de prueba y verificar firmas y cobros. Sin despliegue, migraciones alojadas, creación de recursos PayPal, Live ni activación de muro por este paso.

## 11. Resultado de auditoría webhook Sandbox del PO — 2026-10-13

**Lectura REAL de PayPal obtenida por el PO (solamente datos sanitizados):** un webhook registrado en la app Sandbox; ID `6N7889790V1467139`, `httpsUrl=true`, seis eventos contractuales `BILLING.SUBSCRIPTION.*` presentes, faltan `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`. Estos tres sí pertenecen al catálogo oficial de eventos de suscripción: https://developer.paypal.com/subscriptions/webhooks/ .

**Interpretación precisa:** `needs_webhook_configuration` indica **registro existente pero suscripción a eventos incompleta**; no falta el webhook en sí. `httpsUrl=true` solo prueba un URL HTTPS sintácticamente válido, no entrega, titularidad, disponibilidad, seguridad, ni confianza de certificados. Receptor final/entitlements NO implementados ni verificados.

**Gate para editar el registro:** primero confirmar en la propia app Sandbox que ese ID tiene una URL de callback que realmente pertenece a PAZO y sirve eventos en HTTPS. No revelar consultas/tokens secretos del URL. Si es placeholder, sitio de otra integración o ruta inexistente, NO agregar eventos ni reenviar datos. Diseñar/autorizar despliegue seguro del receptor y política de endpoint antes de modificar registro. Si es listener seguro de PAZO efectivamente activo, **propuesta pendiente de autorización explícita**: editar el webhook existente y sumar los 3 `PAYMENT.SALE` sin eliminar eventos ya suscritos; re-ejecutar preflight; probar entrega real, autenticidad de firma y reconciliación. No crear segundo webhook, ni Live, ni SQL alojado por defecto.
