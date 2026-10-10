# PAZO F14 A3 — Auditoría de locks y rutas indirectas

Fecha 2026-10-09. PR #38 DRAFT. Auditoría de catálogo Supabase READ ONLY y del SQL DRAFT de 30 tablas. Ninguna migración aplicada. No es certificado de ausencia de interbloqueos.

## Grafo confirmado por funciones de producción

- account_blocks INSERT: trigger F14 BEFORE f14_block_before obtiene advisory lock de pareja mediante private.f14_pair_lock; AFTER f14_block_after elimina follows recíprocos. El A3 DRAFT propone adquirir locks de cuenta en BEFORE y sus follows DELETE pueden adquirir locks adicionales.
- follows INSERT: private.f14_guard_social_insert toma pair lock y consulta account_blocks. El trigger A3 propuesto interviene antes por su nombre, no está instalado todavía.
- pet_place_checkins INSERT: place_private.prepare_checkin_insert bloquea mascota FOR UPDATE y finaliza checkins anteriores; después place_private.sync_place_presence inserta/actualiza presencia. El A3 DRAFT introduce lock de cuenta en la fase BEFORE.
- pet_place_checkins UPDATE/DELETE: el sync de presencia puede borrar filas derivadas. pet_place_presence DELETE se excluye del guard A3 para preservar limpieza y cascadas.
- A3 begin_review: lock advisory por cuenta, luego job row FOR UPDATE; full_write_fence_ready() sigue retornando false.

## Riesgos específicos que bloquean activación

1. Se utilizan dos espacios distintos de advisory locks: F14 pareja hashtextextended(LEAST||':'||GREATEST,0) y A3 cuenta hashtextextended(uuid,901426). No existe garantía de orden global con locks de fila y trigger cascades.
2. Las excepciones para bloquear/desbloquear a una cuenta congelada y limpiar follows recíprocos son necesarias para seguridad, pero faltan pruebas reales de dos conexiones.
3. Los INSERT/UPDATE de presencia dependen de checkins y pet owner; DELETE de presencia es la excepción derivada. Quedan sin inventariar RPC/Edge/Storage y service-role writers.
4. La definición de funciones y el catálogo de triggers provienen de Supabase alojado. Los triggers A3 solo existen en archivos NOT_APPLIED; la ordenación esperada no fue observada en runtime.

## Próximo gate, en DB aislada y autorizada

- Dos conexiones simultáneas: transición A3 versus bloqueo A/B y B/A; follow INSERT/DELETE y unblock. Registrar éxito, rechazo 42501, timeouts y SQLSTATE 40P01, sin ignorar deadlocks.
- Repetir con checkin INSERT/UPDATE/DELETE, expiración, UPSERT presence y cascada del checkin; comprobar limpieza y ausencia de resurrección de presencia.
- Validar grants/RLS y permisos reales de authenticated, anon y service_role para los nueve borradores; probar cadenas completas de triggers y FKs.
- Auditar todos los writers RPC, Edge, Auth y Storage API antes de cambiar readiness a true.
- No crear sandbox pagado, aplicar DDL alojado, habilitar flags, desplegar ni fusionar por esta auditoría. Pedir gate específico cuando sea necesario.

Resultado: CI y fixtures pg_temp previos son evidencia parcial, nunca sustituyen concurrencia real. F14 A3 Gate 8 permanece ABIERTO.

## Interbloqueo concreto auditado: RPC de señales vs comentario

La definición existente de `public.register_interaction_signal` (fuente `supabase/migrations/20261005101300_feed_like_save_integrity.sql`, verificada contra `pg_get_functiondef` alojado) en acciones `impression/view/comment/not_interested` toma `pet_private_metrics FOR UPDATE` **antes** de intentar INSERT a `interactions` y por tanto antes del A3 BEFORE guard propuesto. En cambio, `post_comments INSERT` pasa primero por A3 BEFORE y luego su AFTER llama a `private.adjust_pet_learning_tags`, que toma `pet_private_metrics FOR UPDATE`. Con el mismo actor/target y dos transacciones es posible un ciclo **metrics row → A3 advisory** frente a **A3 advisory → metrics row**; no se afirma que un deadlock ya haya ocurrido en producción.

**Mitigación preparada, no aplicada:** `supabase/drafts/20261009_f14_a3_interaction_lock_order_NOT_APPLIED.sql`. Conserva `SECURITY INVOKER`, firma, permisos y acciones existentes; añade locks A3 de actor y dueño de post en orden UUID antes de cualquier escritura/métricas; relee propietarios tras la espera y aborta con SQLSTATE 40001 si cambian. La propuesta evita esta inversión específica pero **no certifica el grafo global**, otras RPC ni seguridad E2E. Pruebas estáticas en CI; todavía falta carrera de dos conexiones en DB aislada.
