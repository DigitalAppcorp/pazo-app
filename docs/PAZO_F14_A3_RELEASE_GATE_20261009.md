# PAZO F14 A3 — Gate de cierre técnico y activación (2026-10-09)

**Decisión vigente:** PO autorizó **preparar código y SQL como borradores**. NO autorizó aplicar migraciones, desplegar Edge Functions, borrar cuentas ni archivos, pagar por servicios, fusionar PRs o activar la UI. Esta verificación documenta lo que existe y lo que falta, no es una liberación a Beta.

**Rama:** `f14/a3-account-deletion-draft-20261009` / PR #38, basada lógicamente en #37 (mod.) y #36 (MVP aprobado en local). Su base GitHub `main` sirve solo para el CI. Producción `main` sigue sin estos PR.

## Entregables versionados hasta aquí

| Módulo | Evidencia | Resultado |
|---|---|---|
| UI solicitud, estado y cancelación | `src/features/account/` + feature flag `VITE_F14_A3_REQUESTS_ENABLED` | Preparado **OFF**; no E2E |
| Modelo de estados/coordinación | `deletionFlow.ts`, `deletionCoordinator.ts` y tests | Unit tests PASS; NO ejecutor |
| Intake/reporte backend | `supabase/drafts/20261009_f14_a3_request_preflight_NOT_APPLIED.sql` | SQL DRAFT con bloqueo transaccional |
| Archivo privado de contenido ajeno | `supabase/drafts/20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql` | SQL DRAFT; error de delimitador corregido; no probado en PostgreSQL |
| Lease de worker | `supabase/drafts/20261009_f14_a3_worker_lease_NOT_APPLIED.sql` | SQL DRAFT; reintentos/exclusión unitarios |
| Write fence / FK | `supabase/drafts/20261009_f14_a3_write_fence_NOT_APPLIED.sql`, `...community_fk_NOT_APPLIED.sql` | SQL DRAFT; solo 11 tablas; faltan superficies |
| Storage manifest | `src/features/account/mediaManifest.ts` + tests | Validador PURO; ninguna llamada a remove() |
| Gobierno/documentación | Handoff, roadmap, inventario, diseño, runbook Storage | Preparados; NO políticas públicas |

**Cinco archivos SQL** contienen `BEGIN; DO RAISE EXCEPTION` antes de DDL: se abortan incluso si alguien intenta ejecutarlos sin retirarlo deliberadamente. No hay migraciones A3 aplicadas. Los tests de texto/código **no sustituyen ejecución SQL** ni garantías E2E.

## Bloqueos técnicos comprobados — no declarar A3 completado

1. **Trabajador real y reautenticación:** no existe servicio backend que valide sesión recientemente reautenticada, adquiera lease, avance estados y gestione reintentos seguros. Un `auth.jwt().iat` renovado no demuestra reautenticación; JWT puede seguir válido tras Auth delete. `auth.admin.deleteUser` no puede ejecutarse desde frontend.
2. **Congelar TODAS las escrituras:** triggers DRAFT cubren 11 tablas, pero faltan `interactions`, `community_post_likes`, `pet_place_checkins`, rescue/sightings/QR, presencia, notifications, preferencias/RPC específicas y la vía de **Storage API**. Falta sincronización transaccional del cambio de estado con los mismos locks.
3. **Aportaciones de terceros y FK:** `communities.owner_user_id` y autores de community_posts tienen ON DELETE CASCADE en la DB hospedada. El borrador de cambio de FK no ha sido probado; también está el trigger `community_private.ensure_owner_membership`. Hasta cambiar y comprobar, un borrado de Auth podría destruir contribuciones ajenas.
4. **Storage / CDN:** borrar filas `storage.objects` mediante SQL deja bytes huérfanos. Requiere servidor con Storage API, inventario exacto de versiones/paths, detector de referencias compartidas, reintentos, verificaciones de origen y enlaces públicos. Supabase documenta purga manual CDN como funcionalidad Pro; no hay autorización de upgrade. Validar comportamiento en plan actual sin prometer revocación instantánea de todos los caches.
5. **Privacidad/retención:** metas D3-B de 30/90/180 días y Backups/CDN/terceros no implantadas. Reportes, archivos privados y cuenta requieren procedimientos de privacidad, restauración segura y textos públicos que reflejen práctica real.
6. **QA de base real:** no hay PostgreSQL de ensayo conectado; no se ejecutó ninguna DDL de A3. Requiere probar migraciones, RLS/RPC, rol no autorizado, concurrencia, errores de Storage, borrado de 2+ usuarios de prueba y preservación de aportes cruzados, sin interferir con Pazo visual QA.
7. **Integración release:** PR #36/#37/#38 apilados en `main` no merged; Preview Vercel con bloqueo de cuota, beta externa no autorizada.

## Proceso de gate propuesto (en orden)

A. **Validación SQL aislada** y pruebas de 2–3 cuentas de prueba, con fixture de comunidad y comentarios cruzados, fotos públicas y documento privado; resolver errores/falsos positivos de trigger y RLS. Se requiere autorización PO para cualquier aplicación, incluso en el proyecto Supabase alojado.
B. Preparar y revisar worker servidor de eliminación con reauth real, circuito de fallos/reintentos, freeze total y prueba de versiones/ownership; **no desplegar mientras haya caminos de borrado no verificados**.
C. Revisar proveedor/CDN en plan disponible, logs/backups, inventario de archivos con referencias compartidas, proceso de privacidad pública y limpieza de datos pre-lanzamiento.
D. Solo tras PASS auténtico: autorización específica del PO para **cada** bloque de migraciones remotas, habilitar flujo bajo flag, QA móvil y de permisos, y gates separados de merge/deploy.
E. Finalmente Scope Closure Reconciliation de F14 Gate 8 con pruebas observables y política pública reconciliada. No basta GitHub Actions SUCCESS.

## Pruebas CI actuales

- Corrección de delimitador PL/pgSQL + tests estáticos: GitHub Actions [#37956473862](https://github.com/DigitalAppcorp/pazo-app/actions/runs/37956473862) SUCCESS.
- Validador de media y tests negativos: GitHub Actions [#37956829331](https://github.com/DigitalAppcorp/pazo-app/actions/runs/37956829331) SUCCESS.
- **Limitación:** no se ha probado código de ejecución de eliminación real, ya que aún no está integrado ni autorizado para operar.

## Qué se mantiene intacto

- Producción Supabase: **sin cambios** de esta fase; siguen las cuentas y datos actuales de prueba.
- `main`: no merged; Vercel sin despliegue.
- Antigravity: worktree de QA visual permanece independiente.
- Cero contornos y reglas de privacidad de PAZO intactas.

**Estado al checkpoint:** F14 A3 está **desarrollada parcialmente y bloqueada por los gates técnicos enumerados**. No se debe marcar COMPLETE ni sugerir al usuario probar eliminación todavía.

## 2026-10-09 — Hosted SQL QA read-only A3

- PO autorizó pruebas SQL controladas/reversibles, NO ejecución de migraciones ni eliminación.
- Se probaron en Supabase transacciones READ ONLY con ROLLBACK: 6 cuentas, 1 post ajeno en comunidad, 6 comentarios Feed ajenos y 1 documento privado. La única comunidad bloqueada por media; 5 comentarios JSON legacy en 3 posts; 13 posts Feed con foto, 2 posts de Comunidad con foto, 6 perfiles de mascota con foto.
- Preflight mejorado detecta media/legacy y bloquea 5 de 6 cuentas hasta revisión. SQL de snapshot falla cerrado ante comentarios JSON de autoría no reconciliada. Conteo CASE sobre JSON no-array probado por SELECT real. PR #38 código + tests CI #38002029845 PASS.
- FKs reales peligrosas 5/5 coinciden; anon carece de SELECT de communities; authenticated sin JWT no ve comunidades; no existen tablas ni RPC A3. Ningún DDL/DML ni Storage/Auth write remoto.
- Evidencia completa: docs/PAZO_F14_A3_HOSTED_READONLY_QA_20261009.md. Queda pendiente DDL/pgTAP en sandbox y todo el worker; Gate A3 abierto, sin merge/deploy y feature flag OFF.

## 2026-10-09 — F14 A3 PostgreSQL TEMP QA (reversible y sin apply)

- PO autorizó pruebas SQL reversibles en Supabase hospedado. Se probaron funciones de intake/estado/cancelación, worker lease/CAS, snapshot de aportes de terceros, write fence y FK de comunidad **adaptadas a pg_temp**, con datos exclusivamente sintéticos y `BEGIN ... ROLLBACK`. Ver `docs/PAZO_F14_A3_TEMP_PG_QA_20261009.md`.
- PASS: idempotencia de solicitudes (2 jobs históricos/1 activo), lease versión 3/rechazo de claim simultáneo, archivo privado 1 post/2 comentarios/1 tombstone, bloqueos al detectar media/legacy, write fence de posts y comentarios ajenos, transición de comunidad archivada sin perder post ajeno.
- SQL DRAFT `f14_a3_write_fence` extendido de **11 a 14 tablas** añadiendo `interactions`, `community_post_likes`, `pet_place_checkins`. Pruebas TEMP verificaron 3 rechazos y 1 acción no relacionada permitida. Código CI `38002952300` PASS.
- Verificación post-QA: Supabase alojado mantiene 6 cuentas, 6 mascotas, 1 comunidad, 20 objetos; jobs/leases/RPC A3 ausentes. **No hay migraciones A3 aplicadas, ni borrado Storage/Auth ni cambios a contenido real.**
- **Pendiente crítico**: DDL completo en sandbox aislado, concurrencia entre 2 conexiones, rutas residuales de escritura, worker operativo/reautenticación/Storage/CDN/retención/Auth final. No activar A3 ni fusionar PR. Estas pruebas no certifican seguridad JWT/RLS de nuevos objetos.

## 2026-10-09 — F14 A3 review worker + durable CAS journal DRAFT

- Nuevo motor `supabase/functions/f14-a3-account-deletion/worker.ts` + adaptador RPC `adapter.ts`, sin Edge entrypoint/deploy: revisión con evidencias server-only, lease revalidada antes/después de gates, check de estado reviewing, reintentos seguros, sanear errores y nunca autorización irreversible. Cuando faltan verificadores, retorna blocked.
- Nueva sexta migración bloqueada `supabase/drafts/20261009_f14_a3_worker_checkpoint_NOT_APPLIED.sql`: RPC service_role y journal privado CAS/versiones y eventos mínimos; no content DELETE.
- SQL real **TEMP + ROLLBACK**: 2 eventos de journal en revisión 2, rechazo de tokens viejos y revision 0 repetida; sin objetos permanentes. CI motor #38003551960, checkpoint #38003843415 y adaptador #38003932473 SUCCESS. Un primer CI falló por ruta de test inválida y fue corregido antes del checkpoint final.
- Evidencia/alcance: `docs/PAZO_F14_A3_WORKER_REVIEW_20261009.md`. **Worker destructivo NO construido**, aun sin sesión reciente JWT real, all-writes freeze, paths exactos Storage/CDN, Auth final ni E2E. A3 permanece abierta y UI OFF. PO no autorizó migraciones ni despliegue.

## A3.4d — Internal HTTP review runner disabled (2026-10-09)

- PR #38 agrega `http.ts`, `index.ts` y pruebas para invocación interna de revisión. HTTP requiere token de servicio secreto, body JSON limitado, no CORS y no expone operaciones físicas. `supabase/config.toml` mantiene la función `enabled=false`, `verify_jwt=true`; además runtime exige PAZO_A3_REVIEW_WORKER_ENABLED=true, ausente por defecto. Ningún Edge desplegado.
- Backend de revisión no dispone aún de verificadores externos aprobados; el adaptador retorna missing_evidence por defecto y no existe eliminación física. Las nuevas variables de entorno y coste de despliegue NO se han configurado ni solicitado.
- Cambios bajo Gate A3 DRAFT; F14 sigue ABIERTA. Evidencia ampliada en docs/PAZO_F14_A3_WORKER_REVIEW_20261009.md.

## A3.4e — verificadores de servicio limitados, 2026-10-09

- El worker servidor de PR #38 ahora inyecta `createA3ReadOnlyChecks()` mediante `adapter.ts` e `index.ts`. Se verifican exclusivamente **(1)** `worker_lease_valid` consultando `public.f14_a3_worker_validate_lease` con el token/versión exactos, y **(2)** `legacy_authorship_reconciled` consultando una RPC SQL borrador que solo devuelve true cuando la cuenta NO tiene ningún JSON de comentarios legacy sin reconciliar. No se acepta un valor `'true'`, `1`, error RPC ni evidencia de navegador.
- Séptima migración **NO_APLICADA** `supabase/drafts/20261009_f14_a3_worker_legacy_clear_NOT_APPLIED.sql`, con `BEGIN/DO RAISE EXCEPTION` intencional antes de DDL, `SECURITY DEFINER`, grants solo `service_role` y sin DML. Se probó la función **adaptada a pg_temp** con fixtures sintéticos y `ROLLBACK`: array vacío/SQL NULL/JSON null permitido; comentario JSON no vacío y objeto desconocido bloqueados; estado no reviewing y rol authenticated rechazados. Esto NO prueba permisos RPC aplicados de verdad.
- Las otras ocho verificaciones no tienen provider: el primer gate `recent_reauthentication` **se bloquea siempre**. No se puede completar una revisión ni borrar cuenta por este código. No activar `PAZO_A3_REVIEW_WORKER_ENABLED` ni `VITE_F14_A3_REQUESTS_ENABLED`.
- Supabase actual recomienda para llamadas servicio-a-servicio secret key con validación server `auth: 'secret'` y `verify_jwt=false` (https://supabase.com/docs/guides/functions/auth), mientras el borrador A3 conserva por defensa en profundidad `verify_jwt=true` y header interno `x-a3-worker-key`. **No desplegar sin reconciliar esta incompatibilidad de formatos y hacer pruebas reales de gateway con credenciales de servicio**. No degradar simplemente a `verify_jwt=false` sin configurar primero el autenticador oficial y probar denegaciones.
- CI código `151d48bb` [#38004703115](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38004703115) SUCCESS; SQL draft `01042a3d` [#38004748138](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38004748138) SUCCESS.
- Verificación posterior READ ONLY: 6 cuentas Auth, 6 mascotas, 20 objetos Storage; `f14_a3_request_deletion()` y `f14_a3_worker_legacy_clear(uuid)` siguen ausentes. Sin apply, merge, deploy, borrados ni gastos. A3 / Gate 8 ABIERTOS.

## A3.4f — Auth service-to-service y contraseña server-side DRAFT (2026-10-09)

- PR #38 cambió `index.ts` a `@supabase/server@1.8.1` middleware `auth:'secret:pazo-a3-review'` con credencial nombrada de servidor por `apikey`. Por diseño `verify_jwt=false` (solo gateway) y `enabled=false` (función desactivada); segundo secreto privado y flag de runtime siguen necesarios. **No se crearon claves, secrets, recursos ni deploy**. No publicar sin pruebas reales del gateway.
- Nuevos módulos server-only `reauth.ts`/`reauthAdapter.ts` + tests: exigir sesión JWT consultada con Auth.getUser y claims válidos; job pertenece al usuario; `signInWithPassword` vuelve a validar contraseña en sesión aislada y signOut local; solo entonces registrar prueba privada, sin exponer contraseña, token ni email. **Sin endpoint HTTP de reauth**, UI A3 OFF.
- Octava migración protegida por aborto transaccional `supabase/drafts/20261009_f14_a3_recent_auth_NOT_APPLIED.sql`: prueba de sesión y propietario, TTL 5 minutos; la puerta worker necesita prueba consumida de una futura transición segura que NO está implementada, por lo que no libera eliminaciones.
- SQL alojado PG_TEMP con rollback: pertenencia y sesión externa, recibo idempotente, prueba sin consumir/rechazada, consumida/fresca permitida, caducada/rechazada, rol normal/rechazado. Ningún dato real alterado. Detalles: `docs/PAZO_F14_A3_REAUTH_GATE_20261009.md`.
- **A3/Scope Gate continúan ABIERTOS**: falta transición atómica para freeze real, cobertura de todas las escrituras, pruebas Edge/Deno con credenciales válidas, Storage/CDN/retención, Auth final. No merge ni despliegue.

## A3 lock-order mitigation DRAFT — 2026-10-09

Décimo archivo SQL propuesto: `supabase/drafts/20261009_f14_a3_interaction_lock_order_NOT_APPLIED.sql`, con guardia de aborto previa al DDL. Corrige una inversión de locks identificada entre la RPC de interacciones (métrica antes de A3) y el AFTER de comentarios (A3 antes de métrica). Conserva SECURITY INVOKER y permisos. El CI estático NO sustituye la prueba de dos conexiones. **No aplicado**, no modifica flags, Edge, Auth, Storage ni borrado; bloqueo del release gate permanece.

## Gate 8 — Auth-last/CASCADE vs write-fence (2026-10-09)

READ ONLY confirmó `profiles.id` FK Auth ON DELETE CASCADE, `pets.owner_id` y `posts.user_id` FK NO ACTION, y `pet_documents.pet_id` FK RESTRICT. En estado A3 `reviewing` el trigger propuesto `a3_write_fence_profiles BEFORE DELETE` rechazaría la cascada del Auth DELETE. Fixture `pg_temp` en Supabase alojado con BEGIN/ROLLBACK **PASS**, comprobó el bloqueo 42501 sin tocar cuentas reales. Ver `docs/PAZO_F14_A3_CASCADE_DELETE_GATE_20261009.md`. **NO habilitar un bypass global de service_role** ni permitir Auth DELETE hasta diseñar cleanup terminal autenticada/lease+evidencia, preservar UGC de terceros, Storage/CDN y probar en DB aislada. Bloqueo de release A3 permanece.

## A3 contrato de planificación terminal, CI (2026-10-09, DRAFT)
Se incorporó un módulo puro de planificación con once etapas ordenadas y bloqueos estructurales inmutables por incompatibilidad entre perfil CASCADE/trigger A3 y job FK RESTRICT. Aunque todos los flags alegados sean true, el modelo no concede permiso de borrado ni accede a Auth/Storage. Se ejecuta con `npm run test:mvp` en CI. El bloqueo exige una implementación posterior de capacidad estrecha servicio+lease, DDL y tests aislados, todos bajo aprobación. `full_write_fence_ready()` sigue false.

## 22. Scope interno transaccional para futura limpieza de perfil (DRAFT, NO INSTALADO)

El undécimo borrador SQL propone `account_private.deletion_terminal_scopes`: `job_id`, UUID del dueño, scope restringido `profile_delete`, identificador efímero de backend y transacción, token/versión del lease y timestamp, sin email, contraseña, ruta de objeto ni contenido. Tabla privada con RLS y grants revocados; está diseñado solo para operaciones service-only verificadas, sin salida a cliente, y se borra al terminar la transacción. **No instalado**, no hay datos nuevos ni nuevo proveedor; no habilita eliminación real ni telemetría adicional.


## A3.6 — Handoff de lease propuesta (2026-10-09, NOT APPLIED)
`supabase/drafts/20261009_f14_a3_terminal_lease_handoff_NOT_APPLIED.sql` define rotación transaccional de token/versión e impedimento de replays al pasar del estado `deleting_data` a `deleting_auth`, sin permitir que un lease solo de revisión sea usado para borrar. Un guard DDL y dos readiness gates false lo hacen inerte. QA sintética `pg_temp` con ROLLBACK PASS para el contrato de handoff; no equivale a prueba de instalación ni a Auth/Storage delete. Falta un protocolo seguro de renovación de lease terminal expirado y la secuencia anterior de limpieza.

## A3.7 — Cuarentena sin retry automático (2026-10-09)

Decimotercer SQL DRAFT `supabase/drafts/20261009_f14_a3_expired_terminal_lease_quarantine_NOT_APPLIED.sql`, inerte por `BEGIN/DO RAISE EXCEPTION` y readiness fija `false`. Invalidaría token+versión de un lease caducado en `deleting_auth` y pasaría a `blocked`, sin emitir credencial nueva ni intentar Auth/Storage. La prueba `pg_temp` QA `scripts/f14-a3-terminal-quarantine-temp-qa.sql` PASS bajo ROLLBACK; CI estático verifica gates, exclusividad y ausencia de deletes. No confundir cuarentena con recuperación completada o resultado externo verificado. Gate 8 permanece abierto.
