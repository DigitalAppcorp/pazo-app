## Postflight HTTPS **PASS** y cierre de integración — 22-oct-2026 UTC

CI [run 39728858221](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39728858221) **6/6 jobs SUCCESS** en PR77, incluido `public-beta-postflight-http` job119658995723. Auditoría HTTPS de la app desplegada `https://pazo-app-t83r.vercel.app` con `ready:true` y **7/7 PASS**: home, PayPal return falso sin reflejo del token, PayPal cancel falso, manifest PWA válido, service worker sin caché de datos, iconos PNG 192/512. No se usó ninguna credencial ni pago.

PR77 merge `eddcb0a4370c8d78dd1d8c6be349ed3e9680f9bc`. Añade test HTTP público en CI y documentos de continuidad; la compilación Vercel publicada permanece SHA `5283bbc9460c2a991f258983b0051395f1911cea` porque PR77 no cambia el código de aplicación ni assets de Vite. PayPal sigue OFF y kill switch ON. **Este PASS no certifica el flujo iniciado en sesión Auth ni la instalación física de PWA.**

---

## Actualización autoritativa de producción — 22-oct-2026, después de GO del PO

**Tres PR incorporados a `main`:** #74 merge `e24d224d92cc80dbce51f4329feef77872335040`; #75 merge `7eaa2f402578b2d7ed7d183d44c54953fb15188d`; #76 merge `4c9ebe7895b887f32809537e0f512630c1a38cbf`. CI previo de sus heads: PR74 4/4 SUCCESS, PR75 5/5 SUCCESS con laboratorio PostgreSQL17, PR76 4/4 SUCCESS.

**Migración hospedada PASS:** `20261022052854_pazo_f16_public_benefits_live_only` aplicada por `apply_migration` y versionada en `supabase/migrations/20261022052854_pazo_f16_public_benefits_live_only.sql` (commit `5283bbc9460c2a991f258983b0051395f1911cea`). Antes, BEGIN/ROLLBACK con pruebas fail-closed PASS; la fuente original seguía activa tras rollback. Después: `pazo_supporter_public_wall(48)` **0**, badges públicos **0**, Live paid periods **0**, QA períodos **2** conservados, consentimientos muro **2** conservados; función ya no contiene fallback Sandbox. **No se eliminó data QA.**

**Edge ACTIVE v2:** `pazo-admin-paypal-vault`, `ezbr_sha256=cccbf1a996470f898011bced29e72d2cf8e5ddd6cfaa276cac5b234e462877c9`, `verify_jwt=true`; paquete de 9 fuentes comparadas contra GitHub `main`. Sigue exigiendo rol administrador y MFA reciente; auto-reserva **una vez** la generación original de configuración cuando no exista, seguida de readback owner-scoped. Esto NO valida credenciales reales ni crea un cargo.

**Vercel Production READY:** deployment `dpl_9UhAPHHd99rcpamfkQHn9LVM1RAB`, SHA `5283bbc9460c2a991f258983b0051395f1911cea`, alias canónico `https://pazo-app-t83r.vercel.app`, sin error de alias; no se alteraron settings SSO. E2E móvil físico y estado Auth real aún requieren pruebas. El job `public-beta-postflight-http` de este PR ejecuta GET en rutas home/return/cancel/manifest/SW/iconos contra el dominio publicado; su resultado debe consultarse en GitHub Actions antes de declarar PASS.

**Finanzas:** release `off`; live_enabled=false, kill_switch=true, Live paid periods 0. El certificado técnico heredado `admin_private.pazo_live_release_artifact` sigue devolviendo ready=true, **pero documenta frontend SHA anterior `f7cc359a...`**. NO atribuir al nuevo deploy una certificación que solo verificó el artefacto anterior. La conciliación de certificado/evidencia con nuevo frontend es gate antes de canary financiero.

**Limitaciones honestas:** no se han confirmado canary PayPal Live real ni instalación PWA en teléfono real; ninguna operación OAuth Live con claves reales. Código, DB y Edge pueden pasar controles técnicos sin que eso equivalga a pruebas autenticadas del usuario.

---

## F16 — certificado técnico instalado y gate previo a credenciales — 22-oct-2026 UTC

**PASS real de la parte técnica comprobable sin PayPal Live**. GitHub `main` incluye PR71/72; Vercel Production `dpl_J548ManBu2xMJCUwV6L7QwiNfNzM` READY, frontend SHA `f7cc359a15e874942f68fc15f55c43e851f7724d`, canonical `https://pazo-app-t83r.vercel.app`; HTTP público 7/7 PASS en Actions run39718690012/job119626859178. Cinco Edge Live listadas ACTIVE en versiones release1/webhook2/checkout3/cuenta5/worker4 y hashes exactos almacenados en `docs/evidence/PAZO_F16_TECHNICAL_CERTIFICATE_BASIS_20261022.md`; fuente de69/69 verificada por postflight anterior. Worker vivo (heartbeat dentro5min), oferta ES/EN, RPC recuperación, beneficios y finanzas PASS.

Se ejecutó `scripts/f16-technical-release-certificate-operator-20261022.sql` contra Supabase: **primero BEGIN/ROLLBACK PASS con 0 certificados después; después CI SUCCESS y ejecución COMMIT exactamente una vez**. Postflight alojado confirmó fila única `admin_private.pazo_live_release_artifact` con `verified_at=2026-10-22T03:58:00.946349+00:00`, `frontend_commit=f7cc359a...`, `return_origin` canónico, `evidence_sha256=ad9a35ae6b268c5eb9fbe5f26aeeaadb65de8f769eb693c5363cf2a22dd37c29`, `admin_private.pazo_live_artifact_ready()=true`. Fuentes SQL de readiness: terms, recuperación, beneficios, finanzas, certificado y worker **6/6 true**. No hubo merchant configurado.

**SEGURIDAD:** release `off/rev0`; sandbox/live=false/kill=true/active_generation=null; Live intentos0/períodos0. No uso de PayPal Live, claves, pagos, autorización canary ni acceso público financiero. Queda **READY_FOR_PO_PRIVATE_LIVE_CREDENTIAL_ENTRY** por cobertura técnica, pero **NOT LIVE_CANARY_PASS ni BETA_FINANCIAL_PUBLIC_GO**. El PO ingresa Client ID/Secret solo en PAZO Admin→PayPal→Live autenticado con MFA y aprueba expresamente canary US$2.99; tras canary se deben verificar venta firmada, período, beneficios, cancelación y condiciones de apertura pública. QA de usuario autenticado e instalación física PWA no se afirman. Este estado prevalece sobre notas históricas de certificado0.

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
