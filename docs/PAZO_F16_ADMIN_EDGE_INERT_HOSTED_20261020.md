# PAZO F16 — despliegue Edge inerte verificado (20-oct-2026)

El Product Owner autorizó exclusivamente alojar la función administrativa inerte, sin activar transacciones.

- Proyecto Supabase: `mrybvqdebbgcayuvgkkr`.
- Función: `pazo-admin-paypal-provision` — versión 2, ACTIVE, `verify_jwt=true`.
- Fuente comprobada alojada: `index.ts` con `RELEASE_APPROVED=false` y `intake.mjs` con respuesta de bloqueo `live_provisioning_not_released`.
- Base de datos observada: 0 generaciones comerciales, 0 reservas, 0 intentos de aprovisionamiento, 0 eventos Live.
- Selector: `environment=sandbox`, `live_enabled=false`, `kill_switch=true`, `active_generation=null`, `revision=0`.
- No se completó prueba HTTP externa del punto de entrada. El resultado ACTIVE/JWT es verificación de configuración y código alojado, no un E2E.
- No se modificaron main, checkout, webhook, beneficios, PWA ni activación financiera.
- El código sigue en PR #44 DRAFT, rama `f13/section-titles-20261012`.

Pendiente: autenticación administrativa reforzada, verificación comercial PayPal Live, configuración segura de credenciales por generación, firma/entrega de webhook, worker de conciliación alojado y validación E2E. Beta NO-GO hasta completar estos controles.
