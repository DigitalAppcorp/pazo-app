# F14 A3 — diseño y preparación para implementación, sin aplicar

**Product Owner autorizó preparar código + migraciones como borradores el 2026-10-09.** Ninguna autorización para ejecutar SQL, alterar RLS/FK, eliminar datos o desplegar.

## Lo implementado en rama DRAFT
1. `src/features/account/`: servicio de solicitudes y lectura, interfaz en `Mi mascota → Menú y utilidades`, resumen de dependencias, solicitud explícita con texto `ELIMINAR`, cancelación solo en estado `requested`. Es un pedido de revisión, **no** un botón que elimina instantáneamente.
2. Feature gate **cerrado por defecto**: `VITE_F14_A3_REQUESTS_ENABLED` debe ser exactamente `true`, pero no debe habilitarse antes de aplicar y verificar el backend mediante otro gate. En el branch del PR #37 sin flag, la UI sigue sin cambios.
3. SQL `supabase/drafts/20261009_f14_a3_request_preflight_NOT_APPLIED.sql`: tabla privada de jobs, eventos auditables, funciones RPC autenticadas para inventario/status/solicitud/cancelación; RLS activa, sin grants directos, sin acceso anon. El archivo incorpora un **RAISE EXCEPTION intencional** antes de `BEGIN`: no se puede aplicar accidentalmente tal como está. Requiere revisión, reconciliar migraciones remotas y autorización expresa de aplicación.
4. Tests con `node --experimental-strip-types --test`: estados coherentes, cancelación y parsing fail-closed. CI compila/frontend pero **no prueba el SQL** porque no se ha instalado.

## No implementado ni fingido como completado
- Ejecutor/worker de borrado, reautenticación fuerte verificada en backend, bloqueo de nuevas escrituras, separación de cuenta/más de una mascota, despublicación de QR/rescate/comunidades al recibir solicitud, archivo privado de aportes ajenos, borrado físico exacto/Storage/CDN, invalidación JWT y Auth al final. **No se debe activar el feature gate mientras cualquiera de esos puntos impida dar expectativas válidas**. Se puede habilitar solo el intake de revisión mediante Gate separado, dejando por escrito limitaciones.
- Sin emails/identidad de usuarios en nuevos logs/telemetría; service_role sigue solo en backend.
- No confundir la futura limpieza masiva de datos de prueba del PO con el derecho individual de usuarios post lanzamiento.

## Próximos incrementos A3 — diseño ya aprobado en Gate 7, sin DDL real
### A3.2: Privacidad de terceros / FK
- Mover `communities.owner_user_id` de CASCADE a `ON DELETE SET NULL` **solo cuando** `status='archived'`; hacer dueño nullable con `CHECK(status<>'active' OR owner_user_id IS NOT NULL)` y RLS `anon/auth` que niegue lecturas de archived. Construir archivo privado con contribuciones de terceros sin crear nuevas vistas públicas.
- Proteger `community_posts.author_user_id` y `author_pet_id` de CASCADE, adaptar constraints de autor borrado y reglas RLS. Archivar contribuciones ajenas en modo privado, nunca transferir administrador ni mantener una comunidad huérfana pública.
- En posts propios con comentarios de otra cuenta crear `tombstone` sin texto/foto/nombre originales para preservar referencias privadas; cambiar FK solo tras pruebas de integridad. Auditar también comentarios/likes de comunidad y notificaciones.
- Reglas F14 D2/D3-B de revisión de archivo 90/180 días se mantienen como **objetivos de diseño, no retención ya implementada**.

### A3.3: Media/Storage dependiente de D3-A
- Inventario verificable por bucket/ruta/versión, referencias compartidas y archivos fuera de Supabase, lease contra race y eliminación exacta únicamente mediante API privilegiada revisada. Estado `media_pending` hasta verificar origin; CDN/cache y backups con avisos honestos.
- El `f14-moderation-purge` Edge 503 no se activa ni reutiliza automáticamente.

### A3.4: Backend de ejecución e identidad
- Worker autorizado por servicio y deduplicado con estado transaccional. Antes de iniciar operación irreversible validar reautenticación reciente con evidencia **del servidor**, no confiar en JWT `iat` (puede refrescarse sin contraseña), flag UI o simple texto `ELIMINAR`.
- Bloquear escrituras concurrentes de cuenta en eliminación con política/RPC server-side; la mera UI de carga no bloquea PostgREST.
- Procesar archivos y contribuciones en fases reintentables. En error, estado `failed` o `blocked`, **nunca decir «eliminado»**. Auth `deleteUser` solo en backend y **al final**, tras resolver FK y verificar trabajo. Sesiones JWT viejas y restores exigen control propio.
- Documento de retención por proveedor antes de publicidad pública. Solicitudes de menor conocida requieren tratamiento prioritario según reglas del proyecto.

## Pruebas de aceptación A3
- Datasets sintéticos con 2+ cuentas, 2+ mascotas, comunidad de una cuenta con post de otra, post con comentarios ajenos, documentos privados, cuidados y fotos.
- Rol anon/auth distinto, suplantación, RLS/grants, doble click/retry/timeout, al menos un error Storage simulado, borrado del propietario sin borrar contribuciones ajenas, referencia pública inaccesible y sesión vieja no autorizada.
- SQL reversible/pgTAP primero; pruebas reales de usuario/Storage solo después de aprobar y aplicar paso a paso, sin activar Vercel ni alterar datos de prueba hoy.

**Siguiente gate después de validar build/CI de esta rama:** diseño seguro de A3.2 y backend de archivo/worker, con test reversible. No aplicar SQL, no activar flag, no merge. Una propuesta adicional de PR de borrado no significa que la función ya elimine cuentas.

### Revisión de consistencia del SQL borrador

La FK de `deletion_jobs.user_id` se diseñó nullable **solamente** si `status='completed'`, manteniendo `ON DELETE RESTRICT`. Así un trabajador final, no implementado, podrá registrar cierre tras validar todas las fases y desvincular el identificador antes de `auth.admin.deleteUser` en su transacción final. Si el proceso Auth falla después de desvincular, el job debe reanudar desde un registro segregado; esto es **otro bloqueo A3.4** y no se presume resuelto. La tabla no admite nulificar `user_id` para evitar su FK mientras una solicitud esté pendiente. Este archivo sigue protegido por excepción hard-fail.

## Incremento A3.2 — snapshot privado con medios bloqueados (borrador)

`supabase/drafts/20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql` prepara tres tablas privadas con RLS: `deletion_post_tombstones`, `deletion_preserved_posts` y `deletion_preserved_comments`. Función `account_private.f14_a3_snapshot_contributions(job_uuid)` concede EXECUTE solo al rol service_role y no expone endpoints públicos. Requiere job en estado `archiving`, **no borra filas** y devuelve explícitamente `ready_to_delete_auth=false` / `ready_to_delete_media=false`.

- Captura posts de autores ajenos dentro de comunidades del titular; comentarios de otras cuentas en publicaciones Feed propias; comentarios ajenos dentro de comunidades propias. Conserva tombstone mínima (ID y fecha, nunca texto/foto/nombre propios).
- Aborta transaccionalmente si la comunidad o cualquier post de ella contiene `image_url`, `photo_url` o rutas Storage: **no mover contenido audiovisual público por SQL**. Se debe agregar un preflight de referencias a medias compartidos y confirmar D3-A con API antes de seguir.
- **No prueba aún escritura congelada**, archivo exacto de likes o mensajes, medios de comentarios legacy ni verificación de concurrencia. El worker futuro tiene que impedir escrituras mientras se toma el snapshot, comparar conteos y decidir archivo de aportes externos con propiedad verificada. Si eso falla, no puede continuar a Auth.
- El script tiene `RAISE EXCEPTION` inicial deliberada, por lo que no debe aplicarse ni habilitarse la función sin remover guard bajo gate aprobado. Sin cambios de cascade FK ni políticas de lectura en hospedado.

### Wrapper de servicio y permisos
La función de archivo permanece en `account_private`; el worker futuro usaría `public.f14_a3_worker_snapshot_contributions(uuid)`, wrapper SEC-DEF cuyo EXECUTE se concede **solo** a `service_role` y cuya implementación comprueba el claim firmado `request.jwt.claim.role='service_role'`. Las ACL revocan `PUBLIC`, `anon` y `authenticated`. No se exponen datos al navegador, ni se añade `account_private` a esquemas REST de Supabase. Estos controles requieren pruebas negativas reales con JWT por separado antes de desplegar.

## Incremento A3.4a — lease de exclusión de worker (solo DRAFT)

Archivo `supabase/drafts/20261009_f14_a3_worker_lease_NOT_APPLIED.sql`:
- tabla `account_private.deletion_worker_leases`, RLS activa y sin grants de tablas a roles de app;
- tres RPC públicas cuyo EXECUTE solo recibe `service_role` (adicionalmente verifican claim JWT de rol firmado);
- adquisición serializada con `FOR UPDATE` en fila job, clave única por trabajo y bloqueo de adquisición concurrente; versión/token de lease, expiración acotada 5–60 s, rechazo si job no está en `reviewing`; validación solo-lectura y liberación compare-and-set, sin borrar nada;
- excepción transaccional al principio del SQL para impedir apply accidental;
- aún NO existe una operación de backend que ponga jobs en `reviewing` ni freeze real de writers. **Ninguna lease autoriza eliminación**: debe sumarse comprobación de sesión y evidencia de los otros gates, además de un worker real protegido por un gate independiente.

**Riesgos sin resolver:** lock SQL no cubre toda la duración de llamadas HTTP a Storage; los permisos privilegiados pueden omitir RLS; tokens de acceso pueden sobrevivir el borrado Auth. El worker real deberá utilizar versionado de objetos, reglas de suspensión de escrituras, bitácora de pasos, reautenticación verificada y reintentos idempotentes, y no sustituir esto por un lease temporal.


## A3.4b — borrador de write fence

## Diseño contenido en el borrador
- Archivo `supabase/drafts/20261009_f14_a3_write_fence_NOT_APPLIED.sql`: aborto transaccional explícito ANTES de crear objetos.
- Función `account_private.f14_a3_row_owners(table,row)` consulta propietarios reales de filas y relaciones asociadas dentro de permisos privados; no acepta IDs autoritativos del cliente.
- Trigger `account_private.f14_a3_guard_social_write` para INSERT/UPDATE/DELETE, comparando propietario antiguo/nuevo y relaciones de terceros. Enlaza a `deletion_jobs` y rechaza estado diferente de `requested` o `cancelled`. Por tanto, una simple solicitud no bloquea el Feed hasta que se revise.
- Locks `pg_advisory_xact_lock(hashtextextended(uuid,901426))` adquiridos en UUID ordenado. Se exige que el futuro RPC del worker **tome el mismo lock antes de activar la fase congelada**; sin esa transición atómica, el gatillo por sí solo no evita carreras.
- Los triggers **también bloquearían SQL privilegiado** que intente modificar filas congeladas hasta que exista una ruta de worker autorizada y demostrada. No colocar un bypass basado en valores arbitrarios de sesión o metadata de usuario.

## Vacíos reales que impiden activar
1. Todos los writes de `interactions`, likes/saves, publicaciones de avistamientos, `pet_place_checkins`, presencia, QR/rescue, `notifications` y sus RPC/Edge, **Storage API** y acciones privilegiadas. Este draft protege 11 tablas importantes, **no todas las rutas**.
2. Worker aún no puede hacer transición atómica segura con el lock; la función de lease anterior solo reserva y no modifica `deletion_jobs.status`. Reautenticación reciente y bloqueo integral de JWT no implementados.
3. FK de comunidades, posts y comentarios con CASCADE siguen peligrosos; no modificar hasta diseñar archive/tombstone consistente para todas las referencias. Retención privada 90/180 días es objetivo, no política técnica instalada.
4. No se ejecutaron triggers ni tests SQL en Supabase (solo revisión de catálogo, pruebas de invariantes de borrador y CI). No se han ejecutado operaciones reales sobre usuarios o Storage.

**Siguiente:** completar matriz de cobertura de escrituras, analizar FK/RLS y pruebas aisladas antes de solicitar cualquier permiso de aplicación. La fase A3 y Gate 8 permanecen ABIERTOS. No habilitar `VITE_F14_A3_REQUESTS_ENABLED`.

## A3.2b — Propuesta de FK para comunidad archivada (solo DRAFT)

# A3 — archived community FK safety proposal (NOT APPLIED)

Based on a read-only inspection of hosted Postgres `public.communities` and its triggers on 2026-10-09:

- `communities.owner_user_id`: currently `NOT NULL` + `ON DELETE CASCADE` to Auth.
- `community_posts.author_user_id` and `author_pet_id`: also `ON DELETE CASCADE`.
- `community_private.ensure_owner_membership()`: constraint trigger rejects owner absent, even when `status='archived'`.
- `communities_status_allowed`: allows only `active` and `archived`; `communities_read_authenticated` condition hides archived records unless owner. F14 restrictive `f14_communities_select` still needs direct RPC/access audit before relying on it for all API reads.

**Proposed draft**, SQL `supabase/drafts/20261009_f14_a3_community_fk_NOT_APPLIED.sql`:
1. Nullable `owner_user_id` **only logically for archived**; constraint `status<>'active' OR owner_user_id IS NOT NULL`.
2. FK `ON DELETE SET NULL` instead of cascade. Direct Auth DELETE of the owner of an *active* community will fail the CHECK, forcing explicit archival before deletion.
3. Existing owner-membership constraint trigger updated to accept `archived + owner=NULL`, still require owner membership for active or archived non-null owner.
4. Community-post author FK `ON DELETE RESTRICT` for both Auth and pet: direct delete fails until private contributions are preserved and content explicitly processed.

**Crucial:** This migration has a hard abort under `BEGIN` and was **NOT applied**. It can change/delete the assumptions of current product operations and has *not* been tested against the entire community UI and RPC API. A3 still lacks a working writer freeze, media handling and storage URL purge. No claim that archive/purge completes via this FK alone.

**Subsequent correctness matrix:** archiving owner while preserving third-party post/comment, author deleting own profile with/without pet, direct Auth DELETE of active vs archived community, references to signed public URLs, restoring backups, RLS anonymous/authenticated, cascade blockers for Feed posts and comments, session expiration and normal deletes not impacted.

PR #38 remains DRAFT; release is not allowed until SQL/E2E tests, a distinct migration authorization and remaining F14 gates.
## Corrección de SQL del archivo (2026-10-09)
Se detectó en auditoría posterior al CI que el wrapper `f14_a3_worker_snapshot_contributions` tenía `AS $` y `$;` (delimitador PL/pgSQL inválido) aunque las pruebas estáticas originales pasaban. Corregido a delimitador `$a3_worker_wrapper$` pareado y añadido test de todos los delimitadores SQL de los cinco borradores. **Esto no equivale a ejecución real en PostgreSQL**; QA SQL sobre DB aislada permanece imprescindible antes del gate remoto.

## A3 — checkpoint de cierre técnico sin activación, 2026-10-09

PO pidió terminar desarrollo. Se reparó un SQL inválido de `f14_a3_worker_snapshot_contributions` y se añadió validador de delimitadores en todos los SQL DRAFT; CI #37956473862 SUCCESS. `src/features/account/mediaManifest.ts` + pruebas negativas verifican rutas de Storage, propiedad, objetos compartidos, concurrencia y evidencia de CDN; devuelve `deletionAuthorized=false` en todos los casos; CI #37956829331 SUCCESS.

**No confundir esto con un trabajador físico de eliminación**. Sigue SIN implementar lo señalado en `docs/PAZO_F14_A3_RELEASE_GATE_20261009.md`: SQL aislado, transición worker, reauth backend, freeze total, archivo/retención E2E, D3-A Storage/CDN, Auth final, políticas y release. La UI A3 permanece OFF; PR #38 DRAFT y branch `main` intacta. No pedir al PO borrar ninguna cuenta con esta versión.
