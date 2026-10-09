# PAZO F14 A2 — Recuperación de reservas y límite COPY (SIN PURGA)

**Estado:** especificación operativa / no desplegada. Continúa prohibida la eliminación automática de medios de usuarios. La Edge `f14-moderation-purge` debe seguir devolviendo HTTP 503. No habilitar `f14_confirm_media_cleanup(kind,id)`.

## Backend real verificado

- Supabase registró `20261009054411_f14_held_media_fail_closed_recheck_update_guard` después de autorización del Product Owner.
- `f14_storage_media_path_unclaimed` mantiene rutas `held` bloqueadas para las políticas `INSERT/DELETE/UPDATE` autenticadas **incluso expirado `expires_at`**.
- `f14_recheck_media_claim` retorna `false` en expiración o discrepancia sin marcar `invalidated`.
- La actualización de la política RLS no impide escrituras con `service_role` ni establece lock transaccional mientras una petición HTTP de Storage está en curso. No permite asumir compare-and-swap (CAS) al llamar `.remove([path])`.
- Las tablas privadas de reservas y eventos son legibles por el ejecutor privilegiado autorizado únicamente según sus grants; ninguna consola cliente debe mostrar IDs, rutas ni eventos de terceros.

## Recuperación de un claim atascado — NO AUTOMÁTICA

Una reserva caducada no se libera por reloj. Antes de diseñar/codificar un endpoint de liberación, demostrar TODOS los puntos:

1. La eliminación está desactivada o detenida y no hay tareas antiguas/en vuelo que aún puedan operar sobre el objeto. Una respuesta de `recheck=false` por sí sola **no confirma** que no exista una tarea HTTP en vuelo.
2. El actor de recuperación tiene autorización servidor explícita. Ningún usuario normal, cliente web o petición que señale `claim_id` puede pedir invalidación directamente.
3. Revalidar la misma combinación `claim_id`, `target_kind/id`, `report_id`, `bucket`, `path`, `storage_object_id/version` y referencias de DB. Si el origen o la versión cambió, conservar `manual_review` sin delete.
4. Diseñar protocolo de adquisición/liberación/heartbeats o estado de worker que impida liberar durante operación en vuelo, con auditoría de quién aprobó y por qué. Nada de temporizador ciego.
5. Una liberación, cuando se autorice en gate posterior, debe ser una operación limitada, idempotente, registrada con evidencia y protegida contra carreras; no hacer UPDATE manual de `moderation_private.media_claims` desde el chat.
6. Una reserva sin resolver puede bloquear reenvíos de medios en esa ruta: la UI futura de moderación debe reflejar revisión pendiente, no afirmar que se eliminó ni que todo está disponible.

**Consulta de inspección futura SOLO lectura, en contexto autorizado:** `SELECT claim_id,target_kind,target_id,bucket,status,expires_at,checked_at FROM moderation_private.media_claims WHERE status='held' ORDER BY created_at;` No ejecutar invalidaciones manuales sin protocolo comprobado.

## MOVE / COPY / UPSERT — evidencia y límite

Referencia oficial: [Copy / Move Objects](https://supabase.com/docs/guides/storage/management/copy-move-objects) y [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control).

- **MOVE:** requiere permisos `SELECT` y `UPDATE`. PAZO no tiene política UPDATE permisiva para cuentas autenticadas; además la nueva política RESTRICTIVE protege rutas `held`. No equivaler a prueba real de todas las variantes HTTP.
- **UPSERT:** necesita `SELECT` y `UPDATE` además del permiso de inserción; ruta held rechazada por protección RLS en pruebas SQL. Tampoco asegura exclusión para un HTTP en vuelo antes del claim.
- **COPY:** necesita `SELECT` del origen y `INSERT` en destino; `UPDATE` permitiría sobrescribir destino. La nueva protección **no** bloquea el SELECT de una foto pública que ya está reservada, ni necesariamente el INSERT en una **ruta diferente no reservada**. El test reversible `f14_storage_copy_prerequisites_rollback.test.sql` verificó que ambas condiciones se cumplen con objeto sintético y rol autenticado simulado: **gap demostrado en permisos SQL, no ejecución efectiva de un COPY HTTP**.
- No confundir `SELECT` de metadata Storage con revocación de una URL pública: los buckets públicos permiten descargar con URL ya conocida. Un usuario podría preservar/capturar una copia externa, problema que ninguna purga garantiza revertir.
- Cualquier protección adicional de `SELECT` para operaciones COPY debe diseñarse usando semántica de operación de Storage y probar sus consecuencias en lectura pública D1, carga de Feed, thumbnails y navegación. No cambiar esas políticas sin gate de producto/seguridad y pruebas autenticadas.

## Próximas evidencias que faltan

- Auditoría de todos los escritores privilegiados (backend, Edge, service key). Coordinación cross-service REAL, no solo SQL simulada.
- Prueba API Storage de `MOVE/COPY/UPSERT/DELETE` con **archivo sintético y sesión legítima**, en entorno controlado; no ejecutar con fotografías ajenas ni con rutas sospechosas. Pedir aceptación visual del PO solo si aparece nuevo comportamiento visible.
- Confirmación vinculada a objeto y versión; origen, CDN y cachés por separado. La documentación de Supabase no establece que `remove([path])` haga borrado condicional seguro del objeto activo.
- Rutina de recuperación que no libera un claim mientras exista una eliminación en vuelo. D3-B pendiente, sin activar A3/A4.

**Regla de fallo seguro:** cuando haya incertidumbre de ruta, objeto, versión, exclusividad, operación concurrente, CDN o permisos, conservar estado pendiente/revisión manual. No marcar `purged` ni activar Edge hasta cierre de todos los gates.
