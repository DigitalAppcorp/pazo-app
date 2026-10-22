# PAZO — Estado verificado tras limpieza de datos de prueba
**Fecha:** 2026-10-10  
**Estado:** constatación mediante lecturas de Supabase; no certificación de CDN ni de método de borrado.  
**Fuente:** `mrybvqdebbgcayuvgkkr` y PR #37 activo en GitHub.

## Alcance aprobado por el Product Owner

Quitar **todos los registros y medios de prueba del producto** y **conservar las seis cuentas y credenciales de Supabase Auth** para continuar iniciando sesión. Preservar tablas, esquema, migraciones, roles, Edge Functions y RLS. No resembrar contenido desechado por defecto.

## Evidencias leídas del servidor (no inferidas del Git)

| Recurso | Resultado |
|---|---:|
| `auth.users` | 6 |
| `auth.identities` | 6 |
| `auth.sessions` (registros observados; no prueba de acceso) | 9 |
| Tablas de producto/moderación/solicitudes (39 inspeccionadas) | **0 filas cada una** |
| `public.profiles`, `public.pets`, `public.posts`, `public.post_comments` | 0 |
| `public.communities`, `public.community_posts`, `public.interactions` | 0 |
| `public.pet_places`, `moderation_private.moderator_grants` | 0 |
| Archivos de `storage.objects` | **0** |
| Buckets Storage | 5 existentes, todos vacíos |
| `account_requests_private.deletion_requests`, `moderation_private.media_claims` | 0 |

El agente **no ejecutó SQL/Storage DELETE en el handoff**; verificó el estado mediante consultas SELECT. No es posible atribuir con certeza el método/hora ni garantizar la invalidación de cachés CDN. No inventar procedencia. No repetir limpieza.

## Estado de la infraestructura y cambios de código

La base mantiene las migraciones de solicitud de baja `20261010045708_f14_account_request_intake` y continuidad de comunidades `20261010053708_f14_community_ownership_continuity`, y corrección JWT `20261010043307_f14_media_jwt_claim_compat_single_test`. La Edge `f14-moderation-purge` v5 permanece globalmente desactivada. La nueva propuesta de hilos anonimizados `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql` **no está aplicada**.

## Implicaciones para QA de MVP (no reabrir módulos ya aprobados)

1. Una cuenta Auth sin `profiles`/mascotas debe llegar a onboarding o creación de mascota, sin pantalla rota ni datos inventados.
2. Feed, Comunidades, Lugares y Moderación deben mostrar estados vacíos razonables. `pet_places` quedó vacío; ninguna semilla previa debe considerarse vigente.
3. Una función de moderación dependiente de `moderator_grants` necesita una asignación legítima nueva, no autorización implícita.
4. Confirmar que una carga nueva de prueba y un flujo de navegación básico usan el esquema vigente. No repetir suite UX completa si ya pasó antes de reset.
5. Continuar F14 con el gate de base y un pipeline E2E de eliminación de cuenta independiente, sin confundir limpieza prelaunch con ejercicio del pipeline.

Ver `docs/PAZO_ACTIVE_HANDOFF.md` como fuente viva y `docs/archive/PAZO_ACTIVE_HANDOFF_BEFORE_RESET_20261010.md` para historia anterior. No fusionar a `main`, no tocar Vercel ni reactivar purga.
