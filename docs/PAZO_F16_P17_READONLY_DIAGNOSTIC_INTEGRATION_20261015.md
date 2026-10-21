# PAZO F16-P17 — diagnóstico integrado, previews automáticos permitidos

**Fecha:** 2026-10-15. El Product Owner corrigió la restricción anterior: **los previews automáticos por push en la rama pueden generarse sin problema**. Continúan prohibidos los despliegues manuales/promociones a producción sin GO, las compras PayPal, la cancelación de la suscripción histórica, los beneficios, un checkout público y el merge a `main`.

## Trabajo realizado

- Se importó el diagnóstico privado originalmente preparado como paquete local P17 al repositorio: `scripts/f16-p17-account-readonly-preflight.mjs`. Tiene **cero tráfico de red por defecto**. Solo `OPTIONS` CORS y `POST {"action":"list"}` en el mismo endpoint controlado. Debe existir un origen HTTPS **exacto**, nunca un patrón wildcard, y un opt-in explícito del operador `PAZO_F16_P17_READ_ONLY_GO=I_AUTHORIZE_READ_ONLY` para hacer la consulta. El modo Auth requiere `PAZO_F16_TEST_USER_JWT`, `PAZO_F16_PUBLIC_KEY`, `PAZO_F16_STABLE_ORIGIN`, que deben ser credenciales proporcionadas al proceso por el operador sin exponerlas en commits, mensajes, URL, capturas ni argumentos.
- Se integra con el runner de `npm run test:f16:synthetic` mediante `src/features/supporter/testing/f16P17AccountReadonlyPreflight.test.mjs`, y se amplió a seis pruebas (origen exacto; cero red por defecto; CORS; listado bajo Auth; error/lista inválida; sin rutas mutadoras). El encabezado de CORS se valida por tokens **exactos**, no por simples substrings. No se crean datos ni se llama a PayPal.
- Se conserva separado `PAZO_F16_APP_ORIGIN` (configuración privada de la función Edge) del origen introducido por el operador al diagnóstico. **No se afirma que el origen de Edge esté configurado** ni se pretende detectar la presencia de secretos por lectura de código.

## Limitaciones operativas verificadas

- Los controles Supabase vigentes son `f16-paypal-supporter-account` ACTIVE v2 con `verify_jwt=true`; 0 ofertas/consentimientos/ledger y 8 eventos históricos PENDING. No se cambian en este gate.
- No se cuenta con una sesión verificada del titular ni con el origen real permitido para una llamada E2E: las pruebas son **sintéticas** y no prueban `list`, `status` o `cancel` con credenciales reales.
- Vercel devuelve 403 al consultar detalles del scope `digitalapp`; no se inventa un dominio canónico. Los previews automáticos de cada push ahora están autorizados, pero su presencia no demuestra que la función permita su origen. Un preview efímero no es un nuevo valor aprobado de CORS.
- El consentimiento P06 original no existe para la única suscripción histórica. No se puede generar un comprobante auténtico para ella.

## Siguiente gate

Fijar y verificar un dominio HTTPS estable, revisar de forma autorizada la configuración de Edge **sin revelar secretos**, y ejecutar primero CORS/OPTIONS con ese origen. Solo después, con autorización y sesión real del titular, usar el diagnóstico de `list`. La acción `status` es una consulta PayPal GET distinta; cualquier `cancel` requiere confirmación específica de la suscripción y voluntad del propietario y se ejecutaría sobre PayPal, nunca como parte del preflight P17.

Se mantiene **PAZO gratuito**, Amigo opcional USD 2.99/mes **OFF**, PR #44 DRAFT, sin Live, sin períodos acreditados ni beneficios.
