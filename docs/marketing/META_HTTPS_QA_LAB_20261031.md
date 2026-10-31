# PAZO — Laboratorio HTTPS QA de Meta Pixel (31-oct-2026)

## Propósito y aislamiento

**Sitio temporal desplegado:** https://pazo-meta-qa-20261031.vercel.app

- Vercel proyecto **separado** `pazo-meta-qa-20261031`, ID `prj_DFcR6ksQPpFJ9OQa1vJrzhZdNQ0y`, equipo DigitalApp; despliegue corregido `dpl_BmHqm76gR2AAFYvgwZ4TtMk9unLG` (READY), alias HTTPS propio de QA.
- **No** es `pazo-app.vercel.app`, no contiene la aplicación real, no importa `App.tsx`, no accede a Supabase, no hay tokens ni identificadores de usuarios.
- Dataset únicamente **PAZO QA - Pruebas** `1090116830295088` en el JavaScript público. Dataset productivo **PAZO Web** `1438916858347709` no está en la página.
- Archivos replicables en `qa/meta-pixel-https/{index.html,qa.js,vercel.json}`. Proyecto creado sin Git vinculado; los push de PAZO NO despliegan este sitio. El despliegue de QA fue iniciado con archivos explícitos por el conector Vercel, **no** por promoción ni redeploy del proyecto PAZO.
- QA visible públicamente bajo alias, pero `noindex,nofollow`, CSP restringida, referrer no-referrer, sin cargas Meta al abrir la página. Se requiere casilla inicialmente desmarcada y botón deliberado. GPC bloquea el envío; retirar permiso solicita `consent revoke` y borra `_fbp/_fbc`. Solo admite `CompleteRegistration` y UUID sintético. Usarlo en un navegador real transmite IP/datos técnicos de ese navegador a Meta; el aviso del sitio lo explica y debe obtener consentimiento del operador.
- No contratamos productos adicionales; Vercel puede consumir las cuotas preexistentes de compilación/servicio. No hay servicio de CAPI Gateway, ni Pixel de PAZO productivo.

## Auditoría real HTTPS en GitHub Actions (Chromium sintético)

Se ejecutaron **dos intentos aislados** desde GitHub-hosted Chromium, con intercepción de red:
1. [Workflow primer intento](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41197674691): página HTTPS responde 200, 0 solicitudes Meta antes del consentimiento, 0 con GPC; SDK se cargó, evento sintético produjo ID `b356ffa6-5370-4f45-92ae-bcc7c0f832ab`; **0 solicitudes `/tr` observadas**. Una `_fbp` persistió tras el retiro: `INCONCLUSIVE_NO_PIXEL_NETWORK_REQUEST`.
2. [Workflow segundo intento](https://github.com/DigitalAppcorp/pazo-app/actions/runs/41198139196): se reparó el bootstrap de prueba (alias `fbq.push=fbq` y cola nativa), además de limpieza de cookies por host y domain. Chromium: página responde 200, 0 solicitudes Meta antes del consentimiento, 0 con GPC; `window.fbq.callMethod` sí es `function`, cola agotada, scripts oficiales Meta cargados. ID sintético `abec8fa2-0b6e-470c-b166-f7dd2490f04a`; **0 solicitudes `/tr` observadas**; 0 cookies `_fbp/_fbc` tras el retiro; 0 errores de consola y 0 solicitudes bloqueadas por el test. Clasificación: `INCONCLUSIVE_NO_PIXEL_NETWORK_REQUEST`, NO PASS de recepción Pixel.
- La suite `meta-vendor-egress-browser.mjs` aparte descargó dos assets oficiales y confirmó que el SDK puede crear `_fbp`; en ese experimento todos los eventos externos estaban bloqueados. No observó ningún evento a Meta; en ningún caso se ha probado deduplicación de proveedor.
- El runner no lleva correos de usuarios, ni credenciales de Meta, ni token CAPI QA. Se permitió únicamente un POST/GET de Pixel al dataset QA si el request hubiera cumplido dataset/evento/URL, pero **ninguno se generó**.
- El workflow de envío one-shot se **retiró** de `.github/workflows/meta-vendor-egress-audit-off.yml` tras los intentos; no habrá más ensayos de Pixel automático por commits posteriores.
- Resultado `GitHub Actions SUCCESS` significa que la auditoría y sus invariantes ejecutaron sin errores. El estado de negocio `PIXEL_EVENT_DELIVERY` permanece **INCONCLUSIVE**, no un PASS de plataforma.

## Bloqueo actual y protocolo manual más seguro

Necesitamos distinguir si el Pixel oficial no emite por configuración del dataset/dominio/navegador CI o por la secuencia propia de inicialización.

**Se requiere al titular/opción explícita:**
1. En un navegador común, abrir la URL QA HTTPS. *No* visitar el sitio oficial de PAZO para esto.
2. Con el panel de desarrollador **Red / Network** abierto, seleccionar sólo si está conforme con que Meta vea la IP y datos técnicos del navegador. El sitio no requiere correo, contraseña ni registro.
3. Pulsar una vez «Enviar un evento sintético» y filtrar solicitudes por `facebook.com/tr`. Capturar si aparece una solicitud con `id=1090116830295088`, `ev=CompleteRegistration` y `eid` igual al ID que muestra el sitio. **No publicar cookies, IP, encabezados de autenticación o URL completa si contienen información privada.**
4. Si aparece, el siguiente paso será emparejar *ese mismo ID* con un evento sintético CAPI enviado al mismo dataset QA desde una credencial **privada**; comprobar ambos orígenes y deduplicación en Meta. Si no aparece, corregir integración/browser primero; no activar la app productiva ni inventar un PASS.

**No instalar Pixel en PAZO ni crear migraciones/metas para usuarios reales sin la revisión y GO por separado.**

## Estado de liberación

`HTTPS_QA_DEPLOYMENT=READY` · `NO_CONSENT_EGRESS=PASS` · `GPC_BLOCK=PASS` · `QA_COOKIE_WITHDRAWAL=PASS` · `SDK_LOAD=PASS` · `BROWSER_PIXEL_HTTP_EVENT=INCONCLUSIVE` · `META_PROVIDER_DEDUP=NOT_TESTED` · `PRODUCTION_PIXEL_CAPI=OFF` · `PUBLIC_PRIVACY_LEGAL_REVIEW=PENDING`.

Eliminar el proyecto temporal `pazo-meta-qa-20261031` cuando termine la validación y conservar solo las evidencias y archivos del repositorio. Eliminarlo afectará únicamente el proyecto QA, nunca PAZO.
