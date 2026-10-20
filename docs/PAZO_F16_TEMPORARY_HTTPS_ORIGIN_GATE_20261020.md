# PAZO F16 — Origen HTTPS provisional aprobado por Product Owner

**Decisión PO (2026-10-20):** usar temporalmente `https://pazo-app-t83r.vercel.app` para la preparación y las pruebas de la beta, hasta seleccionar un dominio propio. La elección no autoriza publicar beta, crear previews, activar Live, generar cobros ni fusionar `main`.

## Evidencia comprobada
- Vercel `get_project`: proyecto `prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH` tiene en `domains` el dominio `pazo-app-t83r.vercel.app`. **No equivale** a haber comprobado accesibilidad pública, SSL desde navegador o la última app candidata; esas pruebas siguen pendientes.
- Supabase `admin_private.paypal_gateway_settings` fila `environment='live'`: `return_origin=''`, `plan_id=''`, `webhook_id=''`, `validation_status='not_configured'` según lectura realizada hoy. **No se escribió ese campo**: las configuraciones requieren `pazo_admin_paypal_save_draft`, sesión admin real y entrada en auditoría `paypal_gateway_change_log`. Nunca simular `auth.uid()` ni sobrescribir la tabla privada para evitar esa autorización.
- `vercel.json` ya reescribe `/paypal/return` y `/paypal/cancel` a `/index.html`. `src/features/supporter/supporterAccountRoute.mjs` normaliza el regreso a `/#/account/supporter?paypal=return|cancel` y elimina parámetros de PayPal de la URL local sin dar derechos pagados.
- Checkout Live crea `return_url` y `cancel_url` a partir del origen servidor, sin constante de dominio definitiva. `public.pazo_f16_live_service_active_route()` lee `returnOrigin` del borrador administrativo **solo** si Live está realmente activado y el comercio/plan/webhook coinciden. Live sigue OFF; no usar falsos datos para habilitarlo.
- Test de regresión en `adminPaypalLiveHostedCheckout.test.mjs`: prueba CORS contra el dominio provisional y otro dominio futuro. El backend acepta solamente el origen devuelto por la ruta administrativa, no los dos simultáneamente.

## Secuencia cuando el panel administrativo esté listo
1. PO inicia sesión como admin, verifica el origin en Vercel y guarda temporalmente `https://pazo-app-t83r.vercel.app` desde **Configuración → PayPal**. El RPC valida formato/rol y audita. No abrir el checkout por este guardado.
2. Antes de cualquier operación Live: probar acceso HTTPS, `/paypal/return` y `/paypal/cancel` reales, PWA instalada y navegador, consentimiento, compra/cancelación y rechazo de estados sin venta.
3. Para sustituirlo por dominio propio: validar DNS/TLS/dominio de Vercel, guardar nuevo origin por panel admin con auditoría y preflight, verificar que el callback responde y revisar PayPal. Mantener el comercio original y los pagos históricos de quienes ya estén suscritos. No exigir editar código, SQL o un archivo .env para cambiar el origin.
4. La beta permanece **NO-GO** hasta los gates F16, security, UX y firma PO; ningún cambio en producción ni `main` está autorizado por elegir URL temporal.
