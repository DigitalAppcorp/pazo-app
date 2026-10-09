# PAZO F14 A2 — Preflight y reserva transaccional para medios (Gate preparado)

**Estado: MIGRACIÓN DE RESERVAS APLICADA (`20261009014616`). SIN BORRADO DE ARCHIVOS NI PURGA ACTIVA.**

## Alcance y garantías reales

- Migración canónica aplicada: `supabase/migrations/20261009014616_f14_media_claim_preflight.sql`.
- Crear, si se aprueba expresamente la migración, una tabla privada de reservas y un registro de eventos. La reserva es única por contenido y por objeto de Storage y vence en cinco minutos. Reintentos con exactamente la misma prueba devuelven el mismo ID mientras la reserva es válida.
- Funciones RPC `public.f14_prepare_media_claim(kind,id)` y `public.f14_recheck_media_claim(claimId)` exclusivamente para `service_role`, con validación también dentro de la función. `anon` y `authenticated` no tienen EXECUTE ni acceso directo a las tablas privadas.
- La prueba se calcula en el servidor desde reportes retirados, restricción `pending_review`, relaciones de autor/mascota/comunidad, URL canónica de ESTE proyecto Supabase, ruta exacta, referencia única, registro del objeto, version, updated_at y huella de metadata. No se acepta evidencia de identidad suministrada por clientes.
- Admite candidaturas de posts Feed actuales `usuario/mascota/uuid.ext`, posts Feed históricos `mascota/nombre_seguro.ext`, posts de Comunidad `comunidad/usuario/uuid.ext`. Perfiles de mascota y URL externa quedan en revisión manual.
- Los estados posibles son solamente `candidate_only`, reserva `held` / `invalidated`. **NUNCA «autorizado para borrar» ni «eliminado»**. No hay RPC de eliminación, confirmación de purge, cambios de `f14_confirm_media_cleanup` ni edición de la Edge Function.
- `pg_advisory_xact_lock`, `SELECT ... FOR UPDATE` sobre restricción/claim y `FOR SHARE` sobre publicación y metadata de Storage proporcionan una vista coherente EN UNA TRANSACCIÓN SQL. Tras `COMMIT`, esos locks se liberan. **No mantienen un lock mientras se ejecuta Storage API**, ni evitan por sí solos una subida concurrente o reutilización de ruta. Revalidar justo antes del borrado y utilizar un mecanismo CAS/reserva de Storage, o detener el flujo ante falta de esa capacidad, continúa pendiente.
- La reserva guarda ID del objeto y versión pero el código **NO** sustituye la confirmación `f14_confirm_media_cleanup(kind,id)`; esa función es insuficiente y NO puede llamarse para declarar éxito.
- Este borrador está unido al host PAZO `mrybvqdebbgcayuvgkkr.supabase.co`; no se debe trasladar tal cual a otro proyecto sin rediseñar configuración y pruebas.
- Las reservas y eventos forman parte de la retención D3-B aún pendiente; no guardar bearer tokens, emails o contenidos completos en las tablas nuevas.

## Validaciones reversibles ejecutadas en Supabase

Todas dentro de `BEGIN/ROLLBACK`, sin registros ni archivos persistentes:

1. DDL compila y revierte.
2. Una reserva de foto Feed con objeto sintético se prepara y reintenta idempotentemente; el recheck es true con versión vigente.
3. Cambio de URL de la publicación tras la reserva invalida el claim y no permite reabrirlo.
4. Cambio de `storage.objects.version` también invalida el claim.
5. Ruta histórica `mascota/archivo.webp` verificada: candidata; no equivale a borrar.
6. Publicación de Comunidad con URL y storage path correctos: candidata y recheck true.
7. Roles `anon` y `authenticated`: invocación denegada; solo `service_role` puede invocar y nunca consultar directamente tabla de claims.
8. Medios compartidos, URL de otro proyecto, marcador lógico de eliminación: rechazo con error controlado.

Los casos de prueba usan metadata **sintética** de Storage en una transacción que se revierte; no representan un archivo real, ni validan la API de Storage, ni constituyen HTTP firmado con JWT independientes.

## Gates pendientes

1. **Superado:** aplicación autorizada y registrada en Supabase como versión `20261009014616`, con cinco pruebas positivas y dos pruebas adicionales de vencimiento/rechazo contra la función instalada.
2. Reconciliar versión remota con migración canónica y retención D3-B; estudiar triggers/locks y garantía de CAS entre servicio de DB y Storage, incluyendo subidas/upserts concurrentes.
3. Ejecutar smoke HTTP con JWT reales de cuentas separadas moderador/no moderador; el test en `scripts/f14-signed-jwt-authorization.mjs` permanece sin ejecutar.
4. Probar con un archivo REAL, aislado, sin contenido de clientes, pero **sin borrarlo**, para verificar getInfo y comportamiento versionado.
5. Diseñar una función de confirmación vinculada a `claim_id`, `object_id`, `version` y evidencia de ausencia real, con idempotencia y retención de auditoría. El CDN puede conservar copias en caché.
6. **Una aprobación posterior e independiente** para habilitar cualquier Storage DELETE. Por ahora `f14-moderation-purge` debe seguir respondiendo 503 sin código de borrado.

No cerrar F14 A2, no tocar main, Production Vercel, ni iniciar A3/A4.


## Validación posterior a aplicación (2026-10-09 UTC)

Supabase registra `f14_media_claim_preflight` versión `20261009014616`. Dos tablas privadas y dos RPC service-only instaladas. Grants: anon/authenticated denegados, service_role autorizado. Cero reservas/reports/restrictions actuales, 1 moderador, 19 objetos de Storage intactos. Pruebas funcionales sobre la función realmente instalada: Feed actual/idempotencia/URL cambiada, rechazo de permisos, Comunidad, versión del objeto modificada, Feed legacy, vencimiento y 3 escenarios de rechazo (foto compartida, host distinto, marcador de borrado), todos con ROLLBACK. Esto NO es prueba JWT firmada real ni de bytes/CDN.

**La reserva solo devuelve candidato.** La confirmación de ausencia en Storage y el control de carrera entre servicios siguen sin implementar. No invocar ni conectar `f14_confirm_media_cleanup(kind,id)` a un nuevo worker.
