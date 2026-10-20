# PAZO F16 — Generaciones Live con secretos exclusivos de Edge

Estado al 19-oct-2026: **SOLO CÓDIGO**, PR #44 DRAFT. PayPal Live y los entrypoints `pazo-paypal-live-checkout`/`pazo-paypal-live-webhook` permanecen **hard OFF**. No existe comerciante Live ni dominio beta HTTPS definitivo. No se necesitan credenciales reales para estas pruebas.

## Por qué cambia la arquitectura

La opción anterior devolvía `client_id` y `client_secret` de Vault por una RPC pública accesible a `service_role`. Aunque no se había publicado, la herramienta bloqueó instalarla. Se retiró la migración automática; el SQL original quedó archivado exclusivamente como **propuesta rechazada** en `supabase/drafts/f16_live_historical_merchant_vault_DEPLOY_PROPOSAL_NOT_APPROVED.sql`. No ejecutarlo ni restaurarlo bajo otro nombre.

La nueva opción almacena credenciales en los **secretos privados de la función Edge**, nunca en una respuesta HTTP, una tabla de prueba o un RPC que las devuelva. La vinculación `owner/intent/subscription/generation` sigue en PostgreSQL detrás del único RPC de **datos no secretos** `public.pazo_f16_live_service_binding_read(text)` ya instalado. No se revocaron ACLs anteriores de Vault; `service_role` sigue teniendo los privilegios que Supabase tenía antes de esta propuesta. No afirmar que el sistema global elimina todo acceso directo existente a Vault.

## Secretos separados por generación

El código `liveEdgeGenerationSecrets.mjs` recibe `getSecret` mediante inyección **solo de servidor** y mantiene `released=false` por defecto. Lee una lista permitida, `PAZO_F16_LIVE_HISTORICAL_GENERATIONS` (ejemplo de laboratorio: `7,8`), y exclusivamente el namespace **inmutable** de la generación verificada, `PAZO_F16_LIVE_G<n>_`, cuyos campos son `READ_ENABLED`, `PLAN_ID`, `WEBHOOK_ID`, `MERCHANT_FINGERPRINT_SHA256`, `CLIENT_ID` y `CLIENT_SECRET`. No lee la credencial global Sandbox, la de la generación activa de nuevas altas ni la de otra generación. El secreto privado no se registra ni se devuelve al browser.

Una generación retirada puede seguir siendo legible para consultar/cancelar suscripciones antiguas sin permitir crear otras nuevas. La lectura se puede deshabilitar por generación cuando corresponda, teniendo presente las obligaciones de cancelación y soporte de suscripciones históricas. Ningún `getSecret` predeterminado toca `Deno.env`: la composición real de Edge debe inyectarlo en un futuro despliegue **autorizado**.

## Webhook y comprobaciones financieras

`liveGenerationPinnedWebhook.mjs` exige una URL `/functions/v1/pazo-paypal-live-webhook?generation=<n>`, sin parámetros añadidos. Ese número **no autentica** a nadie; únicamente selecciona la firma y el webhook ID del comerciante para la verificación oficial de PayPal. Luego `provePazoScope` busca el `subscriptionId` en la vinculación privada y contrasta `merchantGeneration` del propietario con la generación usada para verificar la firma; un evento cruzado **no entra al inbox**. El operador tendrá que configurar en PayPal un endpoint específico por generación, apuntando al dominio de Edge bajo HTTPS, cuando exista la cuenta Live. La aplicación web tendrá independientemente su dominio beta HTTPS para el retorno del checkout, instalado o no como PWA.

Ni firma correcta, ni `ACTIVE`, ni `COMPLETED` aisladamente generan pagos, períodos, insignias o `paidThrough`. Siguen siendo necesarios el GET autenticado de la venta y su período de servicio, conciliación de refunds/holds, escritura idempotente y revisión de retención.

## Compatibilidad con la base ya instalada

La tabla `admin_private.pazo_paypal_merchant_generations` alojada tiene `client_id_vault` y `client_secret_vault` **NOT NULL**. Es incompatible con una generación solo en Edge. Se prepararon dos DRAFTS, ninguno es migración alojada:

- `supabase/drafts/f16_live_edge_credential_source_DISPOSABLE_ONLY.sql`: ensayo exclusivamente en `f14_synthetic`.
- `supabase/drafts/f16_live_edge_credential_source_HOSTED_PROPOSAL_NOT_APPROVED.sql`: futuro cambio mínimo de esquema, solo tras GO explícito, que conserva generaciones `credential_source='vault'` y permite `credential_source='edge_secrets'` **únicamente con ambas referencias a Vault nulas**.

El laboratorio `scripts/f16-live-edge-credential-generation-disposable-lab.sql` verifica preservación de filas antiguas, rechazo de mezclas de referencias y ausencia de modificación del selector financiero. **No aplicar un draft a Supabase.** Hasta ese gate, el usuario no puede activar Live desde el panel.

## Panel administrativo y lanzamiento

El objetivo aprobado continúa siendo gestionar los entornos desde `Configuración · PayPal`. Este diseño de Edge NO significa que el panel pueda escribir secretos en la configuración de Edge: falta un **servicio de aprovisionamiento administrativo seguro**, verificación OAuth/plan/webhook, rollback/auditoría y gates de autorización para actualizar credenciales sin exponerlas en la PWA. No simular éxito, no mostrar `Activar Live` como operativo ni pedir secretos por chat.

Pasos restantes, en este orden: aprobación técnica de la adaptación no secreta de esquema; despliegue posterior de validadores privados y aprovisionamiento de secretos con autorización separada; pruebas E2E de cancelación y reconciliación sin Live checkout; URL pública beta y prueba real supervisada; habilitación del conmutador Live únicamente tras GO expreso del Product Owner. Los 26 eventos y 2 períodos QA Sandbox se conservan sin procesar como si fueran Live.

No realizar ningún despliegue financiero automático.
