# PAZO — F14 A3 write fence / FK review checkpoint (2026-10-09)

**ALCANCE: migración exclusivamente DRAFT, no aplicada, sin cambios en Supabase.** PR #38 sobre el MVP y PR #37, autorizado solo para programación. Este borrador **NO** completa congelación ni elimina nada.

## Contratos y evidencia read-only
- Catálogo PostgreSQL: `communities.owner_user_id → auth.users ON DELETE CASCADE`; `community_posts.author_user_id → auth.users ON DELETE CASCADE`; `community_posts.author_pet_id → pets ON DELETE CASCADE`; `post_comments.post_id → posts ON DELETE CASCADE`, y `community_post_comments.post_id → community_posts ON DELETE CASCADE`. Los cambios de FK y el archivo privado deberán diseñarse como **una transición probada**, jamás cambiar CASCADE a RESTRICT/SET NULL indiscriminadamente.
- Eliminar al dueño de la comunidad mientras un tercero tiene un post provoca pérdida colateral por cascada. La conservación propuesta en `deletion_preserved_posts/comments` sigue en borrador.
- Se detectaron triggers y políticas de F14 ya existentes; el guard no debe desactivar esos mecanismos ni producir recursión sobre ellos. Se revisaron tablas de `posts,pets,communities,community_posts,post_comments,community_post_comments,follows,community_memberships,care_items,care_completions,pet_documents`.
- `public.communities` RLS ya exige `status='active'` para visitantes autenticados salvo propietario; al archivar / convertir `owner_user_id` en nullable la política restrictiva F14 `f14_can_interact(owner_user_id)` y triggers de normalización/ownership podrían cambiar la visibilidad. **Necesita pruebas SQL en base aislada antes de modificar FKs o checks.**

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
## Extensión del borrador tras PostgreSQL TEMP QA (2026-10-09)

- Se probaron las funciones originales adaptadas **solo a tablas temporales**, dentro de transacciones ROLLBACK: una cuenta congelada rechazó modificar su post, rechazar un comentario escrito por un tercero sobre ese post y reparentar contenido hacia ella; otra cuenta conservó escritura normal. Es **PASS del comportamiento sintético de triggers**, no prueba de carrera entre dos conexiones ni cobertura de Storage/Edge.
- Inventario real de Supabase verificado por SELECT READ ONLY: `interactions` contiene 143 señales `target_type='post'`, `community_post_likes` 2 filas y `pet_place_checkins` 6. Se comprobó el nombre real de las columnas en las tres tablas.
- Se añadieron ramas de `f14_a3_row_owners` y triggers para esas tres tablas: comprobación de dueño actor/autor afectado de `posts`, `community_posts` y mascotas; la operación aborta ante destino inexistente o un tipo de interacción desconocido. Total **14 tablas cubiertas como SQL DRAFT**.
- Esta cobertura adicional todavía NO valida todos los caminos de backend ni todas las operaciones privilegiadas. En particular, `target_type` futuros fuera de `post` se rechazan deliberadamente hasta nuevo contrato; puede requerir reconciliación antes de aplicar.
- **Sin apply remoto, sin merge/deploy, flag A3 OFF.**

## Auditoría de ampliación 26 a 28 (2026-10-09, PR #38 DRAFT)

- El catálogo information_schema.columns y las FK de Supabase PAZO fueron consultados en modo solo lectura: las 26 tablas y los campos del resolver anterior existen. Interactions: 143 filas, todas target_type='post'; no se infiere soporte futuro para nuevos targets.
- Cuatro tablas públicas no estaban en el mapeo: profiles, place_suggestions, account_blocks, pet_place_presence. Dos relaciones simples añadidas al borrador: profiles.id -> auth.users.id y place_suggestions.submitter_user_id -> auth.users.id, ambas FK ON DELETE CASCADE. El resolver falla cerrado ante propietario NULL y cada trigger cubre OLD/NEW más los advisory locks. Total propuesto: 28 tablas. Cero triggers A3 aplicados.
- account_blocks tiene blocker_user_id/blocked_user_id y el trigger private.f14_block_after elimina follows al bloquear. Un fence por ambos lados podría impedir a terceros protegerse bloqueando una cuenta en revisión; un fence solo por actor requiere revisar backlinks y efectos colaterales. No se añade automáticamente; falta prueba block/unblock/tercero.
- pet_place_presence es tabla derivada mediante place_private.sync_place_presence() tras cambios en pet_place_checkins. visible_pet_id puede ser NULL y el FK checkin_id tiene CASCADE. Resolver propietario desde el padre durante una cascada podría impedir checkout normal. Requiere auditoría de todos los escritores privilegiados y prueba aislada de cascadas antes de añadir un fence directo.
- RLS, grants, FK y funciones de las cuatro tablas se inspeccionaron. La falta de permisos INSERT para authenticated no demuestra que no existan funciones privilegiadas; verificar RPC/Edge e indirectos.
- Tests de contrato añadidos para paridad, cardinalidad 28 y nuevas rutas. Esto prueba texto/CI, NO ejecución PostgreSQL de los 28 triggers. Pendientes: pruebas SQL temporales de nuevas rutas, dos sesiones, DDL/RLS en DB aislada y Storage/Auth/terceros. Gate 8 continúa ABIERTO, transición full_write_fence_ready() sigue en false.

### PostgreSQL sintético reversible: nuevas ramas profiles y place_suggestions

- Ejecutada prueba alojada con BEGIN, tablas y funciones pg_temp, y ROLLBACK. Se aisló el resolver de las dos nuevas rutas copiando sus ramas exactas del borrador, y se ejecutó la función guard de la rama reescrita exclusivamente para pg_temp.deletion_jobs. Ninguna tabla real consultada por las dos ramas ni alterada.
- PASS: INSERT/UPDATE/DELETE bloqueados para la cuenta en reviewing (ambas tablas), INSERT con propietario nulo rechazado, y UPDATE permitidos para la cuenta no congelada. Resultado SQL devuelto: PASS synthetic pg_temp fence on profiles and place_suggestions; rolled back.
- Limitación expresa: no es instalación de los triggers originales ni verificación de otras 26 ramas, roles/RLS, transiciones reales ni carreras de dos sesiones.
- CI del primer commit 2fba36d3 falló únicamente por conservar la aserción documental literal /NOT COVERED: Storage API/ tras reordenar los comentarios. Se restauró esa etiqueta sin cambiar el SQL ejecutable; se verifica en CI del siguiente commit.


## A3.4 — Protección para bloqueos y presencia derivada (2026-10-09, DRAFT)

**Catálogo read-only verificado:** `account_blocks` (RLS INSERT/DELETE por `blocker_user_id = auth.uid()`, sin UPDATE directo de usuario) y `pet_place_presence` (lectura de presencia, sin DML directo de usuario); servicio puede escribir con privilegios. FK a Auth para `account_blocks`; presence depende de `pet_place_checkins` (checkin_id ON DELETE CASCADE, visible_pet_id nullable). Funciones reales inspeccionadas: `private.f14_block_before`, `private.f14_block_after`, `private.f14_guard_social_insert`, `place_private.prepare_checkin_insert` y `place_private.sync_place_presence`.

**Cambio de contrato (NO aplicado):** 29 triggers completos INSERT/UPDATE/DELETE para 29 tablas incluyendo `account_blocks`, y un trigger INSERT/UPDATE adicional para `pet_place_presence` = **30 tablas mapeadas**, no un freeze total. El `account_blocks` resolver toma locks A3 de blocker y blocked ordenados; el guard bloquea al *blocker* congelado, pero deja que un tercero bloquee o desbloquee a una cuenta congelada. En `follows DELETE` la única excepción aceptada es la pareja de un `account_blocks` existente cuyo blocker es `auth.uid()` y coincide con los owners de ambos pets. No es una excepción controlada por parámetro de sesión arbitrario, no permite nuevos follows ni alterar una cuenta si el blocker mismo está congelado. La motivación es preservar un bloqueo de seguridad y su borrado recíproco de follows.

**Presencia:** la fuente del INSERT/UPDATE es el checkin y su pet (usuario/pet deben tener dueño consistente, y visible_pet_id debe ser NULL o el pet del checkin). El guard previene insert/upsert y reparenting de presencia durante freeze de su cuenta. El DELETE de presencia **no tiene trigger A3**: la eliminación ocurre por checkout/terminación y por cascada del checkin, cuando el padre ya puede no existir; bloquear la limpieza prolongaría presencia visible. El servicio puede borrar registros derivados: se requiere especificarlo en política de retención y verificar rutas privilegiadas antes de poder declarar protección integral.

**PostgreSQL TEMP + ROLLBACK ejecutado en PAZO alojado, solo fixtures sintéticos:** bloquear desde B a cuenta A congelada y limpiar ambos sentidos de follows PASS; intentar bloqueo saliente de A congelada y nuevo follow B→A bloqueado PASS; presencia NULL de A congelada rechazada PASS; upsert/UPDATE de B activo permitido PASS; reparent a A y pet de otro dueño rechazados PASS; checkout B con limpieza de presencia PASS. Se ejecutó código PL/pgSQL del guard adaptado a `pg_temp`, no el DDL de nueve drafts ni RLS real/2 sesiones.

**Gate no cerrado:** autorización remota NO concedida; faltan race tests A3/seed0 combinados contra bloqueos, consistencia de locks bajo RPC/Edge/Storage, grants/RLS reales en sandbox aislado, backups/retención y políticas públicas. `full_write_fence_ready()` continúa **SELECT false**. No merge/deploy ni activación.

### Writer indirecto de Feed: orden de locks (propuesta sin aplicar)

Se detectó que `register_interaction_signal` bloquea `pet_private_metrics FOR UPDATE` antes del INSERT de `interactions`, mientras el AFTER de `post_comments` adquiere A3 primero y después `pet_private_metrics`. Se documentó la inversión en `docs/PAZO_F14_A3_LOCK_GRAPH_GATE_20261009.md` y se preparó un décimo SQL DRAFT `supabase/drafts/20261009_f14_a3_interaction_lock_order_NOT_APPLIED.sql`, con abort por defecto, locks ordenados sobre actor/target y revalidación antes de escritura. No es un fix desplegado ni prueba de concurrencia de dos sesiones. Gate 8 abierto.
