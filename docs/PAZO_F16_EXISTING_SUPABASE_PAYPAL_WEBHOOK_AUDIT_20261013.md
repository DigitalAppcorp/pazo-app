# PAZO F16 — Auditoría READ ONLY del webhook PayPal existente (2026-10-13)

**Estado:** gate F16 BLOQUEADO hasta migración segura. Auditoría READ ONLY desde Supabase conectado y GitHub. Sin cambios en Supabase ni PayPal; PR #44 DRAFT.

## Evidencia confirmada

- Supabase project `mrybvqdebbgcayuvgkkr`, REST host `https://mrybvqdebbgcayuvgkkr.supabase.co`.
- Edge Function existente: `paypal-webhook`, **ACTIVE**, versión 30; `verify_jwt=false` (normal para un proveedor externo, **solo cuando** el receptor valida autenticidad por otra vía).
- Código desplegado leído vía `get_edge_function` concuerda estructuralmente con `supabase/functions/paypal-webhook/index.ts` del branch `f13/section-titles-20261012`.
- URL convencional de invocación Supabase **esperada, NO confirmada en registro PayPal**: `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/paypal-webhook`. El enlace dado por PO `https://supabase.com/dashboard/project/mrybvqdebbgcayuvgkkr/functions` es una página administrativa, **no** endpoint de webhook.
- PO ejecutó auditoría read-only PayPal Sandbox: **1** webhook registrado, ID `6N7889790V1467139`, endpoint con esquema HTTPS; los tres eventos `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED` ausentes. **No se verificó si ese registro apunta a la URL de la función existente**.
- Plan Sandbox `P-14V25407JP6850922NLHMDKI` validado `ACTIVE`, USD 2.99 mensual por preflight ejecutado localmente por PO.

## Hallazgos sobre el código desplegado

1. **ALTO — semántica equivocada de fundador/membresía:** para cualquier evento permitido cuya firma sea válida y plan coincida, consulta `GET /v1/billing/subscriptions/{id}`, toma `subscription.custom_id` como UUID y ejecuta `UPDATE public.profiles SET is_founder=(subscription.status==='ACTIVE'), paypal_subscription_id=...`. El modelo F16 prohíbe usar `is_founder` como entitlement pagado. Esto puede conceder/quitar insignias fundadoras indebidamente; `ACTIVATED` por sí solo no demuestra cobro.
2. **ALTO — entitlements no verificados:** no comprueba transacción concreta, id de pago único, monto USD 2.99, reembolso anterior, intervalo cubierto, autorización del vínculo usuario-suscripción ni meses acumulados. Un evento no debe activar membresía sin conciliación servidor con pago válido y titular.
3. **ALTO — deduplicación ausente:** no posee inbox durable por event ID ni unicidad por transaction ID. Reintentos/out-of-order pueden repetir updates y sobrescribir estado.
4. **ALTO — entorno por defecto Live:** `PAYPAL_ENV==='sandbox' ? SANDBOX : LIVE`. Cualquier variable ausente/valor mal escrito selecciona Live en lugar de fallar cerrado; no se consultaron valores secretos del entorno y no se afirma qué entorno está realmente activo.
5. **MEDIO — firma verificada mediante API oficial de PayPal:** llama `POST /v1/notifications/verify-webhook-signature` con ID y headers; devuelve 401 si `verification_status !== SUCCESS`. Es una protección positiva. Se requiere verificar que `PAYPAL_WEBHOOK_ID` corresponde al webhook Sandbox existente, sin exponer valores secretos. `verify_jwt=false` es compatible con este modelo, no evidencia de inseguridad por sí mismo.
6. **MEDIO — respuesta/errores:** endpoint responde 200 `received:true,ignored:true` para tipos no permitidos o sin identificador, y 500 ante fallos. No hay persistencia previa a ACK, no hay backoff/reconciliación durable; algunos eventos válidos pueden perderse o reintentarse sin trazabilidad.
7. **MEDIO — importaciones sin versión inmovilizada:** `@supabase/supabase-js@2` en CDN y servidor `std@0.168.0` legado; revisar contra las normas de dependencias del proyecto, sin actualizar ciegamente la función activa.

## Gate inmediato (orden seguro)

1. Confirmar en PayPal Dashboard que el webhook ID `6N7889790V1467139` efectivamente tiene como URL `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/paypal-webhook`. No compartir query strings con tokens. **No añadir aún eventos**.
2. Preparar receptor nuevo en código del repositorio, solo para pruebas locales, que falle cerrado ante `PAYPAL_ENV` ausente/no válido; valide firma y webhook de entorno correcto; no escriba `profiles.is_founder` ni `profiles.paypal_subscription_id` como efecto de cobrar; registre recepción/duplicados en almacenamiento privado *únicamente tras autorizar SQL*.
3. Desarrollar pruebas adversariales de firma, live-vs-sandbox, replay, reembolso anterior al cobro, relación usuario-suscripción e intervalos. Mantener guard `supporter_private.wall_has_verified_entitlement()=false` hasta la reconciliación real y aprobación.
4. Solicitar autorización explícita PO para los cambios a recursos alojados (migraciones, secrets, deploy y edición webhook) con plan de reversión. **No sustituir Edge Function v30**, no editar webhooks PayPal ni hacer cobros Live por esta auditoría.
5. Solo después de receptor durable/seguro y deploy de Sandbox confirmado: agregar eventos al webhook EXISTENTE, demostrar entregas reales, verificar merchant/plan/monto/pagos, y seguir aprobación individual de muro; nunca equiparar entrega con entitlement.

El contrato general permanece en `docs/PAZO_F16_PAYPAL_RECONCILIATION_MODEL_20261013.md`. Auditoría de código/Supabase con lectura directa, no inferencia de capturas.

## Verificación automatizada del callback — gate pendiente

El PO reconfirmó `6N7889790V1467139`, pero **no ha confirmado la URL**. La API de Webhooks de PayPal documenta `GET /v1/notifications/webhooks/{webhook_id}` para leer los detalles de un webhook; se implementó auditoría READ ONLY con ese endpoint:

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\\scripts\\f16-paypal-sandbox-plan.ps1 -Check Destination
```

La consulta utiliza credenciales Sandbox introducidas de forma oculta localmente y compara el campo `url` del registro contra la URL exacta esperada de la Edge Function de PAZO. No muestra el URL ni secretos: solo el resultado saneado `destinationMatches`. Debe ejecutarlo el PO en Windows antes de afirmar que el registro apunta a Supabase. No mide disponibilidad, seguridad del código ni delivery; **ningún cambio del lado de PayPal o Supabase queda autorizado por esta lectura**.

Referencia PayPal (endpoint GET y objeto de webhook): https://developer.paypal.com/api/webhooks/v1/definitions/webhook/ .

## Resultado real de verificación del destino: MISMATCH (2026-10-13)

El Product Owner ejecutó la lectura autenticada `GET /v1/notifications/webhooks/6N7889790V1467139` por medio del runner seguro y compartió una salida sin URLs ni secretos:

```json
{
  "environment": "sandbox",
  "ok": false,
  "status": "destination_mismatch",
  "webhookIdMatches": true,
  "destinationMatches": false
}
```

**Interpretación:** PayPal reconoce el ID de webhook, pero el registro NO apunta exactamente a la URL canónica de la función existente en Supabase. No se conoce su URL real. No presupongas que es otra empresa o otro proyecto; una barra final u otro path también causan mismatch. Se amplió `inspectPazoWebhookDestination` para clasificar de forma cerrada la diferencia sin mostrar hostname/path/query/credenciales. El PO puede ejecutar el mismo `-Check Destination` tras actualizar el código para obtener `destinationCategory`.

**Gate seguridad inalterado:** incluso si el destino es una simple variación de la ruta correcta, NO redirigir todavía notificaciones a `paypal-webhook` v30, porque la función activa escribe `profiles.is_founder` desde el estado de la suscripción y carece de conciliación de pagos/idempotencia. En todo caso, todo cambio PayPal, Supabase, secretos o despliegue requiere autorización separada.

## Confirmación posterior del destino: PANEL ADMINISTRATIVO (2026-10-13)

El PO indicó que la dirección del webhook Sandbox registrada en PayPal tiene `supabase.com/dashboard`. Este host y segmento corresponden al panel administrativo de Supabase, **no** a un endpoint de ejecución `*.supabase.co/functions/v1/<slug>`. No se mostró la URL completa, por lo que **no se infiere su ruta exacta ni sus posibles parámetros**. El resultado autenticado `different_host` es consistente.

**El bloqueo de seguridad continúa:** NO reemplazar el destino por la URL de la función `paypal-webhook` v30, ya que podría actualizar `public.profiles.is_founder` incorrectamente; tampoco sumar eventos de venta/reembolso todavía. Crear y probar adaptador F16 con verificación de firma, referencia mínima en inbox durable y conciliación server-side; obtener autorización independiente para cambios SQL, secretos, despliegue y actualización **del mismo webhook Sandbox**.

## Implementación local del verificador PayPal Sandbox (F16, sin despliegue)

Se incorporó un adaptador del receptor nuevo **solo para pruebas en rama**, sin sustituir la función activa `paypal-webhook` v30 ni modificar SQL/secretos/PayPal:

- `supabase/functions/f16-paypal-webhook/paypalSandboxPostback.mjs`: construye un verificador PayPal **solo Sandbox** con Client ID + Client Secret únicamente del servidor, autenticación OAuth Basic en `https://api-m.sandbox.paypal.com`, y postback a `POST /v1/notifications/verify-webhook-signature`. Nunca sigue redirecciones de proveedor; filtra algoritmo `SHA256withRSA`, `paypal-cert-url` HTTPS en hosts PayPal Sandbox autorizados con ruta de certificado, ID de webhook y headers completos. Rechaza configuración, entornos y respuestas ambiguas. Mantiene bytes originales del JSON dentro de `webhook_event` para evitar reconstrucción de un evento parseado: PayPal lo exige para postback.
- `supabase/functions/f16-paypal-webhook/core.mjs`: controlador de recepción previamente creado; exige resultado de firma y adaptador `inbox.insertIfAbsent` duradero e idempotente para ACK 2xx. Ingesta de evento verifica firma, no crea beneficio, nunca actualiza `profiles.is_founder`. La interacción de evento y el procesamiento de cobro son fases distintas.
- `src/features/supporter/testing/f16PaypalSandboxPostback.test.mjs`: tests aislados sin llamadas reales de red para raw JSON, ruta Sandbox, rechazo Live, cabeceras, URLs/certificados engañosos, fallo OAuth/PayPal y conexión con el receptor sintético. **CI debe confirmar PASS en el HEAD correspondiente antes de considerar estable esta implementación.**

**Límites duros:** el core todavía **NO tiene un entrypoint de Edge Function desplegable ni un inbox persistente/SQL alojado ni reconcilia importes/cobros**. Este código no alcanza el gate de despliegue ni el de suscripción real. Hay que diseñar/aprobar DDL privado, IAM/RLS/privilegios, retención y recuperación, luego implementar adapter de inbox y reconciliación; solicitar autorización específica del PO ANTES de tocar la base alojada, secretos, desplegar función o actualizar el registro PayPal existente. Nunca usar el enlace administrativo `supabase.com/dashboard` como webhook listener.

## Contrato RPC de inbox propuesto — NO APLICADO

Adaptador **solo de código**, preparado en `supabase/functions/f16-paypal-webhook/paypalInboxAdapter.mjs` y probado con `src/features/supporter/testing/f16PaypalVerifiedEventInbox.test.mjs`. Fija la URL del proyecto Supabase de PAZO, nunca acepta hosts extraídos del webhook ni del navegador y utiliza una credencial privilegiada solo en memoria de servidor. **No existe aún** la función SQL `public.f16_paypal_record_verified_event`; una llamada real al RPC debe fallar. La ausencia del RPC debe seguir siendo bloqueo, NO argumento para conceder privilegios al cliente.

Propuesta de contrato para diseñar antes de solicitar un gate de migración alojada:

| Elemento futuro | Contrato necesario |
| --- | --- |
| `supporter_private.paypal_verified_event_inbox` | Evento mínimo: ID opaco de proveedor como clave única, tipo de evento, marca de recepción, estado de procesamiento y control de reintentos; ningún correo, payload de PayPal, token ni tarjeta |
| `public.f16_paypal_record_verified_event(p_provider_event_id text, p_event_type text)` | RPC restringida a `service_role`: inserción atómica, retorna `true` si creó fila, `false` ante duplicado; fallo transaccional propaga error para que receptor NO devuelva 2xx |
| Privilegios | REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT a service_role **en una única migración transaccional**; RLS habilitada y defensa en profundidad sobre tabla privada; función con `SET search_path` seguro |
| Retención y auditoría | Pendiente de decisión PO/privacidad. No borrar automáticamente eventos de reembolso o reversión mientras puedan alterar cobertura |
| Reconciliación posterior | Debe existir worker/retry que procese inbox hacia ledger verificado por API de PayPal, incluido evento recibido fuera de orden; **no emitir ACK 2xx en entorno real antes de tener worker probado**, aunque la inbox ya sea durable |

**No se creó migración ni se implementó worker todavía**: el próximo gate es fijar diseño/retención, generar archivo de migración mediante CLI según AGENTS, auditar grants y pedir aprobación del PO **antes de aplicar en Supabase**. La función v30 sigue operativa sin cambios, pero la URL PayPal registrada apunta al dashboard administrativo y no a ese receptor.
