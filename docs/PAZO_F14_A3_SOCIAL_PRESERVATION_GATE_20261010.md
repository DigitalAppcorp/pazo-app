# PAZO F14 A3 — Gate social / integridad de terceros
**Fecha:** 2026-10-10 · **Estado:** PREPARADO EN CÓDIGO, **NO APLICADO** al Supabase alojado.  
**Rama:** `f14/beta-reporting-integration-20261009` (PR #37 DRAFT).

## Regla innegociable
Nunca borrar por CASCADE una publicación o comunidad propia si conserva comentarios de otras personas. Las contribuciones ajenas deben sobrevivir con el mismo ID y autor; la información personal del usuario que se retira debe limpiarse conforme al contrato de la plataforma. No presentar una solicitud de baja como eliminación efectiva.

## Qué reveló la auditoría de PostgreSQL alojado (solo SELECT)
- `post_comments.post_id → posts.id`: ON DELETE CASCADE.
- `community_post_comments.post_id → community_posts.id`: ON DELETE CASCADE.
- `community_posts.author_pet_id → pets.id`: ON DELETE CASCADE.
- `community_posts.author_user_id → auth.users.id`: ON DELETE CASCADE.
- `communities.owner_user_id → auth.users.id`: ON DELETE SET NULL.
- `care_items.pet_id` y `care_completions.pet_id` mantienen restricciones sin cascada; `pet_documents.pet_id` es RESTRICT. Un `auth.admin.deleteUser` temprano es inseguro.
- Inventario del entorno de pruebas al consultar: `posts=0`, `post_comments=0`, `community_posts=0`, `community_post_comments=0`, `care_items=0`, `pet_documents=0`. **NO se infiere de estos ceros que el módulo funcione con aportaciones ajenas.**

## Implementado EN BORRADOR en el PR
- `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql`: ahora tiene `RAISE EXCEPTION` antes de cualquier `ALTER TABLE` o cambio en datos. Anteriormente la falta de esta barrera era un riesgo de aplicación accidental.
- `supabase/drafts/20261010_f14_a3_social_dependency_review_NOT_APPLIED.sql`: preflight agregado del dueño, comentarios de terceros bajo sus posts, respuestas ajenas en publicaciones comunitarias del solicitante, publicaciones de otros usuarios en comunidades que creó, comentarios propios en contenido ajeno, documentos, cuidados y objetos Storage/claims de moderación. Solo acceso `service_role`; no devuelve texto, URL ni IDs. `social_cleanup_verified=false`; guard incondicional.
- `socialDependencyReview.ts`: evalúa evidencias *proporcionadas por un servidor confiable*. Si hay respuestas de terceros sin conservar, comunidades sin archivar, objeto Storage aún presente, moderation hold sin resolver, comentario legacy sin reconciliar o writers activos, falla cerrado. Siempre `destructiveExecutionAllowed=false`.
- `socialDependencyAdapter.ts`: exige sesión Auth de revisor autenticada, membresía en registro privado y solicitud real antes de llamar a la RPC de inventario. Sin permisos en frontend.
- `supabase/drafts/20261010_f14_a3_write_fence_NOT_APPLIED.sql`: nuevo registro privado `deletion_third_party_evidence` con **IDs técnicos y autor** (sin mensaje) de feed replies, comentarios de comunidad y publicaciones ajenas bajo una comunidad administrada por el solicitante, capturados dentro de la misma transacción de congelación. RPC propuesta `f14_a3_verify_other_users_survived` comprueba uno por uno que cada ID y autor siguen presentes con la misma lease/revisión y proceso vigente. Guard incondicional original permanece.
- `thirdPartySurvival.ts`: verificaciones fail-closed para sesión del operador, lease, autorización SQL y `missing_contributions=0`. No se debe inferir supervivencia por igualdad de contadores globales.
- Tests `socialDependencyReview.test.mjs`, `socialDependencyAdapter.test.mjs`, `thirdPartySurvival.test.mjs`, `scripts/f14-a3-social-safety-contract.test.mjs`, extensión de `scripts/f14-a3-write-fence-contract.test.mjs` ejecutadas con `npm run test:mvp`. Son tests Node con mocks y contratos, **no pruebas de PostgreSQL concurrente ni Storage real**.

## Reutilización confirmada
En Supabase ya existe la RPC `public.pazo_archive_owned_communities_for_deletion(uuid)`. Exige rol servidor y solicitud `processing`; archiva comunidad dejando `owner_user_id=NULL`, niega transferencias pendientes y se niega a archivar si una publicación del dueño tiene comentarios de otros. **No volver a programarla desde cero**, pero hay que integrar la redacción de threads antes de llamarla, con transacciones/leases protegidas. No asumir que conserva automáticamente replies porque la RPC explícitamente falla frente a ese caso.

## Aún bloqueante para A3 funcional
1. Consolidar estas propuestas SQL en migración real **revisada**, comprobar nombres de FK, RLS y carrera de escritores en PostgreSQL aislado, y ensayar restauración.
2. Implementar la transformación de posts con `Autor eliminado` y FKs `ON DELETE SET NULL` sin perder replies. Verificar que el Feed muestra esos hilos, que no permite comentarios nuevos y que comunidades quedan archivadas antes de retirar el usuario.
3. Completar limpieza de cuidados, documentos y QR, rescate, relaciones, notificaciones y archivos bajo la lease; no tocar aportaciones ajenas.
4. Worker real persistente de etapas, sesiones/Auth al final, retención legal, y pruebas E2E con **nuevas cuentas descartables** autorizadas (las seis cuentas actuales están protegidas).
5. El endpoint `f14-account-deletion/index.ts` debe continuar OFF (HTTP 503) hasta que el flujo entero quede demostrado. Ni PR merged ni Vercel ni datos del usuario modificados.

**Gate vigente:** no solicitar nuevamente permiso para escribir borradores; el PO ya dio autorización amplia para implementar. Solo pedir intervención cuando resulte indispensable una decisión de política o aprobación de instalación y pruebas destructivas concretas. Mantener evidencia en `docs/PAZO_ACTIVE_HANDOFF.md`.

## 12. Limpieza propia por etapas — avance 2026-10-10

**Código en PR #37 (NO instalado):**
- `supabase/functions/f14-account-deletion/privateCleanupPlan.ts` ordena nueve operaciones: anonimizar hilos con comentarios ajenos; retirar respuestas/reacciones propias; borrar solo posts sin terceros; archivar comunidades existentes; documentos y cuidados; dependencias de mascotas; mascotas; perfiles; reconciliación final. Verifica evidencias frescas por fase y checkpoints contiguos, pero siempre devuelve `destructiveExecutionAllowed=false`.
- `supabase/drafts/20261010_f14_a3_owned_activity_cleanup_NOT_APPLIED.sql` incluye **guard incondicional** y una RPC supervisada exclusivamente de las intervenciones propias (`post_comments`, `community_post_comments`, `community_post_likes`, `interactions`). Bloquea si faltan titular, lease, fase `clean_private_data`, snapshot de terceros, objeto de Storage o recibo privado de retirada, moderación retenida o comentarios legacy. Solo elimina filas de mascotas del sujeto y recalcula contadores Feed/Comunidad mediante `DELETE ... RETURNING` y agregados. **No borra posts padres, mascotas, comunidades, Auth o archivos**. Fija la GUC de cleanup como valor **local a la transacción**, verificado por el write-fence.
- `ownedActivityAdapter.ts` autentica operador y exige contrato booleano de SQL; si falla, rechaza. `privateCleanupPlan.test.mjs`, `ownedActivityAdapter.test.mjs` y `scripts/f14-a3-owned-activity-contract.test.mjs` integrados en `npm run test:mvp`. El primer test CI #572 falló por un UUID regex con grupo faltante; corregido en `227f8049` y **CI #574 PASS**. Protección de journal CI **#576 PASS**. Sin pruebas reales de PostgreSQL.
- El draft `20261010_f14_deleted_author_threads_NOT_APPLIED.sql` exige ahora `p_reviewer_user_id`, `p_lease_token`, `p_revision`; verifica solicitud `processing`, operador enrolado y lease `preserve_others/clean_private_data`, y fija la misma GUC local para permitir el tombstone bajo el write-fence sin habilitar a navegadores. `scripts/f14-deleted-author-contract.test.mjs` actualizado, **CI #578 PASS**.
- El plan de limpieza se corrigió para exigir comprobación de anonimización **después** de esa fase, archivado después de archivar comunidades y avistamientos reconciliados antes de tocar sus dependencias, en lugar de exigir un resultado antes de ejecutarlo.

**No simular completado**: aún falta migración consolidada y probada en DB aislada; worker privilegiado conectado, borrar posts sin terceros, archivar usando la RPC alojada, limpiar cuidados/documentos/rescate/mascotas, sesión/Auth, retención legal y pruebas E2E de dos cuentas descartables con comentarios cruzados. El endpoint de baja pública continúa 503, SQL sin aplicar, datos Auth/Storage existentes conservados y PR DRAFT sin merge.
