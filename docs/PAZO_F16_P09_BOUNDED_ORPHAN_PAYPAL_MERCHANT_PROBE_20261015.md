# PAZO F16-P09 — Candidate-only orphan subscription merchant probe

**2026-10-15.** Rama `f13/section-titles-20261012`, PR #44 DRAFT; solo código y tests. PAZO gratuito, Amigo de PAZO USD 2.99/mes voluntario, pagos públicos NO-GO.

## Problema

P07 hace una sola reserva antes de emitir PayPal create POST. Si la respuesta se pierde antes del bind, el P08 read-only responde `MANUAL_MERCHANT_RECONCILIATION_REQUIRED`: no tiene un `subscriptionId` para GET individual y no puede repetir el POST con seguridad.

**PayPal Subscriptions v1:** `GET /v1/billing/subscriptions` documenta filtros `plan_ids`, `created_after`, `created_before`, `page_size` y `page`, pero NO documenta query por `custom_id`. Se requiere inspección del detalle de IDs devueltos, no atribución por plan o tiempo solamente. Referencia: https://developer.paypal.com/api/subscriptions/v1/subscriptions-list/ y https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/.

## Implementación solo en código (no deploy)

- P08 SQL DRAFT añade `providerCreateClaimedAt` al RPC `f16_p08_read_checkout_recovery`, con owner/requestKey exactos. No cambia ninguna fila hosted; `p06CheckoutConsentStore` valida estrictamente claimed bool ↔ timestamp. Se conserva `REVOKE PUBLIC,anon,authenticated`, `GRANT service_role` y `FORCE RLS` de tablas privadas.
- Nuevo `p09SandboxOrphanMerchantProbe.mjs`: orquestador requiere `Request` real + Auth verificada + admisión + intent privado `pending`, `subscriptionId=null` y claim P07 consumido no más antiguo que 48h. Proveedor PayPal consulta endpoint Sandbox fijo con OAuth client credentials; listado por plan PAZO, ventana de creación de 11 minutos alrededor del claim, una sola página de 10 (y máximo 9 detalles); GET de cada sub listada, compara ID, plan y `custom_id` con el intent original privado. Nunca envía la ventana, owner o IDs del navegador al proveedor. Nunca almacena subscriber email, payer, tokens, links u otro contenido de PayPal y no los devuelve a la UI.
- Resultados: `ONE_UNBOUND_CANDIDATE_REVIEW_ONLY` si aparece exactamente una coincidencia; `NO_CANDIDATE_PROVEN` en otros casos limpios **NO prueba inexistencia**; `INCOMPLETE_MERCHANT_SCAN` ante paginación/truncación/saturación; `DUPLICATE_MATCHING_INTENTS` ante duplicados; demás resultados son revisión/bloqueo. Ninguna respuesta pública incluye IDs de usuario, suscripción, interés, términos, merchant refs, correos, URLs ni secretos.
- **No se conecta este módulo al webhook ni a un worker desplegado.** OAuth POST solo obtiene token PayPal, no crea suscripción ni cobra. El resultado no cambia el estado `pending`, no hace bind, no otorga `paidThrough` y no desbloquea checkout.
- La coincidencia sigue sin demostrar totalidad histórica, falta de otros planes/merchant apps, carácter real del pago o cobertura de refunds/disputas. Tampoco debe utilizarse para decidir que está bien crear una nueva suscripción cuando no hay coincidencia.
- El listado PayPal devuelve datos merchant que podrían contener referencias a suscriptores ajenos; el módulo descarta contenido y no usa analytics ni logs de respuestas. Cualquier despliegue requiere aprobación de alcance de privacidad y permisos de lectura, proveedor, rate limit/costos y política de retención.

## Evidencia de pruebas

Commit [85a08dec](https://github.com/DigitalAppcorp/pazo-app/commit/85a08dec962de574607e4c873c31deceb8a88fd1): **CI general SUCCESS + F16 Disposable PostgreSQL Lab SUCCESS**. Tests Node y PostgreSQL sintéticos agregados: 0/1/2 coincidencias, intento extranjero, ID/lista inválida, plan falso, status desconocido, carrera de reintentos cerrada en P07, tiempo de claim, rechazo de usuarios sin Auth, GET solo, no PII. Nuevas pruebas de timestamp PostgreSQL, normalización UTC y dobles custom IDs también **CI general + F16 Disposable PostgreSQL Lab SUCCESS** en commit técnico [`06d93f8`](https://github.com/DigitalAppcorp/pazo-app/commit/06d93f8e1d928ac91fdccd9b373fb1f7b6d4064e). Sin PayPal OAuth real.

## Gates restantes

1. Definir operación real de lectura merchant limitada y revisión de alcance/retención. No asumir que la prueba de 10 resultados cubre todos los escenarios.
2. Crear **solamente con GO separado** una propuesta transaccional de enlace de candidato probado a intent previamente reclamado, con nueva lectura merchant inmediatamente antes de guardar, antifalsificación de Auth y prevención de duplicado global; no ejecutar todavía.
3. Cierre de historia financiera (pago regular, refund, reversals/disputas, deuda, fiscalidad), términos ES/EN finales y política de retención P01-P09 aprobada; posteriormente GOs independientes de migración Sandbox, Edge OFF, webhook y checkout controlled.
4. Resuscripción posterior a cancelación requiere otro gate de nueva aceptación, ciclos previos y análisis de duplicidad; mantener `p06_one_checkout_per_owner`.

**Invariantes:** PR #44 DRAFT; sin DDL hosted, buyer nuevo o replay de 8 eventos, Live, ledger ni beneficios. `paidThrough=null`, `mayGrantBenefits=false`.
