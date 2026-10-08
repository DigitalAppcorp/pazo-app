# PAZO — Fase 14: confianza, moderación y privacidad

**Ruta maestra de producto y arquitectura — 2026-10-08**
**Categoría:** infraestructura obligatoria para Beta; no requiere fake door.
**Estado:** F14 EN CURSO documental; Gate 5 CERRADO (MVP REDUCIDO); Gate 6 CERRADO (scope); Gate 7 CERRADO (arquitectura); Gate 8 PLANIFICADO, **sin autorización para implementación**.
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
