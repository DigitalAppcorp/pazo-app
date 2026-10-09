# PAZO — ACTIVE HANDOFF | estado verificado 2026-10-09

**Este es el snapshot operativo vigente**, no una cronología. Evidencia: GitHub (estado de PRs/CI) + confirmación del Product Owner en Antigravity/localhost. Historial completo anterior archivado, sin pérdida, en `docs/archive/PAZO_ACTIVE_HANDOFF_PRE_MVP_LOCAL_QA_20261009.md`.

## Fuente de verdad y rol
- Product Owner: usuario; ChatGPT Project Brain es ejecutor técnico. Canonical Brain OS: `DigitalAppcorp/project-brain-os` (versión estable vigente 1.4.1; el `AGENTS.md` histórico refiere 1.3.0 y el patrón de diseño nuevo de Brain OS PR #3 **sigue DRAFT**).
- Leer primero `AGENTS.md`, este handoff, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md` y el scope de cualquier módulo específico antes de actuar.
- **No crear nuevas fases ni rediseñar todo PAZO**. Prioridad del PO: cierre MVP y lanzamiento con mínima demora, tokens y costes.

## F14 beta reporting pilot — scope limitado 2026-10-09

- El Product Owner autorizó seguir el **cierre mínimo previo a Beta** después de aprobar QA funcional local de PR #36. No autorizó desclasificar D3-A ni declarar F14 completada.
- PR [#37](https://github.com/DigitalAppcorp/pazo-app/pull/37) DRAFT, branch `f14/beta-reporting-integration-20261009`. Basado en PR #36 `beef7a6`, no en #35. Código integrado `eda27bc00d4641b0766c85582f75d7ab9a525f19`; CI GitHub Actions `37944094738` SUCCESS; documentación posterior cambia HEAD y exige recheck.
- Frontend conectado a RPC existentes en Supabase para **cinco targets de denuncia** (Feed post/comentario, perfil mascota, Comunidad post/comentario). Acciones solo Auth real; cola de moderador solo tras `f14_is_moderator`. Sin botonera destructiva de Storage, no simular purge.
- F14 migraciones de reportes, guardrails y media ya figuran APLICADAS en Supabase alojado; se consultaron estado de DB, lista de migraciones, Edge y permisos **solo lectura**. `f14-moderation-purge` Edge permanece stub 503. **No cambios de schema, DB, grants, archivos o backend efectuados en este checkpoint**.
- Alerta list_tables «RLS Disabled» cuatro tablas privadas: inspección SQL de ACL confirma `anon` y `authenticated` sin USAGE esquema `moderation_private` ni SELECT/INSERT sobre las cuatro tablas. No demuestra acceso directo, pero tampoco equivale a auditoría completa; revisar RPC SECURITY DEFINER y rutas API. Referencia: `docs/PAZO_F14_BETA_REPORTING_PILOT_20261009.md`.
- PR #37 se apuntó provisionalmente a **main solo para activar CI** (el workflow existente corre solo PR a main); apilado lógicamente sobre PR #36. **No fusionar PR #37 antes de PR #36**, ni asumir base de producción, ni probar medios reales. PR #35/PR #34 separados para reconciliar rollout de Lugares.
- **Next:** QA de reportes en `pazo-visual-qa` usando rama PR #37 (en worktree independiente), solo datos descartables propios, incluyendo 5 targets y moderador; validar también acceso denegado a no-moderador. Después resolver requisitos beta pendientes: D3-A medios/CDN, A3 cuenta, A4 retención/políticas, email real y release env. No limpiar datos ni pagar por automatización.

## Código / estado verificable
- `main`: `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90` al inicio del checkpoint; **no contiene todavía PR #36**.
- **PR #36 DRAFT**, `mvp/functional-readiness-20261009`. Último código + reglas QA confirmadas en commit `b49ecd33b8d451056d3a5f2e26baf216a9662967`. Este handoff documental quedará en un commit posterior de la misma rama: comprobar GitHub HEAD en vivo. GitHub Actions `37935882305` **SUCCESS** sobre `b49ecd3`; volver a comprobar CI del HEAD documental.
- PR #36: Feed con paginación íntegra y error/retry, mensajes demo solo en demo, registro/confirmación de correo, recuperación de contraseña, carga segura de mascotas, QA UI proporcional y regla de cero contornos.
- **PR #35 DRAFT** (`f14/block02-moderation-mvp-20261008`), F14 A2 PAUSADA/NO TERMINADA. No mezclar ni desplegar en bloque: contiene guard `PLACES_MAP_DEVELOPMENT_ONLY=import.meta.env.DEV` que podría reemplazar Mapa real con fake door en build no-dev. **PR #34** de Places también está OPEN; revisar antes de cualquier integración. PR #33 de hardening fue MERGED.
- Vercel tiene dos estados `build-rate-limit` para PR #36 y el acceso al equipo `digitalapp` devolvió 403 en auditoría previa. **No pagar upgrades ni hacer desplegues en bucle**. Production y local no son el mismo checkout.

## Aceptación local reportada por PO (2026-10-09)
- PO abrió Antigravity/PowerShell en `C:\Users\osori\Downloads\pazo-visual-qa`, checkout worktree detached de `b49ecd3`, y abrió la app en `localhost` con **frontend local / Supabase alojado en producción**. No hay Supabase local y **no es necesario para aceptación visual**.
- PASS reportado por PO: login/pantalla de recuperación (sin evidencia de envío+clic de enlace real), Feed/scroll, vista de mensajes sin chats falsos, publicar texto, like/unlike, save/unsave, comentario con F5, perfil ajeno, seguir/dejar de seguir con F5. PO confirmó también que **los demás módulos le funcionan**; no atribuir pasos específicos no detallados ni extender esto a QA de seguridad.
- Resto de evidencia: `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md`. **No repetir smoke funcional sin regresión concreta**.
- Carpeta original `C:\Users\osori\Downloads\pazo-app` tenía cambios **sin commit** en F14 reportados por PO. Protegerlos: no reset, clean, stash, switch ni sobrescribir. La carpeta `pazo-visual-qa` es worktree independiente.

## Reglas inamovibles de producto
- **CERO CONTORNOS** para botones, contenedores, tarjetas y similares, incluso focus-visible; excepción localizada solo en field de texto si hace falta. Accesibilidad mediante fondo/contraste/subrayado, no rings/outline. `AGENTS.md` #21 y `docs/PAZO_UI_QUALITY_GATE.md`.
- Mantener utilidad real y funciones aprobadas; fake doors transparentes; mensajes ficticios nunca en cuenta real; Mapa real F8 no debe apagarse silenciosamente.
- Producción Supabase contiene datos de prueba del PO. No limpiar, borrar, ejecutar SQL/migraciones o activar infraestructura facturable sin el gate correspondiente.
- Respetar privacidad, RLS, políticas 18+, coste mínimo, sin session replay ni GPS preciso en telemetría.

## Bloqueos previos a beta externa (NO son fallos del smoke local)
1. **Auth email completo:** confirmar enlace de registro/recuperación y Redirect URLs permitidos en navegador real; en pruebas anteriores solo se abrió formulario, no consta QA de clic de enlace.
2. **F14 y privacidad:** capacidades mínimas de reportar/retirar contenido y solicitudes de eliminación de datos verificables; políticas públicas y retención coherentes con implementación. A2 Gate 8 aún abierto, no prometer borrado CDN o completo.
3. **Release:** reconciliar PR #36 y branches #34/#35, CI de HEAD, Mapa real vs cost/rollout, entorno de despliegue/variables, pruebas móviles y smoke en artefacto de release. Vercel está bloqueado por rate-limit.
4. **Diseño fino:** feedback PO sobre espacio field/botón en login/recuperación queda para F13; foco de teclado/reduced-motion no explícitamente probado. **No bloquear avance por esto** salvo regresión de usabilidad real.

## Aceptación visual PO de denuncias — 2026-10-09

- PO confirmó `git log -1 --oneline` = `b184a66` en `pazo-visual-qa`, confirmó botón `Denunciar perfil` en otra mascota y después validó con «listo» la ronda visual de cinco superficies/formularios del PR #37. **Aprobación visual local; no envío de denuncias ni prueba de cola real.**
- Se dejó el checkout de frontend con Supabase alojado; nunca pedir Docker/Supabase local para ver cambios. Carpeta original `pazo-app` contiene cambios no confirmados de F14, preservarlos.
- El siguiente gate requiere 2 cuentas descartables controladas (usuario denunciante/autor y cuenta moderadora ya autorizada), sin usar contenido ajeno ni activar eliminación; no confundir review visual con seguridad de API.


## Decisión PO — Supabase alojado durante desarrollo = datos de prueba (2026-10-09)

- El Product Owner aclara que **todos los datos actuales de la base hospedada de PAZO, aunque el proyecto se denomine «producción», son datos de prueba pre-lanzamiento**. Incluye publicaciones, perfiles, mascotas, comentarios y cuentas utilizadas para QA; no hay datos de una beta pública que deban tratarse como registros finales de usuarios.
- **Autorizado en principio:** ejecutar validaciones funcionales controladas con esas cuentas/datos (p. ej. denuncia real, cola del moderador, acción de despublicar un post de prueba). No etiquetar estos registros como contenido de clientes externos. Documentar antes/después y resultados.
- **Limpieza pre-lanzamiento:** el PO quiere eliminar los datos de prueba antes de abrir PAZO oficialmente. Preparar inventario y plan de limpieza; **no ejecutar un borrado masivo ahora**, ni eliminar esquema, funciones, buckets, permisos, rol de moderador, migraciones o configuración por confundir infraestructura con datos. Solicitar gate específico del PO justo antes de ejecutarlo y verificar integridad.
- Los riesgos técnicos siguen siendo reales aunque el contenido sea de prueba: D3-A Storage/CDN, eliminación de cuentas/medios, permisos SQL, reportes y retención se deben validar. No publicar el producto afirmando limpieza que aún no se ha ejecutado.
- QA frontend continúa en Antigravity localhost con **Supabase hosted**, sin requerir infraestructura Supabase local, sin Vercel.

## Próxima acción única
Preparar **release-readiness check** acotado de PR #36, sin reabrir módulos; verificar CI actual y separar qué puede integrarse ahora de los bloqueos reales de beta pública. Antes de merge/deploy, detenerse en gate de autorización PO. Retomar F14 mínimo solo con decisión/gate aprobado, sin asumir que su rama es apta para producción.

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

## F14 A3 — avance técnico de implementación DRAFT 2026-10-09

- PO autorizó **solo preparar código/migraciones en borrador**, no apply de SQL ni borrado, merge, deploy o gastos. Se abrió **PR #38** `f14/a3-account-deletion-draft-20261009` dependiente lógicamente de PR #37 y #36; GitHub base `main` solo para CI.
- A3 primer incremento: `src/features/account/` con `deletionFlow.ts`, `deletionService.ts`, `AccountDeletionPanel.tsx`, 5 pruebas unitarias y orquestación en `PetView`/App. Feature gate `VITE_F14_A3_REQUESTS_ENABLED` **false por defecto**; UI y RPC **NO están activos** para usuarios.
- SQL en `supabase/drafts/20261009_f14_a3_request_preflight_NOT_APPLIED.sql` contiene excepción DRAFT fail-closed para evitar apply casual. Tras ella hay propuesta de esquema privado/jobs/auditoría y cuatro RPC (preflight/status/request/cancel). No crea worker, no borra datos, no toca Storage/Auth/relaciones de terceros.
- Arquitectura definitiva, protección de aportes de terceros, reautenticación backend, borrado real Storage/CDN, retención y account cleanup **NO ESTÁN IMPLEMENTADOS**: documento `docs/PAZO_F14_A3_IMPLEMENTATION_DRAFT_20261009.md`. Gate A3 permanece ABIERTO. Las próximas aprobaciones para aplicar SQL/desplegar/eliminar siguen siendo obligatorias.
- Todos los datos actuales de Supabase hospedado son pre-lanzamiento (decisión PO), pero no se han limpiado, ni se puede reemplazar el flujo de eliminación de usuarios por una limpieza masiva.
- CI GitHub de primer código/SQL DRAFT `37951819473` SUCCESS. Verificar CI del último SHA antes de handoff/release.

## F14 A3.2 — snapshot privado de aportaciones ajenas DRAFT 2026-10-09

- PR #38 contiene **dos migraciones en `supabase/drafts/`**, NO aplicadas, ambas con `BEGIN` + `DO RAISE EXCEPTION` antes de cualquier DDL para impedir aplicación accidental.
- Segundo borrador `20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql` crea tablas privadas para tombstone de Feed, posts ajenos de comunidad y comentarios de otras cuentas; snapshot idempotente, solo server-role, devuelve explícitamente `ready_to_delete_auth=false` y `ready_to_delete_media=false`; corta si detecta medios de comunidad sin migración verificada. **No elimina registros ni realiza Storage delete**.
- Checkpoints de CLI/CI: GitHub Actions `37953010063` **SUCCESS** en commit `cf333380d7de63a0dc8dd13ccd11c8eaed7cbd96`. Más adelante comprobar el SHA documental nuevo. 5 tests de estados/errores + pruebas estáticas de migraciones, además de tests del MVP.
- **A3 sigue ABIERTA:** falta worker que congele escrituras concurrentes, adapte FK/RLS de comunidades, garantice comprobación de archivo/medios y recuperación, reautenticación de backend, borrado físico Storage/CDN y Auth al final; no ejecutar scripts en Supabase sin gate explícito. El usuario autorizó código DRAFT, no apply/merge/deploy.
- La experiencia del usuario normal no cambia: `VITE_F14_A3_REQUESTS_ENABLED` OFF por defecto. No pedir prueba de borrar cuenta ni activar el flag hasta disponer de backend y aprobación.

## F14 A3.4a — coordinator/worker lease DRAFT y QA de concurrencia (2026-10-09)

- PR #38 contiene `src/features/account/deletionCoordinator.ts` (inspector puro de 12 condiciones, **destructiveExecutionAllowed=false en todas las situaciones**, secuencia propuesta sin llamadas a Storage/Auth/SQL) y pruebas de cada omisión, string truthy y lease expirado/versionado. No se usa para autorizar operaciones en navegador.
- Tercero SQL DRAFT `supabase/drafts/20261009_f14_a3_worker_lease_NOT_APPLIED.sql`: lease exclusivo/versionado para servicio, `SELECT ... FOR UPDATE`, CAS, duración 5–60s, validación y liberación; **sin borrado, sin alterar status, sin activar worker**. Una cuenta normal no recibe tokens ni grants; requiere status `reviewing` que todavía no se establece por ningún worker.
- CI del código `991fb7b9` GitHub Actions `37953868080` SUCCESS (después de reparar expectativa de test). CI del SQL `bf1610f3` run `37954129413` SUCCESS. Se añadió clasificación del archivo privado y tokens de lease en `docs/PAZO_DATA_INVENTORY.md`.
- Próximo gate técnico: integración de reautenticación desde servidor, bloqueo efectivo de writes y protección de FK; D3-A Storage/CDN permanece blocker. Ningún SQL aplicado, ninguna cuenta/pet/archivo borrado, ni merge o despliegue, ni gasto.

## F14 A3.4b — write fence / FK D2 proposal, 2026-10-09

- PO continúa autorizando **solo código y migraciones DRAFT**, no DB apply, merge, deploy, eliminación ni gastos. PR #38 sigue DRAFT / feature flag `VITE_F14_A3_REQUESTS_ENABLED` OFF.
- Inventario Supabase **READ ONLY** de propietarios/FKs/triggers/RLS: las tablas públicas de comunidades, posts, seguidores, cuidados y documentos tienen relaciones con Auth y mascotas, algunas `ON DELETE CASCADE`. `community_private.ensure_owner_membership()` actualmente rechaza comunidad sin dueño incluso archivada; esta dependencia fue inspeccionada directamente.
- Migración DRAFT `supabase/drafts/20261009_f14_a3_write_fence_NOT_APPLIED.sql` con aborto SQL transaccional, guard de BEFORE INSERT/UPDATE/DELETE sobre **11 tablas** (post/comment/mascota/comunidad/membresía/follows/cuidados/documentos) y chequeo owner de fila vieja/nueva/relaciones; locks transaccionales ordenados. **Cobertura incompleta**: aún faltan interacciones, rescatistas, check-ins, QR, Storage API, RLS/RPC especiales, Auth y un cambio de estado atómico que use los mismos locks. Ningún trigger aplicado.
- Migración DRAFT `supabase/drafts/20261009_f14_a3_community_fk_NOT_APPLIED.sql` prepara `communities.owner_user_id` nullable únicamente para `archived`, `ON DELETE SET NULL` a Auth, ajuste de constraint trigger de membresía, y `RESTRICT` para FKs de autor de `community_posts`. **NO aplicar:** puede cambiar reglas de borrado de mascotas/usuarios; requiere pruebas en DB aislada y revisión de views, RPC y medios. No borrado de contribuciones ajenas.
- Contratos detallados `docs/PAZO_F14_A3_WRITE_FENCE_20261009.md` y `docs/PAZO_F14_A3_COMMUNITY_FK_PROPOSAL_20261009.md`. Tests estáticos/versionado en `scripts/f14-a3-draft.test.mjs`; código de cambios no ejecuta ninguna eliminación ni SQL en remoto.
- Próximo trabajo: ampliar matriz de cobertura, diseñar transición server-only al estado de congelación usando locks compatibles, pruebas aisladas de FK/RLS e integrar D3-A/Storage. **A3 sigue abierta**, no prometer eliminación real de cuentas.

## A3 — checkpoint de cierre técnico sin activación, 2026-10-09

PO pidió terminar desarrollo. Se reparó un SQL inválido de `f14_a3_worker_snapshot_contributions` y se añadió validador de delimitadores en todos los SQL DRAFT; CI #37956473862 SUCCESS. `src/features/account/mediaManifest.ts` + pruebas negativas verifican rutas de Storage, propiedad, objetos compartidos, concurrencia y evidencia de CDN; devuelve `deletionAuthorized=false` en todos los casos; CI #37956829331 SUCCESS.

**No confundir esto con un trabajador físico de eliminación**. Sigue SIN implementar lo señalado en `docs/PAZO_F14_A3_RELEASE_GATE_20261009.md`: SQL aislado, transición worker, reauth backend, freeze total, archivo/retención E2E, D3-A Storage/CDN, Auth final, políticas y release. La UI A3 permanece OFF; PR #38 DRAFT y branch `main` intacta. No pedir al PO borrar ninguna cuenta con esta versión.

## 2026-10-09 — Hosted SQL QA read-only A3

- PO autorizó pruebas SQL controladas/reversibles, NO ejecución de migraciones ni eliminación.
- Se probaron en Supabase transacciones READ ONLY con ROLLBACK: 6 cuentas, 1 post ajeno en comunidad, 6 comentarios Feed ajenos y 1 documento privado. La única comunidad bloqueada por media; 5 comentarios JSON legacy en 3 posts; 13 posts Feed con foto, 2 posts de Comunidad con foto, 6 perfiles de mascota con foto.
- Preflight mejorado detecta media/legacy y bloquea 5 de 6 cuentas hasta revisión. SQL de snapshot falla cerrado ante comentarios JSON de autoría no reconciliada. Conteo CASE sobre JSON no-array probado por SELECT real. PR #38 código + tests CI #38002029845 PASS.
- FKs reales peligrosas 5/5 coinciden; anon carece de SELECT de communities; authenticated sin JWT no ve comunidades; no existen tablas ni RPC A3. Ningún DDL/DML ni Storage/Auth write remoto.
- Evidencia completa: docs/PAZO_F14_A3_HOSTED_READONLY_QA_20261009.md. Queda pendiente DDL/pgTAP en sandbox y todo el worker; Gate A3 abierto, sin merge/deploy y feature flag OFF.

## 2026-10-09 — F14 A3 PostgreSQL TEMP QA (reversible y sin apply)

- PO autorizó pruebas SQL reversibles en Supabase hospedado. Se probaron funciones de intake/estado/cancelación, worker lease/CAS, snapshot de aportes de terceros, write fence y FK de comunidad **adaptadas a pg_temp**, con datos exclusivamente sintéticos y `BEGIN ... ROLLBACK`. Ver `docs/PAZO_F14_A3_TEMP_PG_QA_20261009.md`.
- PASS: idempotencia de solicitudes (2 jobs históricos/1 activo), lease versión 3/rechazo de claim simultáneo, archivo privado 1 post/2 comentarios/1 tombstone, bloqueos al detectar media/legacy, write fence de posts y comentarios ajenos, transición de comunidad archivada sin perder post ajeno.
- SQL DRAFT `f14_a3_write_fence` extendido de **11 a 14 tablas** añadiendo `interactions`, `community_post_likes`, `pet_place_checkins`. Pruebas TEMP verificaron 3 rechazos y 1 acción no relacionada permitida. Código CI `38002952300` PASS.
- Verificación post-QA: Supabase alojado mantiene 6 cuentas, 6 mascotas, 1 comunidad, 20 objetos; jobs/leases/RPC A3 ausentes. **No hay migraciones A3 aplicadas, ni borrado Storage/Auth ni cambios a contenido real.**
- **Pendiente crítico**: DDL completo en sandbox aislado, concurrencia entre 2 conexiones, rutas residuales de escritura, worker operativo/reautenticación/Storage/CDN/retención/Auth final. No activar A3 ni fusionar PR. Estas pruebas no certifican seguridad JWT/RLS de nuevos objetos.

## 2026-10-09 — F14 A3 review worker + durable CAS journal DRAFT

- Nuevo motor `supabase/functions/f14-a3-account-deletion/worker.ts` + adaptador RPC `adapter.ts`, sin Edge entrypoint/deploy: revisión con evidencias server-only, lease revalidada antes/después de gates, check de estado reviewing, reintentos seguros, sanear errores y nunca autorización irreversible. Cuando faltan verificadores, retorna blocked.
- Nueva sexta migración bloqueada `supabase/drafts/20261009_f14_a3_worker_checkpoint_NOT_APPLIED.sql`: RPC service_role y journal privado CAS/versiones y eventos mínimos; no content DELETE.
- SQL real **TEMP + ROLLBACK**: 2 eventos de journal en revisión 2, rechazo de tokens viejos y revision 0 repetida; sin objetos permanentes. CI motor #38003551960, checkpoint #38003843415 y adaptador #38003932473 SUCCESS. Un primer CI falló por ruta de test inválida y fue corregido antes del checkpoint final.
- Evidencia/alcance: `docs/PAZO_F14_A3_WORKER_REVIEW_20261009.md`. **Worker destructivo NO construido**, aun sin sesión reciente JWT real, all-writes freeze, paths exactos Storage/CDN, Auth final ni E2E. A3 permanece abierta y UI OFF. PO no autorizó migraciones ni despliegue.

## A3.4d — Internal HTTP review runner disabled (2026-10-09)

- PR #38 agrega `http.ts`, `index.ts` y pruebas para invocación interna de revisión. HTTP requiere token de servicio secreto, body JSON limitado, no CORS y no expone operaciones físicas. `supabase/config.toml` mantiene la función `enabled=false`, `verify_jwt=true`; además runtime exige PAZO_A3_REVIEW_WORKER_ENABLED=true, ausente por defecto. Ningún Edge desplegado.
- Backend de revisión no dispone aún de verificadores externos aprobados; el adaptador retorna missing_evidence por defecto y no existe eliminación física. Las nuevas variables de entorno y coste de despliegue NO se han configurado ni solicitado.
- Cambios bajo Gate A3 DRAFT; F14 sigue ABIERTA. Evidencia ampliada en docs/PAZO_F14_A3_WORKER_REVIEW_20261009.md.

## A3.4e — verificadores de servicio limitados, 2026-10-09

- El worker servidor de PR #38 ahora inyecta `createA3ReadOnlyChecks()` mediante `adapter.ts` e `index.ts`. Se verifican exclusivamente **(1)** `worker_lease_valid` consultando `public.f14_a3_worker_validate_lease` con el token/versión exactos, y **(2)** `legacy_authorship_reconciled` consultando una RPC SQL borrador que solo devuelve true cuando la cuenta NO tiene ningún JSON de comentarios legacy sin reconciliar. No se acepta un valor `'true'`, `1`, error RPC ni evidencia de navegador.
- Séptima migración **NO_APLICADA** `supabase/drafts/20261009_f14_a3_worker_legacy_clear_NOT_APPLIED.sql`, con `BEGIN/DO RAISE EXCEPTION` intencional antes de DDL, `SECURITY DEFINER`, grants solo `service_role` y sin DML. Se probó la función **adaptada a pg_temp** con fixtures sintéticos y `ROLLBACK`: array vacío/SQL NULL/JSON null permitido; comentario JSON no vacío y objeto desconocido bloqueados; estado no reviewing y rol authenticated rechazados. Esto NO prueba permisos RPC aplicados de verdad.
- Las otras ocho verificaciones no tienen provider: el primer gate `recent_reauthentication` **se bloquea siempre**. No se puede completar una revisión ni borrar cuenta por este código. No activar `PAZO_A3_REVIEW_WORKER_ENABLED` ni `VITE_F14_A3_REQUESTS_ENABLED`.
- Supabase actual recomienda para llamadas servicio-a-servicio secret key con validación server `auth: 'secret'` y `verify_jwt=false` (https://supabase.com/docs/guides/functions/auth), mientras el borrador A3 conserva por defensa en profundidad `verify_jwt=true` y header interno `x-a3-worker-key`. **No desplegar sin reconciliar esta incompatibilidad de formatos y hacer pruebas reales de gateway con credenciales de servicio**. No degradar simplemente a `verify_jwt=false` sin configurar primero el autenticador oficial y probar denegaciones.
- CI código `151d48bb` [#38004703115](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38004703115) SUCCESS; SQL draft `01042a3d` [#38004748138](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38004748138) SUCCESS.
- Verificación posterior READ ONLY: 6 cuentas Auth, 6 mascotas, 20 objetos Storage; `f14_a3_request_deletion()` y `f14_a3_worker_legacy_clear(uuid)` siguen ausentes. Sin apply, merge, deploy, borrados ni gastos. A3 / Gate 8 ABIERTOS.
