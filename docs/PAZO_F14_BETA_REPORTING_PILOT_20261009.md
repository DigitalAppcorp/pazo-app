# F14 beta reporting integration | 2026-10-09

**Alcance:** Rama revisable basada en PR #36, sin fusionar ni desplegar. Se reutiliza backend F14 hospedado existente; sin SQL, migraciones, cambios de Storage ni activación de purge.

## Contratos existentes observados
- RPCs alojadas: `f14_submit_report` (auth required, cinco objetivos), `f14_is_moderator` (grants privados), `f14_moderation_queue`, `f14_review_report` y `f14_pending_media`.
- Advertencia `rls_disabled` en cuatro tablas del esquema privado. Comprobado: roles `anon`/`authenticated` sin USAGE del esquema ni SELECT/INSERT de esas tablas. Es un hallazgo para seguir revisando, **no acceso directo demostrado**. No habilitar RLS indiscriminadamente.
- `f14_content_visible` consulta estado eliminado sin listar datos privados. No es prueba exhaustiva de todas las rutas HTTP.

## Integración de frontend
- Acciones Denunciar para post y comentario de Feed, perfil de mascota, post y comentario de Comunidad; solo usuarios Auth reales, no demo.
- Se trae componente de reporte ya validado en F14, con feedback de denuncia pendiente y rate-limit.
- Cola de moderación y vista de medios pendientes disponibles solo si RPC servidor confirma moderator; sin controles para borrar Storage.
- Respetar identidad PAZO, cero contornos incluso en foco. Preservar Feed, comentarios, Mapbox, autenticación del PR #36.

## Estado del gate
- **D3-A no terminado:** despublicación de DB no garantiza revocación de URL pública/CDN/Storage. Edge `f14-moderation-purge` continúa fallando cerrado 503.
- **A3/A4 no terminadas:** cuenta/mascota, archivos, retención y políticas públicas. No prometer eliminación completa ni dar beta pública aún.
- CI solo demuestra build/tests. Se requiere QA real de cinco objetivos, moderador/no moderador y prueba de borrado físico separada con autorización específica. No usar datos de usuarios reales para ensayo.
- PR #35 permanece pausado; PR #34 regula alternativa pública de Lugares y exige reconciliación explícita. No fusionar por inercia.

### Refinamiento QA de interfaz

La cola de medios utiliza ahora un diálogo Portal responsivo con cierre Escape y control de foco; antes era `absolute` y podía quedar recortada dentro del perfil. La cola continúa **solo lectura**: no es un camino oculto para borrar Storage/CDN.

El PR está dirigido temporalmente a `main` solo para activar el CI existente, que no se ejecuta en PRs cuyo base sea otra rama. **No está autorizado el merge**; la dependencia PR #36 debe integrarse primero, luego volver a conciliar el diff.

## Aceptación visual PO de denuncias — 2026-10-09

- **Entorno:** Antigravity, frontend local de PR #37 en commit `b184a66`; Supabase hospedado de PAZO. El PO confirmó el SHA, encontró «Denunciar perfil» de mascota ajena y después respondió «listo» a una única ronda de revisión de las **cinco opciones**: Feed post, Feed comment, pet profile, Community post y Community comment, verificando apertura de formulario.
- **Resultado:** UI/visibilidad del formulario por usuario real **PASS reportado por PO**; no se recibieron capturas detalladas de cada variante y NO consta pulsación de «Enviar denuncia», persistencia de denuncia ni recepción/decisión de moderador. No marcar Gate 8 completo.
- **Siguiente gate:** prueba real de creación, deduplicación y cola de moderación con contenido **descartable de otra cuenta de prueba controlada** y cuenta moderadora con grant legítimo, sin enviar reportes sobre usuarios ajenos. Completar negativo: usuario normal no ve/puede invocar cola moderadora. Registrar resultados, sin editar DB, nunca borrar medios reales.
- **Bloqueadores de beta:** D3-A Storage/CDN; A3 cierre/eliminación de cuenta con terceros; A4 retención/privacidad; correo real Auth; integración PR #36/37/34 sin regresión de Mapa y entrega de release.

## Decisión PO — Supabase alojado durante desarrollo = datos de prueba (2026-10-09)

- El Product Owner aclara que **todos los datos actuales de la base hospedada de PAZO, aunque el proyecto se denomine «producción», son datos de prueba pre-lanzamiento**. Incluye publicaciones, perfiles, mascotas, comentarios y cuentas utilizadas para QA; no hay datos de una beta pública que deban tratarse como registros finales de usuarios.
- **Autorizado en principio:** ejecutar validaciones funcionales controladas con esas cuentas/datos (p. ej. denuncia real, cola del moderador, acción de despublicar un post de prueba). No etiquetar estos registros como contenido de clientes externos. Documentar antes/después y resultados.
- **Limpieza pre-lanzamiento:** el PO quiere eliminar los datos de prueba antes de abrir PAZO oficialmente. Preparar inventario y plan de limpieza; **no ejecutar un borrado masivo ahora**, ni eliminar esquema, funciones, buckets, permisos, rol de moderador, migraciones o configuración por confundir infraestructura con datos. Solicitar gate específico del PO justo antes de ejecutarlo y verificar integridad.
- Los riesgos técnicos siguen siendo reales aunque el contenido sea de prueba: D3-A Storage/CDN, eliminación de cuentas/medios, permisos SQL, reportes y retención se deben validar. No publicar el producto afirmando limpieza que aún no se ha ejecutado.
- QA frontend continúa en Antigravity localhost con **Supabase hosted**, sin requerir infraestructura Supabase local, sin Vercel.

## QA hosted real — envío de denuncia (2026-10-09)

- PO remitió desde frontend localhost (código PR #37) una denuncia sobre publicación de otra cuenta de prueba, motivo `spam`, detalle literal `Prueba controlada F14`. La pantalla mostró `Denuncia recibida`.
- Supabase (SELECT de solo lectura de `moderation_private.reports`) devolvió **exactamente una fila**: `target_kind=feed_post`, `reason=spam`, `status=pending`, `details=Prueba controlada F14`, `created_at=2026-10-09 14:57:06+00`. Línea base antes del envío: 0 filas. **PASS: UI -> persistencia hosted de una denuncia; sin duplicado observado**.
- NO probado todavía: intento duplicado, 4 tipos restantes con envío, acceso de moderador y autorización negativa, cola de revisión, acción dismiss/remove, borrado físico Storage/CDN.
- Siguiente prueba: salir de cuenta normal, entrar con **cuenta moderadora controlada**, abrir Mi mascota -> Menú y utilidades -> Moderación -> Denuncias; verificar que se muestre esa denuncia pendiente. No pulsar Descartar/Despublicar hasta confirmar cola correcta. No requiere comandos ni migraciones.

## F14 QA hosted: resolución Descartar verificada (2026-10-09)

- PO, usando sesión moderadora en localhost/PR #37, confirmó haber pulsado **Descartar** sobre la denuncia de prueba previamente enviada.
- Consulta Supabase **solo lectura**: moderación privada contiene una fila feed_post/spam ahora status `dismissed`, resolved_at=2026-10-09 15:02:52.31554+00.
- Consulta JOIN `moderation_private.moderation_actions` + `moderation_private.reports`: existe una acción `dismiss` con fecha coincidente y reporte `dismissed`. **PASS de transición y bitácora de moderador para ese caso**. No se eliminó ninguna publicación, foto ni archivo; el asistente no ejecutó SQL de escritura.
- Esto amplía evidencia del flujo «enviar -> pendiente -> moderador descarta»; todavía no valida `remove`, otros cuatro tipos con envío, rechazo directo de API a no moderador, Storage/CDN, eliminación de cuenta o release.
- Siguiente ensayo: publicación SOLO TEXTO de prueba de la otra cuenta controlada, denuncia desde cuenta normal y **Despublicar** con la moderadora. Verificar estado/bitácora y exclusión de API. Sin imágenes para evitar confundir despublicación con purga física.

## QA hosted de despublicación: PASS técnico del objetivo real, discrepancia de objetivo del ensayo (2026-10-09)

- El PO comunicó «listo» después de ejecutar la prueba **Despublicar** con su sesión moderadora, en su frontend local (PR #37). Todas las filas referidas a cuentas y publicaciones son datos de prueba pre-lanzamiento.
- Supabase de solo lectura: nueva denuncia `feed_post` / `spam` con detalle «Prueba F14 - despublicación» tiene `status=removed`, `resolved_at=2026-10-09 15:07:07+00`; `moderation_private.moderation_actions` tiene acción `remove` vinculada a esa denuncia. **PASS registro y decisión del moderador.**
- **Discrepancia precisa:** `target_id=26faf724-036f-41b5-9082-efa781a3d20e` corresponde a la publicación ANTERIOR «Prueba de publicación PAZO» (la misma del reporte anterior que fue `dismissed`); la nueva publicación «Prueba F14 - despublicación» existe con `id=2158592e-627e-4ff1-af17-82db400a487d` y sin foto, **pero NO fue el objetivo del nuevo reporte**. No confundir `details` de la denuncia con el texto de la publicación.
- `public.f14_content_visible('feed_post',id)` devuelve `false` para la publicación anterior restringida y `true` para la nueva. `moderation_private.content_restrictions` tiene registro de la anterior con `media_status=none`; la nueva no tiene restricción.
- Prueba real de consulta DB con `BEGIN READ ONLY; SET LOCAL ROLE anon; SELECT ... FROM public.posts ...; ROLLBACK`: **solo aparece la publicación nueva**, NO la anterior. Esto demuestra RLS efectiva del rol público simulado contra estas dos filas en PostgreSQL. No equivale a comprobar caché de navegador, CDN, URL Storage ni endpoint HTTP independiente.
- **Resultado:** PASS para `remove` + bitácora + exclusión SELECT `anon` **del ID realmente denunciado**, pero la prueba específica de despublicar el post NUEVO queda **pendiente** hasta que PO denuncie ese post exacto desde la otra cuenta y lo resuelva la moderadora. No hacer SQL destructivo ni crear restricciones de prueba directamente para simular UI. No bloquear el proceso por datos de prueba.


## QA acceso moderador + A3 read-only preflight — 2026-10-09

- Cuenta normal en Antigravity: Product Owner confirmó que **NO** aparece la sección `Moderación` en Mi mascota/Menú; PASS de visibilidad por PO. Rechazo server-side bajo rol SQL `authenticated` sin identidad moderadora había sido comprobado `42501`; no igualar a prueba JWT independiente.
- A3 auditado sin mutaciones: esquema hosted presenta 6 cuentas/mascotas, 1 comunidad con 1 aportación de no propietario, 6 comentarios Feed cruzados, 1 documento privado, 5 cuidados/2 completados y 20 objetos Storage (19 públicos, 1 privado) en 5 buckets.
- **Bloqueo de seguridad:** `communities.owner_user_id` y `community_posts.author_user_id` tienen CASCADE a Auth; una eliminación ingenua puede borrar aportes de terceros. `pet_documents` RESTRICT y cuidados con NO ACTION impiden orden improvisado. No hay jobs A3 implantados.
- Decisión PO pre-lanzamiento de datos actuales de prueba sigue vigente. **No se borró nada**. Plan auditado: `docs/PAZO_F14_A3_DELETION_PREFLIGHT_20261009.md`. A3 necesita permiso de implementación *separado*, y luego autorización independiente para ejecutar migraciones/operaciones de borrado. Mantener PR #37 DRAFT, sin merge/deploy.

## D3-A — Implementación lista para revisión, sin activar (2026-10-09)

Se versionaron Edge con validación Auth/moderador y feature flag OFF, función PostgreSQL `f14_moderation_media_gate` restringida a service_role, verificación de propietario/unicidad de referencia, borrado exclusivo Storage API, `exists=false`, HTTP HEAD sobre URL original y variante cache-bust y finalización transaccional de `media_status='purged'` solo tras éxito. Interfaz de cola tiene botón detrás de flag local OFF. Ver `docs/PAZO_MVP_LAUNCH_FAST_TRACK_20261009.md`.

**Sin cambio en Supabase remoto.** No afirmar cobertura de perfil con múltiples medios, origen externo ni limpieza CDN global; no abrir Beta hasta QA controlada y cierre del contrato de medios.
