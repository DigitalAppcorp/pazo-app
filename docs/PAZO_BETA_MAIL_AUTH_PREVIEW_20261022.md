# Beta: correo, Auth, textos públicos y preview — 22-oct-2026

## Gmail operativo — 22-oct-2026

PO confirmó que la contraseña de aplicación corresponde al correo de soporte
ya designado. SMTP Supabase→Gmail **APLICADO**, smtp.gmail.com:587 con STARTTLS,
remitente PAZO y correo de soporte. Clave usada solo en memoria hacia API
Management, nunca frontend/Git/logs. PATCH+GET verificó campos y presencia de
password sin devolverla; otros ajustes Auth preservados. Límite técnico10
correos/hora (antes2 del proveedor predeterminado), sin plan/add-on ni coste
nuevo contratado; límites propios de Google siguen aplicando.

**Entrega PASS:** una sola solicitud de recuperación a la propia cuenta del PO,
registrada previamente, HTTP200; PO confirmó «Sí, ya llegó». No envíos a terceros,
reintento, cambio de contraseña ni repetición del E2E Auth aceptado. Se verificó
transporte real, no una simple respuesta genérica para correo inexistente.
Privacidad ES/EN ahora describe Google/Gmail, direcciones y contenido de correos
de cuenta/recuperación/soporte; sin nuevos datos de mascotas/pago o analytics.

Red de preview ya accesible por ruta normal: HTTP302 de autenticación Vercel,
no403 del túnel. No afirmar fallo de red actual ni pedir volver a generar
contraseñas. Falta validar HTTPS/PWA autenticado y la vista final actualizada;
no READY_FOR_PO_CREDENTIALS aún. Las notas inferiores de SMTP ausente/bloqueo403
son checkpoints anteriores.

Continúa PR67, sin repetir PR62–65 ni el Auth local aceptado. No autoriza main,
producción, PayPal real ni publicación legal. Cada cambio se documenta y sube
por orden del PO.

## Vercel

CLI oficial, proyecto `pazo-app-t83r` / equipo `digitalapp`. Build local/prebuilt
del commit `020e6ce10a363b32a29973434316d9bef93c00cb`, sin consumir otro build
cloud. Deployment `dpl_FGiumJgvLvrL3MmxSwk8i1WUC11s`, **READY**, target preview,
sin alias: https://pazo-app-t83r-8zbuzaf2x-digitalapp.vercel.app.

SSO `all_except_custom_domains` preservado. Flags públicos del build:
`VITE_PAZO_F16_SANDBOX_QA_UI=false`, beneficios=true con período SQL obligatorio.
Producción `dpl_E6t1jhXeAN49mS4gSCJufc2wFZ93`, SHA5163c187 y dominio canónico
sin cambios. Git deployments OFF. Legal de este incremento todavía no está en
esa vista; no atribuirle el contenido de un commit posterior.

El proxy rechaza ese hostname con403 antes de conectar a Vercel. Excepción
exacta guardada en borrador de Codex Cloud, pendiente revisión/guardado y
publicación humana del entorno de desarrollo. No desactivar proxy, TLS o SSO,
ni usar IP/rutas alternativas para eludirlo. No es HTTPS_E2E_PASS.

## Auth y Gmail

Auditoría Management API: `site_url=http://localhost:3000`, un redirect de RC
antiguo, SMTP ausente y hook de envío deshabilitado. Supabase predeterminado
solo entrega a miembros del equipo; esto impide recuperación pública.
Fuente: https://supabase.com/docs/guides/auth/auth-smtp.

PATCH mínimo **APLICADO y verificado por GET**: site_url al origin canónico,
añadir `/` y `/?auth=recovery` exactos del origin y preview anterior. La entrada
previa sigue presente, total5. No cambiar autoconfirmación, MFA, contraseñas,
proveedores OAuth ni plantillas. No altas/reset/email nuevos; aceptación previa
de Auth conserva su validez. Rollback de esos dos campos guardado privadamente
fuera del checkout; no contiene contraseñas ni identificadores de usuarios.

PO eligió **Gmail**. Se preparó requisito `PAZO_GMAIL_APP_PASSWORD`, secreto de
red personal con destino exclusivo api.supabase.com. Valor aún no disponible.
El titular crea contraseña de aplicación en https://myaccount.google.com/apppasswords
(Google puede exigir verificación de dos pasos), nombre PAZO, y la guarda en la
bóveda personal como secreto de red con esa clave. No contraseña de login,
chat, capturas, Git ni variable VITE. Publicar el borrador no implica publicar
PAZO ni activar pagos. La herramienta solo guarda requisitos, no genera secretos.

Una vez disponible: configurar Gmail por API Management en memoria, remitente
de soporte ya designado `appdigital.corp@gmail.com`, nombre PAZO, smtp.gmail.com
con TLS; conservar el resto de Auth. Verificar configuración sin devolver pass,
y obtener evidencia de entrega autorizada antes de SMTP_PASS. Respetar límites
del servicio y no contratar proveedores/planes. Google aún NO configurado.

## Texto legal sin nueva política comercial

ES/EN añade PayPal, referencias restringidas de suscripción/eventos/transacciones,
importes/moneda/períodos/consentimiento y finalidades de gestión/disputas/audit.
Aclara que PAZO no recibe contraseña PayPal ni tarjeta completa, que no hay
datos financieros en analytics y que la baja no borra automáticamente historial
sujeto a obligaciones/casos pendientes. Beneficios desde períodos verificados;
muro opt-in separado revocable. Términos remiten al consentimiento original,
cancelación confirmada y cobertura/revisión existentes. No se modifica la oferta
Live inmutable, versión, digest, precio ni retención aprobada.

`VITE_PAZO_LEGAL_EFFECTIVE_DATE` es metadata pública opcional YYYY-MM-DD, fecha
calendario validada. Vacía/incorrecta conserva texto preparado; fecha real se
configura únicamente al publicar con GO del PO. El reloj, guardar credenciales
o activar un selector nunca fijan vigencia. No requiere editar código tras las
claves; no es autorización de publicación ni una prueba de aceptación.

## Verificación

- `verify:prepreview`: **1,813 PASS** (11+103+5+4+493+1193+4), TypeScript/build/dist.
- Legal8/8: ambas lenguas, PayPal/consentimiento/retención real, calendario
  inválido/bisiesto, fecha publicada sin mutar previews ni perder operador.
- ESLint archivos TS/TSX tocados0/0, sin cambiar baseline legacy.
- Chromium390/1440, diálogo real de registro: privacidad/términos, contenido
  nuevo, scroll y cierre, Escape/restauración de foco, sin overflow ni errores
  JS. Captura móvil inspeccionada. Solo lectura local; sin crear cuenta.
- Auth PATCH+GET PASS y cinco redirects preservados; no SMTP/entrega PASS.

P4 hospedado mantiene estado OFF/certificado ausente según postflight previo.
No solicitar claves PayPal hasta HTTPS/PWA/certificado/cierre operativo.
**NO READY_FOR_PO_CREDENTIALS ni BETA_PUBLIC_RELEASE_GO.**
