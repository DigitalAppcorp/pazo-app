# PAZO — Active handoff (estado único vigente)

**Verificado para transferencia:** 2026-10-11 (hora del Product Owner) / 2026-10-12 UTC. Última conciliación de solo lectura en proveedores: 2026-10-11, tras commit RC `5cc0e33a`. **Fuente:** GitHub RC + consultas oficiales Supabase de solo lectura + reporte de Codex documentado. No inferir que un CI o un script instalado demuestra ejecución alojada. Cualquier texto histórico discordante queda supersedido por este snapshot y por el estado que muestren los proveedores.

## 1. Identidad, reglas y control

- Producto: **PAZO**, PWA social para mascotas, beta/MVP Los Ángeles. El usuario es **Product Owner** y aprueba decisiones, UX y mutaciones sensibles. **ChatGPT Project Brain** dirige producto, arquitectura, implementación, revisión, Supabase, GitHub y gates; Codex/Computer Use puede ejecutar tareas locales concretas delegadas, pero no altera las autorizaciones ni decisiones vigentes.
- Operating system: `DigitalAppcorp/project-brain-os`, **v1.4.1**. Primero leer `AGENTS.md`, este archivo, `docs/PAZO_MASTER_ROADMAP.md`, subruta de cierre y runbook F14. Reglas permanentes: no inventar decisiones ni declarar PASS sin evidencia; **cero contornos en UI**; minimizar costo/tokens, no repetir pruebas aceptadas.
- Repositorio **`DigitalAppcorp/pazo-app`**. Rama **ÚNICA ACTIVA**: `release/mvp-beta-fast-track-20261010`. HEAD **último verificado antes de este commit de transferencia**: `5cc0e33a606908a2966825f30aa3347a867ee0e3`; el commit de handoff posterior lo avanzará: **consultar siempre HEAD remoto al comenzar**. `main` leído en `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`; **NO tocar ni mergear `main`**. PRs antiguos #34–#38 abiertos hacia `main`: no presumir que la RC esté integrada allí.
- CI de `5cc0e33a`: **SUCCESS** [Actions #38201818944](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38201818944). Volver a comprobar CI del nuevo commit de transferencia; el resultado anterior no certifica automáticamente el siguiente.
- `docs/archive/PAZO_ACTIVE_HANDOFF_PRE_F14_OPERATOR_GATE_20261011.md` conserva **íntegro** el histórico anterior de 44 KB. Si hacen falta decisiones/evidencias viejas, consultar ese archivo y el historial Git. El **handoff activo es este snapshot**, no una cronología.

## 2. Gate actual — F14 / T08 (único paso activo)

**Objetivo:** cerrar la validación real de retirada física de **UN ÚNICO archivo sintético descartable** (foto de una pelota roja), después de publicar, denunciar y despublicar correctamente. **Estado: BLOQUEADO OPERATIVO; NO PASS de borrado físico.**

**Autorización:** el PO dijo explícitamente **«sí»** al ensayo físico irreversible sobre **este único objeto**, con despliegue temporal acotado y reversión. **Sigue vigente; no volver a pedirla para la misma operación** si las precondiciones del procedimiento autorizado permanecen intactas. NO autoriza purga global, otros medios/usuarios, relajación de seguridad, cambio de permisos, publicación beta, Vercel, costes o `main`.

**Identidad exacta de la fixture:**
- Target: `feed_post`, post `140d3769-cde2-47dc-998a-dcb3238b6f17`.
- Storage: bucket `post-photos`, objeto inmutable `b9ef7bf4-9d86-4168-b124-a8b0b272d0c8`.
- Ruta canónica precisa y controles ejecutables: **`docs/PAZO_F14_ONE_OBJECT_HOSTED_EXECUTION_20261011.md`** y `supabase/functions/f14-moderation-purge/trialScope.ts`. No incluir credenciales/JWT en documentos, registros o chats.
- **PASS alojados ya aceptados**: subida única desde usuario legítimo, denuncia desde otra cuenta, moderador genuino despublicó, cola **Moderación → Medios pendientes** visualmente aprobada, `f14_content_visible=false`. Codex ejecutó una vez el SDK oficial `Storage.info()` y verificó **UUID exacto, salida 0**. No repetir estos pasos.
- **Supabase conciliado para este relevo por ChatGPT (READ ONLY; 2026-10-11):** `posts=1`, `community_posts=0`, `reports=1`, denuncia fixture `removed=1`, restricción fixture `pending_review=1`, `media_claims=0`, objeto fixture `post-photos=1` y `pet-avatars=2` intactos.
- Backend ya aplicado: migraciones `20261010222006_f14_media_purge_retry_reconciliation` y `20261011022000_f14_media_url_alias_guard`. **NO reaplicar**.
- Edge alojada **`f14-moderation-purge` v7 ACTIVE**, revalidada con conector oficial para el relevo: bundle de cinco archivos `index.ts`, `core.ts`, `storageInfo.ts`, `publicUrl.ts`, `trialScope.ts`; `verify_jwt=true`. **AMBOS latches hardcoded `F14_MEDIA_PURGE_RELEASE_APPROVED=false` y `F14_TRIAL_PURGE_APPROVED=false`**. Ninguna función destructiva habilitada. Valor del flag alojado `F14_TRIAL_PURGE_ENABLED`: **desconocido/no leído**; no asumir.
- Codex documentó **BLOQUEADO** por incapacidad acreditada del entorno para: invocar la función con una **sesión auténtica de moderador de PAZO**, gestionar el flag alojado de prueba, y garantizar la reversión inmediata. El conector Supabase de ChatGPT permite `deploy_edge_function`/inspeccionar pero **NO invocar como moderador ni administrar secretos**. Codex no modificó ni invocó Edge en su ejecución bloqueada.
- **Próximo paso ÚNICO y preciso:** conseguir/verificar un entorno operador legítimo que tenga **(a)** sesión PAZO autenticada con `f14_is_moderator()=true`, **(b)** capacidad operativa de gestionar y revertir `F14_TRIAL_PURGE_ENABLED`, y **(c)** rollback probado a cinco archivos exactos v7 con ambos latches `false`. Si cualquiera falta, **STOP sin activación**. Una vez acreditado, seguir **exactamente** el runbook de ejecución temporal autorizada, sin alternativa SQL, sin doble invocación, con aislamiento por target+UUID, preflight de referencias/locks/claims, verificación `Storage.info` + HEAD/GET Range original/cache-busted (solo 404/410), y restaurar a OFF incluso ante errores.
- **PASS físico requiere** ausencia real del objeto en Storage y respuestas HTTP concluyentes, estado privado `purged` registrado por RPC (no UPDATE manual), conservación de 2 avatares y auditoría de apagado. Si CDN sigue accesible o hay incertidumbre: **PARCIAL/BLOQUEADO**, sin inventar PASS ni reintentar borrado. No afirmar eliminación de backups o todas las cachés.

### Delta operador — Chrome, 2026-10-12 03:56 UTC

- **Clasificación: Handoff. Resultado: BLOQUEADO operativo; ningún borrado intentado.** HEAD RC leído: `24e3e649f1d2bdf7c8b3b0ddc2c2f89d35a68fa8`. Este cambio documental avanzará el HEAD; no altera código ni el runbook.
- **Acceso recuperado por el complemento oficial de Chrome:** pestaña autenticada del Preview con controles de Moderación y cola de archivos del target autorizado. La cola mostraba revisión manual pendiente y el aviso «La eliminación de Storage continúa desactivada». No se extrajeron credenciales ni se infirió el rol por usar normal/incógnito.
- **Bloqueo preciso:** la UI observada solo ofrece «Actualizar estado». El código RC confirma que esa acción consulta `f14_pending_media`; la única acción que invoca Edge, «Retirar archivo verificado», está condicionada por `VITE_F14_MEDIA_PURGE_ENABLED` y no está disponible en esta sesión. No se acreditó un canal permitido de invocación autenticada como moderador. Acceder a la cola no demuestra por sí solo capacidad de invocar Edge.
- **Administración visible:** Dashboard Supabase del proyecto correcto → Edge Functions → Secrets accesible, formulario de alta/reemplazo visible; la tabla mostró «No custom secrets created», también filtrada por F14. No se guardó ningún secreto, no se leyó ningún valor sensible y no se probó una escritura/reversión. No confundir ver el formulario con acreditar el ciclo completo de rollback.
- **Estado Edge leído por conector:** v7 ACTIVE, `verify_jwt=true`, ambos latches hardcoded `false`, bundle SHA-256 `95a0afb20fe20f9c1f4d13553caab4aaf340873ada9606d29f8cd04f1dcd5393`. No hubo deploys, activaciones, invocaciones ni mutaciones de datos. Se conserva el PASS SDK previo sin repetirlo.
- **Siguiente paso:** proporcionar un entorno operador oficial con invocación SDK desde sesión genuina que cumpla `f14_is_moderator()=true`, gestión reversible del flag server-side y rollback v7 acreditado. El runbook sigue exigiendo STOP antes de activar si falta cualquiera; no habilitar VITE/Vercel, exportar JWT, improvisar SQL ni borrar directamente desde Storage. Las pestañas autenticadas quedan disponibles para continuar.

## 3. Alcance de cierre beta y NO-GO

- Objetivo operativo inmediato: completar F14/T08 con seguridad, después reconciliar únicamente gates de cierre pendientes antes del rediseño visual.
- **F13 (rediseño visual integral): NO INICIADO**, se diseñará con el PO después del gate técnico. **NO-GO** de beta pública y release. `main` y despliegue Vercel público no autorizados.
- T07 eliminación de cuenta: una prueba manual descartable completa ya realizada; cola/solicitud admin visual pendiente. No repetir eliminación E2E.
- T10 recepción real del correo soporte `appdigital.corp@gmail.com`: no confirmada end-to-end; no confundir ausencia de bounces recientes con PASS.
- T17 login en Preview con configuración fail-closed: pendiente de comprobación final. T12 smoke mínimo de rutas afectadas + CI en HEAD final; NO repetir suites generales de módulos aprobados.
- T05 Mapbox/dirección visual funcionaron; 3D con lugares alojados reales no acreditable si no hay datos. T09 PWA iPhone físico pendiente de decisión PO, no cargar esta prueba a Codex. T11 backup/restore local real auditado; no reabrir pruebas de recuperación ya aprobadas.
- Datos alojados actualmente son de ensayo beta; no borrar otras publicaciones, cuentas, avatares, Storage ni alterar perfiles/moderadores. Nada de servicios pagados sin autorización.


**Autoridad para el próximo chat:** este snapshot vigente y el runbook detallado prevalecen sobre banners históricos de las hojas maestras. El PO solicitó transferencia de chat, no ampliar la operación: la única autorización destructiva ya dada sigue limitada a la foto sintética exacta. No crear otra foto, no repetir denuncia ni preflight SDK, no desplegar v8 ni habilitar trial sin acreditar previamente operador legítimo, flag reversible y rollback probado.

## 4. Continuidad / ejecución

- En Windows, `C:\Users\osori\Downloads\pazo-rc` tuvo `Permission denied`; un worktree apuntó a SHA obsoleto y GitHub/npm DNS falló transitoriamente. **El preflight SDK se recuperó y pasó en entorno aislado**, por lo que esos errores antiguos NO bloquean automáticamente trabajo con GitHub/Supabase conectados. Comprobar el acceso local solo si es necesario para el próximo gate.
- No confundir cuenta moderadora con Chrome normal/incógnito: comprobar sesión y RPC, nunca inferir roles de la ventana. **No pedir contraseñas, JWT ni claves en el chat.**
- Ante bloqueo independiente de un agente, documentar y continuar otros gates solo si no interfieren; en un handoff el objetivo prioritario sigue siendo el gate operator F14 anterior.
- Autorizaciones sensibles están ligadas al único objeto y runbook. La autorización genérica no permite improvisar bypass de RLS/claims, SQL destructivo o activar purga de cualquier otro objeto.
- Para verificar estado: GitHub RC actual + Actions exact HEAD, Supabase lectura real, Edge deployed v7, este handoff y runbook. Para recuperar historia: archivo en `docs/archive/` y commits previos.

**Prompt de activación sugerido para próximo chat:** «Activa Project Brain OS desde `DigitalAppcorp/project-brain-os` y PAZO desde `DigitalAppcorp/pazo-app` rama `release/mvp-beta-fast-track-20261010`. Lee AGENTS, el handoff vigente y `docs/PAZO_F14_ONE_OBJECT_HOSTED_EXECUTION_20261011.md`. Audita HEAD/CI/Edge/Supabase y continúa SOLO el gate operativo F14 autorizado, sin repetir QA ni activar purga hasta acreditar operador y rollback. No toques main, Vercel ni F13».

## Auditoría de continuidad — 2026-10-11, sesión actual

- Project Brain OS v1.4.1 leído desde `DigitalAppcorp/project-brain-os/SKILL.md`; su raíz no contiene `AGENTS.md`, que sí existe y fue leído en PAZO. Se leyeron handoff, roadmap maestro, subroadmap de cierre y runbook F14 de la rama RC.
- HEAD remoto RC comprobado mediante GitHub commit API: `3cbfed59cf6c0c4b5130b0e5c226f478610bfbe3` **antes de este commit documental**. GitHub commit combined status: dos checks Vercel `success`; consulta de workflow runs de PR para ese SHA devolvió arreglo vacío, por lo que **GitHub Actions para el SHA no se acredita como PASS**.
- Supabase proyecto `mrybvqdebbgcayuvgkkr` consultado en solo lectura: Storage `post-photos=1`, `pet-avatars=2`, `moderation_private.media_claims=0`, `moderation_private.reports=1`. La fila del UUID `b9ef7bf4-9d86-4168-b124-a8b0b272d0c8` sigue presente en bucket y ruta canónicos. Una primera consulta falló por asumir `public.reports`; el esquema correcto `moderation_private.reports` fue consultado sin modificación.
- Edge `f14-moderation-purge` alojada v7 `ACTIVE`, `verify_jwt=true`, hash `95a0afb20fe20f9c1f4d13553caab4aaf340873ada9606d29f8cd04f1dcd5393`; código alojado inspeccionado: ambos latches `F14_MEDIA_PURGE_RELEASE_APPROVED=false` y `F14_TRIAL_PURGE_APPROVED=false`. ACTIVE no equivale a purga habilitada.
- **GATE F14/T08 BLOQUEADO OPERATIVO**. No hay acreditación en este entorno de (a) invocación Edge con sesión moderadora PAZO genuina, (b) administración reversible del flag server-side, ni (c) restauración operativa demostrada del bundle v7. No se intentaron deploy, invocación, flag, eliminación, nuevas publicaciones/denuncias ni repetición del PASS SDK.
- **Siguiente acción exclusiva:** ejecutar un preflight de capacidades NO destructivo desde un entorno operador oficial con sesión moderadora auténtica, control reversible de secretos y capacidad verificada de restauración del bundle v7. Si no están las tres, STOP; si están, continuar exactamente el runbook ya autorizado sobre el objeto único y desactivar inmediatamente después. No tocar main, Vercel, beta ni F13.
