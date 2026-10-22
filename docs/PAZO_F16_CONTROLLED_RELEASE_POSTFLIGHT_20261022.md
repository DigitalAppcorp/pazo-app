# P4 — postflight alojado, 22-oct-2026

Código `41871d47` publicado en PR67: **5/5 GitHub Actions SUCCESS** (verify,
Live Gateway PG17, F14 PG17, P12 staged install y P21 worker rehearsal).
Local: verify:prepreview1811 PASS, TypeScript/build/dist; PG17 y Chromium390/1440
PASS. No prueba financiera real ni aceptación visual del PO.

## Base de datos

`20261021230000_pazo_f16_live_controlled_release` **APLICADA** como preparación
técnica autorizada. Auditoría previa: 3/3 bridges originales coinciden por hash;
se guardaron definiciones privadas previas de los seis RPC reemplazados.
BEGIN/ROLLBACK alojado PASS; ausencia de objetos y selector sin cambios
verificados después. SQL e historial instalados en la misma transacción.

SHA256 del SQL aplicado:
`cf865e45439483089efb0436161580e16a7c60f5e20801d5d81783747588a4da`.

Postflight: **13/13 cuerpos SQL exactos**. Tres tablas nuevas con RLS ENABLE +
FORCE; authenticated sin UPDATE y service_role sin INSERT directo. Release
change/admit/runtime solo EXECUTE service_role; snapshot de release y settings
solo authenticated + admin revalidado dentro de SQL. Ni instalar ni desplegar
crea certificados o autoriza compras.

Control `off/revision0`, certificado0, autorizaciones0. Selector
sandbox/Live=false/kill=true/generación=null; procesamiento financiero=false.
Intentos/períodos/inbox0. No datos financieros reales ni llamadas PayPal nuevas.

## Edge

Actualización dirigida por CLI oficial, sin prune ni cambios de secretos:

| Servicio | Versión ACTIVE | JWT | Fuentes descargadas exactas |
| --- | --- | --- | --- |
| pazo-admin-paypal-release | 1 | ON | 5/5 |
| pazo-paypal-live-webhook | 2 | OFF, firma/origen originales en pipeline | 19/19 |
| pazo-paypal-live-checkout | 3 | ON | 9/9 |
| pazo-paypal-live-account | 5 | ON | 8/8 |
| pazo-paypal-live-worker | 4 | OFF, capacidad privada de un uso | 28/28 |

**69/69 comparaciones de bytes PASS** frente al código del commit revisado.
Worker conserva protocolo `pazo_live_worker_v2`; heartbeat real reciente,
outcome idle y procesamiento=false después del deploy. Cuenta/worker se
actualizaron por los módulos compartidos, conservando sus contratos.

HTTP real sin usuario: checkout GET con JWT público devuelve503
`live_release_unverified`; webhook GET/POST503 `live_webhook_not_released` por
certificado ausente; release sin Auth401, JWT público sin usuario403
`fresh_admin_mfa_required`; cuenta list con JWT público401
`authentication_required`. No se falseó una sesión admin/MFA ni se ejercitó
canary/public con identidad real. Esos positivos siguen reservados al PO.

## HTTPS y publicación

Vercel principal sigue producción `dpl_E6t1jhXeAN49mS4gSCJufc2wFZ93`, SHA
`5163c187eb7c52d85a34e4f32cd89820a4535498`. Dominio canónico no vinculado a
rama preview. Git deployments continúan OFF. Gate público del22-oct devuelve
`ready=false`: la SPA antigua no cumple metadatos y callbacks/manifest/SW/iconos
no devuelven los200 requeridos. No usar el PASS local como HTTPS_E2E_PASS.

Preview protegido creado después de este postflight: **READY**, deployment
`dpl_FGiumJgvLvrL3MmxSwk8i1WUC11s`, fuente `020e6ce1`,
https://pazo-app-t83r-8zbuzaf2x-digitalapp.vercel.app. Build local/prebuilt sin
cloud build adicional ni promoción de producción. SSO conservado; alias vacío.
GET por red normal bloqueado403 por el proxy antes de Vercel; excepción exacta
guardada en borrador de entorno, pendiente publicación manual. No HTTP/PWA PASS.
SDK/OIDC permanece en archivos privados ignorados; `.env.example` conserva su
excepción de versionado. Avance Auth/Gmail/legal posterior en
`PAZO_BETA_MAIL_AUTH_PREVIEW_20261022.md`.

Faltan HTTPS/PWA, certificación técnica tras comprobar fuentes/origin, cierre
operativo y revisión final del PO. **No READY_FOR_PO_CREDENTIALS ni beta lista.**
No main, publicación pública, claves Live, autorización canary ni cobro real.
