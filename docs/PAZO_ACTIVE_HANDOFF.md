# PAZO — Active handoff (estado único vigente)

**Verificado:** 2026-10-11 (hora del Product Owner) / 2026-10-12 UTC. **Fuente:** GitHub RC + consultas oficiales Supabase de solo lectura + reporte de Codex documentado. No inferir que un CI o un script instalado demuestra ejecución alojada. Cualquier texto histórico discordante queda supersedido por este snapshot y por el estado que muestren los proveedores.

## 1. Identidad, reglas y control

- Producto: **PAZO**, PWA social para mascotas, beta/MVP Los Ángeles. El usuario es **Product Owner** y aprueba decisiones, UX y mutaciones sensibles. **ChatGPT Project Brain** dirige producto, arquitectura, implementación, revisión, Supabase, GitHub y gates; Codex/Computer Use puede ejecutar tareas locales concretas delegadas, pero no altera las autorizaciones ni decisiones vigentes.
- Operating system: `DigitalAppcorp/project-brain-os`, **v1.4.1**. Primero leer `AGENTS.md`, este archivo, `docs/PAZO_MASTER_ROADMAP.md`, subruta de cierre y runbook F14. Reglas permanentes: no inventar decisiones ni declarar PASS sin evidencia; **cero contornos en UI**; minimizar costo/tokens, no repetir pruebas aceptadas.
- Repositorio **`DigitalAppcorp/pazo-app`**. Rama **ÚNICA ACTIVA**: `release/mvp-beta-fast-track-20261010`. HEAD **de referencia en la auditoría previa al handoff**: `b2db18f91c2dd71880c3be5611185bae553ce1f3`; los commits de archivo/resumen posteriores avanzan este SHA: **consultar HEAD remoto de nuevo al comenzar**. `main` leído en `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`; **NO tocar ni mergear `main`**. PRs antiguos #34–#38 abiertos hacia `main`: no presumir que la RC esté integrada allí.
- CI para ese HEAD auditado: **SUCCESS** [Actions #38200749391](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38200749391). Volver a comprobar CI del HEAD resultante de este handoff; un resultado del padre no valida automáticamente sus commits posteriores.
- `docs/archive/PAZO_ACTIVE_HANDOFF_PRE_F14_OPERATOR_GATE_20261011.md` conserva **íntegro** el histórico anterior de 44 KB. Si hacen falta decisiones/evidencias viejas, consultar ese archivo y el historial Git. El **handoff activo es este snapshot**, no una cronología.

## 2. Gate actual — F14 / T08 (único paso activo)

**Objetivo:** cerrar la validación real de retirada física de **UN ÚNICO archivo sintético descartable** (foto de una pelota roja), después de publicar, denunciar y despublicar correctamente. **Estado: BLOQUEADO OPERATIVO; NO PASS de borrado físico.**

**Autorización:** el PO dijo explícitamente **«sí»** al ensayo físico irreversible sobre **este único objeto**, con despliegue temporal acotado y reversión. **Sigue vigente; no volver a pedirla para la misma operación** si las precondiciones del procedimiento autorizado permanecen intactas. NO autoriza purga global, otros medios/usuarios, relajación de seguridad, cambio de permisos, publicación beta, Vercel, costes o `main`.

**Identidad exacta de la fixture:**
- Target: `feed_post`, post `140d3769-cde2-47dc-998a-dcb3238b6f17`.
- Storage: bucket `post-photos`, objeto inmutable `b9ef7bf4-9d86-4168-b124-a8b0b272d0c8`.
- Ruta canónica precisa y controles ejecutables: **`docs/PAZO_F14_ONE_OBJECT_HOSTED_EXECUTION_20261011.md`** y `supabase/functions/f14-moderation-purge/trialScope.ts`. No incluir credenciales/JWT en documentos, registros o chats.
- **PASS alojados ya aceptados**: subida única desde usuario legítimo, denuncia desde otra cuenta, moderador genuino despublicó, cola **Moderación → Medios pendientes** visualmente aprobada, `f14_content_visible=false`. Codex ejecutó una vez el SDK oficial `Storage.info()` y verificó **UUID exacto, salida 0**. No repetir estos pasos.
- **Supabase verificado de nuevo por ChatGPT (READ ONLY):** `posts=1`, `community_posts=0`, `reports=1`, denuncia fixture `removed=1`, restricción fixture `pending_review=1`, `media_claims=0`, objeto fixture `post-photos=1` y `pet-avatars=2` intactos.
- Backend ya aplicado: migraciones `20261010222006_f14_media_purge_retry_reconciliation` y `20261011022000_f14_media_url_alias_guard`. **NO reaplicar**.
- Edge alojada **`f14-moderation-purge` v7 ACTIVE**: bundle de cinco archivos `index.ts`, `core.ts`, `storageInfo.ts`, `publicUrl.ts`, `trialScope.ts`; `verify_jwt=true`. **AMBOS latches hardcoded `F14_MEDIA_PURGE_RELEASE_APPROVED=false` y `F14_TRIAL_PURGE_APPROVED=false`**. Ninguna función destructiva habilitada. Valor del flag alojado `F14_TRIAL_PURGE_ENABLED`: **desconocido/no leído**; no asumir.
- Codex documentó **BLOQUEADO** por incapacidad acreditada del entorno para: invocar la función con una **sesión auténtica de moderador de PAZO**, gestionar el flag alojado de prueba, y garantizar la reversión inmediata. El conector Supabase de ChatGPT permite `deploy_edge_function`/inspeccionar pero **NO invocar como moderador ni administrar secretos**. Codex no modificó ni invocó Edge en su ejecución bloqueada.
- **Próximo paso ÚNICO y preciso:** conseguir/verificar un entorno operador legítimo que tenga **(a)** sesión PAZO autenticada con `f14_is_moderator()=true`, **(b)** capacidad operativa de gestionar y revertir `F14_TRIAL_PURGE_ENABLED`, y **(c)** rollback probado a cinco archivos exactos v7 con ambos latches `false`. Si cualquiera falta, **STOP sin activación**. Una vez acreditado, seguir **exactamente** el runbook de ejecución temporal autorizada, sin alternativa SQL, sin doble invocación, con aislamiento por target+UUID, preflight de referencias/locks/claims, verificación `Storage.info` + HEAD/GET Range original/cache-busted (solo 404/410), y restaurar a OFF incluso ante errores.
- **PASS físico requiere** ausencia real del objeto en Storage y respuestas HTTP concluyentes, estado privado `purged` registrado por RPC (no UPDATE manual), conservación de 2 avatares y auditoría de apagado. Si CDN sigue accesible o hay incertidumbre: **PARCIAL/BLOQUEADO**, sin inventar PASS ni reintentar borrado. No afirmar eliminación de backups o todas las cachés.

## 3. Alcance de cierre beta y NO-GO

- Objetivo operativo inmediato: completar F14/T08 con seguridad, después reconciliar únicamente gates de cierre pendientes antes del rediseño visual.
- **F13 (rediseño visual integral): NO INICIADO**, se diseñará con el PO después del gate técnico. **NO-GO** de beta pública y release. `main` y despliegue Vercel público no autorizados.
- T07 eliminación de cuenta: una prueba manual descartable completa ya realizada; cola/solicitud admin visual pendiente. No repetir eliminación E2E.
- T10 recepción real del correo soporte `appdigital.corp@gmail.com`: no confirmada end-to-end; no confundir ausencia de bounces recientes con PASS.
- T17 login en Preview con configuración fail-closed: pendiente de comprobación final. T12 smoke mínimo de rutas afectadas + CI en HEAD final; NO repetir suites generales de módulos aprobados.
- T05 Mapbox/dirección visual funcionaron; 3D con lugares alojados reales no acreditable si no hay datos. T09 PWA iPhone físico pendiente de decisión PO, no cargar esta prueba a Codex. T11 backup/restore local real auditado; no reabrir pruebas de recuperación ya aprobadas.
- Datos alojados actualmente son de ensayo beta; no borrar otras publicaciones, cuentas, avatares, Storage ni alterar perfiles/moderadores. Nada de servicios pagados sin autorización.

## 4. Continuidad / ejecución

- En Windows, `C:\Users\osori\Downloads\pazo-rc` tuvo `Permission denied`; un worktree apuntó a SHA obsoleto y GitHub/npm DNS falló transitoriamente. **El preflight SDK se recuperó y pasó en entorno aislado**, por lo que esos errores antiguos NO bloquean automáticamente trabajo con GitHub/Supabase conectados. Comprobar el acceso local solo si es necesario para el próximo gate.
- No confundir cuenta moderadora con Chrome normal/incógnito: comprobar sesión y RPC, nunca inferir roles de la ventana. **No pedir contraseñas, JWT ni claves en el chat.**
- Ante bloqueo independiente de un agente, documentar y continuar otros gates solo si no interfieren; en un handoff el objetivo prioritario sigue siendo el gate operator F14 anterior.
- Autorizaciones sensibles están ligadas al único objeto y runbook. La autorización genérica no permite improvisar bypass de RLS/claims, SQL destructivo o activar purga de cualquier otro objeto.
- Para verificar estado: GitHub RC actual + Actions exact HEAD, Supabase lectura real, Edge deployed v7, este handoff y runbook. Para recuperar historia: archivo en `docs/archive/` y commits previos.

**Prompt de activación sugerido para próximo chat:** «Activa Project Brain OS desde `DigitalAppcorp/project-brain-os` y PAZO desde `DigitalAppcorp/pazo-app` rama `release/mvp-beta-fast-track-20261010`. Lee AGENTS, el handoff vigente y `docs/PAZO_F14_ONE_OBJECT_HOSTED_EXECUTION_20261011.md`. Audita HEAD/CI/Edge/Supabase y continúa SOLO el gate operativo F14 autorizado, sin repetir QA ni activar purga hasta acreditar operador y rollback. No toques main, Vercel ni F13».
