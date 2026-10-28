# PR 1A — cargas independientes e integridad de solicitudes

Estado: implementación autorizada y probada en rama; entrega para revisión. Sin merge ni despliegue. Base `main`: `c9045b9ad39443296b29f057550a677e6d9f013a`.

## Cambios

- El spinner del feed pertenece solamente a Inicio. Comunidades, Lugares y Mi mascota montan sus vistas existentes mientras el feed sigue pendiente. Inicio conserva sus errores y reintentos.
- Tras verificar autenticación e identidad de mascotas, el bootstrap queda listo y lanza feed, Agenda, documentos y recordatorios sin esperar un `Promise.all` global. Cada servicio conserva sus propios estados y recuperación.
- `src/lib/requestScope.ts` emite comprobaciones de vigencia por época y recurso. Cambiar mascota o cuenta, cerrar sesión, reemplazar una consulta o reiniciar paginación retira resultados anteriores, incluidos errores y finalizadores. Volver a un ID anterior no revive su solicitud.
- Perfil, feed/interacciones, Agenda, documentos, recordatorios y notificaciones comprueban vigencia antes de publicar resultados. Los finalizadores antiguos no liberan el bloqueo de una operación nueva. Marcar una notificación como leída retira consultas anteriores que podrían volver a publicarla sin leer.
- Una salida/entrada a la misma cuenta agrupada por React fuerza una nueva verificación de identidad. `SIGNED_IN`/MFA para la misma cuenta conserva el bootstrap y las pantallas montadas. No hay llamadas asíncronas de Supabase dentro del nuevo callback de eventos.

Cambios de producto limitados a la orquestación y guardas de `App.tsx` y un helper de infraestructura. Sin refactor general, CSS, copy, reglas de negocio, cambios de marketing/métricas, SQL, Edge Functions, permisos, flags financieros o activación de invitaciones. Las solicitudes retiradas pueden terminar en red; sus respuestas ya no pueden publicar estado. Una escritura autorizada ya enviada no se revierte ni se reenvía automáticamente.

## Evidencia automatizada

| Comando / capa | Resultado verificado |
| --- | --- |
| `npm run test:pr1a` | 21/21 PASS; orquestación real de App, servicios diferidos y componentes hijos aislados |
| `npm run test:governance` | 725/725 PASS, incluidos los 21 casos nuevos; hardening, arquitectura, privacidad, operaciones, MVP, PWA, cierre y marketing |
| `npm run test:f16:synthetic` | 1196/1196 PASS, sin llamadas a PayPal; OpenSSL local disponible en PATH y fuera del sandbox MSYS de Windows |
| `npm run test:f18` | 33/33 PASS; invitaciones, elegibilidad y protecciones de lanzamiento |
| `npm run test:gradual` | 69/69 PASS; controles de checkout/worker/recuperación |
| `npm run test:f14` | 53/53 PASS con fuente LF temporal y bytes originales restaurados; véase nota Windows |
| `npm run build` | TypeScript + build de producción PASS |
| `npm run test:prepreview:dist` | 4/4 PASS; manifest/iconos/SW, URLs SPA de retorno y cancelación PayPal, política network-only |
| `npm run test:release:guard` | PASS; guard estático, no certificación de producción |
| ESLint de App/helper vs base | App conserva 14 errores y 6 advertencias heredados; helper 0/0; sin diagnósticos nuevos |
| Diff de fuentes protegidas | Auth, MFA, servicios, QR, vistas/modales, BottomNav, supporter/PayPal, invitaciones, marketing, PWA, public y Supabase sin cambios |

Los 21 casos cubren A → B, A → B → A, respuestas exitosas y errores obsoletos, otra cuenta, salida/entrada de la misma cuenta incluso en un solo render, bootstrap de mascotas obsoleto, reemplazo de paginación, finalizadores antiguos, mutaciones pendientes, refresh del feed, notificaciones concurrentes, fallos independientes, reintentos sin rebootstrap y actualización MFA. El caso de acceso con feed pendiente falla contra la fuente base y pasa con la corrección.

**Nota Windows:** la primera ejecución F14 obtuvo 52/53 porque una prueba heredada busca literalmente `admin.rpc(\n ...` y el checkout usa CRLF. Se repitió la misma suite normalizando temporalmente solo EOL de `f14-moderation-reconcile/index.ts`: 53/53. Se restauró el Buffer original y se verificó ausencia de diff en Supabase. No se alteró la prueba ni el backend para ocultar el resultado inicial. CI Linux utiliza LF.

## Navegador móvil

`npm run test:pr1a:browser` ejecutó Chromium/Edge con App, BottomNav, vistas y modales reales, React StrictMode y CSS existente. Auth y servicios se sustituyen **solo dentro del servidor de prueba localhost**. El punto de entrada aislado evita exigir configuración pública y no ejecuta el registro de la PWA. No hay sesiones ni escrituras alojadas; las peticiones externas se bloquean.

En **320, 390 y 430 × 844 px**, cada ejecución comprobó:

1. Petición HTTP del feed pendiente, mientras se abre y verifica contenido de Comunidades, Lugares y Mi mascota.
2. Error HTTP del feed y navegación con el contexto de red offline.
3. Recuperación del feed mediante Reintentar al volver la conexión.
4. Apertura del pasaporte real y render del SVG QR desde un token sintético.
5. Cero errores `pageerror` y cero overflow horizontal del documento en las tres vistas.

[Resultados del navegador](evidence/pr1a-20261028/browser-results.json). Capturas de 390 px: [Comunidades](evidence/pr1a-20261028/390-Comunidades-pending.png), [Lugares](evidence/pr1a-20261028/390-Mapa-pending.png), [Mi mascota](evidence/pr1a-20261028/390-Mi-mascota-pending.png), [QR](evidence/pr1a-20261028/390-passport.png). CI publica las 12 capturas y el JSON como artifact `pr1a-mobile-<run_id>` durante 14 días.

Reproducción: `npm ci`, `npm run test:pr1a`. Para navegador, usar Playwright **1.56.1** externo o instalado temporalmente sin modificar el lockfile, `PAZO_PLAYWRIGHT_MODULE` apuntando al módulo, y `PAZO_CHROMIUM_PATH` a Chrome/Chromium; en Windows se admite Edge instalado por defecto. Ejecutar `npm run test:pr1a:browser`; los servicios se sirven exclusivamente en `127.0.0.1:5351`.

## Límites y revisión

- No se afirma mejora de rendimiento: no se ejecutó benchmark ni medición comparativa de latencia.
- El fixture de Lugares usa el fallback existente por falta de token público de Mapbox. No certifica teselas, GPS físico, red de un operador móvil ni PWA instalada en teléfono real.
- Las pruebas de Auth/MFA, pagos e invitaciones son regresiones automatizadas y comprobación de fuente, no un nuevo login/MFA alojado ni una compra real. El QR se renderizó con token de prueba, no certifica un rescate público real.
- ESLint global sigue teniendo deuda previa. No se amplió este PR a una limpieza general.
- No se cierra la fase de producto ni se inicia PR 1B/PR 2. Merge y producción quedan para autorización independiente del Product Owner.

El uso de `SIGNED_OUT`, callback síncrono y `subscription.unsubscribe()` se contrastó con la [documentación oficial de Supabase](https://supabase.com/docs/reference/javascript/auth-onauthstatechange). No se modifican convenciones de Auth, autorización o RLS.
