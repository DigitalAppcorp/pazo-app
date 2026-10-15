> **Resultado final verificado (2026-10-15):** CI sobre el commit `78fdfa5` obtuvo `preflight_503_origin_not_configured` desde Edge v3. La variable `PAZO_F16_APP_ORIGIN` falta o su valor no supera el validador de origen HTTPS exacto. Este bloqueo es real, no sintético. El último commit técnico `7cb4480` separa lista/descarga de términos del modo PayPal, con CI+PG Lab PASS. La Edge de gestión está ahora ACTIVE **v4** `verify_jwt=true`; el preflight no se pudo declarar PASS sin que un operador configure el origen. El conector no ofrece gestión de secretos. Se quitó la prueba de red temporal de CI y se conservaron pruebas locales permanentes. DB: 0 ofertas, 0 aceptaciones, 0 ledger, 8 eventos históricos pending; webhooks sin cambios. Un preview conocido `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app` puede servir como **origen temporal de QA**, no como dominio estable de producción.

# PAZO F16-P18 — Corrección comprobable de preflight sin credenciales
**Fecha:** 2026-10-15. PR #44 DRAFT. No Checkout, no Live, no compras ni cancelaciones reales.

## Evidencia real
`GitHub Actions CI` commit [88d7b48](https://github.com/DigitalAppcorp/pazo-app/commit/88d7b48da0ca10a9ddabc3e0d974a7b192b27e58) realizó OPTIONS a la función alojada `f16-paypal-supporter-account` con Origin de un preview existente; devolvió **503** (versión Edge v2). No JWT, información de cuenta ni PayPal. El diagnóstico inicial no distinguía la clase HTTP; el segundo run devolvió `preflight_http_503_unavailable` sin exponer respuesta completa.

## Causa de código y corrección
La versión v2 corría `shouldRun()` —verificación de variables Sandbox/clave servidor— antes de interpretar OPTIONS. Este diseño devolvía 503 aunque el preflight no necesitara ninguna credencial financiera. Corregido en `supabase/functions/f16-paypal-supporter-account/index.ts`: `resolvePazoAccountOriginGate` maneja origen HTTPS exacto y OPTIONS (POST, authorization/content-type/apikey) antes de `shouldRun`. `POST` sigue exigiendo `PAZO_F16_PAYPAL_ENV=sandbox`, Auth `getUser`, límites y procedimientos service_role. Sin orígenes wildcard ni respuesta de datos sensibles; las funciones P14/P15 no cambiaron. **No desactivar verify_jwt**. Archivo del gate: `accountOriginGateP18.mjs` y pruebas `f16P18AccountOriginPreflight.test.mjs`.

Versión **Edge v3 ACTIVE con verify_jwt=true**, desplegada desde el commit técnico [0f2ef89](https://github.com/DigitalAppcorp/pazo-app/commit/0f2ef89f700876a52da23136c49c1bfce4d338e9), CI + PG Lab PASS. No se hizo ninguna transacción PayPal.

## Interpretación de próximo probe
- `CORS_VERIFIED`: preflight 204 real al Origin específico; **NO** prueba tokens ni estado.
- `preflight_503_origin_not_configured`: entorno no dispone de `PAZO_F16_APP_ORIGIN` HTTPS exacto (o valor inválido); debe fijarse por operador autorizado, sin revelar secretos ni ampliar CORS.
- `preflight_503_runtime_not_configured`: otras variables de servicio/Sandbox no configuradas; sin exponer valores.
- `preflight_http_401_authentication_gate`: la plataforma no permitió OPTIONS; evaluar el impacto de `verify_jwt` antes de cualquier cambio, nunca desactivar a ciegas.
- `preflight_http_403_origin_or_gateway_denial`: Origin de preview no corresponde a allowlist, posible acceso prohibido.
- Otras causas: transporte del runner, Edge/route/version, headers. Nunca inferir estado de cobro ni disponibilidad E2E desde preflight.

En espera: nuevo run de GitHub Actions con OPTIONS sin creds tras Edge v3; integración Auth list solo con un usuario real autorizado, PayPal status GET separado, cancelación bajo voluntad inequívoca de titular. No Live, no paidThrough, sin eliminación de 8 eventos QA.
