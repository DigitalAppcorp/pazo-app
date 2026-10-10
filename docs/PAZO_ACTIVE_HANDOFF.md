# PAZO — ACTIVE HANDOFF | snapshot de continuidad, 2026-10-10

**Fuente canónica:** GitHub `DigitalAppcorp/pazo-app`, rama `f14/beta-reporting-integration-20261009`, PR **#37 DRAFT**.  
**Project Brain OS:** `DigitalAppcorp/project-brain-os`, versión estable **1.4.1**; leer `SKILL.md` y `patterns/VERIFIABLE_HANDOFF.md`.  
**Snapshot:** auditoría de solo lectura de GitHub + Supabase alojado `mrybvqdebbgcayuvgkkr` el 2026-10-10. **Handoff previo completo archivado:** `docs/archive/PAZO_ACTIVE_HANDOFF_BEFORE_RESET_20261010.md`.

## Estado actual, verificado — LEER ANTES DE HACER CAMBIOS

**Se autorizó una limpieza de datos de prueba conservando seis cuentas existentes de Supabase Auth.** La verificación posterior del proveedor encontró:
- **6 `auth.users`, 6 `auth.identities`; las cuentas se conservaron.** Nueve sesiones registradas en Auth; ello no prueba que el inicio de sesión/onboarding funcione.
- **0 filas en las 39 tablas de aplicación auditadas** de `public`, `account_requests_private`, `community_private` y `moderation_private` (consulta de conteo exacto por tabla, no aproximaciones). Incluye `profiles=0`, `pets=0`, `posts=0`, `post_comments=0`, `communities=0`, `community_posts=0`, `interactions=0`, `moderator_grants=0`, `deletion_requests=0`, `media_claims=0`, `pet_places=0`.
- **0 objetos en Storage**, cinco buckets existentes sin archivos: `post-photos`, `pet-avatars`, `pet-documents`, `community-avatars`, `community-post-photos`.
- **NO se volvió a ejecutar ninguna limpieza durante este handoff.** El agente comprobó estado final con SELECT; **no se ha verificado procedencia, hora exacta ni método del borrado anterior**, ni eliminación de copias en CDN. No afirmar que este chat lo ejecutó, ni repetirlo.
- Las tablas, migraciones, RLS/RPC y las seis identidades de Auth siguen existiendo. **No reconstruir contenido antiguo; los datos de antes de la limpieza eran fixtures**, no usuarios externos definitivos.
- **Impacto a revisar:** `profiles` y `pets` están vacíos; el login debe permitir rehacer/onboardear una mascota y un perfil de modo seguro. `moderator_grants` y el catálogo `pet_places` también están vacíos; comprobar estados vacíos y flujo de reposición legítimo, sin repoblar automáticamente datos viejos.

## Git y evidencia

- **PR activo:** [PAZO #37](https://github.com/DigitalAppcorp/pazo-app/pull/37) DRAFT; rama `f14/beta-reporting-integration-20261009`. HEAD de código auditado **antes de este commit documental**: `c647fb6687c3d3aaba4e5e9ac259f86d90155371`; GitHub CI de ese commit **PASS #38031627641**.
- **`main` auditado:** `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`; PR #37 **NO merged**. Otros PR abiertos: #38 (A3 DRAFT), #36 (funcional DRAFT), #35 (moderación DRAFT), #34 (Lugares abierto). No confundir sus cambios con main ni fusionarlos implícitamente.
- **Nuevo chat:** recuperar HEAD vigente y CI de #37 tras leer este snapshot (puede diferir por el commit de handoff). Estado de working tree de Antigravity/Windows: **DESCONOCIDO**; no afirmar que está sincronizado.
- Vercel/producción web **no se han desplegado desde este lote**; su estado runtime actual no se validó. No ejecutar deploy ni merge por defecto.

## Backend aplicado y pendientes

**Migraciones APLICADAS en Supabase alojado:** `20261010043307_f14_media_jwt_claim_compat_single_test` (corrección de JWT), `20261010045708_f14_account_request_intake` (request/status/cancel), `20261010053708_f14_community_ownership_continuity` (rol admin, oferta/aceptación, archivo server-only, owner FK SET NULL). La tabla `community_private.ownership_transfer_offers` existe pero sin ofertas vigentes, como consecuencia del reset.

**NO APLICADA:** `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql` (hilos “Autor eliminado”, FKs de posts, restricciones y triggers de solo lectura, RPC de redacción). El código del PR está preparado y compiló en `BEGIN/ROLLBACK`, pero no existe `author_deleted_at` ni `pazo_redact_social_threads` en la base alojada. **No aplicar por la aprobación de la política solamente; requiere gate PO separado.**

**Moderación/Storage:** Edge `f14-moderation-purge` **v5, verify_jwt=true y purge global OFF** (`F14_MEDIA_PURGE_RELEASE_APPROVED=false`); sin bypass para foto. Antes del reset existían 14 medios de publicación y una claim held; **ya no están** en el inventario actual. No seguir instrucciones antiguas de “retirar foto de prueba”, porque ese objeto ya no está en Storage.

## Decisiones de producto cerradas

- PAZO = MVP social de mascotas, utilidad y adopción antes de monetización; Product Owner prioriza **terminar MVP rápido** y reducir pruebas repetidas, costo y tokens. El AI es ejecutor técnico, PO valida solo decisiones y prueba visual inaccesible para conectores.
- Todos los datos alojados antes del lanzamiento eran **de prueba**. El PO autorizó borrarlos **excepto las seis cuentas de Auth**. Conservar cuentas/credenciales; no hacer `deleteUser`, ni re-crear nuevas cuentas por defecto.
- Si el propietario de una comunidad sale: **transferir a administrador solo con aceptación explícita**; sin aceptación, archivar preservando aportes de terceros. El backend de continuidad ya está aplicado, pero sus pruebas de archivo después del despliegue y UX visual aún pueden quedar abiertas.
- Si se elimina una cuenta con publicaciones comentadas por otras personas: **retirar texto/fotos/datos del autor, mantener las respuestas de terceros bajo “Autor eliminado”**. Código en PR #37 y SQL solo DRAFT; no confundir decisión aprobada con eliminación de cuenta completa.
- Cuentas 18+, no exponer datos privados, no capturar GPS exacto en analytics, privacidad/Terms definitivos pendientes. Identidad visual alegre de PAZO; **cero bordes/contornos** salvo justificación individual de campos. Leer `AGENTS.md` y `docs/PAZO_UI_QUALITY_GATE.md`.

## Gate abierto, riesgos y límites

**El reset de fixtures está reflejado en DB; no repetirlo.** Antes de declarar MVP listo: confirmar login de una cuenta retenida, recuperación de perfil/mascota desde cero, estados vacíos de Feed/Comunidades/Lugares/moderación, y consistencia de las migraciones aplicadas; verificar solo efectos del reset (no repetir pruebas que ya pasaron). Las verificaciones visuales hechas antes del reset siguen documentadas, pero no prueban la experiencia con cero perfiles.

**Eliminación definitiva de cuenta no está implementada ni autorizada para ejecutar.** Las tres RPC de solicitud existen, pero no hay worker seguro de Auth/Storage. La migración de “Autor eliminado” es solo borrador. Política y términos públicos finales requieren responsable legal/contacto/retención y QA antes de beta pública. No convertir el backend vacío en evidencia de E2E de eliminación de cuenta.

**Límites de autorización:** no tocar Vercel, no mergear PRs/main, no crear recursos de pago, no ejecutar nuevos borrados masivos ni eliminar Auth, no aplicar migraciones nuevas sin gate específico. Actualizaciones técnicas y documentales reversibles dentro de la rama activa sí; conservar seguridad básica e inspeccionar la realidad antes de actuar.

## ÚNICA SIGUIENTE ACCIÓN

**Auditar y asegurar el flujo de arranque/login/onboarding con `auth.users` preservado pero `profiles`, `pets` y demás datos vacíos**: revisar `src/App.tsx`, flujo de Auth y CreatePet; corregir el caso sin nuevas migraciones si es posible; usar CI y, solo si es imprescindible para aceptación del reset, una prueba local corta del PO. No sembrar datos anteriores automáticamente. Luego continuar la ruta de cierre MVP desde este gate.

**Nuevo chat — activación sugerida:**
> Activa Project Brain OS v1.4.1 desde `DigitalAppcorp/project-brain-os`. Continúa PAZO en `DigitalAppcorp/pazo-app` PR #37 DRAFT, rama `f14/beta-reporting-integration-20261009`. Lee `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_MASTER_ROADMAP.md` y la ruta F14 correspondiente. Audita HEAD, CI y Supabase de solo lectura. Ya se verificaron 6 Auth y 0 filas de app / Storage después de reset aprobado: **no repitas el borrado**. Empieza por login/onboarding tras limpieza; continúa autónomamente dentro de los gates sin Vercel ni merge.

## Auditoría incremental del gate login/onboarding — 2026-10-10

- PR #37 seguía DRAFT, HEAD de entrada `eeb2283931edf2c07934e79d1d84a6db146b1e74`, CI #38033515133 SUCCESS. Brain OS v1.4.1 recuperado de `SKILL.md` y `patterns/VERIFIABLE_HANDOFF.md`.
- SELECT remoto de solo lectura: `auth.users=6`, `auth.identities=6`, `public.profiles=0`, `public.pets=0`, `storage.objects=0`. Sin borrados, nuevas cuentas, migraciones ni cambios en Vercel/main.
- `src/App.tsx`: `fetchOwnedPets` distingue lista vacía de error de red; la lista vacía redirige a A03 de creación de mascota y un error muestra reintento sin perder sesión. `create_pet_profile` actual usa `auth.uid()` y crea mascota vinculada directamente a `auth.users` (FK `pets_owner_id_fkey`). Este examen de código/SQL NO equivale a QA autenticada E2E.
- Riesgo específico tras reset: `profiles` carece de política INSERT para `authenticated`; el trigger `on_auth_user_created` solo se activa al crear una cuenta Auth nueva. No usar un INSERT cliente no autorizado ni re-crear cuentas; evaluar necesidad real de restaurar perfil en el gate posterior, sin DDL sin autorización.
- Corrección reversible en la rama: `OnboardingView` detecta sesión autenticada y sustituye el botón «Volver» desde A03 hacia formulario de alta A02 por «Sesión recuperada»; evita invitar accidentalmente a crear una segunda cuenta cuando una retenida no tiene mascotas. Commit `a6d5a412873778d7903eaa43ebb8351f6fbbf4bb`. CI de este commit y aceptación visual no se presuponen.
- Próxima acción única: revisar CI del HEAD final y validar en local con **una** cuenta Auth retenida el login → A03 → creación de mascota → recarga F5, sin repetir suites previas ni crear cuenta nueva. Corroborar si `profiles` realmente se requiere para el flujo y remediar con gate separado si exige migración. No marcar MVP listo aún.
