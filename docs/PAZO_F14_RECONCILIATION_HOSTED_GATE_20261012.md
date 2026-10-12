# PAZO — F14/T08 | Gate de reconciliación alojada (único objeto ya eliminado)
**Fecha:** 2026-10-12. **Estado:** PREFLIGHT READ-ONLY PASS; MIGRACIÓN/EDGE ALOJADOS **NO AUTORIZADOS NI EJECUTADOS**. No utilizar este documento como permiso para cambios alojados.

## Scope permanente
- Proyecto Supabase `mrybvqdebbgcayuvgkkr`. Rama única RC `release/mvp-beta-fast-track-20261010`. `main` y Vercel fuera de alcance.
- Objetivo **único**: `feed_post/140d3769-cde2-47dc-998a-dcb3238b6f17`, bucket `post-photos`, Storage UUID original `b9ef7bf4-9d86-4168-b124-a8b0b272d0c8`.
- **PROHIBIDO** repetir `f14-moderation-purge`, `Storage.remove`, eliminar otro objeto, crear claims, reenviar bytes, forzar `UPDATE` SQL manual, exponer secretos, activar la purga general, alterar `main`, Vercel o facturación.
- El POST único inicial registró `DELETE | 200` en Storage seguido de `Storage.info HTTP 400, NoSuchKey, statusCode=404` y HTTP 503 Edge. `Storage.info` y GET público confirmaron `NoSuchKey` y ausencia de bytes. El claim quedó `held`, la restricción `pending_review`.

## Evidencia comprobada para este gate (READ ONLY 2026-10-12)
1. PR [#39](https://github.com/DigitalAppcorp/pazo-app/pull/39) y PR [#40](https://github.com/DigitalAppcorp/pazo-app/pull/40) integrados en RC por autorización expresa PO; la nueva Edge `f14-moderation-reconcile` y la migración `20261012063205_f14_one_object_admin_reconcile.sql` están **sólo en GitHub**.
2. CI RC [#38214971669](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38214971669) SUCCESS, incluidos PostgreSQL17, pruebas del contrato `NoSuchKey`, claim único, idempotencia y carrera real entre dos transacciones.
3. Preflight SQL `SELECT` sobre el claim alojado devuelve exactamente **1** claim con `status='held'`, `checked_at` presente, bucket y Storage UUID exactos, y TODAS las correspondencias JSON del snapshot verdaderas: `kind,target_id,storage_object_id,bucket,report_id,path,source_url`; la URL coincide con la referencia del post, owner/pet presentes; reporte `removed`, restricción `pending_review`; metadata original y objeto de mismo bucket/path ausentes.
4. Comprobaciones anteriores directas: `post-photos=0`, `pet-avatars=2`, UUID original ausente, la Edge destructiva alojada v27 con `verify_jwt=true` y ambos latches `false`, nueva Edge no instalada y nuevo RPC no aplicado.
5. T11 copia de seguridad/restore local se acreditó en trabajos anteriores; la custodia offsite Google Drive continuaba pendiente. Antes de operar, verificar estado actual del respaldo y no declarar un backup nuevo sin evidencia.

## Gate A — requiere autorización PO SEPARADA: preparar backend sin ejecutar cierre
- Confirmar HEAD RC exacto, CI SUCCESS, identidad del proyecto, migración no aplicada, nuevo RPC ausente y Edge original apagada. Confirmar esquema/roles/RLS/retención y respaldo recuperable. Si hay drift: STOP.
- Aplicar **solamente** `supabase/migrations/20261012063205_f14_one_object_admin_reconcile.sql` mediante canal de migraciones aprobado (no SQL ad hoc). La RPC `public.f14_finalize_one_object_reconciliation(text,uuid,uuid)` tiene `SECURITY DEFINER`, `search_path=''`, exige `auth.role()='service_role'`, y sólo acepta exactamente el target+UUID; `REVOKE ... FROM PUBLIC,anon,authenticated`, `GRANT ... TO service_role`.
- Validar por catálogo que la definición y privilegios son exactos, que no hubo cambios de filas de claim/restricción/Storage y que el procedimiento no fue invocado. No activar el RPC por aplicación.
- **No desplegar ni activar todavía la variante de reconciliación sin comprobar el método de flags/config**, y no invocar desde Chrome en Gate A. Preparar en carpeta temporal aislada una función de reconciliación desplegable con `verify_jwt=true`, verificando que la copia de recuperación tiene `F14_ONE_OBJECT_RECONCILE_APPROVED=false` y que el código fuente de `f14-moderation-purge` mantiene latches `false`. El archivo RC `supabase/config.toml` deja nueva Edge con `enabled=false`; jamás subir el proyecto entero sin delimitar una sola función y comprobar el efecto de esa opción.
- **Resultado de Gate A:** sólo RPC instalada y protegida, sin modificar claim/status; no afirmar F14 PASS.

## Gate B — exige autorización PO específica, y ejecución controlada del cierre único
- PO autentica sesión de moderador real `f14_is_moderator()=true` en PAZO local. Sin JWT ni secrets en chat/logs.
- Verificar primero **cuatro controles HTTP** y `Storage.info` bajo parser estricto `NoSuchKey`; acceso denegado, 400 genérico, 200/206 o caché accesible son STOP, no motivos para debilitar validación.
- Diseñar y demostrar en el entorno operador, ANTES de activar, la ventana temporal de `F14_ONE_OBJECT_RECONCILE_APPROVED=true` con secreto `F14_ONE_OBJECT_RECONCILE_ENABLED=true`; ningún flag de PURGE debe cambiar. Backup de la función con latch `false`, secreto `false` y procedimiento de revertir y verificar remoto. Si se usa watchdog, demostrar prueba independiente y que el timeout no puede producir segundo POST. Desplegar **solo** `f14-moderation-reconcile` con `verify_jwt=true` y code exacto; validar versión alojada.
- **Una única invocación de cierre** con cuerpo exacto `{kind:'feed_post',id:'140d3769-cde2-47dc-998a-dcb3238b6f17'}`; no invocar `f14-moderation-purge`, no reintentar ante timeout/error. SQL transaccional revalida claim held+snapshot, reporte removed, ruta/UUID y ausencia de Storage, ejecuta `f14_moderation_media_gate(...,'complete')`, actualiza el claim `held→invalidated` y escribe un evento; si error, no deducir que la transacción no ocurrió.
- Desactivar secreto, redesplegar código de reconciliación con latch `false` (o deshabilitar/eliminar la función según procedimiento verificado), comprobar desde el proveedor. La Edge destructiva original permanece apagada. Nunca escribir estados a mano.

## Postflight READ ONLY y clasificación
- **PASS F14/T08 únicamente si:** el POST de reconciliación devuelve éxito o postflight prueba estado final inequívoco; objeto UUID/bucket-path sigue ausente; GET+HEAD original/cachebusted indican ausencia con parser aceptado y sin bytes; 2 avatares intactos; reporte `removed`, restricción `purged`; claim del UUID `invalidated`; un evento `invalidated`; RPC y Edge restringidas/desactivadas; CI y handoff consistentes.
- Si queda `pending_review`, claim `held`, una URL responde bytes, evidencia ambigua, permiso alterado o función activa fuera de la ventana: **PARCIAL/STOP**, recabar evidencia READ ONLY, sin segundo POST ni cambios manuales.
- No declarar “F14 fase completa” hasta Scope Closure Reconciliation de todo el alcance MVP, decisiones PO, y las condiciones generales de AGENTS.md. `F13` y GO/NO-GO público siguen como gates independientes.

## Notas de seguridad
- Documentación Supabase: desplegar explícitamente la función por nombre, comprobar `verify_jwt`, no subir todas. Los secretos de Supabase se administran sólo en entorno operador; no mostrarlos en respuestas.
- Tiempos del CDN, backup offsite y fecha legal de lanzamiento no se dan por certificados mediante una respuesta `NoSuchKey`.

## Resultado efectivo del Gate A (2026-10-12 UTC) — PASS ALOJADO

- Product Owner aprobó explícitamente **sólo** la instalación de `supabase/migrations/20261012063205_f14_one_object_admin_reconcile.sql`, sin ejecución de cierre.
- La herramienta de migraciones oficiales aplicó los **4328 bytes exactos del SQL de RC** (`success:true`) y registró `20261012071140_f14_one_object_admin_reconcile`. **ATENCIÓN:** el archivo del repo tiene prefijo `20261012063205`. No ejecutar `supabase db push` sobre todas las migraciones ni repetir esta migración desde su nombre de archivo: el versionado del ledger alojado es distinto. Corregir mapeo de historial en gate futuro, sin reaplicar DDL; referencia canónica en `docs/PAZO_ACTIVE_HANDOFF.md`.
- Postflight de catálogo: RPC existe con firma exacta, `owner=postgres`, `security_definer=true`, `search_path=''`, `EXECUTE` exclusivamente para `service_role` (`anon=false`, `authenticated=false`, `PUBLIC=0`). Contiene target UUID y Storage UUID exactos, la puerta `f14_moderation_media_gate`, reintento idempotente y evento.
- Postflight datos: **cero cambios en datos**. `post-photos=0`, `pet-avatars=2`, objeto UUID ausente, claim `held=1`, claim `invalidated=0`, evento invalidado `0`, restricción `pending_review=1`, `purged=0`, reporte `removed=1`.
- Edge nueva `f14-moderation-reconcile` todavía **NO instalada**, Edge de purga original **v27 `verify_jwt=true`, ambos latches false**; ningún flag activado ni POST enviado. **STOP aquí:** ejecutar Gate B necesita orden separada del PO.
