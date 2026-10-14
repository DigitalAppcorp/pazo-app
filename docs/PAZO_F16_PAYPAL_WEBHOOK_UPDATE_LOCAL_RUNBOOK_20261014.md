# PAZO F16 — Corrección del webhook PayPal Sandbox EXISTENTE

**Estado actual (2026-10-14): EXECUTOR LOCAL PREPARADO, PAYPAL AÚN SIN MODIFICAR.**

## Permiso y alcance

El Product Owner respondió «sí» al gate de modificar exclusivamente el webhook Sandbox existente `6N7889790V1467139`; no autorizó PayPal Live, otro webhook, nuevos planes, creación de suscripciones, checkout ni membresías. El receptor F16 está activo en Supabase versión 12 y su endpoint es `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-webhook`. HTTP negativo 405 GET / 400 POST sin firmas: PASS. El receptor de legado `paypal-webhook` v35 está fuera de alcance.

No hay conector directo PayPal disponible aquí y los secretos de PayPal almacenados en Supabase no son recuperables para este gate. **No se ha hecho ninguna petición PATCH a PayPal desde ChatGPT.** El PO ya verificó localmente el plan/webhook existentes con `-Check Resources` (PASS de acceso, configuración incorrecta), sin tener que repetir credenciales por chat. El flujo para escribir se ejecuta solamente con los secretos que el PO introduce **localmente** en PowerShell.

## Ejecución única autorizada en Windows

En una carpeta local `PAZO-F13-preview` limpia, situada en la rama `f13/section-titles-20261012`:

```powershell
git status --short
git pull --ff-only origin f13/section-titles-20261012

powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\f16-paypal-sandbox-plan.ps1 -Check ApplyWebhook
```

El wrapper solicita escribir `APLICAR` en PowerShell; después pide Client ID y Client Secret **del mismo Sandbox REST app**. El secreto se ingresa oculto y las variables de entorno temporales se limpian en `finally`. **No pegar credenciales, token, webhook payload ni URLs internas en GitHub, chat o capturas.** No ejecutar con credenciales Live ni modificar desde Dashboard al mismo tiempo.

El script `scripts/f16-paypal-update-webhook-once.mjs` hace:
1. Validación del entorno `APLICAR` y credenciales locales; un único token OAuth Sandbox.
2. GET al plan `P-14V25407JP6850922NLHMDKI` y GET al webhook `6N7889790V1467139`; valida plan ACTIVE USD 2.99 MONTH/1, webhook ID exacto, los seis tipos originales y que no haya wildcard, tipos adicionales ni modificación parcial.
3. Relee webhook (GET) para detectar deriva antes de escribir. Si todo coincide, hace **un único PATCH** oficial con `replace /url` y `replace /event_types`: conserva los seis tipos aprobados y añade los tres `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`.
4. Revisa respuesta PATCH y hace GET final, comprueba ID, URL exacta y nueve tipos exactos. Si ya está correcto, termina sin mutación. Nunca crea ni elimina webhook.

Salida exitosa: `status=updated_and_verified`, detalle `same_webhook_nine_events_f16_destination`, o `status=already_configured`.

**En caso de error o conexión interrumpida después del envío PATCH, NO repetir ApplyWebhook automáticamente.** Una mutación pudo tener efecto aun sin respuesta. Ejecutar únicamente el preflight read-only:

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\f16-paypal-sandbox-plan.ps1 -Check Resources
```

Este lee los dos recursos, redirige la salida a campos saneados y no escribe. Enviar solo JSON saneado y código de etapa al chat. Si `destinationMatchesF16=true`, `missingEvents=[]`, `eventConfigurationComplete=true`, se cierra gate de configuración. `safeToActivate=false` en ese reporte es una constante que **no invalida** el destino correcto: recuerda que configuración no prueba entrega ni pago. Un fallo ambiguo requiere revisión manual, no reintento ciego. Si el plan o webhook no pertenecen al app local, abortar sin intentar otras credenciales al azar.

## Condiciones posteriores

Tras PASS local, ChatGPT debe inspeccionar Supabase **solo lectura** para verificar que no hay entradas financieras ni entitlements indebidos, y mantener PR #44 Draft. Un PATCH configurado no equivale a firma entregada, checkout, pago o membresía. Siguiente GO distinto: pruebas con evento **auténtico** de comprador PayPal Sandbox; verificar 202, duplicado firmado 200, reintentos 503 y conciliación mínima. Nunca apuntar a la Edge legado `paypal-webhook`, crear recursos duplicados ni tocar Live.

Documentación oficial: https://developer.paypal.com/api/webhooks/v1/webhooks-update/ y https://developer.paypal.com/api/rest/webhooks/rest/ .
