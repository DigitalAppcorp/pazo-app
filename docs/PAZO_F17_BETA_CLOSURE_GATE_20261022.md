# PAZO — F17 cierre técnico / QA antes de publicación
**Fecha:** 22-oct-2026. **Rama:** `f17/beta-final-mobile-support-admin-20261022`. **PR:** #81 DRAFT.
**Autoridad:** PO autorizó completar código en rama; NO autorizó aplicar migraciones ni publicar/mergear a `main`.

## Estado verificado

El PR #81 ya incorporaba UI para F17 (mapa Streets, PWA en configuración, soporte, regalos y mantenimiento) y tres SQL deliberadamente en `supabase/drafts/`. Se continuó **sobre el PR existente**.

Correcciones de esta continuación:
- **Mantenimiento:** el enlace de entrada ya no muestra la aplicación a una sesión ordinaria. Solo un login aislado de administrador y verificación `pazo_is_admin` autoriza montar App. Denegar expulsa la sesión introducida; no sustituye la protección backend.
- **Regalos:** la lista de resultados realiza readback RPC explícito después de cada operación; antes `search()` retornaba temprano con `busy=true`.
- **Instalación PWA:** `installPromptBridge` captura `beforeinstallprompt` desde bootstrap, incluso si el usuario aún no inició sesión. Aviso compacto solo en Inicio, arriba de la barra de navegación, con cierre recordado siete días localmente; control adicional en ajustes de Mi mascota, estado standalone/iOS y `appinstalled`. No se infiere instalación previa de otra pestaña.
- **Viewport:** envoltura móvil externa e interna se dimensionan con `100dvh`; safe-area inferior ya la respeta la barra inferior.
- **Lugares:** Mapbox mantiene Streets v12 y marcadores 3D; degradados superior e inferior reducidos para altura pequeña para no ocultar cartografía. No hay verificación Mapbox en dispositivo real ni mapa de producción nuevo desplegado.
- **Soporte:** borrador endurecido con `pg_advisory_xact_lock` por usuario para asegurar máximo tres envíos por hora incluso ante solicitudes simultáneas. Las notas del administrador no son legibles por el remitente.
- **Privacidad:** inventario y gobernanza F17 anotados como propuestas sin afirmar recopilación activa.

## Inspección real de Supabase (solo lectura)

`to_regclass` confirmó que **no existen** estas tablas en Supabase hospedado:
- `public.pazo_support_tickets`
- `supporter_private.pazo_admin_gift_access`
- `admin_private.pazo_app_maintenance`

Las dependencias financieras previas (tablas de temas y controles de release/checkout/worker) sí existen. No se ejecutó DDL, instalación SQL, compra, despliegue Vercel ni escritura a datos de usuarios.

## Matriz de cierre

| Requisito | Código | Hosted | QA externo |
| --- | --- | --- | --- |
| Viewport móvil y barra de Chrome | Ajustado | N/A | Teléfonos Chrome/Safari pendiente |
| Mapbox base y 3D | Streets v12, degradados adaptativos | Token existente en producción; no actualizado | Vista con cartografía real pendiente |
| Banner PWA | Componente + listener temprano + test de contrato | N/A | Android/iPhone/PWA instalada pendiente |
| Tickets soporte y bandeja Admin | UI y SQL borrador | **NO aplicado** | RLS, envíos reales, admin pendiente |
| Beneficios sin pago | UI y SQL borrador | **NO aplicado** | Derechos/badge/tema y no-finanzas pendiente |
| Mantenimiento | UI y SQL borrador | **NO aplicado** | Backend cross-surface pendiente |

**No declarar F17 cerrado** mientras falte alguna columna de aceptación. No confundir pruebas CI sobre código con despliegue autenticado/real del teléfono.

## Gates restantes

1. Confirmar CI del SHA final del PR, TypeScript/build, E2E browser y contratos F17; corregir regresiones antes de pedir aprobación.
2. Revisar seguridad SQL con ensayo PostgreSQL aislado, políticas/grants e integración con las tablas y funciones alojadas actuales. Exigir aprobación explícita del PO antes de aplicar los tres borradores; convertir entonces a migraciones versionadas según el flujo de Supabase.
3. Resolver plazo de retención de tickets/notas y borrado antes de habilitar el soporte al público; reconciliar privacidad/Terms publicados.
4. Seguridad mantenimiento: revisar PostgREST `db-pre-request` + Storage + Realtime + Edge + Auth + PayPal para garantizar que no queda uso ordinario fuera del gate; mantener cancelaciones, reembolsos, webhook y trabajo de servicio. No activar la opción ni calificarla de bloqueo global solo por mostrar pantalla.
5. Reprobar Chrome con barra visible, Chrome PWA standalone, iOS Safari y mapa Streets/3D real en producción o preview aprobado. PO acepta visualmente antes de merge/publish.
6. PR #81 permanece DRAFT. F16 Live/canary tiene su gate financiero independiente y no se activa en esta fase.

**Sin gastos nuevos, sin claves privilegiadas expuestas, sin merge/deploy.**
