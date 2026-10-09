# PAZO — ACTIVE HANDOFF | estado verificado 2026-10-09

**Este es el snapshot operativo vigente**, no una cronología. Evidencia: GitHub (estado de PRs/CI) + confirmación del Product Owner en Antigravity/localhost. Historial completo anterior archivado, sin pérdida, en `docs/archive/PAZO_ACTIVE_HANDOFF_PRE_MVP_LOCAL_QA_20261009.md`.

## Fuente de verdad y rol
- Product Owner: usuario; ChatGPT Project Brain es ejecutor técnico. Canonical Brain OS: `DigitalAppcorp/project-brain-os` (versión estable vigente 1.4.1; el `AGENTS.md` histórico refiere 1.3.0 y el patrón de diseño nuevo de Brain OS PR #3 **sigue DRAFT**).
- Leer primero `AGENTS.md`, este handoff, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md` y el scope de cualquier módulo específico antes de actuar.
- **No crear nuevas fases ni rediseñar todo PAZO**. Prioridad del PO: cierre MVP y lanzamiento con mínima demora, tokens y costes.

## F14 beta reporting pilot — scope limitado 2026-10-09

- El Product Owner autorizó seguir el **cierre mínimo previo a Beta** después de aprobar QA funcional local de PR #36. No autorizó desclasificar D3-A ni declarar F14 completada.
- PR [#37](https://github.com/DigitalAppcorp/pazo-app/pull/37) DRAFT, branch `f14/beta-reporting-integration-20261009`. Basado en PR #36 `beef7a6`, no en #35. Código integrado `eda27bc00d4641b0766c85582f75d7ab9a525f19`; CI GitHub Actions `37944094738` SUCCESS; documentación posterior cambia HEAD y exige recheck.
- Frontend conectado a RPC existentes en Supabase para **cinco targets de denuncia** (Feed post/comentario, perfil mascota, Comunidad post/comentario). Acciones solo Auth real; cola de moderador solo tras `f14_is_moderator`. Sin botonera destructiva de Storage, no simular purge.
- F14 migraciones de reportes, guardrails y media ya figuran APLICADAS en Supabase alojado; se consultaron estado de DB, lista de migraciones, Edge y permisos **solo lectura**. `f14-moderation-purge` Edge permanece stub 503. **No cambios de schema, DB, grants, archivos o backend efectuados en este checkpoint**.
- Alerta list_tables «RLS Disabled» cuatro tablas privadas: inspección SQL de ACL confirma `anon` y `authenticated` sin USAGE esquema `moderation_private` ni SELECT/INSERT sobre las cuatro tablas. No demuestra acceso directo, pero tampoco equivale a auditoría completa; revisar RPC SECURITY DEFINER y rutas API. Referencia: `docs/PAZO_F14_BETA_REPORTING_PILOT_20261009.md`.
- PR #37 se apuntó provisionalmente a **main solo para activar CI** (el workflow existente corre solo PR a main); apilado lógicamente sobre PR #36. **No fusionar PR #37 antes de PR #36**, ni asumir base de producción, ni probar medios reales. PR #35/PR #34 separados para reconciliar rollout de Lugares.
- **Next:** QA de reportes en `pazo-visual-qa` usando rama PR #37 (en worktree independiente), solo datos descartables propios, incluyendo 5 targets y moderador; validar también acceso denegado a no-moderador. Después resolver requisitos beta pendientes: D3-A medios/CDN, A3 cuenta, A4 retención/políticas, email real y release env. No limpiar datos ni pagar por automatización.

## Código / estado verificable
- `main`: `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90` al inicio del checkpoint; **no contiene todavía PR #36**.
- **PR #36 DRAFT**, `mvp/functional-readiness-20261009`. Último código + reglas QA confirmadas en commit `b49ecd33b8d451056d3a5f2e26baf216a9662967`. Este handoff documental quedará en un commit posterior de la misma rama: comprobar GitHub HEAD en vivo. GitHub Actions `37935882305` **SUCCESS** sobre `b49ecd3`; volver a comprobar CI del HEAD documental.
- PR #36: Feed con paginación íntegra y error/retry, mensajes demo solo en demo, registro/confirmación de correo, recuperación de contraseña, carga segura de mascotas, QA UI proporcional y regla de cero contornos.
- **PR #35 DRAFT** (`f14/block02-moderation-mvp-20261008`), F14 A2 PAUSADA/NO TERMINADA. No mezclar ni desplegar en bloque: contiene guard `PLACES_MAP_DEVELOPMENT_ONLY=import.meta.env.DEV` que podría reemplazar Mapa real con fake door en build no-dev. **PR #34** de Places también está OPEN; revisar antes de cualquier integración. PR #33 de hardening fue MERGED.
- Vercel tiene dos estados `build-rate-limit` para PR #36 y el acceso al equipo `digitalapp` devolvió 403 en auditoría previa. **No pagar upgrades ni hacer desplegues en bucle**. Production y local no son el mismo checkout.

## Aceptación local reportada por PO (2026-10-09)
- PO abrió Antigravity/PowerShell en `C:\Users\osori\Downloads\pazo-visual-qa`, checkout worktree detached de `b49ecd3`, y abrió la app en `localhost` con **frontend local / Supabase alojado en producción**. No hay Supabase local y **no es necesario para aceptación visual**.
- PASS reportado por PO: login/pantalla de recuperación (sin evidencia de envío+clic de enlace real), Feed/scroll, vista de mensajes sin chats falsos, publicar texto, like/unlike, save/unsave, comentario con F5, perfil ajeno, seguir/dejar de seguir con F5. PO confirmó también que **los demás módulos le funcionan**; no atribuir pasos específicos no detallados ni extender esto a QA de seguridad.
- Resto de evidencia: `docs/PAZO_MVP_LOCAL_ACCEPTANCE_20261009.md`. **No repetir smoke funcional sin regresión concreta**.
- Carpeta original `C:\Users\osori\Downloads\pazo-app` tenía cambios **sin commit** en F14 reportados por PO. Protegerlos: no reset, clean, stash, switch ni sobrescribir. La carpeta `pazo-visual-qa` es worktree independiente.

## Reglas inamovibles de producto
- **CERO CONTORNOS** para botones, contenedores, tarjetas y similares, incluso focus-visible; excepción localizada solo en field de texto si hace falta. Accesibilidad mediante fondo/contraste/subrayado, no rings/outline. `AGENTS.md` #21 y `docs/PAZO_UI_QUALITY_GATE.md`.
- Mantener utilidad real y funciones aprobadas; fake doors transparentes; mensajes ficticios nunca en cuenta real; Mapa real F8 no debe apagarse silenciosamente.
- Producción Supabase contiene datos de prueba del PO. No limpiar, borrar, ejecutar SQL/migraciones o activar infraestructura facturable sin el gate correspondiente.
- Respetar privacidad, RLS, políticas 18+, coste mínimo, sin session replay ni GPS preciso en telemetría.

## Bloqueos previos a beta externa (NO son fallos del smoke local)
1. **Auth email completo:** confirmar enlace de registro/recuperación y Redirect URLs permitidos en navegador real; en pruebas anteriores solo se abrió formulario, no consta QA de clic de enlace.
2. **F14 y privacidad:** capacidades mínimas de reportar/retirar contenido y solicitudes de eliminación de datos verificables; políticas públicas y retención coherentes con implementación. A2 Gate 8 aún abierto, no prometer borrado CDN o completo.
3. **Release:** reconciliar PR #36 y branches #34/#35, CI de HEAD, Mapa real vs cost/rollout, entorno de despliegue/variables, pruebas móviles y smoke en artefacto de release. Vercel está bloqueado por rate-limit.
4. **Diseño fino:** feedback PO sobre espacio field/botón en login/recuperación queda para F13; foco de teclado/reduced-motion no explícitamente probado. **No bloquear avance por esto** salvo regresión de usabilidad real.

## Aceptación visual PO de denuncias — 2026-10-09

- PO confirmó `git log -1 --oneline` = `b184a66` en `pazo-visual-qa`, confirmó botón `Denunciar perfil` en otra mascota y después validó con «listo» la ronda visual de cinco superficies/formularios del PR #37. **Aprobación visual local; no envío de denuncias ni prueba de cola real.**
- Se dejó el checkout de frontend con Supabase alojado; nunca pedir Docker/Supabase local para ver cambios. Carpeta original `pazo-app` contiene cambios no confirmados de F14, preservarlos.
- El siguiente gate requiere 2 cuentas descartables controladas (usuario denunciante/autor y cuenta moderadora ya autorizada), sin usar contenido ajeno ni activar eliminación; no confundir review visual con seguridad de API.

## Próxima acción única
Preparar **release-readiness check** acotado de PR #36, sin reabrir módulos; verificar CI actual y separar qué puede integrarse ahora de los bloqueos reales de beta pública. Antes de merge/deploy, detenerse en gate de autorización PO. Retomar F14 mínimo solo con decisión/gate aprobado, sin asumir que su rama es apta para producción.
