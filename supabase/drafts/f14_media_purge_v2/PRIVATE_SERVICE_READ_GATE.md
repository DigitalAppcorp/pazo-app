# PAZO F14 A2 — Gate pendiente: lector de evidencia privado para servicio

**Estado:** propuesta de integración, NO desplegada ni autorizada como migración concreta. Control actual: `moderation_private` no tiene USAGE para `anon`, `authenticated` ni `service_role`. El ejecutor Edge de purga está deshabilitado HTTP 503.

## Contrato mínimo por aprobar

Introducir una función pública `f14_get_media_claim_evidence(p_claim uuid)` con `SECURITY DEFINER`, `search_path=''` y `auth.role() = 'service_role'`. Revocar `EXECUTE` de `PUBLIC`, `anon` y `authenticated`, y concederlo **solo** a `service_role`. No dar `USAGE` ni SELECT de `moderation_private` a ningún rol API.

La función únicamente **lee** un `media_claims` existente, reporte resuelto `removed`, restricción `pending_review`, objeto/version en Storage metadata, snapshot vivo por `moderation_private.f14_media_probe` y referencias reconstruidas por cuenta. Devolver **un objeto JSON con campos mínimos y estado candidato** únicamente cuando la reserva sigue `held` vigente; si no, no devolver candidato. Nada de denuncia libre/reportante. No realizar `storage.remove`, HTTP, INSERT, UPDATE, DELETE ni marcar `purged`. El cliente de navegador no debe acceder ni importar este contrato.

Fuente validada para este diseño: `hosted_claim_evidence_readonly.sql`, y clasificador puro `hostedClaimEvidence.mjs`. Usar una transacción que permita locks `FOR SHARE`; no SQL READ ONLY mode. **Una transacción de lectura NO protege durante HTTP**; resultado `candidate_only` con `mayDelete:false` siempre.

## Pruebas antes y después de una posible migración

1. Versionar el DDL bajo `supabase/migrations/` con número futuro no usado, sincronizar historial de Supabase, ejecutar primero SQL aislado `BEGIN/ROLLBACK`, luego revisar permisos y `pg_get_functiondef`.
2. Verificar `anon` y `authenticated` con SQLSTATE 42501 al llamar la RPC y con permisos `has_function_privilege`, incluso si conocen `claim_id`. Confirmar `service_role` EXECUTE verdadero pero sin `USAGE` privado.
3. Con cinco tipos de moderación, solo `feed_post` y `community_post` con foto pueden producir candidato; perfiles/avatares quedan en revisión manual según D3-A.
4. Probar `report` distinto, fuente eliminada, URL distinta, metadata nueva, versión nueva, claim vencido, referencia compartida y expiración cruzando llamadas: respuesta nula o `manual_review`, nunca permiso de borrado.
5. Ejecutar los checks de Supabase Security Advisor. Ningún hallazgo nuevo de función expuesta a `anon/authenticated`; código de Edge destructiva sigue 503.
6. **No habilitar DELETE** con el simple PASS de esta RPC. Aún se necesitan exclusión de operaciones HTTP in-flight, registro/reconciliación de intentos, verificación por `versionId` y origen posterior, tratamiento explícito CDN/TTL y controles de costo.

## Decisión requerida

El Product Owner debe autorizar **específicamente** la migración remota que crea esta RPC de **solo lectura** después de ver su DDL/test y confirmar que no amplía las operaciones de borrado. La autorización general para continuar F14 no sustituye los gates de migración/producción del `AGENTS.md`. Un intento previo de preparar el RPC fue bloqueado por seguridad del conector; no sortear esa barrera, ni pedir secretos/JWT al usuario. Si persiste, documentar la limitación y no inventar un lector activo.


## Resultado del gate — APLICADO / acceso restringido verificado (2026-10-09)

El Product Owner autorizó específicamente esta única migración de lectura. Supabase confirmó `apply_migration: success=true` y la registró como `20261009095635_f14_service_only_media_evidence_reader`. El repositorio contiene exactamente el SQL aplicado en `supabase/migrations/20261009095635_f14_service_only_media_evidence_reader.sql`; se retiró el nombre preliminar posterior para evitar duplicados de historial.

**Auditoría alojada PASS:** `SECURITY DEFINER`, `search_path=''`, retorno `jsonb`, `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true`, `service_role USAGE moderation_private=false`. Prueba SQL reproducible `supabase/tests/database/f14_service_only_evidence_reader_permissions_rollback.test.sql` PASS: ambos roles públicos denegados, `service_role` con JWT no privilegiado denegado, JWT de servicio autorizado pero claims nulos/inexistentes sin evidencia. Con fixtures sintéticos en `BEGIN/ROLLBACK`, prueba **positiva** PASS para Feed y Comunidad, comprobando `status=candidate_only`, `mayDelete=false`, snapshots/referencias; al cambiar la versión o retirar la fotografía original, devuelve NULL. No se persistieron fixtures ni se eliminaron bytes.

**Limitación importante:** la prueba estática `serviceEvidenceRpc.test.mjs` se creó y se revisó, pero su inclusión en el comando `npm run test:f14` fue bloqueada por el control de seguridad de la herramienta. No afirmar que esa prueba Node se ejecutó por CI. La validación real de permisos/filas sí se ejecutó directamente en Supabase y el SQL del test de permisos quedó versionado. No intentar eludir un bloqueo del conector.

**Lo que NO autoriza este PASS:** purga real, `purged`, exclusión de escrituras service_role concurrentes ni invalidación CDN/navegador/backup. La Edge de eliminación permanece desactivada. El gate de lector privado pasa a **PASS BACKEND**; F14 A2/D3-A permanece ABIERTO por los otros requisitos.
