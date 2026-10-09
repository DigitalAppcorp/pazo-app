# PAZO F14 A2 — Gate para fencing durable de operaciones Storage privilegiadas

**Estado:** contrato de diseño y simulador Node; **NO es un servicio desplegado, una migración ni autorización para borrar medios**. El PO permitió avanzar con ingeniería no destructiva; nueva DDL remota, edición real de fotos y release requieren un gate concreto según `AGENTS.md`.

## Riesgo que debe resolver

`public.f14_get_media_claim_evidence(uuid)` puede comprobar una reserva, identidad de media, referencia exclusiva y versión exacta dentro de una transacción SQL. **Los bloqueos PostgreSQL terminan antes de la petición HTTP a Storage.** Un cliente con `service_role` omite las políticas RLS, incluso cuando la ruta está retenida mediante `held`. Un borrado con `versionId` exacto ya pasó una prueba sintética en Supabase (PO QA 4/4); no equivale a un compare-and-swap distribuido con escritores privilegiados, fuente social, CDN o backup.

El cierre seguro exige **enumerar y coordinar todos** los clientes privilegiados que puedan escribir, copiar, mover o eliminar objetos en `post-photos` y `community-post-photos`. No basta enumerar este repositorio si existen scripts, accesos de consola o integraciones con la clave de servicio. El inventario de `src/services/communityService.ts` muestra cargas autenticadas con `upsert:false`; eso **no** prueba ausencia de otros writers.

## Contrato del futuro servicio — no implementado

1. **Registro duradero privado.** Tabla de intentos autorizada solo al ejecutor servidor, nunca a `anon/authenticated`: identificador aleatorio `operation_id`, `claim_id`, `storage_object_id`, bucket, ruta exacta protegida, `versionId`, generación monotónica, sello temporal y estado. No registrar imagen, contenido de posts, identidad de denunciantes, headers de autorización ni JWT en logs. Definir retención en F14 D3-B.
2. **Barrera de escritores.** El servicio debe disponer de un punto único de entrada y una generación/fencing token monotónica para **todos** los escritores privilegiados de esos buckets, con estado confirmado antes de despachar un DELETE. Un token almacenado únicamente en Postgres **NO** detiene a un writer externo que llame Storage directamente; si existe cualquiera, abortar.
3. **Intento antes del HTTP.** Registrar en la misma base, con exclusión de ruta y `operation_id` único, que la petición **podría estar en vuelo**. Confirmar su persistencia antes del primer byte de DELETE. La lease `expires_at` del media claim no debe liberar la ruta durante un intento iniciado, vencido o desconocido.
4. **Envío restringido.** Únicamente `remove([{path,versionId}])` después de comprobaciones con servidor, nunca `remove([path])` ni regenerar `versionId` con la ruta original. No inferir autorización del resultado `candidate_only` ni de `mayDelete:false`.
5. **Confirmación independiente.** Tratar `timeout`, desconexión, 500, reintento y respuesta vacía como **estado desconocido**, no como fracaso seguro. Con respuesta HTTP exitosa, comprobar origen con `storage.info` + `storage.list` y la identidad del objeto/version, además de la fuente vigente en DB. Un HTTP 400/404 CDN no prueba invalidación mundial.
6. **Recuperación.** No reintentar DELETE ni invalidar `held` automáticamente tras timeout o vencimiento. Reconciliar estado del origen, operaciones en vuelo y writers registrados. Si falta un testigo confiable, conservar reserva y escalar a revisión manual. La pérdida de disponibilidad es preferible a eliminar un archivo nuevo o republicar uno moderado.
7. **Terminación honesta.** `origin_absent_observed` no equivale a `purged`. No marcar `purged` hasta alinear implementación, CDN/TTL, retención/backups y doctrina D3-A/D3-B aprobada. La Edge `f14-moderation-purge` permanece con HTTP 503.

## Contrato de simulación versionado

- `privilegedAttemptProtocol.mjs`: estado inmutable con `claimId`, `objectId`, `fenceToken`, `generation`, `selector` exacto; eventos hipotéticos `JOURNAL_DISPATCH`, `HTTP_SUCCESS`, `HTTP_TIMEOUT`, `HTTP_ERROR`, `OBSERVE_ORIGIN`, `REQUEST_MANUAL_REVIEW`.
- `privilegedAttemptProtocol.test.mjs`: exige persistencia/registro y fence simulado antes de registrar despacho, niega token viejo y despacho duplicado, no reenvía un HTTP ambiguo, niega liberar hold o marcar purged. Enumera **1,331 secuencias** de tres eventos (11³). Cada estado tiene `mayDelete:false`, `shouldSendHttp:false`, `mayFinalizePurge:false`, `canReleaseHold:false`.
- **Límite metodológico:** los booleanos de los tests son testigos sintéticos. **No** significan que exista un ledger duradero, fencing aplicado a Storage o cooperación real de writers. No importar este simulador en una Edge productiva para decidir envíos.
- `serviceReaderDryRun.mjs`, `hostedClaimEvidence.mjs`, `exactVersionOutcome.mjs` siguen siendo solo detectores/candidatos; no autorizan acciones destructivas.

## Evidencia requerida para un siguiente gate técnico

- Inventario completo y revisión de accesos privilegiados de PAZO, incluidos jobs, backoffice, Edge, consola, scripts y proveedores externos. Listado de operaciones `upload/upsert/move/copy/remove` y políticas de credenciales.
- Revisión de migración **borrador** para ledger/RPC de intento; suite de roles `anon/authenticated/service_role` y reversión `BEGIN/ROLLBACK` en SQL.
- Prueba real con **dos procesos backend concurrentes** sobre archivos **sintéticos**: solicitud HTTP lenta/in-flight vs escritura o sustitución privilegiada, generación obsoleta, restart, crash antes/después del envío, pérdida de ACK, replay y reconciliación; demostrar invariante bajo operación Storage real antes de activar purga.
- Documentar alcance de CDN/browser/cache/backups y ventanas realistas en plan Free; evitar prometer eliminación inmediata de copias previas.
- Aprobación específica para cualquier nueva migración remota o para activar una Edge destructiva. Mantener PR #35 DRAFT y no fusionar `main`.

**Gate actual:** solo modelo + test. Ninguna tabla, trigger, tarea, endpoint, función Edge o comando de borrado se instaló por este documento.


## Evidencia de SQL aislado en CI — PASS, SIN Supabase live DDL

Propuesta de tres tablas privadas en `20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql`, no aplicada a PAZO. Se creó `privileged_attempt_ledger_ephemeral.test.sql` con IDs únicamente sintéticos y `scripts/test-f14-ledger-ephemeral.sh`: **solo bajo `GITHUB_ACTIONS=true`**, inicia un PostgreSQL 16 desechable por Docker en el runner, crea roles `anon/authenticated/service_role` falsos y la tabla stub `media_claims`, compila y ejecuta la propuesta en el contenedor, prueba RLS FORCE + grants cerrados, ruta exclusiva, FK compuesta de operación/bucket/path, idempotencia de evento, ruta malformada y estado `purged` rechazado. El SQL de fixture termina en `ROLLBACK`; el contenedor se elimina al finalizar. **No utiliza el proyecto Supabase, llaves, fotos ni cuentas reales.**

Resultados transparentes: primer CI con Postgres `37919265959` falló por un fixture que esperaba `foreign_key_violation` pero chocaba primero con `unique_violation` para el mismo `active_operation_id`; ajustado para insertar una segunda operación sintética y aislar la FK compuesta. Otro run `37919380212` falló al iniciar el contenedor sin mensajes de diagnóstico; se mejoró registro/cleanup y se repitió. **CI `37919563316` SUCCESS** con salida `F14 private ledger DRAFT: disposable PostgreSQL smoke PASS`, **128/128 pruebas Node PASS** y compilación Vite PASS.

**Resultado del gate:** validez de esquema y restricciones principales **PASS EN POSTGRES TEMPORAL**, no se ha probado ni instalado ledger en Supabase PAZO, no se ha desarrollado/instalado RPC de coordinación, no se han auditado todos los actores externos `service_role` y el ensayo de dos procesos con operaciones Storage HTTP sigue pendiente. La tabla por sí sola no constituye exclusión. Para migración real se exige autorización concreta nueva según AGENTS, revisión de privacidad/retención, SQL canonizado, rollback y permisos posteriores. No confundirlo con aprobación para borrar medios.
