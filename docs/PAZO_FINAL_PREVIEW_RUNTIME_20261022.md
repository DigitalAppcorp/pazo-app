# Preview final: runtime y cierre de correo — 22-oct-2026

> **Actualización Guatemala21-oct/UTC22-oct:** red resuelta, HTTP7/7 y Chromium HTTPS390/1440+offline/online PASS del candidato exacto. No instalación física ni dinero. Evidencia vigente `PAZO_PREVIEW_HTTPS_VALIDATION_20261021_GT.md`; notas de red pendientes inferiores son historia superada. Canonical/certificado requieren GO.

## Código y servicios

Fuente candidata **a3f912ebbb64d1c2365471be04ac2915fc9e1e9e**,5/5 Actions SUCCESS,
con SQL anterior73525439 también5/5 y parche instalado20261022021500. Último
`verify:prepreview`1,813 PASS, TypeScript/build/dist. Gmail SMTP587 configurado,
remitente PAZO; un envío de recuperación al propio PO HTTP200 y recibido según
confirmación explícita. No cambió contraseña; no repetir Auth E2E ya aceptado.

Sin credenciales PayPal nuevas, canary, pagos ni certificado técnico. Supabase
modoOFF/rev0/Live=false/kill=true/gen=null/procesamiento=false, intentos/períodos0
según postflight posterior al parche. Los69 módulos Edge previamente verificados
no cambiaron por estos textos/configuración. Main/producción intactos.

## Hallazgo que impidió aceptar la primera vista

La vista020e6ce1 pasaba los siete GET (SPA/callbacks/manifest/SW/iconos) con acceso
automático oficial de Vercel, usando el token existente del mismo proyecto solo
hacia su propio hostname, sin imprimirlo ni desactivar SSO. **No pasaba app E2E**:
Chromium mostró el mensaje real de configuración ausente.

Causa: `VITE_SUPABASE_URL` genérica tipada sensitive, omitida/exportada vacía por
`vercel pull` para prebuilt. La URL es pública por contrato y solo permite el
proyecto canónico. Vercel respondió400 al cambio de tipo (tipos sensitive son
inmutables); se usó el flujo soportado delete/create exclusivamente para esa URL
pública, tipo plain, mismo origin/targets. Sin extracción de valor sensible,
cambio de publishable key ni guardas relajadas. La comprobación de la app evita
cargar un proyecto vacío/ajeno y se conserva.

Se preservó Mapbox público existente y se añadió target Production; se preparó
QA=false y beneficios=true para Preview/Production. Overrides de otras ramas
conservados. Esto prepara próximos builds, no cambia el deployment que sirve
el dominio público. No PostHog nuevo, key privada, add-on o gasto contratado.

## Artefacto corregido

Pull oficial actualizado: `getPublicSupabaseConfig` sobre el export real PASS,
Mapbox pk válido y flags exactos. Build oficial local/prebuilt PASS con fecha
legal vacía. Se preservó package-lock exacto tras comprobar que npm solo quitó
metadata libc y no cambió versiones/árbol/integrity. Chromium sobre el bundle
compilado390/1440 PASS: inicio/registro sin enviar formulario, textos legales
reales, scroll, Escape/foco, sin overflow/errores. No confundir esto con HTTPS.

Vercel **READY**, proyecto pazo-app-t83r/equipo digitalapp:
`dpl_8wYorPT2TVTFvbyBT9hufbTKNzA3`, fuente a3f912eb exacta por API,
https://pazo-app-t83r-b6fzt5jwv-digitalapp.vercel.app.
Prebuilt sin cloud build nuevo, preview sin promoción, SSO preservado, sin alias.
Producción sigue `dpl_E6t1jhXeAN49mS4gSCJufc2wFZ93`, SHA5163c187.

Auth del candidato nuevo: añadidas sus rutas exactas `/` y `/?auth=recovery`
a la allowlist de Supabase, conservando las5 anteriores (total7). PATCH+GET PASS;
SMTP, site_url, MFA y autoconfirmación preservados. No se envió otro correo.

## Red y prueba pendiente

GET normal al hostname nuevo: túnel403 antes de Vercel. No intentar IP/ruta
alternativa, proxy propio, apagar TLS/SSO ni buscar HTML vía API. Excepción
exacta guardada en borrador del entorno, revisión9, status saved y
requires_publish=true. Presets/domains/secret requirements previos conservados.
Se pidió al PO revisar/guardar/publicar ese entorno; no es GO de PAZO o dinero.

Tras aplicación: comprobar GET normal→SSO; HTTP siete rutas usando credencial
oficial existente del proyecto (solo header/cookie, nunca query/argumentos/logs),
y Chromium HTTPS390/1440 con proxy y CA normales, app realmente iniciada, legal
Gmail/PayPal, SW activo sin Cache Storage y callbacks sin parámetros. Registrar
separadamente emulación/instalación física y dinero: no simular PASS.

Después del GO de publicación, desplegar la misma fuente al canonical, fijar
fecha legal de publicación por env público, repetir gate canonical7/7 y navegador,
verificar fuentes Edge/worker y registrar certificado técnico con SHA de evidencia.
Solo entonces readiness administrativo podrá pedir claves privadas y GO canary.
Ninguna de estas operaciones requiere editar el programa tras las credenciales.
Hasta esos gates: **NO READY_FOR_PO_CREDENTIALS, NO LIVE_CANARY_PASS, NO BETA_GO**.
