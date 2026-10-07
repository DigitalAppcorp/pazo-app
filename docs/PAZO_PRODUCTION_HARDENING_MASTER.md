# PAZO — Production Hardening

**Estado:** EN CURSO — Gate 8  
**Tipo:** I — Infraestructura / seguridad / operación  
**Autorización:** Product Owner autorizó ejecutar el hardening necesario  
**Fecha:** 2026-10-07

## 1. Motivo

PAZO tiene una base sólida de RLS, ownership, migraciones, QA y control de cambios, pero la auditoría pre-Beta detectó deuda operacional que no debe esperar al lanzamiento público.

Esta fase NO cambia el concepto funcional de PAZO. Protege lo ya construido.

## 2. Hallazgos que abren esta fase

P0:
- webhook PayPal público con `verify_jwt=false` sin verificación criptográfica del remitente;
- webhook legacy intentaba modificar `pets.is_founder`, columna que ya no es la fuente de verdad;
- frontend mostraba el pitch de Founder en el primer uso real, sin demostrar uso recurrente;
- frontend activaba visualmente Founder en `onApprove` antes de confirmación segura del backend.

P1:
- sin Error Boundary global;
- sin CI de GitHub;
- sin error monitoring remoto tipo Sentry;
- frontend todavía usa legacy Supabase `anon` key;
- Leaked Password Protection desactivado;
- no existe política documentada de alertas/costos para Vercel/Supabase/Mapbox.

P2:
- observabilidad depende demasiado de revisión manual de logs;
- hay ruido operacional conocido en flujos de Documents y telemetría deduplicada;
- rate limiting/anti-abuse es parcial.

## 3. Decisión sobre membresía de apoyo

La monetización NO se elimina.

Intención aprobada:
- membresía de bajo costo;
- no cobrar por usar el núcleo de PAZO;
- presentar el apoyo solo después de que exista evidencia de uso real;
- mensaje principal: ayudar a mantener PAZO activo y sostenible;
- evitar una experiencia tipo paywall o “llegaste, págame”.

Aún NO decidido:
- precio definitivo;
- beneficios definitivos;
- umbral exacto de elegibilidad para mostrar el pitch;
- frecuencia de reaparición;
- nombre definitivo del programa;
- política de cancelación/gracia desde UX.

Regla:
**no volver a activar el pitch hasta cerrar esas decisiones y tener confirmación server-side del entitlement.**

## 4. Gate 8 — tranche 1

Implementado en `infra/production-hardening-1`:
- pitch automático Founder eliminado;
- activación local de Founder eliminada;
- webhook PayPal preparado para:
  - POST only;
  - límite de payload;
  - fail-closed cuando faltan secretos;
  - OAuth server-to-server;
  - verificación con PayPal `verify-webhook-signature`;
  - validación de plan;
  - lectura del estado real de la suscripción;
  - actualización de `profiles.is_founder`;
  - persistencia de `profiles.paypal_subscription_id`;
  - cancelación/suspensión/expiración reflejadas como no activo;
- Error Boundary global;
- GitHub Actions: `npm ci` + lint + build.

## 5. Configuración privada requerida para PayPal

La Edge Function requiere secretos privados:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID`
- `PAYPAL_ENV` = `sandbox` o `live`

No guardar secretos en Git ni en variables `VITE_*`.

Mientras falte cualquiera, el webhook debe responder 503 y NO mutar membresías.

## 6. Tranches siguientes

P1:
- Sentry/error monitoring y release tracking;
- migración frontend a Supabase publishable key moderna;
- variables de entorno por deployment;
- Leaked Password Protection;
- preparación de CAPTCHA/Turnstile para Beta;
- revisar branch protection/check requerido;
- alertas de salud/costo.

P2:
- rate limiting general para writes sensibles;
- reducir ruido de errores esperados;
- backup/restore drill;
- analytics mínimos de producto;
- regla server-backed para elegibilidad del pitch.

## 7. Definition of Done

No cerrar hasta que:
- webhook desplegado y rechace requests no verificadas;
- secretos PayPal de producción/sandbox estén configurados antes de reactivar membresía;
- build final PASS;
- CI PASS;
- runtime principal PASS;
- Advisors revisados;
- observabilidad/error monitoring P1 resuelta o explícitamente separada con gate activo;
- Scope Closure Reconciliation PASS;
- merge a main y main verificado.
