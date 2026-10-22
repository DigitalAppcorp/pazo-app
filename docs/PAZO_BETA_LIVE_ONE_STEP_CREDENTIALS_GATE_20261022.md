# PAZO F16 beta — credenciales Live en una sola operación (22-oct-2026 UTC)

Estado: **PR76 DRAFT, código/CI pendiente, NO DEPLOY**. El PO ordenó que, tras finalizar F16, su única configuración rutinaria sea introducir Client ID/Client Secret en Administración con MFA reciente, sin un paso técnico extra para crear una generación.

## Bloqueo alojado observado

Consultas read-only de Supabase:
- `admin_private.paypal_gateway_settings`: configuración Live tiene plan, webhook, origen HTTPS canónico y US$2.99/mes correctos, sin secretos.
- `admin_private.pazo_paypal_merchant_generations`: **cero** generaciones Live.
- `admin_private.pazo_paypal_live_bootstrap_reservations`: no hay reserva original utilizable para Vault.
- `public.pazo_f16_live_service_bootstrap_reserve` actual permite reserva idempotente por **mismo actor+plan**, con kill-switch ON y Live OFF; `pazo_f16_live_service_bootstrap_read` entrega estado reservado owner-scoped.
- **Incompatibilidad preexistente:** `liveVaultSetup.mjs` rechaza guardado si no hay reserva, mientras que `liveMerchantBootstrapControl.mjs` rechaza solicitud de reserva si el webhook ya existe. Para el PO con plan/webhook originales ya configurados se produce un bloqueo circular.

## Solución técnica

En `pazo-admin-paypal-vault`, **después** de verificar Admin real+TOTP reciente, el cuerpo exacto Client ID/Secret, Live OFF, plan, webhook, $2.99 y origen original:
- Leer generación reservada por actor/plan. Si existe, usarla sin escrituras de bootstrap adicionales.
- Si devuelve **exactamente NULL**, invocar la RPC service-only **ya instalada** `pazo_f16_live_service_bootstrap_reserve` una sola vez, y efectuar lectura posterior del mismo actor/plan. No usar generación adivinada.
- Si la reserva falla/timeout pero quedó confirmada por el servidor, aprovechar la lectura owner-scoped; **jamás repetir a ciegas** la escritura.
- Reconciliar nuevamente plan/webhook/generación con el estado protegido, verificar OAuth Live, GET plan/webhook, guardar ambos secretos de modo atómico en Vault y verificar readback. Si no hay evidencia suficiente, falla cerrado sin suscripción, permisos, activación ni cargo.
- El endpoint PayPal real, el plan y el webhook **no se recrean ni se editan**. No requiere nuevo SQL, solo versión revisada de la Edge y CI.

## Independencia de otras fases

El PR75 separado corrige la proyección pública de badges/muro con pagos Sandbox; requiere GO de migración. El PR74 separado corrige UI/admin/lectura de estado; requiere GO de merge y QA. Este cambio por sí solo NO autoriza despliegue de Edge, mayCharge, Live público ni petición de claves.

## Gates

1. Suite offline: ruta con reserva existente, auto-reserva única, resultado incierto recuperado/no recuperable, datos alterados, OAuth fallido, owner+TOTP faltantes, no secretos en logs ni respuestas.
2. Revisar compatibilidad de `pazo_f16_live_service_bootstrap_reserve` hospedada y su RLS/switch ON/OFF; ya inspeccionada read-only sin cambios.
3. PO autoriza publicar la Edge actualizada al proyecto; postflight versión/huella/paridad. Registrar nuevo certificado técnico si su evidencia queda afectada.
4. Solo cuando resto del DoD esté validado, el PO ingresa claves **únicamente en el formulario privado** con MFA; canary real US$2.99 necesita GO independiente.
