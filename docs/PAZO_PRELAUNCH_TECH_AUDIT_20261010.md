# PAZO — Auditoría técnica pre-lanzamiento | 2026-10-10

**Rama auditada:** `release/mvp-beta-fast-track-20261010`
**HEAD inicial:** `beefa73e17b7e35b5a25a39b541185af1d9ce57a`
**Supabase:** proyecto autorizado `mrybvqdebbgcayuvgkkr`
**Alcance:** F14 moderación/media, permisos hosted, PWA local y configuración del RC. Lecturas Supabase de solo lectura; ninguna migración, función, bandera, Storage, usuario, Vercel o `main` fue modificada.

## A — Ensayo E2E de baja

PASS conforme a `PAZO_CODEX_PENDING_QA_20261010.md`. La cuenta QA se eliminó por Auth Admin después de retirar únicamente sus datos y comprobar la preservación de las seis identidades originales, el grant del moderador, la mascota y el objeto Storage con evidencia privada mínima. La solicitud quedó `completed` con `processed_at`; no hay solicitudes abiertas. La verificación no cubrió CDN, enlaces ya compartidos ni respaldos. No repetir ni reabrir la prueba.

## B — Reportes y medios moderados

El flujo de reporte usa `f14_submit_report`; `f14_is_moderator` comprueba `auth.uid()` frente al grant privado. `f14_moderation_queue`, `f14_pending_media`, `f14_media_task` y `f14_review_report` tienen `EXECUTE` para usuarios autenticados, pero verifican moderador antes de devolver la cola o modificar un reporte. La decisión `remove` restringe la lectura pública y crea una tarea `pending_review` cuando corresponde; no significa que el archivo haya sido borrado.

El Edge hospedado `f14-moderation-purge` está activo en versión 5 con `verify_jwt=true`. Su latch fija `F14_MEDIA_PURGE_RELEASE_APPROVED=false` y exige además `F14_MEDIA_PURGE_ENABLED=true`; con la constante actual cualquier petición POST devuelve `503 cleanup_disabled` antes de leer credenciales o tocar Storage. El componente conserva el control local `VITE_F14_MEDIA_PURGE_ENABLED`, que por sí solo no habilita la Edge. No habilitar ninguno de los dos gates como parte de esta auditoría.

Si se autoriza una operación futura, el flujo solo acepta posts Feed/Comunidad con UUID objetivo; consulta la fila después de autorizar moderador, deriva bucket/ruta/URL del servidor, valida proyecto, dueño, ruta, referencias únicas y claim retenido, vuelve a comprobar el objeto mediante Storage API, confirma ausencia de Storage y que HEAD y GET de rango fallen tanto en la URL original como en la variante cache-bust, y finalmente permite `media_status='purged'`. Cualquier discrepancia se rechaza. La respuesta `origin_removed_cdn_uncertain` no prueba purga universal de CDN, copias, enlaces externos o respaldos.

### Procedimiento administrativo reproducible

1. El moderador autenticado abre **Moderación → Denuncias** y revisa el objetivo y el motivo. `Descartar` cierra la denuncia sin ocultar contenido. `Despublicar` oculta el objetivo de las lecturas públicas; el resultado distingue si hay medios pendientes. La bitácora queda en `moderation_private.moderation_actions`.
2. Si la cola de medios presenta `pending_review`, registrar internamente el ID de objetivo, tipo, estado, hora y operador en el canal administrativo privado aprobado. No copiar detalles de la denuncia o rutas Storage a GitHub, analítica o reportes públicos. No eliminar el archivo manualmente desde Dashboard, SQL o scripts; la purga está deliberadamente bloqueada.
3. **Éxito de despublicación sin medios:** la RPC devuelve `depublished_no_media_review`; volver a cargar la cola y comprobar que el reporte se cerró. Esto acredita despublicación, no baja física de archivos no inventariados.
4. **Éxito de despublicación con medios:** la RPC devuelve `depublished_pending_media_review`; el contenido está oculto, pero el estado queda pendiente hasta una operación individual con autorización y gates futuros. No registrar `purged`.
5. **Error o resultado incierto:** si la UI indica error, volver a cargar la cola y consultar el estado mediante las vistas/RPC permitidas antes de reintentar. Si el reporte sigue `pending`, resolver permisos/conectividad y repetir la decisión una vez. Si está `removed` con `pending_review`, conservar el bloqueo y escalar al responsable operativo; no deshacer la restricción ni repetir borrados. Una respuesta Edge `503 cleanup_disabled` es el estado esperado de esta release.
6. **Recuperación:** mantener el contenido restringido mientras se concilia el registro y la disponibilidad del archivo. Dejar constancia privada del estado, responsable y siguiente acción; contactar soporte si hace falta. Solo una evidencia completa de una operación autorizada permite cerrar la revisión de medios. Un objeto que no puede asociarse inequívocamente al registro va a revisión manual, sin mutaciones.

No se realizó una purga real en este lote y no se autoriza una prueba destructiva. El estado hosted observado y la cobertura de fallos del contrato local no sustituyen esa prueba.

## C — Privilegios de moderación y Security Advisor

Consulta PostgreSQL de solo lectura confirmó en las tablas `moderation_private.moderator_grants`, `reports`, `content_restrictions` y `moderation_actions`: RLS está desactivado, pero `anon` y `authenticated` no tienen `USAGE` sobre `moderation_private` ni `SELECT`/`INSERT` directo en esas tablas. Por tanto, el estado RLS del linter **no demuestra acceso directo desde roles públicos**. `media_claims` y `media_claim_events` tienen RLS y tampoco permiten acceso directo a esos roles.

Los helpers `moderation_private.is_removed` y `f14_media_probe` solo son ejecutables por `postgres`; `public.f14_moderation_media_gate`, `f14_prepare_media_claim`, `f14_recheck_media_claim` y `f14_get_media_claim_evidence` son exclusivamente `service_role`. Tienen `search_path=''`. Los RPCs autenticados para cola/acciones exigen el moderador. No se cambió RLS ni ACL.

Supabase Security Advisor (consulta del 2026-10-10) informa cuatro tablas privadas con RLS activo y sin políticas (nivel INFO), una función `SECURITY DEFINER` ejecutable por anon (`public.f14_content_visible`) y 19 ejecutables por authenticated, además de Leaked Password Protection desactivada. La función anónima solo devuelve `p_id IS NOT NULL AND NOT is_removed(kind,id)`; no devuelve reportes, notas, propietarios ni claims. Está referenciada por cinco políticas RLS de lectura que necesitan ocultar contenido retirado también a anon. Revocar su permiso sin rediseñar esa dependencia rompería lecturas públicas; se documenta como warning intencional y se deja la defensa actual intacta. La lista de funciones autenticadas incluye funciones ajenas a moderación; las cuatro rutas moderadoras relevantes se revisaron por su control de rol. Leaked Password Protection queda como configuración pendiente separada, no se altera desde este trabajo.

Supabase explica que grants determinan si el rol puede alcanzar un objeto y RLS controla filas; ambos controles se deben evaluar juntos: [Securing your API](https://supabase.com/docs/guides/api/securing-your-api). El Advisor sigue siendo informativo: no sustituye la comprobación de privilegios efectivos ni justifica habilitar RLS en masa.

## D — PWA, caché e identidad

El manifest tiene `start_url`/`scope` raíz, `display=standalone`, iconos regulares de 192/512, maskable 512 y Apple 180. `scripts/generate-pwa-icons.mjs` regenera los PNG a partir de una huella construida localmente con Node estándar; `test:pwa` verifica firma PNG, tamaños, manifest, enlaces y zoom permitido.

El SW solo intercepta navegación GET del mismo origen y hace `fetch` de red; no usa Cache Storage, IndexedDB ni almacenamiento local. Auth, API, Supabase, terceros y recursos autenticados no son interceptados ni precargados. Al estar offline devuelve una página 503 con `Cache-Control: no-store`. Registro solo en build de producción. No hay caché persistente de contenido privado creada por PAZO.

La selección de mascota se guarda bajo `active_pet_<user.id>`; otros datos del Feed/cuidados/documentos viven en estado React y se consultan de nuevo al inicializar la identidad. El render de `App` bloquea con carga mientras `petBootstrap.userId` no coincide con `user.id`, y los datos de notificaciones/recordatorios se vacían cuando no hay usuario. La inspección de fuente no detecta un mecanismo propio de caché privada. No se usaron cuentas de producción ni se intentó iniciar sesión para probar un cambio de identidad: por política no se crearon identidades nuevas. La prueba de logout/cambio de dos cuentas queda como verificación de sesión en el Preview autorizado; el aislamiento del SW sí queda cubierto en código/contrato.

`npm run dev` genera los iconos y sirve el app local, pero registra SW solo con `import.meta.env.PROD`; la verificación runtime en `npm run preview` local confirmó contexto seguro, registro activo en `/` con `sw.js`, y `CacheStorage` vacío. El manifest respondió HTTP 200 y el navegador mostró la bienvenida sin iniciar sesión. Esta comprobación no cubre cambio entre identidades ni instalación real/standalone de Android e iOS, que necesita HTTPS y permanece reservada al Preview de ChatGPT/Product Owner. No marcar F15 completa por build o metadatos.

## E — Preparación de configuración y legal

- `.env.example` documenta `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como configuración pública, y `VITE_MAPBOX_ACCESS_TOKEN` como token público del navegador. `src/features/places/map/MapboxMap.tsx` requiere Mapbox para renderizar el mapa real. La última inspección documentada dice que falta la variable en ambos proyectos Vercel; no se inspeccionó ni cambió Vercel en este lote. ChatGPT debe configurarla en el canal autorizado antes del Preview, sin poner secretos en el cliente.
- `VITE_POSTHOG_PROJECT_TOKEN` es opcional y PostHog está desactivado por guard de código; no activarlo.
- `VITE_F14_DELETION_REQUESTS_ENABLED` deja la solicitud de baja disponible en desarrollo y apagada en builds públicos por defecto; el runbook condiciona cualquier habilitación pública a operador y procedimiento funcionales. No se habilitó.
- `resetPasswordForEmail` dirige al mismo origen con `/?auth=recovery`; Auth requiere que esa URL esté admitida por las Redirect URLs del proyecto. Este lote no cambió configuración hosted.
- Avisos ES/EN declaran proveedores, ubicación y controles según el código. Antes de publicación, establecer la fecha efectiva real; el RC ahora muestra que se fijará al publicar y no adelanta una fecha inexistente.
- `ErrorBoundary`, watchdogs de sesión/perfil, mensajes de recuperación y fallback offline cubren errores básicos de carga. No se rehizo QA aprobada de módulos.

## Gates restantes

Validación local: `npm run test:governance` (91 pruebas) y `npm run build` PASS; PWA runtime local PASS. ESLint dirigido a los archivos cambiados PASS. El lint completo del repositorio conserva 107 errores y 6 advertencias preexistentes. GitHub Actions CI #672 PASS para el primer commit publicado de esta auditoría; el push documental final dispara su propio run.

- F14 integral no está cerrada: medio de moderación aún no retirado físicamente; operación futura requiere autorización separada y una sola prueba de objeto descartable, sin terceras personas.
- F15 es parcial: faltan Preview HTTPS, prueba instalada/standalone Android e iOS, prueba de logout/cambio de cuenta con identidades de test autorizadas, y configuración Mapbox en el entorno Preview.
- F13 continúa planificada por decisión del PO; recordar justo antes del GO/NO-GO para decidir abordarla o diferirla.
- No se aplicó ninguna migración, DDL, cambio RLS, Edge, config Supabase, Vercel, merge o publicación.
