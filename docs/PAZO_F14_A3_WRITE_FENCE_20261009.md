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