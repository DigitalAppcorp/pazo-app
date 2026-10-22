# PAZO — publicación técnica beta / postflight

Fecha: 2026-10-21 (Los Ángeles), 2026-10-22 UTC.
Alcance: GitHub + Vercel Production + auditoría SQL de solo lectura; PayPal Live **OFF**.

## Recuperación Codex
- Codex dejó PR #67 fusionado en F13: oferta Live bilingüe US$2.99/mes, checkout/recuperación idempotente, cuenta y cancelación del titular, webhooks, conciliador/worker, beneficios desde períodos verificables, administración financiera y control P4. También se incluyeron PR #68–70 para PWA/return, gate HTTP y entrypoints inertes.
- PR #44 integró F13/F16 en `release/mvp-beta-fast-track-20261010`; merge `a4a61c158885eb4f9a2c516b2d68bb7f1ecc981e`. El reporte previo a la publicación registra verify:prepreview 1,813 PASS, PG17 y preview HTTPS 7/7, navegador móvil/escritorio 390/1440px, SW/callbacks/offline, sin confirmar pago real.
- Las migraciones Supabase hasta `20261022021500` y Edge (release v1, webhook v2, checkout v3, cuenta v5, worker v4) figuraban instaladas y verificadas en el handoff. No se reaplicó SQL ni se redesplegó Edge durante este postflight.
- No hay acceso a cambios locales de Codex no subidos a GitHub desde el entorno de esta conversación. No se declaran recuperados.

## Integración GitHub
- PR #71 `release/mvp-beta-fast-track-20261010` -> `main`: **MERGED** con expected head `a4a61c158885eb4f9a2c516b2d68bb7f1ecc981e`.
- Commit nuevo en `main`: `f7cc359a15e874942f68fc15f55c43e851f7724d`.
- La cabeza release anterior había ejecutado **8/8 workflows Actions SUCCESS**: CI, Live Gateway PG17, Bootstrap Browser, Sandbox Auto QA, Fresh Auth Owner PG17, Retry PG17, Created Webhook Readonly y Multiattempt PG17.
- Comparación antes del merge: release ahead of main, detrás=0 (fast-forward histórico posible); se utilizó merge commit para conservar el historial completo y el SHA auditado.
- Vercel Git autodeploy seguía deshabilitado; la publicación se lanzó manualmente en el proyecto correcto.

## Vercel Production — PASS plataforma y HTTP público 7/7
- Equipo `digitalapp` (ID `team_02Ax5UcD1OlLzpDBYyNMi6KO`).
- Proyecto existente `pazo-app-t83r` (ID `prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH`), Vite/Node 24, sin cambio de plan, cuota ni protección SSO.
- Deploy desde GitHub `main` SHA `f7cc359a15e874942f68fc15f55c43e851f7724d`, target **production**.
- Deployment ID `dpl_J548ManBu2xMJCUwV6L7QwiNfNzM`; estado **READY**; `aliasError=null`.
- Alias principal asignado por Vercel: `https://pazo-app-t83r.vercel.app` (más alias de equipo/git-main).
- Entorno Vercel ya incluye `VITE_PAZO_LEGAL_EFFECTIVE_DATE=2026-10-21` para production, URL pública de Supabase para preview/production, flags Sandbox QA=false y beneficios UI=true (sujetos a RLS/SQL); Mapbox se conserva.
- **HTTP canonical 7/7 PASS verificado de forma externa a las 2026-10-22 03:46 UTC**: GitHub Actions run `39718690012`, job `119626859178` `Beta canonical 7-route HTTP/PWA smoke (read-only)`, step exitoso. Salida JSON real `ready=true` y siete `code=pass`: home, paypalReturn, paypalCancel, manifest, serviceWorker, icon192, icon512. Prueba por GET no autenticado; chequea status 200, content-type, manifest instalable, SW network-only, PNG correctos y no reflexión de token sintético. No se cambió SSO para conseguirlo. La lectura directa con el conector Vercel sí devolvió 403 de permisos y no debe confundirse con el resultado HTTP del runner.
- No se ha comprobado instalación PWA física, carga completa Mapbox en dispositivo, navegación anónima real ni E2E autenticado en este deploy. El preview previo PASS no sustituye estas pruebas.

## Postflight financiero SQL alojado, solo lectura
Consulta al proyecto Supabase `mrybvqdebbgcayuvgkkr` después del despliegue:
- `admin_private.pazo_live_release_control`: `mode=off`, `revision=0`, `merchant_generation=null`.
- `admin_private.pazo_live_release_artifact`: **0** certificados.
- `admin_private.pazo_paypal_new_checkout_switch`: `environment=sandbox`, `live_enabled=false`, `kill_switch=true`, `active_generation=null`, `revision=0`.
- Solicitudes de cambio `pazo_live_release_requests`: **0**; pruebas financieras `pazo_paypal_release_evidence`: **0**.
- Ningún ajuste de flags financieros, secreto, permiso, factura, merchant, plan, token o producción de Supabase se realizó durante esta entrega.
- **PayPal Live NO habilitado**. No hubo canary, cargo comercial, cancelación Live real ni creación simulada de certificado.

## Gates restantes sin falsear
1. **Completado:** gate HTTP canónico 7/7 desde GitHub Actions. Pendiente QA autenticada/manual de registro/login, privacidad, mapa y navegación y PWA instalada en dispositivo físico. La prueba HTTP no certifica estos recorridos.
2. Inspeccionar errores runtime de Production y comprobar configuración SSO/acceso público con navegador de usuario real; no debilitar SSO por intuición.
3. Registrar certificado técnico solo tras verificar commit exacto, assets HTTPS, origen de retorno y fuentes Edge con pruebas verdaderas, conforme al protocolo P4; no crear un certificado vacío.
4. Para monetización, el PO debe ingresar claves de PayPal Live únicamente dentro del panel privado, usar MFA reciente y autorizar por separado canary personal US$2.99, conciliación y cancelación. Abrir el cobro público solo después de recibo firmado, período confirmado y cancelación verificada.
5. Instalar/probar PWA en un dispositivo físico y confirmar la aceptación del Product Owner. Riesgos conocidos: HIBP no disponible en plan Supabase Free (Pro requerido) y backup offsite aplazado por decisión PO.

## Estado resumido
**GIT_MAIN_INTEGRATED=PASS; VERCEL_PRODUCTION_READY=PASS; FINANCIAL_KILL=PASS; PUBLIC_HTTP_7_OF_7=PASS (Actions 39718690012); AUTHENTICATED/PWA_PHYSICAL_E2E=UNVERIFIED; LIVE_PAYMENT_E2E=NOT_RUN; RELEASE_FINANCIAL_CERTIFICATE=ABSENT.**
La beta técnica está desplegada. **No se afirma beta final con QA funcional autenticada completa ni PayPal Live listo para cobrar** sin cerrar los puntos anteriores.

Enlaces: [PR71](https://github.com/DigitalAppcorp/pazo-app/pull/71), [production](https://pazo-app-t83r.vercel.app/), [preview HTTPS anterior](https://pazo-app-t83r-b6fzt5jwv-digitalapp.vercel.app/).
