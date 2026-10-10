# PAZO — ACTIVE HANDOFF | estado verificado 2026-10-09

> **F14 / CONTINUIDAD COMUNIDADES (POLÍTICA APROBADA PO 2026-10-10):** Si el propietario solicita eliminar cuenta, ofrece titularidad SOLO a un administrador previamente designado que puede aceptar/rechazar en su propia sesión; transferencia exige aceptación y no borra contenido ajeno. Sin aceptación vigente, el operador al pasar solicitud a `processing` archivará conservando posts/comentarios y desacoplará propietario antes del Auth delete. Auditoría: roles actuales `owner/member` sin `admin`, owner FK `ON DELETE CASCADE`, trigger de propietario requiere membership; corregidos en **una migración SQL versionada NO APLICADA** `supabase/drafts/20261010_f14_community_ownership_continuity_NOT_APPLIED.sql`. UI y servicio de gestión en `CommunityDetailView` bajo `VITE_F14_COMMUNITY_OWNERSHIP_ENABLED=true`, apagado por defecto; no se desplegó ni cambió DB. La transición Auth/Storage todavía carece de ejecutor autorizado. NO fusionar PR ni tocar Vercel.


> **PREVALIDACIÓN F14 EJECUTADA / PASS — 2026-10-10:** PR #37 `c4140424` CI #38026303714 PASS. Se ejecutó `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` contra las **6 cuentas de prueba** sustituyendo solo CTE del candidato por `auth.users`, sin mutaciones: **3 bloqueadas por aportes de terceros, 2 requieren limpieza de contenido propio, 1 sin dependencias de las clases contadas pero aún SIN permiso para borrado** (`awaiting_executor`). Todas `may_delete_auth=false`, `may_delete_storage=false`. Estado remoto: 6 Auth, 0 solicitudes, 21 objetos Storage totales (14 fotos de publicaciones), 0 medios purged, no nueva RPC, Edge moderación v5 OFF. La interfaz de solicitudes se habilitó **solo en DEV/local** y sigue apagada para builds de producción salvo flag explícito. **Siguiente gate real:** estrategia explícita de conservación/traspaso o cierre seguro de comunidades con contribuciones de terceros y comentarios ajenos, limpia Storage mediante API, reconciliación FK/Auth; no ejecutor aún. Sin deploy, SQL permanente adicional, Vercel ni merge.


> **F14 / PREVALIDACIÓN DE BORRADO (2026-10-10):** inventario PostgreSQL real confirma bloqueo FK: `pets.owner_id` y `posts.user_id` carecen de `ON DELETE CASCADE` en Auth; `communities.owner_user_id ON DELETE CASCADE` arrastraría posts de otros usuarios. Escaneo agregado de 6 cuentas muestra 1 comunidad con 1 post ajeno, 6 comentarios ajenos en Feed, 1 documento privado y 21 objetos en 5 buckets; 0 solicitudes activas. Se implementó **consulta admin READ-ONLY** `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` y motor puro tipado `src/features/account/deletionPreflight.ts` con tests (reporte `blocked_third_party/cleanup_required/awaiting_executor` y `may_delete_auth=false` / `may_delete_storage=false` inmutables). Entrada de solicitudes `Mi mascota → Cuenta y datos` habilitada sólo en `import.meta.env.DEV` para QA local, producción sigue apagada y el ejecutor no existe. **Ningún SQL nuevo se instala**, 0 borrados, Vercel sin tocar, PR sin merge. Este es el gate técnico antes del borrado real, no un reemplazo de ello.


> **F14 ACCOUNT REQUEST INTAKE INSTALADA Y QA PASS — 2026-10-10 UTC:** autorización PO ejecutada; Supabase migración `20261010045708_f14_account_request_intake`. Creó schema privado, tabla de solicitudes por usuario y RPCs `pazo_deletion_request/status/cancel`; **0 solicitudes reales**, 6 usuarios Auth y 14 archivos intactos. ACL verificado: anon sin RPC, authenticated solo RPC, ni anon ni authenticated SELECT/USAGE de schema privado, RLS enabled. QA SQL sobre objetos *instalados*, con `SET LOCAL ROLE authenticated` y dos cuentas separadas: solicitud, consulta, repetición idempotente, aislamiento BOLA, cancelación solo de `requested`, rechazo en `processing`; todo bajo `BEGIN/ROLLBACK`, sin dejar datos. La UI de `Mi mascota → Cuenta y datos` está versionada pero permanece **apagada por `VITE_F14_DELETION_REQUESTS_ENABLED` (default OFF)**; no activada, no desplegada. Solicitud ≠ eliminación definitiva; ejecutor Auth/Storage/terceros NO existe aún. Vercel no tocado y PR #37 sin merge.


> **F14 REQUEST INTAKE SQL QA PASS / 2026-10-10 04:50 UTC:** PR #37 commit `8925f2d5`, CI #38025574055 **SUCCESS**. La migración `supabase/drafts/20261010_f14_account_request_intake_NOT_APPLIED.sql` fue ejecutada únicamente dentro de BEGIN/ROLLBACK: se verificaron dos identidades distintas en instrucciones SQL separadas, request/status/cancel idempotentes, aislamiento de cuentas y ACL. Se corrigió `JSON null` a `SQL NULL` para ausencia de solicitud. **No se aplicó** nada permanente ni se habilitó UI; necesita autorización PO específica según AGENTS.md. La recepción segura de solicitud no reemplaza el ejecutor de eliminación real, que sigue P0. D3-A Edge v5 sigue OFF. 


> **F14 / LOTe CUENTA (2026-10-10):** entrega de solicitud autenticada de eliminación (NO ejecución): `supabase/drafts/20261010_f14_account_request_intake_NOT_APPLIED.sql`, tres RPC idempotentes request/status/cancel, esquema privado/tabla mínima, UI ES/EN en Mi mascota detrás de `VITE_F14_DELETION_REQUESTS_ENABLED` (OFF), tests de ownership y no borrado. **NO se aplicó la migración**: `AGENTS.md` requiere gate PO independiente para SQL, y eliminar datos/Auth/Storage sigue totalmente fuera de alcance. Solicitud registrada != cuenta eliminada, no abrir Beta hasta manejo real seguro. D3-A Edge v5 desactivada; 14 objetos intactos.


> **LOTE MVP / PRIVACIDAD INFORMATIVA (2026-10-10 UTC):** PR #37 incluye centro preliminar ES/EN accesible desde registro y Mi Mascota; no requiere base de datos, servicios ni navegación extra. Texto consistente con inventario Supabase/Mapbox/moderación y explícitamente marcado **borrador**: `LEGAL_RELEASE_READY=false`, sin fingir contacto legal, retención ni eliminación de cuenta completas. Requiere verificación de responsable/contacto, retención y políticas definitivas antes de Beta externa; solo CI todavía no aprueba legalmente el texto. D3-A sigue pendiente del E2E real, Edge v5 protegida, 14 objetos intactos.


> **D3-A ROLLBACK SEGURO — 2026-10-10 04:37 UTC:** ante petición del PO de automatizar y seguir rápido, se restauró Edge `f14-moderation-purge` **v5**, `verify_jwt=true`, release latch `F14_MEDIA_PURGE_RELEASE_APPROVED=false`, sin excepción temporal para ningún UUID; UI también vuelve a apagada (sin botón dev). Foto descartable verificada sigue **sin borrar**, 14 objetos Storage (13 anteriores + 1 ensayo), purged=0. Se corrigió y verificó preflight JWT `auth.role()` (migración `20261010043307_f14_media_jwt_claim_compat_single_test`; PASS SQL), pero **no es una prueba de purga real**. D3-A NO cerrada. Requiere ejecución futura con JWT de moderador vía flujo explícito; no manipular Storage SQL. Continuar en paralelo con gates MVP sin tocar Vercel ni merge.


> **D3-A JWT HOTFIX APLICADO (2026-10-10 04:33 UTC):** migración remota `20261010043307_f14_media_jwt_claim_compat_single_test`, CI #38024417241 PASS. Reemplaza la lectura legacy `request.jwt.claim.role` por `auth.role()` en el gate y trigger (ambos aceptan formato PostgREST `request.jwt.claims`). Preflight SQL para el único `feed_post` nuevo con JWT claims service_role PASS bajo BEGIN/ROLLBACK; grants anon/authenticated aún DENY. Claim exacto extendido hasta **05:33 UTC** y comprobado `held`/checked. Storage 14, media purged 0, test object 1 y pending_review 1. **Foto NO BORRADA todavía**; PO debe hacer solo un segundo clic en su UI local del objeto `...7bf4076e`; después verificar y desactivar la excepción temporal de Edge v4. No Vercel ni merge.


> **DECISIÓN PO / FAST-TRACK 2026-10-09:** NO usar Vercel hasta MVP listo para lanzar. Carril activo: integración del MVP #36→#37 y cierres Auth/moderación/privacidad con criterios E2E; **PR #38 A3 PAUSADA**, sin más drafts hipotéticos. Detalle y gates: [PAZO_MVP_LAUNCH_FAST_TRACK_20261009.md](PAZO_MVP_LAUNCH_FAST_TRACK_20261009.md). Los checkpoints cronológicos antiguos de esta rama no reactivan A3 ni autorizan merge/deploy/SQL.


**Este es el snapshot operativo vigente**, no una cronología. Evidencia: GitHub (estado de PRs/CI) + confirmación del Product Owner en Antigravity/localhost. Historial completo anterior archivado, sin pérdida, en `docs/archive/PAZO_ACTIVE_HANDOFF_PRE_MVP_LOCAL_QA_20261009.md`.

## Fuente de verdad y rol
- Product Owner: usuario; ChatGPT Project Brain es ejecutor técnico. Canonical Brain OS: `DigitalAppcorp/project-brain-os` (versión estable vigente 1.4.1; el `AGENTS.md` histórico refiere 1.3.0 y el patrón de diseño nuevo de Brain OS PR #3 **sigue DRAFT**).
- Leer primero `AGENTS.md`, este handoff, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md` y el scope de cualquier módulo específico antes de actuar.
- **D3-A / ERROR LOCAL REPRODUCIDO 2026-10-10 04:28 UTC:** clic de moderador generó HTTP 409; auth y RPC f14_prepare_media_claim, f14_recheck_media_claim devolvieron 200; preflight f14_moderation_media_gate devolvió false y nunca hubo DELETE Storage. Snapshot posterior: 14 objetos, target intacto, media_status pending_review y claim held checked. Causa: función SQL exigía solo request.jwt.claim.role; PostgREST puede proveer rol en request.jwt.claims (auth.role() resuelve ambos). Migración correctiva `supabase/sql/f14_media_auth_role_compat_single_trial.sql` prepara cambio de ambas comprobaciones a auth.role() y extiende SOLO claim descartable verificado 60 min para dar tiempo a ensayo. Edge v4 mantiene allowlist 1 UUID, general OFF. Sin Vercel. Verificar CI/migración, después repetir 1 clic y desactivar allowlist.

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

## D3-A: código preparado para finalización segura (2026-10-10 UTC)

En PR #37 se añadió `supabase/sql/f14_moderation_media_finalize.sql` y Edge ahora llama `f14_prepare_media_claim`, `f14_recheck_media_claim` y preflight antes de Storage API. Conserva trigger de rechazo con autorización excepcional solo a service_role + claim verificado + objeto ausente. **Cualquier migración o despliegue posterior se registra y verifica separadamente**. Edge release latch continúa `false`; 13 objetos preexistentes permanecen intocados. Falta una fotografía de prueba descartable para la validación real controlada. No Vercel, no merge.
