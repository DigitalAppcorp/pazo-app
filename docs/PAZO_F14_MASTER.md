# PAZO — Fase 14: confianza, moderación y privacidad

**Ruta maestra de producto y arquitectura — 2026-10-08**
**Categoría:** infraestructura obligatoria para Beta; no requiere fake door.
**Estado vigente (2026-10-09):** F14 A2 Gate 8 **EN CURSO**; Gate 5/6/7 CERRADOS. Implementación y migraciones A2 autorizadas y verificadas, PR #35 DRAFT; A3/A4 NO autorizados. Ver `docs/PAZO_ACTIVE_HANDOFF.md` y `docs/PAZO_F14_A2_SCOPE_CLOSURE.md`. La especificación de A0–A4 que sigue abajo conserva el contexto histórico previo a las autorizaciones posteriores.
**Base auditada:** respaldo `backup/pazo-codex-local-20261008` (`c4f466f`).
**Precedencia:** `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_MODULE_LIFECYCLE.md`, `docs/PAZO_ARCHITECTURE_CONTRACT.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` y `docs/PAZO_DATA_INVENTORY.md` siguen obligatorios. Este documento detalla la sub-ruta F14.

> IMPORTANTE: la aprobación de arquitectura NO significa que la función exista, ni permite crear SQL/código, alterar producción o presentar cumplimiento legal como confirmado. Este documento registra decisiones aprobadas y especificaciones para futuras autorizaciones separadas.

## 1. Gates y decisiones aprobadas

- **Gate 5 — CERRADO / MVP REDUCIDO.** Moderación humana mínima; no IA de moderación, reconocimiento facial, verificación documental de edad, gran consola administrativa ni proveedor nuevo.
- **Gate 6 — CERRADO.** Reportar cinco tipos: publicación del Feed, comentario del Feed, perfil público de mascota, publicación de Comunidad y comentario de Comunidad. No incluye reportar una comunidad entera como recurso, salvo nueva decisión.
- **Gate 7 — CERRADO por autorización expresa del Product Owner.** Se aprueba el contrato de arquitectura resumido en este documento, incluidas las condiciones y pruebas obligatorias abajo.
- **D1 — CERRADA.** Perfiles y publicaciones públicas seguirán accesibles a visitantes anónimos. Bloquear se ejecuta a nivel de cuenta Auth, en ambos sentidos y para todas las mascotas de ambas cuentas; se filtra la experiencia autenticada y se rechazan operaciones sociales entre cuentas. No prometer que el bloqueado perderá acceso anónimo a contenido público. Conservar el rescate/QR público según su contrato limitado.
- **D2 — CERRADA.** Si el único propietario de una comunidad elimina su cuenta: archivar y despublicar sin borrar automáticamente contribuciones ajenas; no transferir dirección sin aceptación. Archivo privado de contribuciones conservadas conforme a D3-B.
- **D3-A — CERRADA.** Despublicación, eliminación verificable en origen activo y Storage, conservación mínima justificada y distinción entre datos activos, terceros, backups, logs y CDN.
- **D3-B — CERRADA.** Metas operativas propuestas por PAZO aprobadas por PO; **no están implementadas**, no constituyen obligaciones legales universales ni garantizan retención de proveedores. Matriz siguiente.
- **D4 — Alcance delimitado** por Gate 6: solamente cinco clases de denuncias antes indicadas.

## 2. Retención D3-B aprobada como meta de diseño

| Categoría | Disparador y meta operativa | Responsable provisional | Cautelas |
|---|---|---|---|
| Cuenta, mascotas, posts, comentarios, fotos y documentos propios | Despublicar tras solicitud de eliminación confirmada; completar limpieza de datos activos y Storage **dentro de 30 días** | PO / ejecutor técnico autorizado | Reintentos, FK, CDN, copias de seguridad y posibles excepciones legales |
| Cuidados y registros asociados | Al eliminar mascota/cuenta: limpieza coordinada dentro de **30 días** | Ejecutor técnico | Dependencias `care_items`/`care_completions` sin borrado cascada automático |
| Contactos y avistamientos cerrados | Eliminar información sensible **dentro de 30 días** desde el cierre o fin de finalidad | PO / responsable de rescate | Considerar aportes de terceros y obligaciones concretas |
| Reportes cerrados sin infracción | Eliminar o anonimizar irreversiblemente a los **90 días** tras resolución | Moderador / PO | Conservar mínimo durante revisión y proteger identidad del reportante |
| Reportes con infracción confirmada | Evidencia mínima segregada hasta **180 días** desde resolución | Moderador / PO | Excepciones justificadas con fecha y revisor; nunca republicar evidencia |
| Comunidades archivadas sin dueño y aportes de terceros | Despublicar al confirmar; revisión a **90 días**; resolución humana documentada antes de **180 días** | PO / moderador | No eliminar aportaciones ajenas por cascada ni transferir dueño sin aceptación |
| Telemetría propia identificable | Hasta **90 días**; agregados realmente anónimos hasta **12 meses** | PO / técnico | Un UUID persistente no es anónimo; PostHog requiere verificación propia |
| Logs bajo control de PAZO | Meta de **hasta 30 días**, o menor si proveedor limita | PO / técnico | Sin PII, secretos ni payload de formularios |
| Backups propios DB + Storage | Rotación/caducidad **30 días** desde creación | PO / técnico | Backups externos aún por verificar; restaurar no debe resucitar datos borrados |
| Bloqueos y ocultación | Vigentes mientras la cuenta exista o el usuario retire el bloqueo; limpieza vinculada al cierre **dentro de 30 días** | Sistema / PO | No reactivar follows tras desbloquear |
| Pago/PayPal | **Sin plazo asignado** hasta revisar obligaciones jurídicas y contractuales | PO / asesor competente | Supporter desactivado; no inferir plazo de PayPal |
| Cuenta de menor conocida | Restricción prioritaria al comprobar el caso; ruta de cierre/borrado con meta general **hasta 30 días** desde decisión | PO | No exigir DOB ni documento de edad por defecto; atender requisitos aplicables |

**Responsabilidades:** Product Owner = responsable provisional de privacidad, moderación y excepciones; ejecutor técnico = diseño/pruebas/operación solo bajo autorización específica. No hay un DPO formal designado por este documento. Antes de Beta: contacto público de privacidad, procedimiento de solicitudes, tratamientos excepcionales, política jurídica revisada cuando corresponda y matriz contrastada contra configuración real de Supabase, PostHog, Vercel, Mapbox y PayPal. Los textos públicos no prometerán plazos no implementados.

## 3. Arquitectura funcional de Gate 7 (aprobada; aún no implementada)

### 3.1 Propiedad del código

- Nuevo `src/features/moderation/` para reportes, bloqueos, ocultación, permisos de moderadores, cola y vistas mínimas.
- Nuevo `src/features/account/` para solicitud confirmada y eliminación de cuenta/mascota, progreso y reintentos.
- UI de dominios legacy (`App.tsx`, Feed, Perfil, Comunidades, búsqueda, rescate) integrada incrementalmente, sin trasladar grandes carpetas ni copiar reglas de negocio en `App.tsx`.
- Sin incorporación de servicios externos, SDK de replay/autocapture ni planes pagados por defecto.

### 3.2 Objetos de datos propuestos

Los nombres finales y DDL deberán comprobarse contra el esquema en el bloque local correspondiente, no antes.

| Objeto | Diseño/seguridad mínima |
|---|---|
| `account_blocks` | Pareja de cuentas Auth, actor/objetivo, sin autobloqueo, relación bidireccional de control, índices ambos sentidos, RLS mínima |
| `hidden_posts` | Relación usuario-publicación, sin afectar visibilidad del autor o de terceros, borrado al cerrar cuenta |
| `moderation_private.reports` | Cinco tipos cerrados, propietario resuelto en servidor, motivo permitido, deduplicación y rate limit; acceso solo vía endpoint verificado |
| `moderation_private.actions`, `moderator_grants` | Decisión, actor, destino, motivo/caducidad mínima; autoridad privada (jamás `profiles.is_founder`) y bitácora no editable por usuario |
| `content_restrictions` | Retirada/restricción efectiva en API, lectura anónima y autenticada cuando se retire por moderación |
| `account_private.deletion_jobs` | Trabajos idempotentes, solicitud confirmada, estado y reintentos, inventario de archivos/FK, resultados por fase |
| Archivo de comunidades y medios privados | Contribuciones de terceros sin publicación pública, revisión 90d y resolución 180d; control de acceso independiente |

**Regla de RLS:** usar `auth.uid()` y propiedad realmente derivada del servidor; grants explícitos; RLS para cualquier objeto expuesto; funciones privilegiadas en esquemas no expuestos con `search_path` fijo, validación propia y sin service-role en navegador. No creer que una política `PERMISSIVE` adicional restringe una política preexistente `USING(true)`. No filtrar únicamente en React: verificar SQL, RPC, rutas directas, Feed, perfiles, búsqueda y comunidades.

### 3.3 Bloqueo, denuncia y moderación

- Bloqueo por cuenta, no por mascota; cancelar follows de ambos lados, bloquear nuevas acciones sociales relacionadas (follow, likes, saves, comentarios y operaciones directamente involucradas en Comunidad); cambiar mascota activa no evade bloqueo; desbloquear no restaura follows.
- Ocultar publicación es preferencia privada independiente de bloquear, con persistencia y limpieza al eliminar cuenta.
- Reportar: actor autenticado, objetivo existente y denunciable, sin permitir que cliente asigne `reporter`, `owner` o rol; reportes no enumerables por denunciado ni terceros.
- Moderador: autoridad server-side segregada, cola paginada, registro auditable, retirada efectiva de contenido y medios; el usuario no puede darse privilegios desde metadatos de perfil.
- Lectura anónima de contenido social legítimamente público permanece autorizada conforme D1; contenido retirado por moderación o archivado NO debe permanecer accesible por API, URL pública ni Storage si se requiere despublicación.

### 3.4 Eliminación de cuenta y protección de terceros

**Riesgo verificado:** `communities.owner_user_id` es NOT NULL y FK `ON DELETE CASCADE` a Auth. `community_posts.author_user_id` y `author_pet_id` también están en cascada. `pet_documents.pet_id` es RESTRICT; cuidados y algunos contenidos tienen FKs no cascada. Borrar Auth o mascotas sin preparar dependencias puede destruir contenido ajeno o fallar parcialmente.

**Contrato:** reautenticación reciente; estado de cuenta protegido; inventario completo; preparar archivo privado sin datos del titular; despublicar comunidad y contenido propio; revisar referencias; eliminar archivos mediante Storage API y comprobar resultados; eliminar datos propios en orden dependiente; Auth **al final**. Trabajo idempotente con estados de error/reintentos, sin confirmación engañosa. Seguridad de sesión/JWT y enlaces CDN debe probarse.

**D2 / comunidad sin dueño:** evolución posterior autorizable de `communities.owner_user_id` a nullable en archived, FK a Auth sin cascada peligrosa y CHECK para requerir dueño en active; cambiar RLS según estado. Aportes de terceros preservados solo en archivo privado; sus medias dejan de estar en bucket público. Si un post del titular tiene comentarios de terceros, conservar un *tombstone* desidentificado (sin autor/texto/foto originales) para vincular aportes privados, y adaptar `NOT NULL`, FKs y constraints sin cascada. Si no hay aportes ajenos, eliminar post propio. Ninguna transferencia automática de propiedad. Revisión humana 90d/180d.

**Borrado parcial:** si Storage o una relación falla, mantener job recuperable y no declarar eliminación completada. Backups restaurados deben reaplicar solicitudes de supresión desde registro separado antes de reexponer servicio. Las fotos almacenadas públicamente no se vuelven privadas por ocultar una tarjeta.

## 4. Pruebas y Definition of Done (Gate 8 futuro)

- Matriz A/B/C con dos mascotas por cuenta; bloqueo unilateral y cruzado, desbloqueo, cambio de mascota, F5, tries directos API/RPC, persistencia y compatibilidad con lectura anónima D1.
- Cinco tipos de denuncia; validación de objetivo, duplicado, rate limit, rechazo self-report no autorizado si aplica, actor falso, escalamiento por falsificación de moderator ID y cola privada paginada.
- Retirada efectiva en Feed, perfil, búsqueda, Comunidades, RPC, APIs, archivos Storage; ningún reporte ni archivo privado filtrado a público/analítica.
- Borrado de cuenta desechable con múltiples mascotas, posts propios con comentarios ajenos, comunidad con autores distintos, documentos privados, cuidados, rescate QR, presencia, follows y los cinco buckets. Fallas simuladas con reintentos; conservación de aportes ajenos, sin pérdida silenciosa.
- Retención D3-B con reloj controlado; vencimientos y excepciones auditables; backups sin resurrección de datos borrados; sin transferencias a PostHog/analítica de datos sensibles.
- Pruebas pgTAP/SQL, API, Storage, `npm run verify:local`, cold-start cuando corresponda, targeted lint, revisión visual PO y Scope Closure Reconciliation. PASS de una suite antigua no equivale a verificación de F14.
- Fase 14 solo podrá declararse COMPLETADA tras merge a `main` autorizado, backend aplicado, pruebas aprobadas, verificación y DoD reconciliada, más políticas de privacidad y procedimientos Beta adecuados.

## 5. Plan Gate 8 y permisos separados

| Bloque | Alcance | Autorización actual |
|---|---|---|
| **A0 — Documentación local** | Incorporar esta sub-ruta, actualizar roadmap/handoff y comprobar diff / `npm run verify` | **AUTORIZADO únicamente para documentos** |
| A1 — Bloqueos y ocultación | Backend/UI local, matrices RLS/RPC, filtro transversal | NO AUTORIZADO |
| A2 — Reportes y moderación | Cinco objetivos, moderador, cola y retirada efectiva | NO AUTORIZADO |
| A3 — Eliminación y archivo | Integridad FK/Storage/Auth, aportes terceros, jobs resilientes | NO AUTORIZADO |
| A4 — Retención y privacidad | Procesos D3-B, matriz/inventario, procedimientos y textos | NO AUTORIZADO |

Cada bloque futuro requiere permiso del Product Owner para el alcance concreto, migraciones locales si corresponden y pruebas. Ningún bloque autoriza automáticamente al siguiente. Cualquier migración remota, push, merge o despliegue necesita **nueva autorización explícita**. `supabase/local_migrations/` es entorno aislado; jamás representa por sí mismo una migración para producción. Antes de release reconciliar historia de 30 archivos canónicos y Supabase remoto.

**Punto de parada A0:** verificar `git status`, `git diff --check` y `npm run verify` local, registrar resultado y DETENERSE. No ejecutar comandos Supabase destructivos ni iniciar A1.

## 6. Trabajo pendiente para Beta (no equivale a permiso actual)

- Correo/contacto de privacidad, proceso de solicitudes y política pública consistente con implementación efectiva.
- Revisión jurídica específica de políticas, derechos del usuario, casos de menores y reclamaciones de copyright/IP cuando corresponda; ningún plazo de PayPal inferido.
- Validación de retención real de proveedores y alertas; Vercel permisos de acceso a proyecto, PostHog eliminación; respaldo externo DB+Storage y restauración verificable (Release Candidate).
- Production Hardening continúa EN CURSO en su sub-ruta independiente; PR #34 permanece sin merge ni despliegue en virtud de A0.

## 7. F14 A1 — candidato aislado pendiente de autorización de aplicación

- Fuente: ZIP del PO posterior a `F14 A0 VERIFIED PASS`, sin carpeta `.git`; HEAD local exacto debe confirmarse en Windows.
- SQL versionado **solo como propuesta**: `supabase/migrations/20261008090000_f14_account_blocks_hidden_posts.sql`; NO aplicado a ninguna base. NO autoriza Supabase prod, push o deploy.
- UI/servicio bajo `src/features/moderation/`, conectada a Feed, perfil, búsqueda, Comunidades; D1 mantiene lectura anónima social y rescate.
- Pruebas estáticas `npm run test:f14`; pgTAP dedicado `npm run local:test:f14` solo después de autorizar migración local.
- **Pendiente antes de cerrar A1:** aplicar parche a la copia local exacta, autorización explícita para migración local, `npm run verify:local`, build, pruebas A/B/C de bloqueo entre varias mascotas, calls directas de API/RPC y revisión visual.
- No declarar este bloque completado hasta verificar y recibir aceptación del PO. A2-A4 permanecen sin autorización.


---

## 8. Estado operativo F14 A1 hosted-first — 2026-10-08

Por decisión expresa del PO, desarrollo del MVP temporalmente **hosted-first** en lugar de descargas/parches y entorno local; ver `AGENTS.md` y `docs/PAZO_ACTIVE_HANDOFF.md`. La implementación de bloqueos/ocultación ya está en la rama `f14/block01-hosted-mvp-20261008` desde `c4f466f`, sin merge a `main`. Supabase PAZO aplicó SQL A1 (`f14_account_blocks_hidden_posts`, versión remota `20261008112333`) y pasó revisión estructural posterior. El archivo local versionado usa prefijo `20261008090000`: reconciliar migraciones. Se preserva D1 de lectura `anon`.

El frontend de `pazo-app-t83r` compiló en **preview** pero NO está en producción: operaciones API directas de deployment y promote fallaron 403 por autorización del equipo Vercel `digitalapp`. La prueba visual y el paquete local habían pasado; prueba hosted de API real entre cuentas A/B/C aún pendiente. A1 sigue ABIERTO. **A2–A4 no autorizados**, producción no debe publicitarse como Beta final de F14.


## 9. F14 A2 — Implementación preparada, autorización de despliegue pendiente (2026-10-08)

El Product Owner autorizó iniciar A2 **sin exigir antes la publicación del frontend A1**, la cual continúa bloqueada por permisos Vercel 403. El código A2 se prepara exclusivamente en rama GitHub `f14/block02-moderation-mvp-20261008`. La migración está en `supabase/drafts/20261008150000_f14_reports_moderation.sql`: **no debe incluirse en el replay automático ni aplicarse a Supabase hasta autorización posterior específica**.

### Contrato de A2
- Denuncias autenticadas de **cinco tipos** aprobados; tipo, owner, reporter real y existencia se verifican del lado servidor. El usuario no puede designar autor ni moderador.
- Taxonomía de motivos de implementación **provisional**, pendiente de aceptación de producto: `spam`, `harassment`, `unsafe`, `other`. Detalles opcionales hasta 500 caracteres, máximo cinco denuncias por cuenta en 24 h; índice único sobre denuncias pendientes para impedir duplicados.
- Esquema privado `moderation_private` contiene `reports`, `moderator_grants`, `moderation_actions` y `content_restrictions`. Ningún usuario obtiene rol automáticamente; `profiles.is_founder` no concede privilegios. Requiere selección/autorización explícita del primer moderador antes de operación real.
- RPC `f14_submit_report`, `f14_is_moderator`, `f14_moderation_queue`, `f14_review_report`. Accesos verifican `auth.uid()` dentro de funciones de servidor. Cola paginada en lotes de 20, orden por fecha/ID y auditoría de decisiones.
- Contenido retirado se bloquea en lecturas por API REST/RLS **restrictiva**, incluidas lectura anónima de posts/perfiles/comentarios y lectura autenticada de comunidades. D1 se preserva para contenido público NO retirado. La UI no debe fingir que un botón por sí solo hace la retirada.
- **Limitación crítica pendiente:** fotos en buckets públicos y CDN pueden seguir accesibles por URL directa aunque RLS o tarjetas oculten el contenido. `content_restrictions.media_status='pending_review'` obliga a auditoría y posterior borrado verificado mediante Storage API. No declarar retirada total, privacidad garantizada ni A2 cerrado hasta implementar y probar ese flujo. Archivos fuera de Supabase requieren procedimiento separado.
- La retención D3-B de denuncias sigue siendo meta no implementada; revisar periódicamente 90/180 días en A4. No enviar reporter, razones ni textos a PostHog/logs cliente.

### Pendiente para aceptación y autorización siguiente
1. Verificar compilación/CI de rama en GitHub/Vercel Preview.
2. Revisión SQL por seguridad, tests directos A/B/C, RLS select anon/auth, RPC falsa autoridad, concurrencia/rate limit/deduplicación.
3. Aprobar y ejecutar la migración con versión remota reconciliada; elegir primer moderador con autorización separada.
4. Implementar purga de medios Storage segura e idempotente, comprobar URL directa y propagación/CDN; validar visual y Scope Closure Reconciliation.
5. B01 continúa pendiente de prueba API hospedada y publicación oficial. A3/A4 siguen sin autorización.


### Contrato de revisión de medios preparado en A2
El borrador SQL incorpora `f14_pending_media`, `f14_media_task` y `f14_confirm_media_cleanup` (esta última requiere `service_role`). Se agrega una Edge Function propuesta en `supabase/functions/f14-moderation-purge/`: exige JWT validado, `f14_is_moderator` desde servidor, limita a buckets controlados por PAZO, rechaza URLs externas y marca la limpieza solo tras éxito de Storage API. **No está desplegada ni probada contra Storage hospedado**. El CDN puede retener enlaces temporalmente; sigue siendo necesario verificar URL directa y propagación. No conceder permiso de moderador, desplegar Edge Function ni aplicar SQL sin aprobación distinta y verificación de riesgos. La UI indica pendiente si el backend no está operativo.


### Corrección de privacidad: comentarios legacy duplicados
Una consulta agregada al esquema hospedado detectó **5 comentarios históricos duplicados en `posts.comments` JSONB**, todos vinculados mediante `post_comments.legacy_id` a un comentario normalizado (0 huérfanos). La retirada de un `feed_comment` o de un `pet_profile` debe retirar también su copia legacy JSON, sin borrar la fila canónica de evidencia. El SQL A2 borrador incluye esa depuración específica y mantiene las demás copias intactas. Este comportamiento requiere prueba de API `posts.select(*)` y control de regresión antes de aplicar a datos hospedados. Ningún dato histórico se modificó durante esta auditoría.


**Guardia de Storage añadida al borrador:** `f14_media_task` obtiene `owner`, `pet` y `community` directamente de la fila base. La Edge Function valida que las rutas del objeto correspondan al titular y al contexto del contenido original antes de eliminar. Si la URL es externa, malformada o corresponde a otra identidad, queda en revisión manual. **Todavía faltan pruebas funcionales y confirmación real de propagación CDN**.


### 10. Activación autorizada A2 — supabase PAZO, 2026-10-08
`moderation_private` y los RPC de denuncias/revisión fueron creados mediante migración `f14_reports_moderation`, versión Supabase `20261008120333` (SQL blob `b853f00ad222079021d49dece92e42282e135864`). Se verificó sintaxis con DDL transaccional revertido antes del apply real. Post-auditoría: 5 políticas RLS restrictivas, anon excluido, sin concesiones de rol moderador ni contenidos retirados. Edge `f14-moderation-purge` versión 1 JWT activo pero **solo stub inerte que devuelve 503**: ningún borrado de Storage. El diseño de purga completo fue movido a `supabase/drafts/` para impedir despliegues accidentales.

**Pruebas pendientes:** integración de formularios vía preview con credenciales de prueba; deduplicación y limitación por reportero, 5 objetivos, validación de rol y RLS/REST anónimo/autenticado, contenidos retirados y copias legacy, borrado de medios y propagación CDN. Cierre A2 y promoción a producción Vercel NO autorizados automáticamente. El siguiente gate requiere autorización explícita para designar moderador e intervenir registros de prueba. A3/A4 no autorizados.


### 11. Rol de moderación inicial — aprobado y aplicado
El PO confirmó que `appdigital.corp@gmail.com` es su cuenta PAZO y autorizó expresamente asignarle el rol inicial de moderador. Se comprobó que Auth contiene una única cuenta con correo confirmado y no eliminada. `moderation_private.moderator_grants` ahora contiene **una concesión y ninguna otra**. Comprobación posterior: no hay reportes ni contenido moderado. Esta concesión únicamente habilita las RPC de revisión; **no** implica permisos de administrador de GitHub/Vercel/Supabase y no activa Storage DELETE.

Pendiente: prueba de acceso con token real del moderador y denegación a cuentas estándar; matriz de cinco tipos, RLS y legados, seguridad API, revisión visual vía preview, media/CDN y reconciliación de cierre. A3/A4 no autorizados.


### 12. Verificación parcial A2 de roles y hallazgo de RLS (2026-10-08)
Se simularon roles SQL con `SET LOCAL ROLE` y `request.jwt.claim.sub`, con `ROLLBACK`. PASS: único moderador reconocido, cola accesible, usuario estándar y `anon` rechazados, lectura social anónima legítima conservada, tablas privadas inaccesibles, cinco clases de reportes con IDs inexistentes rechazadas y motivo no admitido rechazado. No se usaron JWT reales ni se generaron reportes persistentes: faltan pruebas REST con tokens firmados, deduplicación, rate-limit, flujos de retirada y validación UI.

Se observó que `f14_moderated_comments_select` no verificaba SELECT del post padre; `f14_moderated_community_comments_select` tampoco lo exige explícitamente. El nuevo SQL propuesto `supabase/drafts/20261008_f14_comment_parent_guard.sql` modifica las dos políticas para requerir lectura RLS del post padre, incluidas restricciones de retirada de perfiles. La sintaxis superó prueba DDL reversible con `ROLLBACK`; producción sigue sin esta corrección. **Exigir aprobación específica antes de aplicar**. A2 sigue ABIERTO.


### 13. F14 A2 — Parent visibility correction applied
With explicit PO approval, migration `f14_comment_parent_guard` version `20261008122907` updated the two restrictive comment SELECT policies to require visibility of their parent Feed or Community publication. Prior to hosted apply, a reversible DDL smoke tested anon/authenticated SELECT successfully. After apply, transactional tests temporarily hid a Feed post and a pet profile (the latter owning a post with comments written by another pet). Both parent posts and their comments became invisible to anon and authenticated users; transaction `ROLLBACK` restored all data. **Post-audit: 1 moderator, 0 reports, 0 restrictions, 14 Feed posts, 8 normalized Feed comments.** The hosted database has 0 Community comments, so community-specific runtime hiding remains untested and MUST NOT be marked PASS. The SQL is now canonical in `supabase/migrations/20261008122907_f14_comment_parent_guard.sql`, old draft removed.

Remaining A2 gate: JWT-backed API validation, all five real report targets with disposable data, duplicate/rate-limit verification, moderator queue and decisions, media/CDN investigation, visual preview acceptance. Storage deletion disabled; Vercel production deferred. A3/A4 not authorized.


### 14. A2 additional transactional behavior checks
SQL simulations of authenticated user and appointed moderator passed full ephemeral `submit_report → duplicate rejected → moderator queue → dismiss → audit` and five-per-24-hour rate limit, all transactionally reverted. Existing target types `feed_post`, `feed_comment`, `pet_profile`, and `community_post` accepted real IDs under simulated client role; `community_comment` positive path awaits fixture (zero existing rows). These are strong server-side checks, **not HTTP requests authenticated by signed real-user JWTs**. No persistent test data, moderation actions, or content withdrawals resulted. Keep final integration checks open.


### 15. Permission audit correction — no migration required (2026-10-08)
An initial `has_table_privilege` check returned false for several app tables and was improperly construed as user write breakage. More precise review of `information_schema.column_privileges` revealed intentionally scoped per-column privileges to `authenticated`. Correct frontend paths were exercised in a single reversible transaction using synthetic users, RLS and `SET LOCAL ROLE authenticated`: create own pet, call `create_community`, join membership, create Feed and Community posts and both comment types **PASS**. Attempts to modify another user's pet or insert a pet with forged `owner_id` failed; reading protected `pets.weight` and `profiles.paypal_subscription_id` failed as intended. Final persisted data unchanged. **No DDL, GRANT or migration applied**, because a broader grant would expose private fields. Distinguish SQL-simulated auth claims from real signed user JWT. Existing A2 tests and future gates remain open.


### 16. F14 A2 user-confirmed report and scoped mobile UX polish
The PO used the Preview and submitted a real `spam` report for the explicitly disposable Feed post. Hosted SQL confirmed a pending report on that exact target, originating from the initial moderator account, and zero other reports/withdrawals. Thus submission by real user session is user-confirmed, but other-account denial by real JWT remains untested. PO shared mobile screenshots: safety access link was exposed inside Feed, post actions crowded mobile cards, and temporary no-photo pet avatar rendered broken. Frontend-only correction on current A2 branch moves safety entry to Account / Mi mascota, makes post actions accessible via compact menu, adds selected report context, and falls back to paw avatar. Preserve the feed algorithm, preview gating, and no prod release. Temporary post/pet/report continue to exist pending queue UI validation and narrowly scoped cleanup.


### 17. A2 verified real user moderation cycle and cleanup (2026-10-08)
User-confirmed Preview submit -> moderator queue -> `dismiss` flow PASS using actual Auth session. Hosted report status was `dismissed`, one audit action existed. Guarded exact-ID deletion dry-run PASS, then PO-authorized isolated fixture cleanup committed. Post-check 0 disposable pets/posts/reports/actions/impressions; no user content, photos or Storage assets affected. This supersedes section 16's temporary-fixture-pending status. `pazo-app-t83r` Preview for portal queue commit `0931717` passed; production remains unchanged. **Do not equate `dismiss` validation with a `remove` verification.** Independent real non-moderator JWT requests and verified media removal/CDN are still missing; current media Edge remains disabled (503). A2 not closed; A3/A4 not authorized.


### 18. F14 A2 depublishing trial passed and cleaned (2026-10-08/09 UTC)
PO completed real-session Preview **Despublicar** action on isolated test post. Server state: one `removed` report with moderator resolution, audited `remove`, `feed_post` restriction, and SQL role simulations verifying the post is not SELECT-visible to anon/authenticated while unrelated posts remain accessible. Fixture had no photos. Exact-ID, guarded, reversible deletion dry-run PASS then committed; post-check zero test pet/post/report/action/impression and generated public link, no residual reports/restrictions, 1 moderator, 14 regular posts, 5 regular pets. No Storage delete, Vercel production unchanged. **Known defect:** `f14_review_report` marks even photo-less feed posts `pending_review`, cluttering media queue. Needs scoped migration after PO approval. A2 remains open for independent non-moderator signed JWT/API tests, media/CDN purge design and validation, D3-B retention and UX. Do not initiate A3/A4.


### 19. A2 media-presence guard proposed; hosted rollout pending (2026-10-08)
PO approved preparing and reversibly testing narrow correction. New SQL draft `supabase/drafts/20261009_f14_media_status_presence_guard.sql` detects nonblank `posts.photo_url` or `community_posts.photo_url/photo_storage_path` for removal media review classification. `pet_profile` intentionally stays pending even with no avatar to avoid silently missing media in the pet's existing posts. Return codes distinguish `depublished_no_media_review` vs pending; frontend ModeratorQueue messaging updated. Tested via DDL `ROLLBACK` plus five isolated SQL cases covering photo/no-photo and profile, all reverted. **NOT APPLIED TO HOSTED SUPABASE** pending separate approval. No change to disabled Storage Edge. Keep A2 open; HTTP/JWT independent-account, media/CDN and retention gates outstanding.


### 20. A2 media-status migration applied and live-function regression (2026-10-09)
PO-approved SQL applied to hosted PAZO, named `f14_media_status_presence_guard`, server version `20261009010551`. Current function checks `posts.photo_url` and `community_posts.photo_url/photo_storage_path`, avoiding false media tasks for text-only post withdrawals; pet-profile tasks remain conservative. All five relevant cases verified *against installed function* under reversible SQL role simulations. Authenticated execute grant remains, anon remains excluded, 1 moderator/0 report/0 restrictions, and no data persisted from tests. Canonical migration file replaces prior draft. Vercel production untouched; media purge inactive; A2 remains open for real normal-user JWT, safe media/CDN deletion and D3-B.


### 21. F14 A2 Storage security V2 draft (2026-10-08)
Prepared fail-closed, NO-DELETE JS media candidate inspector and synthetic test suite, separate real signed-JWT read-only HTTP validation harness and threat-model README. Live Storage audit: five buckets (four public/one private); existing Feed media has BOTH 3 new owner/pet/UUID and 4 historical pet/safe-file matched paths; 6 other Feed photo URLs do not resolve to post-photos objects; 3 Storage post-photo objects unreferenced. Four pet profiles carry photographic posts; profile media requires conservative treatment. Supabase f14-moderation-purge remains parked 503. Old purge proposal superseded: must not deploy. Data provenance, exclusive references, race/CAS, immutable object identity, idempotent retries, CDN verification and genuine separate-user JWT checks remain gates. A2 still OPEN; no migrations, Storage deletions or prod deployments authorized.


### 22. F14 A2 preflight/lease security proposal (NOT APPLIED)
PO authorized preparing and reversibly testing claim gate. Draft `supabase/drafts/20261009_f14_media_claim_preflight.sql` creates private object-version-bound 5-minute claims with audit events, service-role-only prepare/recheck RPC and transaction-scoped row locks; no DELETE, `purged`, completion function or Edge activation. Verified with rollback for current/legacy Feed and Community paths, idempotence, version and source drift, expired claims, anonymous/normal role denial, shared paths, wrong project and Storage delete markers. These are SQL role simulations, not authentic independent JWT or Storage byte operations. It is only `candidate_only`; locks cannot span Storage HTTP requests. Another explicit PO authorization required BEFORE applying migration. F14 A2 open, media/CDN and D3-B still unverified.


### 23. F14 A2 preflight claims installed (2026-10-09 UTC)
PO approved hosted migration; Supabase version `20261009014616` installed. Private leases/events plus service_role-only prepare/recheck RPC, no Storage DELETE or confirmation. Tested after migration via reversible SQL: Feed current/legacy, Community, idempotent recheck, source+version drift, expiry, anonymous/authenticated role rejection, shared file, cross-project URL and delete marker. All checks PASS. 0 claims/reports/restrictions and 19 Storage objects remain. Genuine two-account signed JWT and cross-service CAS confirmation pending; Edge remains 503, A2 open, no A3/A4.


### 24. Preview live-session JWT testing UI staged (2026-10-09 UTC)
Scoped moderation diagnostic panel in `pazo-app-t83r` Preview only, with no token copying and no writes. The actual signed-in user can test moderator or normal-account RPC access, including guaranteed denial of service-only claim APIs. UI test is NOT PASS until PO uses two independent sessions and shares redacted results/screenshot. Does not enable Storage deletion, D3-B unresolved, A2 remains open.


### 25. Signed-browser screenshot smoke vs strict HTTP authorization evidence (2026-10-08 local)

PO supplied real browser screenshots: normal and moderator accounts each showed six PASS items; moderator screenshot includes its two management entry buttons. **QA audit found that original verifier treated any RPC error as denied**, allowing false positives from outages/missing RPC. Applied a code-only fix requiring `42501` SQLSTATE for all expected denies and labeling verified account type. Original visual test is recorded but strict signed-browser security gate **awaits PO's two retests after Preview CI**. No DB or Edge changes, and A2 remains open.


### 26. Signed-in normal and moderator browser permissions verified (2026-10-08 local)
PO sent new screenshots from fixed strict diagnostic `38a2bcc`: one labeled `Normal`, one `Moderadora`. Both show 6/6 PASS for Auth session, role, role-appropriate report/media queues and service-only prepare/recheck denied specifically by SQLSTATE `42501`. **Browser authenticated authorization validation PASS**. This removes the previous false-positive-risk blocker from this screen-based gate, while independent raw HTTP/JWT-script and wider audit remain separate checks. Read-only DB: zero claims/events/reports/restrictions, one moderator; 20 Storage objects currently (one more than former audit, ownership unspecified; don't mutate). Edge purge remains disabled 503. Remaining Block 02 risks: cross-service concurrency, exact-object confirmation, Storage/CDN and retention D3-B. No permission to activate deletion or production release.


### 27. Authenticated Storage hold guards installed (2026-10-09 UTC)
With PO blanket technical authorization, applied Supabase migration `20261009040957_f14_storage_held_media_guard.sql` (service remains non-deleting). Two restrictive storage.objects INSERT/DELETE policies block only currently claimed post-photos/community-post-photos paths for authenticated accounts, with definer helper/index; four existing permissive owner policies unchanged. Reversible synthetic test and post-apply tests PASS for held/unheld/different bucket/expiry. Anon lacks helper EXECUTE. 20 objects preserved, 0 claims. **Not a complete cross-service CAS**; storage service role bypass, in-flight requests and TTL remain risks. Edge disabled 503; exact-object deletion confirmation, CDN/cache and D3-B unresolved.


### 28. Live isolated synthetic Storage API QA staged (2026-10-09)
The browser Preview (pazo-app-t83r only) now contains a separately labeled, opt-in Storage lifecycle test for one unique generated 1-pixel file. It authenticates via existing PAZO session, uploads with upsert false, validates `.info()`, deletes only that file via Storage API, confirms origin metadata 404, and retains an account-specific retry path for interrupted cleanup. No real user content or moderation report touched. **Await PO click and screenshot; not marked PASS yet.** Does not test service-role purge, concurrent held claim or CDN invalidation. 503 Edge stays parked, A2 open.


### 29. Transferencia de chat y gate visual pendiente (2026-10-08)
Brain OS v1.4.1 + snapshot corto `docs/PAZO_ACTIVE_HANDOFF.md`; historial archivado. La rama F14 A2 en commit auditado `2e6dd13` contiene `F14StorageProbe` de Preview y build Vercel en ambos proyectos PASS. El PO **todavía NO validó visualmente pulsando** el botón que crea/verifica/limpia la imagen sintética; esa es la siguiente aceptación real. No inventar PASS ni confundir una imagen artificial generada por QA con purga de fotos de clientes. SQL hold `20261009040957` aplicada, Edge `f14-moderation-purge` 503, Storage 20 objetos en última lectura (un objeto adicional sin provenance conocida). A2 sigue abierto por cross-service CAS, confirmación de ausencia exacta y CDN/retención D3-B; no F14 A3/A4 ni merge a main.


### 30. A2 Storage sintético PASS y siguiente gate seguro (2026-10-08 local)

**Aceptación visual PO: PASS.** Captura real de `F14StorageProbe` en Preview: autenticación, imagen artificial de 1 píxel creada, objeto localizado con Storage API, eliminación del fixture y ausencia confirmada mediante Storage API. Se trata solo de un fixture generado por esa prueba, NO de contenido de usuarios moderado ni de prueba `service_role`.

**Verificación alojada solo lectura posterior:** 20 objetos Storage, 0 rutas `f14-storage-probe-*`, 0 media claims, 0 eventos, 0 reportes, 0 restricciones. No hubo limpieza manual. Auditoría `storage.objects`: reglas F14 RESTRICTIVE INSERT/DELETE aplicadas; **0 políticas UPDATE permisivas** actualmente, así que `upsert` autenticado no está concedido por RLS. Una futura concesión UPDATE requiere endurecimiento explícito; el helper público `SECURITY DEFINER` también requiere revisión de exposición. Supabase documenta borrado `remove([{path,versionId}])` para versiones no actuales, pero NO se ha confirmado que sea CAS seguro sobre la versión activa; S3 bucket versioning no está disponible como sustituto.

**Trabajo versionado en rama, SIN aplicar backend:** `supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md` (invariantes, carrera DB/Storage, confirmación objeto/version, CDN y límites D3-B), `supabase/drafts/20261009_f14_storage_held_media_update_guard.sql` (política UPDATE restrictiva propuesta), `supabase/tests/database/f14_storage_held_media_update_draft_rollback.test.sql` (DDL de prueba reversible, aún NO ejecutado). No habilitar Edge 503, no ejecutar `f14_confirm_media_cleanup`, no afirmar `purged`.

**Estado:** gate de imagen sintética PASS, F14 A2 Gate 8 **ABIERTO** por garantías entre servicios, revisión de políticas y permisos, medio retirado/CDN, retención D3-B y aceptación de alcance. A3/A4 no autorizados. Se requiere gate específico para cualquier migración alojada o Storage DELETE. No merge/main ni publicación oficial.



### 31. A2 — Pruebas RLS UPDATE, expiración y candidato fail-closed (2026-10-08)

El PO autorizó avanzar con el **gate técnico no destructivo** posterior al Storage synthetic PASS. Ejecutadas mediante Supabase hospedado y sentencias completas con `BEGIN` + `ROLLBACK`:

- `f14_storage_held_media_update_draft_rollback.test.sql`: estructura `RESTRICTIVE UPDATE` con `USING` y `WITH CHECK`, PASS.
- `f14_storage_held_update_behavior_rollback.test.sql`: objetos/claim sintéticos creados y revertidos; con una política UPDATE permisiva **temporal** el objeto libre acepta la modificación y el `held` la rechaza. **Hallazgo:** la reserva vencida a los 5 minutos libera la protección bajo el helper **actual**. PASS como prueba del riesgo actual, **no como seguridad suficiente**.
- `f14_storage_held_update_candidate_rollback.test.sql`: prueba reversible de la versión propuesta del helper, que mantiene una ruta `held` bloqueada aun pasado el TTL y la libera solo tras cambiar explícitamente su estado a `invalidated`. PASS como simulación de política RLS; no certifica bloqueos de peticiones HTTP ya iniciadas.

Se actualizó, **solo en `supabase/drafts/`**, `20261009_f14_storage_held_media_update_guard.sql`: añade política UPDATE y elimina expiración automática del predicado RLS sobre `held`. **No aplicado en Supabase.** La RPC de `recheck` sigue pudiendo invalidar reservas expiradas: debe diseñarse coordinación/sincronización antes de activar cualquier worker real. El proyecto todavía carece de borrado CAS confirmado para la versión actual de Storage y `service_role` bypass RLS.

La suite estática `scripts/f14-moderation-check.mjs` ahora exige los borradores de seguridad, los dos sentidos del control UPDATE y la Edge 503. Verificación post-prueba de producción: **20** objetos Storage, **0** claims/reportes/restricciones, **0** políticas UPDATE F14 permanentes; helper actual conserva el predicado de caducidad (prueba de ROLLBACK correcto). No se modificaron archivos reales.

**Git/CI:** los checks Vercel posteriores a estos commits de rama fallaron por **build-rate-limit**, no proporcionan evidencia de compilación. Intento independiente de acceder a GitHub desde contenedor sin salida de red; no se ejecutó `npm run verify` para el último HEAD. No comprar plan ni inferir PASS.

**Pendientes imprescindibles A2:** evaluar llamadas `MOVE/COPY/UPSERT` vía API con pruebas auténticas bajo autorización, controles de `service_role`, prohibir liberación de claim mientras haya un delete in-flight, protocolo de confirmación objeto/version por backend, CDN/retención D3-B y tests finales de UI. Ningún DELETE de medios reales, Edge activation, nueva migración alojada o merge `main` fue autorizado por este gate.



### 32. A2 — recheck fail-closed auditado, borrador completado, sin apply

Se inspeccionó `public.f14_recheck_media_claim(uuid)` realmente desplegada: actualmente cambia `status='invalidated'` en el recheck si el claim está vencido o la fuente difiere, liberando la protección. El borrador `supabase/drafts/20261009_f14_storage_held_media_update_guard.sql` ahora contiene **tres cambios propuestos no aplicados**: (1) no caducar automáticamente la protección RLS de un `held`; (2) añadir `AS RESTRICTIVE FOR UPDATE` con `USING` y `WITH CHECK`; (3) modificar `f14_recheck_media_claim` para devolver `false` en expiry/drift **sin invalidar automáticamente**. Requiere reconciliación manual auditable para liberar reservas abandonadas.

`f14_storage_held_update_candidate_rollback.test.sql` pasó sobre Supabase hospedado en transacción `BEGIN/ROLLBACK` probando objeto libre, retenido, vencido, recheck con rol `service_role` sin liberación, drift sin liberación y desbloqueo explícito. También demostró, **como límite esperado**, que `service_role` SÍ puede actualizar objetos `held` pese a RLS; esto no está solucionado por el borrador. No son pruebas de Storage HTTP, MOVE/COPY, ni CAS real. Ni versión activa de `remove` ni CDN fueron certificados.

Recuento post-ROLLBACK: 20 objetos, 0 claims/eventos/reportes/restricciones, 0 política UPDATE instalada y función `recheck` productiva original sin cambios. Vercel CI del HEAD reciente bloqueado por **build-rate-limit**; `npm run verify` para último HEAD no observado. **Gate actual:** proponer autorización de migración alojada estrecha solo para guardas fail-closed, sin permitir DELETE, sin habilitar Edge y sin cerrar F14 A2; después auditar coordinación de escritores privilegiados/operaciones en vuelo y mantener purga en revisión manual mientras no haya prueba de exclusión trans-servicio.


### 33. A2 — migración de retención de `held` aplicada y verificada

El Product Owner dio aprobación expresa para aplicar la migración estrictamente no destructiva de RLS/recheck y para seguir con los pasos técnicos de F14 A2 sin aprobaciones visuales innecesarias. **Supabase PAZO aplicó** `f14_held_media_fail_closed_recheck_update_guard` en versión **`20261009054411`**. Archivo canónico `supabase/migrations/20261009054411_f14_held_media_fail_closed_recheck_update_guard.sql`. Se retiró el antiguo borrador.

Cambios: RLS retiene bloqueo sobre ruta `held` aunque venza el TTL; política `RESTRICTIVE UPDATE` adicional con `USING` + `WITH CHECK`; `f14_recheck_media_claim` (solo `service_role`) devuelve `false` ante expiración o cambio sin invalidar automáticamente el hold. `anon` no puede ejecutar helper/recheck, `authenticated` solo helper, `service_role` solo recheck. Dos políticas `INSERT/DELETE` previas preservadas.

**Pruebas backend alojado después del apply:** `f14_storage_held_update_installed_rollback.test.sql` PASS (auth simulada, expiración/drift, servicio sin auto-liberación, liberación explícita solo transaccional, service-role bypass demostrado); `f14_storage_held_insert_guard_installed_rollback.test.sql` PASS (INSERT held `42501`, libre permitido); smoke lectura post-photos como SQL `anon` y `authenticated` PASS. Un intento de probar SQL DELETE sobre `storage.objects` fue impedido por el trigger `storage.protect_delete` como corresponde; NO se eludió ni cuenta como prueba de DELETE vía Storage HTTP. Storage conserva 20 objetos, 0 claims/eventos/reportes/restricciones. Supabase Edge `f14-moderation-purge` inspeccionada directamente: versión 1, solo HTTP 503, sin operación DELETE. Security Advisor: mismo conjunto de hallazgos que antes del apply.

**Advertencia operativa:** una reserva `held` puede permanecer bloqueada indefinidamente hasta reconciliación autorizada; la ruta de recuperación aún no existe, documentada en `supabase/drafts/f14_media_purge_v2/HELD_CLAIM_RECOVERY_AND_COPY_AUDIT.md`. La autorización no habilitó limpiador de archivos ni cierre de A2.

**Riesgo COPY identificado mediante prueba de permisos SQL con ROLLBACK:** `f14_storage_copy_prerequisites_rollback.test.sql` PASS demuestra que el SELECT de origen held público y un INSERT de destino libre autorizado coexisten; esto **NO confirma COPY HTTP**, pero impide afirmar que todas las copias de medios retenidos son imposibles. MOVE requiere UPDATE; los usuarios normales carecen actualmente de UPDATE permisivo. `service_role` sigue eludiendo RLS, sin CAS cross-service. CDNs/retención D3-B pendientes.

**Próximo gate técnico A2:** auditoría/prueba API de operación de copia/movimiento/sobrescritura con archivos sintéticos, coordinación de escritores privilegiados, recuperación segura de claims, confirmación de objeto+versión y CDN. No fotos reales, no Edge activa, no gastos, no Vercel Production, no main ni F14 A3/A4. Los últimos checks CI Vercel están sujetos a build-rate-limit; `npm run verify` final no confirmado.


### 34. A2 — COPY interno bloqueado para ruta held; confirmación vieja deshabilitada (2026-10-09 UTC)

PO autorizó los cambios técnicos necesarios dentro de F14 A2. Tras inspeccionar las operaciones de Storage documentadas por Supabase (`object.copy`, `s3.object.copy`, `s3.upload.part_copy`) se versionaron y aplicaron dos migraciones defensivas:

1. **`20261009055801_f14_held_media_copy_source_operation_guard`**: nueva política `RESTRICTIVE FOR SELECT TO authenticated` en `storage.objects`, activada exclusivamente durante operaciones COPY conocidas. Excluye del origen objetos en `claim.status='held'`; no altera la lectura ordinaria/Feed ni los permisos de rutas no reservadas. Suite `f14_held_copy_source_select_rollback.test.sql` PASS en transacción; `f14_held_copy_source_installed_rollback.test.sql` PASS contra política instalada. Comprobaron SELECT cerrado ante `object.copy`, `s3.object.copy` y `s3.upload.part_copy`, preservación de `object.list`, `object.get_public`, `object.get_authenticated`, `object.sign`, permisos de `anon` y orígenes no reservados. **No es prueba HTTP auténtica ni prohíbe copiar una URL pública fuera de Supabase.**
2. **`20261009055955_f14_disable_unverified_media_purge_confirmation`**: función obsoleta `public.f14_confirm_media_cleanup` ahora solo genera `42501`, con `REVOKE EXECUTE` para `PUBLIC`, `anon`, `authenticated` y `service_role`. Así se impide marcar `media_status='purged'` sin verificación de objeto. Prueba rollback y `f14_legacy_media_confirmation_installed_rollback.test.sql` PASS después del apply.

Los dos archivos canónicos existen en `supabase/migrations/` con sus versiones remotas exactas; borradores de `supabase/drafts/` retirados. `scripts/f14-moderation-check.mjs` exige su presencia, operaciones restringidas y que la función antigua no actualice `purged`.

**Estado alojado:** 20 Storage objects, 0 claims, 0 reportes, 0 restricciones; políticas originales INSERT/DELETE, UPDATE y COPY presentes. Edge `f14-moderation-purge` sigue v1 stub HTTP 503, sin bytes eliminados. No hay nueva rutina de purga habilitada.

**Bloqueadores restantes A2:** `service_role` omite RLS, falta exclusión serializable entre servicios/operaciones HTTP y borrado condicional de versión activa, recuperación auditada de `held`, comprobación de origen/versión/CDN con fixture aislado y D3-B. Si no existe prueba de exclusión, mantener salida manual y NO declarar `purged`. No merge/main, A3/A4 ni despliegue oficial. CI Vercel sigue limitado por cuota y `npm run verify` final no observado.


### 35. A2 — UI de revisión manual y resguardo del estado final (2026-10-09)

Cambio frontend en rama: `ModerationMediaQueue` ya no ofrece una acción que invocaba la Edge 503. Ahora muestra la cola pendiente y explica que no hay eliminación de Storage confirmada. `reportingService` retiró `purgeModerationMedia`. Se reforzó `scripts/f14-moderation-check.mjs` para impedir que vuelva una llamada de eliminación no verificada.

Supabase versión `20261009061213_f14_reject_unverified_purged_status` aplicada: el trigger `f14_no_unverified_media_purge` impide cambiar el estado a `purged` sin protocolo de prueba. Las dos pruebas SQL reversibles del nuevo control pasaron; todos los datos sintéticos se revirtieron. El backend tenía 20 objetos Storage, 0 reservas y 0 restricciones. El trigger conserva las transiciones normales hacia `pending_review`.

Validación parcial del componente React mediante TypeScript: cero diagnósticos de sintaxis al transpilar JSX aisladamente, **no** equivale a build completo o prueba visual. La cuota de builds Vercel aún puede bloquear el Preview. Siguiente: verificación integrada `npm run verify` y validación visual del nuevo estado de revisión de medios. La prueba visual del archivo sintético de 1 píxel ya fue aprobada y no se repetirá.

Riesgos que impiden habilitar eliminación automática: coordinación con escrituras privilegiadas, ausencia de borrado condicionado por versión activa demostrable, carreras HTTP, caché/CDN y retención D3-B. La salida segura es revisión manual y nunca confirmar `purged` prematuramente. F14 A2 sigue abierto, A3/A4 y `main` sin alteraciones.


### 36. F14 A2 — evidencia visual PO y alcance reconciliado

Captura del Product Owner de `Revisión de archivos` sobre Preview Vercel READY `a650dd8`: **PASS visual** para contenido, estado vacío y ausencia de operación destructiva. No se ha demostrado funcionamiento del refresco ni de un caso no vacío. GitHub Actions CI del mismo SHA SUCCESS. No pedir nuevamente esta aceptación ni repetir QA Auth/Storage sintético previamente aprobadas.

Matriz actual de cierre: `docs/PAZO_F14_A2_SCOPE_CLOSURE.md`. Sigue pendiente el requisito D3-A de eliminar medios retirados del origen activo y Storage de manera verificable; el modo revisión manual no sustituye D3-A sin decisión PO explícita. CDN/cachés, exclusión entre operaciones privilegiadas y borrado condicional por versión activa no han sido certificados. Edge HTTP 503; estado `purged` protegido por SQL. PR #35 DRAFT, `main` sin merge, A3/A4 no iniciadas.
