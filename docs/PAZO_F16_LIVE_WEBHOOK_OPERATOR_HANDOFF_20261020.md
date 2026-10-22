# PAZO F16 — Operación manual PayPal Developer Live (SOLO después del próximo GO)

**Estado actual:** NO EJECUTAR TODAVÍA. No existe generación comercial reservada ni webhook Live configurado. Checkout Live y entitlements OFF.

## Dependencia previa

Primero, el PO autoriza el despliegue independiente de la reserva de generación. Tras una autenticación administrativa reciente TOTP, PAZO mostrará un número **obtenido de la base de datos** y una URL HTTPS exacta. Nunca inventar el número.

## Operación del titular en PayPal Developer

1. Iniciar sesión en PayPal Developer con la cuenta empresarial dueña de la app **Pazo**; seleccionar explícitamente la pestaña **Live**. No usar Sandbox.
2. Abrir la aplicación REST **Pazo** ya creada. **No crear otra app, producto ni plan**. Plan existente `P-9BR88240215654528NLL3I4I`, $2.99 USD/mes.
3. Ir a **Webhooks → Add Webhook**; pegar exactamente la URL generacional mostrada en la pantalla de PAZO. No usar localhost ni una URL con número generado manualmente.
4. Suscribir únicamente los 10 eventos exigidos por `supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs`: `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`, `BILLING.SUBSCRIPTION.CREATED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.UPDATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`.
5. Guardar el webhook y obtener su Webhook ID real. El ID puede comunicarse al flujo administrativo, pero **nunca** pegar Client Secret, PAT o códigos MFA en ChatGPT, GitHub o archivos de Vite.
6. Verificar por API HTTPS y con la app correcta la URL + Webhook ID + los eventos habilitados, antes de declarar el webhook listo. La entrega firmada, prueba de rotación, callback PWA y conciliación financiera **siguen independientes**.

## Aviso importante de entregabilidad

El webhook alojado actualmente tiene `LIVE_WEBHOOK_RELEASED=false`: puede rechazar entregas. No realizar venta, renovación, cobro o prueba de emisión Live hasta que el receptor firmado y su worker estén efectivamente listos; PayPal puede reintentar notificaciones que no reciben HTTP 2xx.

La reserva de generación NO prueba identidad del comercio, validez de credenciales, webhook entregado ni derecho a beneficios. Es solo el primer identificador del control plane.

Documentación oficial de PayPal: https://developer.paypal.com/api/rest/webhooks/rest/
