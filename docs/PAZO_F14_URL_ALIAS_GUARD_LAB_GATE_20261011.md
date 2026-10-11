# PAZO — F14 media URL alias: corrección versionada, gate pendiente

**Fecha:** 2026-10-11. **Ámbito:** rama `release/mvp-beta-fast-track-20261010`. **Estado:** PREPARADA EN RC; NO APLICADA EN SUPABASE.

## Evidencia

El Product Owner ejecutó localmente una reconstrucción del esquema por catálogos en PostgreSQL 17 con adaptaciones documentadas del laboratorio. La versión v10 del candidato produjo `F14 CANDIDATE single-session SQL suite: PASS (original gate FAILED; not rollout-ready)` y detuvo el servidor aislado. El SQL original había aceptado erróneamente una referencia compartida a la misma imagen en `profiles.avatar_url` con el sufijo `?v=synthetic`. La suite sintética de **una sesión** pasó después de añadir el guard de identidad y aplicarlo tanto al probe como al gate.

La migración nueva `supabase/migrations/20261011022000_f14_media_url_alias_guard.sql` sucede a `20261010222006_f14_media_purge_retry_reconciliation.sql` (también pendiente de aplicación). Conserva el helper `f14_local_url_points_to_object` y su grant limitado al dueño de las funciones, `postgres`, para mantener la equivalencia con el candidato probado. Sustituye únicamente los cuerpos de `moderation_private.f14_media_probe` y `public.f14_moderation_media_gate`; no ejecuta Storage.remove, DELETE, ni activa el worker. El contrato estático incorporado al CI solo comprueba presencia y alcance del SQL, **no lo ejecuta en PostgreSQL**.

## Diferencias y riesgos aún pendientes

- El esquema recuperado fue adaptado localmente: 25 otorgantes de roles, orden de dos funciones y una pseudorrestricción trigger duplicada. No hay validación completa de fidelidad de metadatos/ACL/owners ni restauración oficial `pg_dump --schema-only`.
- El guard reconoce únicamente la URL pública canónica del proyecto (incluidas variantes de query, fragmentos y codificación del path). Otras rutas, hosts y URLs firmadas no quedan certificadas; una URL no reconocida no debe interpretarse como garantía de objeto exclusivo. Revisar variantes y resolver ambigüedades antes de autorizar purga automática.
- Faltan ensayos de dos sesiones, cambios de referencias entre preflight/recheck/complete, comprobación de locking, y simulación del intervalo de llamada HTTP a Storage. La suite de sesión única no certifica concurrencia.
- Falta ensayo de retiro físico de **un objeto nuevo y descartable**, con autorización independiente; comprobar metadata Storage, URLs públicas y cachés. No afirmar limpieza de CDN/backups.
- El historial de migraciones alojadas debe cotejarse antes de cualquier despliegue. Hacer revisión de SQL/privilegios y Gate PO específico antes de `apply_migration`; no alterar migraciones ya aplicadas.
- Worker/Edge sigue `F14_MEDIA_PURGE_RELEASE_APPROVED=false`; no activar feature flags globales ni publicar cambios en `main` o Vercel.

## Verificación

`npm run test:mvp` incluye `scripts/f14-media-url-alias-contract.test.mjs` como contrato estático; CI debe verificarse contra el HEAD remoto exacto. El PASS de laboratorio proviene de la salida del usuario, no de GitHub Actions. Para certificar esta migración versionada habrá que volver a ejecutar en PostgreSQL aislado **el SQL del repositorio**, en ese orden, además de completar los gates anteriores.

**Plan MVP:** T08 permanece BLOQUEADO para purga física. Los pendientes Preview/Mapbox, Auth, operador, PWA móvil y respaldo no cambian. F13 visual sigue para el último paso con el Product Owner.
