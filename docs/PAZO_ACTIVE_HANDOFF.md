# PAZO — ACTIVE HANDOFF | snapshot canónico para nuevo chat

**Verificado:** 2026-10-09, GitHub remoto + Supabase READ ONLY.  
**Orden de autoridad:** `AGENTS.md` → este snapshot → `docs/PAZO_MASTER_ROADMAP.md` → contratos/sub-rutas de módulo → código y estado real GitHub/Supabase. Los apéndices antiguos y PR body extensos son historia; no sustituyen este snapshot. Antes de implementar, **volver a consultar refs, CI, ramas y DB**.

## 1. Activación, rol y filosofía

- **Usuario = Product Owner. ChatGPT = Project Brain / CTO / implementador técnico principal.** Habla español, con decisiones y evidencia, de manera concisa. No delegar desarrollo a Gemini/u otra IA. El usuario valida producto/UI en Antigravity; ChatGPT escribe y audita código, PR, SQL DRAFT, pruebas, seguridad, roadmap y handoffs mediante conectores.
- **Brain OS canónico:** `DigitalAppcorp/project-brain-os` v1.4.1 (main). Este repositorio PAZO es la fuente de verdad de producto. Leer Brain OS `SKILL.md` / `patterns/VERIFIABLE_HANDOFF.md` cuando comience nuevo chat.
- Producto: **PAZO**, red social 18+ para mascotas, lanzamiento piloto inicial Los Ángeles; prioridad **MVP útil y Beta rápida**, ayudar a usuarios antes de monetizar. Stack React + TypeScript + Vite + Router + Tailwind, Supabase y Vercel. Futuro: comunidades, eventos, lugares pet-friendly, servicios, QR, marcas y monetización validada; no ampliar MVP por fantasías futuras.
- **UI NO NEGOCIABLE: CERO CONTORNOS.** No bordes/outlines/rings/strokes ni sombras que dibujen bordes alrededor de cards, botones o containers. Foco accesible con superficies/contraste/subrayado; excepción mínima para campo de entrada justificado. Preservar diseño actual, nada de rediseño sin gate.
- Flujo eficiente: primero auditar rama y estado real; agrupar cambios/tests y reducir comandos/costos/tokens. GitHub actions CI; Vercel Preview históricamente limitado por cuotas/403; no pagar por validaciones evitables. No pedir intervención del PO para fallos que el AI pueda resolver dentro de su autorización.

## 2. Repos, ramas y estados (no confundir desarrollo con producción)

- **PAZO:** `DigitalAppcorp/pazo-app`, `main` verificado **`ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`**, no contiene PR #36/#37/#38. No merge/deploy.
- **PR #36 DRAFT**, `mvp/functional-readiness-20261009`, HEAD `beef7a6850b1b08bb7e656e6910ead592f43feba`: refuerzo Auth/Feed MVP. PO aprobó QA funcional local mayormente; confirmación email y recuperación end-to-end pendiente.
- **PR #37 DRAFT**, `f14/beta-reporting-integration-20261009`, HEAD `9142dbf0af4d8c5ff67891c6d4beedc37193938a`: denuncias 5 superficies, revisión de moderación, cola medios lectura; QA report/dismiss/remove y control acceso moderador. Borrado físico de medios/moderación **NO completo**, Edge purge 503 sin activar. Hay dependencias lógicas de #36.
- **PR #38 DRAFT** [GitHub](https://github.com/DigitalAppcorp/pazo-app/pull/38), `f14/a3-account-deletion-draft-20261009`, último código auditado HEAD **`d512cbce8a5a9946132ce6811aaff905cdc37757`**; último GitHub Actions **#38007005749 SUCCESS** para ese SHA. Basado lógicamente en PR #37 y #36, aunque GitHub base es `main` para ejecutar CI. **Esta es la rama activa** para F14 A3.
- PR #35 F14 master técnico y PR #34 mapa todavía existen; **leer `docs/PAZO_F14_MASTER.md` en rama `f14/block02-moderation-mvp-20261008`**, no asumir que está en la rama #38. No mezclar PR #35 sin auditoría; hay riesgo histórico de regresión dev-only del mapa.
- Windows/Antigravity: worktree de QA visual `C:\Users\osori\Downloads\pazo-visual-qa`; otra worktree `C:\Users\osori\Downloads\pazo-app` tenía cambios sin commit en verificación anterior. **Estado local ACTUAL desconocido**: no reset/stash/overwrite ni presumir que remoto equivale a local. Confirmar antes de indicar comandos.

## 3. F14 A3 — situación precisa

**NO COMPLETA, NO RELEASE, NO MERGED.** El PO autorizó implementar **código y migraciones como borradores** y posteriormente pruebas SQL controladas/reversibles en Supabase alojado. **NO autorizó** aplicar migraciones, desplegar Edge/producción, ejecutar borrados, limpiar datos prebeta, fusionar PR ni cambios de gasto.

**Entregado en PR #38 (solo rama, sin backend aplicado):**
- UI `src/features/account/` de solicitud, preflight, estado/cancelación bajo `VITE_F14_A3_REQUESTS_ENABLED` **OFF**.
- Orquestador `supabase/functions/f14-a3-account-deletion/` (worker/adapter/checks/http/index/reauth y tests): revisión server-only, lease, checkpoint CAS, evidencia fresca, fail-closed. **No es un worker de eliminación real**. Edge `enabled=false`, runtime `PAZO_A3_REVIEW_WORKER_ENABLED` no activado. `@supabase/server` autenticación de clave nombrada `auth:'secret:pazo-a3-review'`, `verify_jwt=false` por formato de secret key, segunda barrera `x-a3-worker-key` (sin credenciales aprovisionadas). Requiere E2E del middleware.
- **9 SQL DRAFT** en `supabase/drafts/20261009_f14_a3_*_NOT_APPLIED.sql`: intake/preflight, archivo privado aportaciones ajenas, worker lease, write fence, community FK, journal CAS, legacy-clear, recibo de contraseña 5 min y transición atómica. **Todos abortan por defecto con excepción transaccional** antes de DDL. No moverlos a migrations sin nuevo gate.
- Último commit `d512cbc`: amplía propuesta de write fence a **26 triggers/tablas** con campos de cuenta/mascota. **Es cobertura propuesta, no verificada como congelación integral**, excluye Storage API, llamadas Edge/RPC privilegiadas, relaciones indirectas y nuevos targets. La transición SQL `f14_a3_full_write_fence_ready()` devuelve **false fijo**; no puede pasar a `reviewing` ni consumir prueba mientras ese gate siga cerrado.
- PostgreSQL alojado: QA de consultas READ ONLY, y tests con **tablas/funciones `pg_temp` sintéticas bajo BEGIN/ROLLBACK**, PASS de intake, idempotencia, archivo cruzado, checks legacy/media, lease/CAS, FK community archive, write fence (14 tablas anteriores), comprobante Auth 5m y transición sintética. **No prueba** ejecución íntegra de nueve migraciones/roles/RLS, carrera entre **dos sesiones**, Deno Edge, ni borrado efectivo. Nuevo guard de 26 tablas fue CI SUCCESS pero no implica PG runtime test integral.
- **Supabase READ ONLY verificado 2026-10-09:** 6 cuentas Auth, 6 mascotas, 1 comunidad, 20 objetos Storage; `account_private.deletion_jobs`, `account_private.deletion_recent_auth` y RPC `f14_a3_service_begin_review(uuid,uuid,uuid)` **ausentes**. Data actuales pre-lanzamiento, no autorizada su limpieza.
- Riesgo de privacidad: 1 post de tercero en comunidad del titular, 6 comentarios ajenos en Feed, 5 comentarios legacy `posts.comments` embebidos, fotos/avatares, documento privado. FKs `ON DELETE CASCADE` de comunidades/posts pueden borrar UGC ajeno; protección/tombstone/archivo 90–180 días son diseños, **no servicio ya activo**. No borrar Auth ni Storage hasta verificar preservación y limpieza de media vía **Storage API**, CDN y sesiones.

**Bloqueos para Gate 8 / A3:** (1) inventario completo de writers/ownership más allá de las 26 tablas; (2) carreras de dos conexiones y transición write-freeze segura, DDL completo en sandbox aislado; (3) reauth bajo flujo real con rate limits y sesión/Auth; (4) conservación de terceros+FK/RLS real y legacy; (5) borrado físico Storage API, URLs/CDN y retries, sin upgrade pagado; (6) revocación/sesiones/JWT, Auth último, backups/retención y E2E. **El módulo está EN PROGRESO**, no hay botón activo para QA de eliminación.

## 4. Próximo paso único y método

**SIGUIENTE (autorizado solo como DRAFT):** auditar el commit HEAD `d512cbc` del write fence ampliado de 14 a 26 tablas: comparar cada columna, trigger y sus dependencias con catálogo de Supabase READ ONLY; detectar falsos bloqueos/targets legacy; realizar pruebas PostgreSQL `pg_temp` con ROLLBACK usando solo fixtures sintéticos y añadir tests regresión. Priorizar matriz de **rutas indirectas, Edge/RPC, Storage**, no declarar freeze completo. Después documentar gate de concurrencia multi-sesión/DB aislada sin ejecutar un apply en PAZO. Resolver bugs del código y test por cuenta propia; pedir permiso solo cuando el siguiente gate requiera modificar backend permanente o hacer acción irreversible.

**Primeras lecturas:** `AGENTS.md`, este handoff, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_F14_A3_RELEASE_GATE_20261009.md`, `docs/PAZO_F14_A3_REAUTH_GATE_20261009.md`, `docs/PAZO_F14_A3_TEMP_PG_QA_20261009.md`, `docs/PAZO_F14_A3_WRITE_FENCE_20261009.md`, `docs/PAZO_F14_A3_DELETION_PREFLIGHT_20261009.md`, y el F14 master de PR #35. Luego inspeccionar PR #38 actual, CI y Supabase con permisos de solo lectura.

## 5. Gatillos de autorización y handoff

- PO puede decir **«sigue», «ok», «dale»**: continuar implementación/pruebas reversibles bajo autorizaciones previas, sin convertirlo en permiso para DDL remoto, deploy, eliminación ni merge.
- **Se necesita autorización específica nueva** para aplicar SQL a PAZO, provisionar claves/Edge, activar UI, borrar datos/Storage/Auth, crear servicios pagos, fusionar PRs o desplegar. No reutilizar autorizaciones antiguas F8 para F14.
- Interfaz de mapas/Comunidades con fake doors e iconos/3D forma parte del scope acordado; preservar lo aprobado. No ampliar ni rediseñar MVP para evitar deuda aspiracional.
- Nuevo chat: leer siempre HEAD remoto, porque el contenido puede haber avanzado desde este checkpoint. Si el GitHub connector falla, **reportar la falla** y conservar el último estado verificable, no afirmar una actualización inexistente.
- Historial previo íntegro: `docs/archive/PAZO_ACTIVE_HANDOFF_PRE_CROSS_CHAT_A3_20261009.md`. Ese historial contiene múltiples notas que describen estados **anteriores**, incluido write fence de 11/14 tablas y autenticación JWT preactualización. **Este snapshot más reciente prevalece**.
