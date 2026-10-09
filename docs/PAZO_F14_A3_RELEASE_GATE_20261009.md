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
