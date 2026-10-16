# PAZO F16-P06 — publicación QA hosted PASS; checkout preparado, NO desplegado

Fecha: 2026-10-16. **PO GO específico «SI»**: publicar la oferta ES+EN de prueba aprobada en Supabase y **preparar** el despliegue del checkout Sandbox para una cuenta PAZO existente, **sin comprar todavía**, sin beneficios ni PayPal Live.

## Operación ejecutada en Supabase alojado

- Proyecto exacto: `mrybvqdebbgcayuvgkkr`; rama de código `f13/section-titles-20261012`, PR #44 DRAFT.
- Preflight SQL hosted `READ ONLY`: current_user `postgres`, membership admin PASS, `supporter_private.paypal_p06_offers` 0, `paypal_p06_checkout_attempts` 0, RLS forzada en ambas tablas, RPC publicada `public.f16_p06_read_published_offer` inaccesible a `anon/authenticated`, sí a `service_role`, ledger 0, claves P42 0, writer P42 OFF, worker P21 OFF.
- Se ejecutó **UNA SOLA VEZ** la transacción exacta de `supabase/drafts/f16_p06_sandbox_qa_approved_offer_REQUIRES_NEW_PUBLISH_GO.sql` leída de GitHub en commit `acfca81fc15b25db9d3af948d72b514dad7c3169`, con `SET LOCAL pazo.f16_p06_qa_publish_go='PO_EXPLICIT_QA_OFFER_PUBLISH_AFTER_OWNER_GATE'` insertado inmediatamente después de `BEGIN;` en **el mismo** lote/transaction. Exact copy ES/EN se comparó automáticamente contra `src/features/supporter/sandboxQaOfferCopyP06.mjs` antes del llamado. No DDL, UPDATE ni DELETE.
- Resultado SQL alojado: `P06_QA_APPROVED_BILINGUAL_OFFER_STAGED_PUBLICATION_PASS`.
- **Postflight READ ONLY**: total ofertas 2, publicadas 2, locales 2, huellas diferentes 2, combinación precio/plan/moneda/cadencia 2, RPC `es/en` devuelve versión correcta, `checkout_attempts=0`, `payments=0`, `p42_keys=0`, writer OFF, worker OFF; `anon/authenticated` no pueden ejecutar la lectura de oferta. Metadatos adicionales: 1 trigger que cubre UPDATE+DELETE de ofertas publicadas, RLS forzada en ambas tablas, 2 digests SHA256 calculados correctamente.
- Este acto **NO creó ninguna suscripción**, intent, oferta Live, periodo pagado ni beneficio. No se desplegó Edge ni se cambiaron secrets, webhooks de PayPal ni Vercel. No hubo reintento del SQL y **NO SE DEBE VOLVER A EJECUTAR**: por diseño es una publicación única e inmutable.

## Despliegue de Checkout Sandbox — PREPARADO, NO AUTORIZADO PARA EJECUCIÓN EN ESTE GO

**Servicio nuevo:** `f16-paypal-supporter` (no estaba en el listado de Edge Functions alojadas). No tocar los existentes `paypal-webhook`, `f16-paypal-webhook`, `f16-paypal-supporter-account` ni `f16-paypal-operator-read` como parte de este subpaso.

El archivo principal de GitHub es `supabase/functions/f16-paypal-supporter/index.ts`, con 10 dependencias relativas; se verificaron por lectura GitHub **11 de 11 archivos** disponibles, sin imports relativos faltantes. Usar **`verify_jwt=true`**. Nunca `--no-verify-jwt`.

**Permisos, configuración y aislamiento previos:**

1. Obtener el UID privado de la **cuenta existente que el PO confirmó que puede usar**. Resolverlo únicamente por búsqueda exacta en Auth Dashboard o canal de operador autorizado; no incluir UID ni correo en GitHub, documentación, logs, URL o variables frontend.
2. Configurar secrets Edge **del proyecto Sandbox QA** de modo privado, sin imprimir valores. Se requieren `PAZO_F16_P06_QA_OWNER_ID` (UUID exacto de ese usuario), `PAZO_F16_P06_QA_ENABLE` (inicialmente **ausente/false**), `PAZO_F16_PAYPAL_ENV=sandbox`, `PAZO_F16_PAYPAL_PLAN_ID=P-14V25407JP6850922NLHMDKI`, `PAZO_F16_APP_ORIGIN`, `PAZO_F16_PAYPAL_RETURN_URL`, `PAZO_F16_PAYPAL_CANCEL_URL`, `PAZO_F16_PAYPAL_CLIENT_ID`, `PAZO_F16_PAYPAL_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. **No inferir** que ya están disponibles; los secretos Supabase son compartidos entre Edge Functions del mismo proyecto, evaluar cambios compartidos.
3. El origin debe ser el frontend oficial de pruebas que el PO acepte; return/cancel URL en el mismo HTTPS origin sin parámetros ajenos ni datos privados. No publicar preview Vercel manual ni habilitar compradores públicos en este GO.
4. Con `PAZO_F16_P06_QA_ENABLE` **false/ausente**, la función retorna `503 paid_supporter_checkout_not_released` **incluso para usuarios autorizados**. Antes de pasar a `true`, verificar `auth.getUser` del token Supabase, que solo permite el UID exacto; además `PAZO_F16_PAYPAL_ENV` debe ser `sandbox` y el frontend solo expone la pantalla con `VITE_PAZO_F16_SANDBOX_QA_UI=true` en un build QA expresamente permitido. Los build públicos mantienen ese flag omitido/false.
5. El endpoint checkout controla consentimiento durable, requestKey y un único PayPal POST; **no** concede pagos, badges, periodos ni entitlements en una redirección; requiere merchant verification independiente para la financiación. No activar el worker P21, writer P42, PayPal Live ni futuro flujo financiero como parte del deploy QA.
6. Despliegue aún pendiente: únicamente cuando exista un GO futuro separado, el operador deberá usar `supabase functions deploy f16-paypal-supporter --project-ref mrybvqdebbgcayuvgkkr`, previa validación con `supabase functions deploy --help` de la CLI instalada y preflight del conjunto de 11 archivos. Verificar `verify_jwt=true` desde la API Supabase y hacer un smoke HTTP no autenticado que **no invoque PayPal** y devuelva 401/503 sin datos. Si existe diferencia, deshabilitar el flag y detenerse.
7. **Otro GO posterior** permitirá habilitar el flag QA para el único usuario Auth, mostrar panel QA y realizar **una sola** suscripción con **comprador PayPal Sandbox distinto de la cuenta de PAZO**. Reconciliar la cancelación y el evento merchant; ninguna acreditación financiera hasta finalizar P05/P21/P42 o arquitectura segura equivalente.

### Dependencias relativas exactas del módulo desplegable

```text
supabase/functions/f16-paypal-supporter/index.ts
supabase/functions/f16-paypal-supporter/p06SandboxQaGate.mjs
supabase/functions/f16-paypal-webhook/verifiedAuthOwner.mjs
supabase/functions/f16-paypal-webhook/intentStoreAdapter.mjs
supabase/functions/f16-paypal-webhook/p06CheckoutConsentStore.mjs
supabase/functions/f16-paypal-webhook/paypalSandboxSubscriptionCreate.mjs
supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs
supabase/functions/f16-paypal-webhook/p06SandboxVerifiedCheckout.mjs
supabase/functions/f16-paypal-webhook/p06SandboxCancellationProvider.mjs
supabase/functions/f16-paypal-webhook/p06SandboxCancellationHandler.mjs
supabase/functions/f16-paypal-webhook/globalAdmissionAdapter.mjs
```

### Próxima acción del PO

Autorización actual ejecutada: **sí publicar dos ofertas** y **preparar checkout**. El **despliegue mismo** o activación del flag/PayPal subscription creation **NO son consecuencia automática** de este GO. Primero se debe establecer el canal privado para el Auth UID, origin QA y secrets; si alguno falta, conservar `503` y NO deploy/Live.

**Estado:** `F16_P06_HOSTED_QA_BILINGUAL_OFFER_PUBLISHED_VERIFIED_CHECKOUT_DEPLOY_PREPARED_NOT_DEPLOYED`.
