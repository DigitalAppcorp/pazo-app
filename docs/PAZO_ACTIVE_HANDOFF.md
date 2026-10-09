# PAZO — ACTIVE HANDOFF / SNAPSHOT OPERATIVO

**Verificado:** 2026-10-08 local / 2026-10-09 UTC. Último apply F14 A2 20261009054411; verificar HEAD, CI y DB nuevamente antes de nuevas operaciones.
**Sistema de trabajo:** [Project Brain OS v1.4.1](https://github.com/DigitalAppcorp/project-brain-os), `SKILL.md` + `patterns/VERIFIABLE_HANDOFF.md`.
**Product Owner:** define visión, prioridades y aceptación visual; IA/ChatGPT realiza análisis, arquitectura, código, GitHub, Supabase, QA técnico y handoffs.
**MODO TEMPORAL:** `hosted-first` para MVP en Preview controlado, sin pedir terminal/descargas ni delegar a otra IA; al lanzar reevaluar local-first.

## 1. Fuente de verdad, Git y alcance

- Repositorio: `DigitalAppcorp/pazo-app`.
- **Rama activa F14 A2:** `f14/block02-moderation-mvp-20261008`. La rama ha recibido commits técnicos/documentales posteriores a `6073e270`; consultar HEAD/CI actual, no asumir SHA del snapshot.
- `main` observado: `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90` (distinto de la rama F14).
- Único PR abierto observado: **#34** `product/places-demand-validation`, sobre Lugares y **no relacionado** con F14. No se encontró PR F14 abierto en esta consulta; verificar de nuevo.
- Históricamente hubo dos checks **SUCCESS** sobre `594e1c9`, pero los últimos commits quedaron sin CI PASS por límite de builds. Preview F14: https://vercel.com/digitalapp/pazo-app-t83r/55Qz33nsAyzbBBkgrFraRAAyr8qc . El resultado CI no prueba que el usuario haya ejecutado el botón de QA.
- **No merge a main ni publicación oficial de PAZO**. Los deploys automáticos de rama/Preview no equivalen a lanzamiento.
- Working tree local de Antigravity, commits locales no empujados: **desconocidos** en este punto; no inferir que GitHub contiene trabajo local no observado. Pedir solo si el trabajo siguiente depende de ello.
- Reglas: `AGENTS.md`, `docs/PAZO_MASTER_ROADMAP.md`, `docs/PAZO_F14_MASTER.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`, `docs/PAZO_DATA_INVENTORY.md`, `docs/PAZO_ARCHITECTURE_CONTRACT.md`.
- Este snapshot sustituye el estado cronológico anterior; historial íntegro archivado en `docs/archive/PAZO_ACTIVE_HANDOFF_THROUGH_20261009.md`. Consultar archivo solo si falta evidencia específica.

## 2. Estado de producto y etapa

PAZO es una red social de mascotas orientada inicialmente a Los Ángeles, 18+, con núcleo real: Feed, perfiles públicos de mascotas, Comunidades, Lugares/mapa, búsqueda global y utilidades para mascotas. Producto: **ayudar primero, validar uso/aceptación antes de monetizar**; extensiones de insignias, eventos, servicios y patrocinios sujetas a su gate. No confundir MVP validatorio con alcance futuro completo.

**Módulo activo:** F14 (confianza, moderación y privacidad), Bloque 02 **A2 EN CURSO, Gate 8 ABIERTO**. F14 A3/A4 no autorizados. Fases 8 Lugares y 12 Búsqueda ya figuran cerradas en sus documentos; no reabrir sin evidencia.

## 3. Evidencia pasada que NO hay que repetir

- **Denunciar → Descartar**: PO lo probó con sesión real en Preview; reporte y acción verificados en Supabase. Fixture temporal limpiada por ID exacto.
- **Denunciar → Despublicar**: PO lo probó con sesión real; `report.status=removed`, acción auditada, restricción creada; consultas SQL como `anon`/`authenticated` ocultaron la publicación retirada y mantuvieron otras legibles. Fixture de texto sin medios eliminada de forma controlada.
- **Clasificación de medios:** migración alojada `20261009010551_f14_media_status_presence_guard` PASS. Publicaciones Feed/Comunidad sin fotos no crean falsas tareas de archivo; con medios sí; perfil de mascota conservador.
- **Reservas privadas de medios:** migración `20261009014616_f14_media_claim_preflight` aplicada. Tablas `moderation_private.media_claims/media_claim_events`; RPCs `f14_prepare_media_claim` y `f14_recheck_media_claim` `service_role` únicamente. Pruebas reversibles para rutas nuevas/históricas, idempotencia, expiración, drift, referencias compartidas, host externo. Candidato `candidate_only`, NUNCA autorización para borrar.
- **Bloqueo de escrituras sobre rutas reservadas:** migración `20261009040957_f14_storage_held_media_guard` instalada; políticas RESTRICTIVE para INSERT/DELETE de usuario autenticado sobre rutas de Feed/Comunidad con reserva activa; conserva políticas originales, no aplica a `service_role`, no es CAS completo entre servicios.
- **Autorización Auth REAL (PO screenshots)**: dos cuentas distintas, `Normal` y `Moderadora`, **6/6 PASS ambas**, con versión estricta del comprobador que exige SQLSTATE `42501` en accesos prohibidos (commit `38a2bcc`). No pedir de nuevo esa prueba. Runner CLI de dos JWT independientes es evidencia separada y no fue ejecutado; la prueba visual de navegador sí pasó.
- Inspector V2 de medios/estudio de rutas/29 casos sintéticos preparado; no implica borrado seguro.
- Estas pruebas NO equivalen a validación global de CDN, retención o contenido con archivos. A2 NO cerrado.

## 4. Backend/Storage comprobado justo antes del handoff

**Supabase PAZO:** proyecto `mrybvqdebbgcayuvgkkr` (endpoint hospedado, no BD local). Consulta de solo lectura más reciente:
- 0 denuncias, 0 restricciones, 0 reservas, 0 eventos de reservas;
- 1 moderador;
- **20 objetos Storage**. Una auditoría anterior tenía 19: objeto adicional no atribuido, **no tocarlo ni asumir que es de prueba**.
- Buckets: `post-photos`, `pet-avatars`, `community-post-photos`, `community-avatars` (públicos) y `pet-documents` (privado). No borrar documentos.
- Edge `f14-moderation-purge` desplegada en versión 1 como **stub HTTP 503 sin código de eliminación**. No activarla.
- Restricciones SQL sobre post no invalidan URLs públicas ya conocidas. La documentación oficial de Supabase indica que eliminación de bytes se hace mediante Storage API, nunca SQL DELETE en `storage.objects`; la propagación Smart CDN puede tardar ~60 s y cachés del navegador pueden persistir.
- No existe aún confirmación segura de eliminación por objeto+versión/claim, ni un CAS transaccional efectivo que abarque DB + Storage API, ni verificación de borrado CDN. **NO declarar media `purged` usando `f14_confirm_media_cleanup(kind,id)`**: es insuficiente.

## 5. ÚLTIMA ACEPTACIÓN VISUAL — STORAGE SINTÉTICO: PASS

**2026-10-08 local, confirmación del Product Owner con captura real del Preview F14.** El panel `Prueba aislada de Storage F14` mostró:
- PASS cuenta autenticada;
- PASS imagen artificial de 1 píxel creada;
- PASS archivo localizado por Storage API;
- PASS eliminación del archivo sintético y ausencia confirmada por Storage API.

**Verificación adicional directamente en Supabase (solo lectura):** `storage.objects` mantiene 20 objetos, `post-photos/%/f14-storage-probe-%` tiene **0**, `moderation_private.media_claims` 0, eventos 0, reportes 0 y restricciones 0. No se generó un nuevo borrado ni se modificó contenido de usuarios. Una sexta mascota aparece en recuento agregado de `pets` (anteriormente cinco); procedencia desconocida, NO tratarla como fixture ni limpiarla.

**Gate visual aislado CERRADO.** No volver a pedir al PO que pulse el botón. **A2 global permanece ABIERTO**: esto no prueba `service_role`, claim real, carrera entre DB/Storage, objeto de contenido retirado ni CDN.

### Checkpoint de migración alojada autorizada — F14 A2

**Autorización explícita del PO en el chat actual:** aplicar el endurecimiento SQL de `held` + `RESTRICTIVE UPDATE` + `recheck` fail-closed; avanzar autónomamente en pasos técnicos no visuales. Esta aprobación NO habilita borrado de medios reales, activación de Edge, plan pagado, merge/main ni lanzamiento oficial.

**Supabase PAZO: APLICADA y VERIFICADA** versión remota `20261009054411_f14_held_media_fail_closed_recheck_update_guard`. Archivo canónico `supabase/migrations/20261009054411_f14_held_media_fail_closed_recheck_update_guard.sql`; borrador SQL anterior retirado de `supabase/drafts/`.

Garantías efectivas:
- `public.f14_storage_media_path_unclaimed` bloquea `INSERT/DELETE` existentes y la nueva política `UPDATE` para rutas con `claim.status='held'`, aunque haya caducado `expires_at`; otros buckets/rutas mantienen su política vigente.
- `public.f14_recheck_media_claim` devuelve `false` para expiración/drift sin invalidar automáticamente la reserva. Dejará reservas `held` bloqueadas hasta resolución explícita y auditada; esa recuperación operativa **aún no existe**.
- Privilegios conservados: `recheck` ejecutable solo por `service_role`; helper de RLS solo `authenticated`, nunca `anon`. Ningún cambio a `f14_confirm_media_cleanup`.

**Pruebas después del apply**:
- `supabase/tests/database/f14_storage_held_update_installed_rollback.test.sql`: PASS, `BEGIN/ROLLBACK`, con roles SQL simulados: `UPDATE` de ruta libre permitido bajo grant sintético temporal, `held` denegado, expiración/drift de recheck no liberan, invalidación explícita libera.
- `supabase/tests/database/f14_storage_held_insert_guard_installed_rollback.test.sql`: PASS; `INSERT` a ruta `held` falla con `42501`, ruta libre permitida; helper reporta denegación de ruta `held` para política DELETE. **Intento SQL DELETE directo** fue rechazado por `storage.protect_delete()` (comportamiento correcto de Supabase); no eludirlo ni tomarlo como validación HTTP DELETE.
- Smoke SQL `anon` y `authenticated` lectura pública de `post-photos`: PASS.
- Storage `20` objetos, `0` claims/eventos/reportes/restricciones; dos políticas restrictivas anteriores y nueva UPDATE intactas; Security Advisor sin hallazgos nuevos atribuibles a este cambio.
- Edge `f14-moderation-purge` verificada directamente versión 1 HTTP **503**, sin métodos para eliminar Storage. `service_role` **bypassa RLS** en la prueba sintética: riesgo restante, no superado.

**CI/frontend:** los checks Vercel recientes están fallando por `build-rate-limit`; NO implican fallo de TypeScript ni demuestran build PASS. No comprar recursos. `npm run verify` del último HEAD no ejecutado en sesión. Git: solo rama F14 A2, sin merge ni release. El Product Owner ya validó el ciclo sintético de Storage visualmente; NO repetir.

**Riesgos que bloquean cierre A2:** no existe CAS confirmado para borrar el objeto activo por versión; `service_role` elude RLS; operaciones HTTP in-flight y MOVE/COPY/UPSERT requieren gate de seguridad; caché CDN y D3-B todavía sin evidencia; reserva `held` necesita recuperación explícita controlada; la función antigua `f14_confirm_media_cleanup(kind,id)` **NO** puede marcar `purged` de forma segura.

## 6. Autorizaciones, límites y forma de colaborar

La última indicación del PO: **«tienes toda la autorización en todos los pasos que no necesiten una aprobación visual mía»**. Esto permite avanzar autónomamente en F14 A2 con auditoría técnica, cambios de código en rama, verificaciones reversibles y mantenimiento documental, sin micro-preguntar cada paso. El PO solo debe probar flujo visual/decisiones de producto; GPT es responsable técnico y no delega a otra IA.

**No interpretar autorización general como permiso para**: borrar fotografías/documentos de usuarios, desplegar purga real, borrar/modificar otras cuentas, crear recursos pagados, desplegar producción oficial, cambiar políticas de retención de forma sustantiva, merge de `main` ni saltar a F14 A3/A4. Respetar aprobaciones remotas de `AGENTS.md`: explicar siempre alcance/risgo de mutaciones sensibles y pedir aprobación específica si aplica. No repetir debates aprobados o pedir claves/JWTs al usuario.

Trabajo con conectores GitHub/Supabase/Vercel; no exigir PowerShell/descarga/Antigravity cuando se pueda hacer directamente. Español claro, directo, enfoque producto+seguridad, pocas listas, sin emojis decorativos. Conservar un historial verificable y ahorrar tokens. No inventar decisiones. Al reportar: separar CI, SQL role simulations, sesión Auth real, QA visual, deploy y release.

### Checkpoint de seguridad posterior — operaciones COPY y confirmación antigua

**Nueva autorización PO:** ejecución técnica autónoma dentro de F14 A2. Se aplicaron dos migraciones alojadas **sin operaciones sobre bytes de Storage**:

- `20261009055801_f14_held_media_copy_source_operation_guard`: política `SELECT RESTRICTIVE` solo para `authenticated` en las operaciones Storage `object.copy`, `s3.object.copy` y `s3.upload.part_copy`; deniega origen de copia `held` y conserva lectura/listado normal (buckets públicos incluidos). Prueba rollback + prueba contra migración instalada PASS con objeto/metadatos sintéticos. Código canónico `supabase/migrations/20261009055801_f14_held_media_copy_source_operation_guard.sql`.
- `20261009055955_f14_disable_unverified_media_purge_confirmation`: desactiva la función antigua `public.f14_confirm_media_cleanup(text,uuid)` con error `42501` y revoca EXECUTE incluso a `service_role`. Impide declarar `purged` sin prueba de objeto/versión. Prueba rollback + prueba contra función instalada PASS. Código canónico `supabase/migrations/20261009055955_f14_disable_unverified_media_purge_confirmation.sql`.

Los borradores originales se retiraron tras canonizarlos. El control está documentado en `scripts/f14-moderation-check.mjs`. **Última auditoría alojada:** 20 objetos Storage, 0 claims, 0 denuncias, 0 restricciones; 1 política COPY, 1 política UPDATE y 2 guardas anteriores presentes. Edge `f14-moderation-purge` sigue versión 1, HTTP 503, sin eliminación. `service_role` aún evade las políticas RLS y no existe CAS interservicio.

**Límites reales:** estas son simulaciones SQL de contexto `storage.operation`; NO se ejecutó COPY/MOVE/DELETE HTTP con cuenta auténtica bajo claim real. La política COPY impide un flujo interno autenticado contemplado por las operaciones oficiales, pero NO revoca URLs públicas ni copias obtenidas fuera de Storage. No reintentar QA visual de un píxel; ya PASS.

**CI:** Vercel ha marcado builds de rama por `build-rate-limit`; no comprar upgrade ni presentar esos checks como PASS. `npm run verify` de HEAD final continúa sin evidencia.

## 7. SIGUIENTE GATE F14 A2 — exclusión cross-service y recuperación segura

**Responsable: AI Project Brain.** Protección COPY y bloqueo de confirmación sin pruebas ya aplicados; continuar con revisión de escritores `service_role`, exclusión real de operaciones HTTP en vuelo y protocolo de recuperación de reservas `held` sin liberar un delete in-flight. Toda prueba adicional con imágenes debe ser aislada y no debe involucrar medios de usuarios. Preparar código/tareas no destructivas solo cuando sean verificables. El plan `supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md` continúa siendo marco preliminar, no autorización de borrar.

**Puntos de detención:** no realizar Storage DELETE de contenido ajeno, ni activar Edge, ni marcar `purged`, ni autorizar una nueva migración sensible fuera del alcance recién aprobado, ni publicar oficialmente Vercel, ni fusionar main, ni pasar a F14 A3/A4. Mantener la revisión manual como salida fail-closed si la API no ofrece exclusión demostrable. La siguiente aceptación visual del PO se pedirá solo si una prueba funcional visible nueva la necesita.

**Estado git:** consultar el HEAD remoto real de `f14/block02-moderation-mvp-20261008` tras estos commits de documentación; rama local del Product Owner no observada. `main` y PR #34 (Lugares) no fueron alterados.


## 8. Checkpoint CI + moderación segura

PR #35 DRAFT en GitHub (sin merge). GitHub Actions CI sobre SHA `da619f905fc77f934158e8eb4f9656c93110ea5b`: SUCCESS, verificaciones governance, build y lint no bloqueante; run `37892668372`. Vercel sigue bloqueado por límite de builds; no hay evidencia de Preview nuevo.

Supabase migración `20261009061213_f14_reject_unverified_purged_status` aplicada y en Git: trigger que impide `media_status='purged'` no certificado. Las pruebas SQL reversibles previas y posteriores pasaron. 20 objetos Storage conservados, 0 claims y 0 restricciones. Edge de purga sigue HTTP 503.

Se retiró el botón inoperante de eliminación del panel `ModerationMediaQueue`; ahora solo muestra revisión administrativa pendiente y permite recargar. Se retiró la invocación desde `reportingService`. La nueva vista transpila JSX y compiló en el workflow de GitHub; falta aceptación visual del PO cuando Vercel publique un Preview actualizado. No repetir pruebas Auth ni Storage sintético, previamente aprobadas.

Siguiente gate: evaluar si el MVP usa revisión manual con contenido despublicado o requiere eliminar físicamente medios. La exclusión entre Storage y escritores privilegiados, la comprobación exacta de versión y la caché CDN aún no están demostradas. F14 A2 abierto. `main` y A3/A4 pendientes.


## 9. Aceptación visual de panel F14 A2 — 2026-10-09

PO envió captura real del Preview `dpl_6iFoQUQ9QVYi8JBzR2FDWKtmmnRE` (READY; SHA `a650dd8`). **Visual PASS** para título `Revisión de archivos`, mensajes precisos de revisión administrativa y URLs públicas, estado vacío coherente con backend, botón `Actualizar estado` y ausencia de acción de purga. **No repetir esta QA**; no implica que el botón se haya pulsado ni prueba de reportes no vacíos, Storage bytes, CDN o concurrencia.

GitHub CI para SHA `a650dd8`: SUCCESS. PR #35 sigue DRAFT, sin merge. Supabase 20 objetos, 0 claims/reportes/restricciones, Edge HTTP 503. **A2 continúa abierto:** D3-A exige verificación de eliminación en Storage además de despublicación; la vista manual no sustituye ese requisito. Falta contrato seguro entre DB y Storage, comprobación de origen/CDN y reconciliación de alcance. No iniciar A3/A4 ni publicar producción.


## 10. Gate técnico A2 — comprobación de versionId exacto (pendiente de sesión real)

La referencia actual de Supabase para `remove` confirma que `{path,versionId}` selecciona versión exacta **actual o archivada**, a diferencia del borrado sólo por ruta. No equivale a certificación en el proyecto PAZO. Se incorporaron:

- `supabase/drafts/f14_media_purge_v2/exactVersionPreflight.mjs`: inspector **puro, sin I/O**, coherencia de identidad y versión entre claim/objeto actual/medio; siempre `candidate_only` con `mayDelete:false` o `manual_review`, nunca autorización de borrado.
- `exactVersionPreflight.test.mjs` incorporado a `npm run test:f14`, con fallos ante expiración, versiones divergentes, referencia no exclusiva y metadata cambiada.
- `src/features/moderation/F14VersionProbe.tsx`: ensayo **opt-in en Preview** con archivo artificial `uid/f14-version-probe-UUID.png`, elimina primero versión deliberadamente errónea (que debe dejar intacta la actual) y luego versión exacta, comprobando ausencia en origen por Storage API. En caso de interrupción sólo se permite intentar limpiar ese archivo sintético bajo la misma sesión. No usa servicio privilegiado, fotos de usuarios ni modifica moderación.
- `SafetySettings.tsx` expone el botón nuevo únicamente en `pazo-app-t83r` Preview, separado del anterior `F14StorageProbe` ya aprobado. Las pruebas estáticas de regresión impiden un borrado por ruta de medios personales.

**Estado:** suite Node/CI deberá comprobarse en último HEAD; Preview nuevo y **QA de versión exacta aún no ejecutada por PO**, no inventar PASS. Supabase no recibió migraciones ni operaciones de Storage durante este checkpoint. 20 objetos previos se mantienen como inventario esperado, confirmar lectura al finalizar. El avance de A2 depende de confirmar comportamiento `versionId` y luego examinar concurrencia/service_role + CDN; Edge 503 y bloqueo `purged` permanecen. No solicitar repetir la prueba anterior del píxel ni el panel manual aprobados.


### A2 Version-id QA: CI aprobado, Preview pendiente por límite de Vercel

Supabase Storage en PAZO (lectura real): los cinco buckets declaran `versioning_status=DISABLED`, pero los 20 objetos existentes tienen identificador de versión de 36 caracteres; **NO cambiar versionado de buckets**. Referencia SDK actual documenta `remove([{path,versionId}])` como selección de versión exacta vigente/archivada, **aún no probado en este proyecto con HTTP real**.

El último código `F14VersionProbe` se compiló y las pruebas automatizadas de `exactVersionPreflight` pasaron mediante GitHub Actions `37895742885` sobre `2e8a32c` (**CI SUCCESS**). Una solicitud de despliegue Preview del mismo SHA a `pazo-app-t83r` fue rechazada por Vercel: HTTP **402**, `api-deployments-free-per-day`, más de 100 deploys, `retryAfter=86400` segundos. La posterior búsqueda por SHA encontró **0 Previews** de esa versión. No repetir llamadas ni contratar plan para eludir la cuota. Vercel no ha desplegado la nueva UI.

**Next gate:** cuando se restablezca la cuota, crear **un único** Preview desde el último SHA con CI verde y comprobar READY; pedir al PO que pulse `Prueba de versión exacta F14` una vez y comparta captura. Si falla, sólo reintentar desde la misma cuenta para limpiar su fixture; no marcar PASS. La ejecución anterior del botón `Prueba aislada de Storage F14` ya pasó y no debe repetirse.

Estado seguro: sin migraciones en esta iteración, Storage 20/claims 0/reportes 0/restricciones 0, Edge purga 503, trigger de estado `purged` activo, PR #35 DRAFT. A2 continúa ABIERTO. No automatizar borrado de medios ajenos basado solo en este nuevo test.


### F14 A2 — Corrección de recuperación exacta, sin Preview nuevo

En continuidad técnica se auditó el último código de `F14VersionProbe` y se eliminó una regresión potencial: la recuperación después de interrupción usaba `storage.remove([path])`, operación no vinculada a la versión previamente observada. **Ahora nunca hay borrado por ruta sola**: `sessionStorage` guarda `path + objectId + versionId` después de comprobarlos; una recuperación compara los tres con `storage.info` y solo solicita `remove([{path,versionId}])` si coinciden. Si se interrumpe entre upload y lectura de identidad, la recuperación falla cerrada y puede dejar únicamente la imagen sintética pendiente; no se elimina nada sin evidencia suficiente. El mensaje de UI ya no promete recuperación automática en ese caso.

Se corrigió error TypeScript TS2339 causado por un `as typeof previous` que infería `null`: ahora se analiza JSON como `unknown` y se valida antes de usarlo. GitHub Actions de la revisión intermedia `37896620408` falló **por compilación**; se corrigió el problema. Run siguiente `37896731396`: **SUCCESS**. También se vinculó en `exactVersionPreflight.mjs` cada `claim.kind` al bucket respectivo para evitar mezclar Feed y Comunidad, con dos casos regresivos nuevos; CI `37896853637`: **SUCCESS**.

**Entorno:** `pazo-app-t83r` último Preview verificado para la rama sigue con SHA `df833ab`, anterior a la incorporación de `F14VersionProbe`. La petición de Preview del nuevo código sigue bloqueada por límite gratuito `api-deployments-free-per-day`; NO marcar QA por versión real ni decir al PO que ya está la prueba en ese Preview. Existe automatización previa de reintento controlado de Preview al restablecer la cuota: no duplicar ni evadir el límite. Supabase sin migraciones ni operaciones de Storage en esta continuación; recuento consultado: 20 objetos, 0 claims/reportes/restricciones.

**Próximo gate sin repetir aprobaciones:** tras recuperar cuota, verificar CI del SHA actual y desplegar UN Preview de rama, verificar SHA/READY y entonces pedir prueba sintética específica de versión exacta al PO. Luego analizar exclusión concurrente y CDN; no activar Edge real ni declarar `purged`, no merge a main/A3/A4.


### F14 A2 — evidencia adicional de eliminación condicional por versión (auditoría upstream)

Se inspeccionó el código fuente abierto `supabase/storage` (`src/storage/object.ts` y `src/storage/database/pg.ts`): la ruta `deleteObjects([{path,versionId}])` invoca `deleteObjectVersions`, que condiciona el `DELETE` transaccional de metadata a `bucket_id + name + version`, y solo intenta borrar bytes de las filas afectadas. Concreta la protección frente a sustituciones en el mismo path; **NO verifica aún el binario/servicio alojado de PAZO, ni la gestión de errores de Storage, CDN o escrituras de terceros**. Ver detalles y enlaces en `supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md`.

Auditoría SQL PAZO de solo lectura: `storage.objects` tiene índice único de `(bucket_id,name,version)` e índice único de objeto actual para `archived_at IS NULL`. Los 20 objetos actuales tienen 20 versiones distintas, sin paths duplicados por bucket; cinco buckets `versioning_status=DISABLED`. Claims, reportes y restricciones: 0; no se modificaron archivos ni schemas.

El código de `F14VersionProbe` ahora recupera un fixture interrumpido solo con ID y versión exactos guardados y comprobados; si no hay evidencia, **falla cerrado**. Dos regresiones adicionales en `exactVersionPreflight` rechazan combinación incorrecta tipo Feed/Comunidad con bucket de otra clase. GitHub CI para `9925107579b2837338854526088623e6f7229b3b` terminó SUCCESS (`37896853637`). En este checkpoint un run anterior falló por TS2339, corregido y verificado SUCCESS en `37896731396`.

**Gate activo:** falta publicar Preview que contenga `F14VersionProbe` y ejecutar QA sintético autenticado con versión equivocada/correcta, además de simular carreras de escrituras privilegiadas e invalidación CDN. Vercel Free fue bloqueado por 402 `api-deployments-free-per-day`; hay un reintento futuro ya programado, no crear tareas duplicadas ni evadir límite. Mantener el proyecto sin purge Edge, sin `purged`, sin merge, sin A3/A4.


### F14 A2 — revisión CDN observacional y robustez de test HTTP sintético (2026-10-09)

**Auditoría agregada Supabase (solo lectura):** hay 4 buckets públicos (`community-avatars`, `community-post-photos`, `pet-avatars`, `post-photos`) y 1 privado (`pet-documents`). Los 20 objetos observados guardan metadata `cacheControl=max-age=3600`. Esto supone riesgo de caché de navegador en medios retirados y no equivale a una garantía de permanencia exacta de una hora. La documentación oficial de [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn) describe invalidación para Pro+ y persistencia de caché de navegador; [CDN purge](https://supabase.com/docs/guides/storage/cdn/purge-cdn-cache) solo Pro+, con secretos de servidor. **No comprar ni activar planes ni bajar TTL globalmente sin evaluar egress/costo.** Referencia de diseño: `supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md`.

`F14VersionProbe`, ejecutable solo desde Preview por interacción explícita, añade una **observación no certificante** del CDN del propio píxel artificial: precarga la URL pública de prueba, verifica la ausencia del origen después de `remove([{path,versionId}])` y consulta una vez con `cacheNonce` y `cache:no-store`, mostrando HTTP observado o no disponible, jamás PASS global CDN. Cada consulta tiene límite de 5 s. Un `useRef` de exclusión sincrónica evita dos test simultáneos por doble clic; las verificaciones estáticas exigen esas guardas. **No se ha ejecutado este nuevo test en sesión de navegador ni desplegado Preview de ese SHA**, por cuota Vercel gratuita pendiente.

Regresiones de código y docs se continúan comprobando con GitHub Actions. Backend no mutado en esta iteración: última lectura 20 objetos, 0 claims/reportes/restricciones, políticas y trigger de bloqueo presentes; Edge `f14-moderation-purge` sigue versión 1 HTTP 503, PR #35 DRAFT. **Gate activo:** esperar cuota de Preview (hay tarea de reintento ya programada), QA opt-in de versión exacta y observación CDN, auditar concurrencia service-role/Storage y cerrar D3-A sin reclasificar revisión manual como borrado certificado.


### F14 A2 — retired legacy Preview Storage probe

La prueba anterior `F14StorageProbe` (1 píxel, `remove([path])`) **ya tenía PASS del PO**. Se retiró su montaje de `SafetySettings.tsx` y se eliminó el componente obsoleto `src/features/moderation/F14StorageProbe.tsx` para impedir nuevas ejecuciones innecesarias o confusión con la prueba por versión exacta. La evidencia histórica de ese PASS sigue en el historial de Git y en este handoff. `scripts/f14-moderation-check.mjs` ahora rechaza explícitamente que el viejo componente reaparezca. El nuevo `F14VersionProbe` continúa solamente en Preview y **aún no ha sido ejecutado por el PO**.

La rama sigue `f14/block02-moderation-mvp-20261008`, PR #35 DRAFT sin merge. Último Preview Vercel identificado sigue `df833ab` y **no contiene** la prueba por versión: no enviar ese enlace para QA. El reintento de cuota ya está programado y no se duplicará. No se hicieron migraciones, cambios de bucket, borrados reales ni cambios de plan.

### F14 A2 — preflight de evidencia alojada, sin nuevos privilegios

Se desarrolló un adaptador **puro** `hostedClaimEvidence.mjs` (y `hostedClaimEvidence.test.mjs`) que reconcilia columnas reales de `media_claims.snapshot`, reporte, restricción, `storage.objects` y `f14_media_probe` **fresco** más los contadores actuales de referencias antes de producir una candidatura no destructiva. Rechaza drift de autor, mascota/comunidad, URL, versión, ID, metadata, fuente, reportes y referencias compartidas. Nunca marca `mayDelete:true`. Integrado en `npm run test:f14` y governance CI.

Falló el primer run `37899973726` por error en regex UUID creada en el adaptador (faltaba un grupo). Se corrigió inmediatamente; run `37900073363` **SUCCESS**. La revisión que exige un nuevo `f14_media_probe` actual pasó en run `37900262964` **SUCCESS**. No implica ni demuestra CAS/lock cross-service o borrado en Storage. Detalles y las precondiciones de lectura transaccional en `supabase/drafts/f14_media_purge_v2/CAS_AND_RETENTION_GATE.md`.

Se confirmó previamente: último Preview READY de la rama sigue en `df833ab` y no incorpora `F14VersionProbe`; cuota Vercel limita el deploy y hay reintento programado, no duplicar. Supabase antes de la nueva comprobación seguía con 20 objetos, 0 claims/reportes/restricciones, protección COPY y trigger contra falsas purgas activos; Edge 503. **Sin migraciones ni cambios en bytes** en este gate. PR #35 DRAFT, no merge a `main`, A2/D3-A abiertos, A3/A4 no iniciados.


### F14 A2 — consulta SQL integrada de evidencia (2026-10-09)

Se añadió `supabase/drafts/f14_media_purge_v2/hosted_claim_evidence_readonly.sql`: `SELECT` privado parametrizado por `claim_id` para recuperar la reserva, restricción, reporte (solo id/tipo/estado), metadatos Storage exactos (sin bytes), `f14_media_probe` recién recalculado, conteos independientes de referencias y hora de servidor. Su resultado se diseñó para alimentar el inspector no destructivo `hostedClaimEvidence.mjs`. Solo debe utilizarse en un backend de confianza; jamás exponerse al navegador ni a roles públicos. Como `f14_media_probe` usa locks `FOR SHARE`, un test con filas positivas podría requerir una transacción que permita locks; su `SELECT` no ejecuta DML.

**Comprobación alojada:** se preparó y ejecutó el SQL mediante `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; PREPARE ...; EXECUTE` con un claim UUID sintético inexistente y `ROLLBACK`. Primer intento detectó ambigüedad de precedencia entre `||` y `->>`; corregida. Segundo intento compiló y devolvió `[]` (coherente con cero claims). **Solo prueba schema/sintaxis y la rama sin filas; NO prueba `f14_media_probe` con filas reales ni exclusión HTTP.** No se almacenó ni modificó contenido.

`hosted_claim_evidence_readonly.test.mjs` exige `SELECT` parametrizado, campos limitados y ausencia de DML/descripciones de reportes; integrado en `npm run test:f14`. GitHub Actions `37901053491` SUCCESS sobre `ade50f90a4ca000630bc25e69eb4dbe4314f172c`. Sin cambios al backend ni Storage: últimas cifras 20 objetos, 0 claims/reportes/restricciones, Edge 503, trigger contra `purged` activo. F14 A2 sigue ABIERTO; falta caso positivo transaccional sintético, ensayo HTTP real `versionId`, carreras/recuperación y CDN. Vercel sigue sin Preview reciente, existe una automatización previa de reintento: no duplicar despliegues.


## F14 A2 — Checkpoint de pruebas con expediente sintético y límite del contrato privado

**Autorización del PO:** ejecutar autónomamente los pasos técnicos de F14 hasta sus gates de aceptación; esta instrucción no convierte pruebas insuficientes en PASS ni autoriza una eliminación de medios reales carente de exclusión demostrada. La rama sigue `f14/block02-moderation-mvp-20261008`, PR #35 DRAFT.

**Pruebas realizadas en Supabase PAZO bajo `BEGIN ... ROLLBACK`** (sin archivos físicos ni filas persistentes):
- **Feed con foto sintética: PASS.** Se creó un post/report/restricción/claim/metadata de Storage transaccional con un pet y propietario existentes solo para satisfacer FK; `moderation_private.f14_media_probe` produjo instantánea válida, la consulta `hosted_claim_evidence_readonly.sql` recuperó reserva+fuente+objeto y contadores 1/1; al retirar la URL del post, el nuevo probe pasó a `null` JSON como esperaba el contrato.
- **Comunidad con foto sintética: PASS.** Se utilizó una comunidad y su autor/mascota existentes únicamente como FK dentro de rollback. Se confirmó `community-post-photos`, `url_reference_count=1`, `community_path_count=1` y equivalencia de snapshots; al poner **ambos** `photo_url` y `photo_storage_path` en NULL, el probe pasó a `null` y el contador de path a cero. Un primer fixture omitía `author_pet_id`; se corrigió. Un test posterior intentó borrar solo `photo_storage_path` y chocó correctamente con CHECK `community_posts_photo_pair`; se corrigió el fixture para preservar la regla de campos emparejados.
- En el primer test Feed, la aserción falló por confundir el `null` de JSONB con el `NULL` SQL; se ajustó y pasó. Las fallas transaccionales no persistieron datos.
- **Privilegios:** `service_role` tiene `EXECUTE` sobre `public.f14_prepare_media_claim`, pero no tiene `USAGE` del esquema `moderation_private`; la lectura privilegiada privada directa no funcionará desde el SDK habitual. Para convertir la consulta de solo lectura en una acción del backend haría falta una interfaz expresamente limitada a servicio, auditada y autorizada, sin abrir permisos del esquema privado. El intento de preparar ese cambio en GitHub fue rechazado por controles de seguridad de la herramienta; **no se instaló RPC ni se cambió grants**. No eludir esta barrera.

**Código y CI:** `hostedClaimEvidence.test.mjs` se amplió con pérdida/deriva de fuente; `hosted_claim_evidence_readonly.test.mjs` ahora exige el contrato `REPEATABLE READ` con locks (no `SET TRANSACTION READ ONLY`). Workflow `37902465901` SUCCESS para `ce5c0b223526e0a37d976aa0329bfadbde2917b3`; los commits documentales siguientes requieren su propio check. Una herramienta bloqueó versionar el archivo SQL completo del fixture positivo: **los PASS son evidencia de ejecución alojada de esta sesión, no parte reproducible del CI todavía**.

**Backend final tras rollback:** 20 objetos Storage, 0 claims, 0 eventos, 0 reportes, 0 restricciones; `f14_confirm_media_cleanup` continúa inaccesible y `f14-moderation-purge` estacionada en HTTP 503. **Sin migraciones, eliminación física, gastos, main merge, publicación ni A3/A4 en este checkpoint.** Últimos Previews Ready son anteriores al nuevo `F14VersionProbe`; Vercel tiene reintento de cuota programado. Siguiente gate real: prueba HTTP autenticada de `versionId` con píxel sintético cuando haya Preview, coordinación entre escritores privilegiados y Storage, diseño de lectura de evidencia de servicio sin acceso público, recuperación segura de holds y CDN/retención. F14 A2 / D3-A siguen ABIERTOS.

## F14 A2 — Gate independiente de 5 tipos, Preview ya disponible (2026-10-09)

**Autorización PO vigente:** mantener A2/D3-A abierto hasta QA real de Storage por versión y exclusión/CDN; continuar autónomamente los controles independientes. No iniciar implementación A3/A4 ni fusionar `main` mientras DoD A2 esté incompleto.

**Preview recuperado, NUEVA evidencia:** Vercel `dpl_7sfQj6vL7LrKuT9QCkyp6LRkSSVW` está `READY` en `https://pazo-app-t83r-j26th5vav-digitalapp.vercel.app`, commit `ac167b43bd39df1a272d10a8e925e38381b58c96`, GitHub Actions `37902074443` SUCCESS. Se comprobó leyendo exactamente ese commit que `SafetySettings` monta `F14VersionProbe` solo en el Preview aislado. **Por primera vez hay un enlace válido para el nuevo QA HTTP de versión exacta.** Se solicitó al PO pulsar el ensayo de píxel sintético una vez y compartir captura cuando pueda. No se ha recibido resultado de esa prueba en este turno. El Preview no incorpora commits independientes posteriores, pero sí el componente de ensayo.

**Prueba integrada alojada de moderación por cinco tipos PASS y ahora reproducible:** `supabase/tests/database/f14_five_report_kinds_hosted_rollback.test.sql`, ejecutada con `BEGIN/ROLLBACK`. Escoge únicamente FK existentes y crea un comentario sintético de Comunidad dentro de la transacción. Usa un usuario autenticado **sin grant de moderador** para enviar reportes sobre `feed_post`, `feed_comment`, `pet_profile`, `community_post` y `community_comment`: exactamente 5 aceptados. Verifica duplicado rechazado por SQLSTATE 23505, sexto reporte rechazado por límite 5/24h con SQLSTATE 22023; además, denegación de `f14_moderation_queue` y `f14_review_report` con SQLSTATE 42501 para el reportante normal. Simula un moderador autorizado distinto y descarta los cinco reportes; comprueba cinco estados `dismissed`, cinco acciones auditadas y ninguna restricción creada. **Todo fue revertido**, sin archivos ni cambios persistentes en posts/pets/reportes. Primer archivo SQL tuvo error de ambigüedad de variable vs columna, corregido y prueba alojada PASS. `scripts/f14-moderation-check.mjs` exige el archivo y su ROLLBACK.

**Límites:** esta es prueba SQL con roles y JWT emulados dentro de una transacción, no cinco flujos visuales reales ni garantía sobre tokens. QA Auth real separada ya fue aprobada para dos roles. A2 sigue abierto por purga verificable, coordinación service_role/Storage, CDN y acceso restringido a evidencia. No instalar RPC privada saltando bloqueos de seguridad. PR #35 sigue DRAFT y Edge destructiva HTTP 503.

### F14 A2 — Prueba RLS de los cinco objetivos con roles reales de Postgres (2026-10-09)

Se añadió `supabase/tests/database/f14_five_target_visibility_hosted_rollback.test.sql`: selecciona fuentes existentes para FK y un comentario sintético de Comunidad. **Antes de aplicar restricciones**, el rol `authenticated` podía leer Feed post, comentario de Feed, mascota, post de Comunidad y comentario de Comunidad. Durante la misma transacción se añadieron cinco filas de moderación sintéticas `media_status='none'`; **después los cinco recursos dejaron de ser visibles** al rol autenticado. El rol `anon` tampoco pudo leer el Feed post/comentario ni el perfil de mascota retirados. PASS en Supabase alojado, `ROLLBACK` final, sin publicar ni borrar recursos reales. No se comprobó visualmente en navegador, y las Comunidades son de acceso Auth por diseño.

Se amplió la prueba reproducible `f14_five_report_kinds_hosted_rollback.test.sql`: cinco denuncias de cuenta normal autenticada, rechazo SQLSTATE 23505 de duplicado y 22023 de sexta denuncia/24h, denegación 42501 de cola/decisión moderadora a la cuenta normal; cinco `dismiss` por moderador distinto y cinco acciones auditadas. PASS bajo `ROLLBACK`. Ambas pruebas están versionadas y protegidas por `scripts/f14-moderation-check.mjs`; **GitHub Actions del HEAD después del checkpoint debe confirmarse**.

**Cierre:** la matriz backend SQL/RLS de los cinco targets supera el gate técnico de emisión de denuncias, autorización y despublicación sintética; no sustituye UX visual de cada objetivo ni elimina la incertidumbre de bytes Storage y CDN. Preview versión exacta `ac167b4` READY, PO aún no reportó resultado de `F14VersionProbe`. Edge de purge permanece 503. F14 A2/D3-A siguen abiertos, A3/A4 sin implementación, PR #35 DRAFT.


## F14 A2 — QA HTTP REAL de versión exacta aprobado por Product Owner (2026-10-09, ~08:32 UTC)

**Evidencia directa:** el PO compartió captura del ensayo `F14VersionProbe` desde Vercel Preview `pazo-app-t83r`; el botón aparece `Prueba completada` y la interfaz registra estos cuatro hitos como PASS: (1) imagen artificial creada, (2) ID y versión del objeto leídos de Storage, (3) intento con `versionId` incorrecto dejó intacta la versión actual, (4) eliminación por `versionId` exacto y ausencia confirmada en origen mediante `storage.info` y `storage.list`. Mensaje final visible: `PASS de la prueba aislada; NO equivale a una purga de medios moderados`.

**Verificación independiente sin borrar nada:** lectura agregada SQL después de la captura: **20 objetos Storage, 0 objetos con nombre `f14-version-probe-*`, 0 claims/reportes/restricciones**. Se verificó que la versión del código del ensayo en branch tiene el mismo blob SHA que el Preview aprobado `ac167b4` (`src/features/moderation/F14VersionProbe.tsx`); el resto de commits posteriores no requiere repetir esta prueba. **No volver a pedir este QA al PO.**

**Observación separada CDN:** la misma captura muestra `CDN consultado desde este dispositivo: HTTP 400`. La solicitud era `fetch(publicUrl + ?cacheNonce=UUID, {cache:'no-store'})` tras borrado del fixture. HTTP 400 **no es una imagen 200 servida desde caché**, pero tampoco demuestra por sí solo propagación CDN global, si era una respuesta estándar `not found`, ni revoca copias previamente descargadas. No marcar `CDN PASS` ni `CDN FAIL` sin inspeccionar encabezados, body/error code y nodos independientes. La observación **no invalida** los cuatro pasos de la prueba Storage, que utilizaron métodos independientes.

**Reconciliación Gate 8:** cambiar `eliminación condicionada por versionId del objeto actual vía Supabase hosted` de `SIN PROBAR` a `PASS HTTP AISLADO CON MEDIO SINTÉTICO`. Sigue **BLOQUEANTE para D3-A completa**: coordinación con escrituras privilegiadas/in-flight, evidencia segura del backend `service_role` sin abrir esquema privado, estrategia de cleanup retry/hold, CDN/cache navegador/backups y certificación de una operación real moderada. Edge `f14-moderation-purge` queda HTTP 503; `purged` no permitido sin prueba, no tocar medios reales, no ampliar permisos por atajos, no subir de plan, no merge a main ni implementar A3/A4 como si se hubiera cerrado A2. PR #35 DRAFT.


## F14 A2 — Continuación autónoma: diagnóstico de reservas y resultados HTTP (2026-10-09)

**Autorización PO:** continuar técnica y autónomamente F14 hasta el DoD, respetando autorizaciones concretas de SQL remoto, borrado real, costos y release. A2 y D3-A siguen ABIERTOS; PR #35 DRAFT, main/Production y A3/A4 sin avanzar.

**Nuevo diagnóstico administrativo no destructivo:** `supabase/drafts/f14_media_purge_v2/held_claim_reconciliation_readonly.sql`. Devuelve **solo contadores agregados**, jamás claim IDs, rutas, denuncia, URLs ni PII. Distinge `held` vigente/coherente (NO permiso de DELETE), `held` vencido, Storage metadata faltante, origen distinto, estado de moderación discordante y reservas `invalidated`. `f14_media_probe` usa locks `FOR SHARE`: ejecutar con privilegio de administrador y transacción capaz de bloquear filas, no como SQL de navegador ni transaction READ ONLY.

**QA alojada:** `supabase/tests/database/f14_held_claim_operator_diagnostics_rollback.test.sql` fue ejecutada con `BEGIN/ROLLBACK`, creando únicamente post/reporte/claim y metadata **sintéticos sin bytes**. **PASS** para cinco condiciones: coherente, vencido, fuente modificada, falta de metadata y moderación modificada. Se corrigió un error inicial de ambigüedad entre variable del fixture y columna SQL (rollback). Sin datos de prueba persistentes. `held_claim_reconciliation_readonly.test.mjs` exige el SELECT agregado, ausencia DML y rollback del fixture; incluido en `npm run test:f14`.

**Sin falso éxito después de HTTP:** `exactVersionOutcome.mjs` clasifica el resultado del intento por `versionId` exacto y lectura posterior `info=404`/`list=absent`; SIEMPRE `mayFinalizePurge:false`, `cdnAbsentVerified:false`, `status=manual_review` u `origin_absent_observed`. Errores, timeouts, path-only, version/object/claim drift y origen sin verificar nunca pasan. `exactVersionOutcome.test.mjs` se ejecuta por CI. No llama Storage, no habilita Edge ni libera rutas.

**Runbook:** `supabase/drafts/f14_media_purge_v2/HELD_CLAIM_OPERATOR_RUNBOOK.md`, enfocado en reserva `held` caducada que sigue bloqueando el path deliberadamente. No invalidar por reloj sin probar ausencia de HTTP in-flight; no añadir cron de `UPDATE invalidated`. Para CDN/cache navegador, no afirmar invalidación mundial con HTTP 400, 404 ni 200.

**Auditoría de rol:** `supabase/tests/database/f14_private_claim_permissions_readonly.test.sql` PASS alojado: `anon/authenticated/service_role` no tienen `USAGE` del esquema privado; solo `service_role` tiene EXECUTE de `f14_prepare_media_claim`/`f14_recheck_media_claim`; la confirmación antigua `f14_confirm_media_cleanup` continúa revocada y trigger anti-`purged` instalado. Edge functions desplegadas: `paypal-webhook` (sin Storage API) y `f14-moderation-purge` (503 sin Storage). No equivale a una auditoría de todos los clientes externos que puedan usar service_role. Supabase: último recuento 20 objetos, 0 claims/eventos/reportes/restricciones.

**Gates restantes (sin fingir completado):** (1) servicio de lectura de evidencia privada accesible **solo** a `service_role` mediante interfaz auditada —no ampliar `USAGE` del esquema; anterior intento de implementar RPC fue bloqueado por controles de seguridad del conector, por tanto no se instaló. (2) Exclusión verificable de operaciones privilegiadas y HTTP en vuelo para claim/reintento. (3) Implementación y QA real de eliminación moderada con confirmación exacta del origen, no solo píxel aislado ya aprobado. (4) Acuerdo de alcance sobre las limitaciones de CDN/navegadores/backup en plan gratuito y retención D3-B futura. Ninguna migración remota nueva, ningún DELETE de medios reales, ningún upgrade, main merge o Production release.


### Gate de continuación F14 A2 — frontera del lector privado

Se documentó el contrato de la RPC mínima `public.f14_get_media_claim_evidence(uuid)` en `supabase/drafts/f14_media_purge_v2/PRIVATE_SERVICE_READ_GATE.md`. Debe ser **solo lectura**, `SECURITY DEFINER` + `auth.role()='service_role'` y EXECUTE exclusivo a `service_role`, sin USAGE del esquema `moderation_private` a API roles y sin Edge DELETE. El lector **no está desplegado ni habilitado**; el intento previo de preparar ese DDL fue bloqueado por controles del conector y no debe sortearse. Por regla AGENTS #24, requiere autorización específica para aplicar cualquier migración remota. El PO dio autorización general de continuidad, pero no sustituye el gate de DDL concreto.

**Evidencia adicional:** `supabase/tests/database/f14_private_claim_permissions_readonly.test.sql` PASS en Supabase: roles públicos sin esquema privado, `service_role` EXECUTE en prepare/recheck, antigua confirmación revocada, trigger anti-purge activo. Los dos Edge Functions alojados son `paypal-webhook` (sin acceso a Storage API en código desplegado) y `f14-moderation-purge` (503 sin delete). La inspección de estas funciones no es prueba de ausencia de escritores privilegiados externos.


## F14 A2 — RPC de evidencia service-only aplicada y auditada (2026-10-09)

**PO autorizó específicamente** preparar, auditar y aplicar la migración de **solo lectura** `public.f14_get_media_claim_evidence(uuid)`. Supabase `apply_migration` respondió `success:true`; historial remoto versión `20261009095635` y archivo canónico reconciliado `supabase/migrations/20261009095635_f14_service_only_media_evidence_reader.sql`. El archivo preliminar `20261009153000_...` fue retirado del repo sin cambiar contenido; no hay duplicidad de versiones. PR #35 continúa DRAFT.

**Permisos efectivos y regresión alojada PASS:** SECURITY DEFINER, `search_path=''`, solo `service_role` EXECUTE; `anon/authenticated` rechazados; `service_role` no tiene USAGE directo del esquema `moderation_private`. JWT no-service simulado con rol DB `service_role` también denegado 42501. `service_role` con JWT válido puede llamar a la RPC, pero `NULL`/claim inexistente devuelve NULL. Se guardó/ejecutó `supabase/tests/database/f14_service_only_evidence_reader_permissions_rollback.test.sql`.

**Casos positivos y deriva, SQL alojado bajo BEGIN/ROLLBACK PASS:** expediente Feed sintético con foto+reporte removed+restricción pending_review+metadata Storage+held claim -> JSON `status:candidate_only`, `mayDelete:false`, una referencia, snapshot vivo idéntico y versión correcta. Cambiar versión del mismo objeto o quitar fuente devuelve NULL. Misma verificación positiva para Community post+photo_storage_path único y negativa tras retiro emparejado de foto/ubicación; sin filas ni bytes persistentes.

**Seguridad y scope:** RPC no elimina imágenes, no permite `purged`, no llama Storage HTTP, no cambia grants de esquema privado. La confirmación antigua sigue revocada y trigger anti-purged activo. Última auditoría anterior al test: 20 objetos Storage, cero claims/reportes/restricciones. La prueba estática `serviceEvidenceRpc.test.mjs` existe pero NO fue integrada a `npm run test:f14` debido a un bloqueo de seguridad del conector; no afirmarla como ejecutada por CI. El test SQL de roles SÍ se ejecutó. No repetir el QA visual del píxel/versionId aprobado previamente.

**Gate pendiente:** el lector de evidencia privada pasa a `PASS BACKEND`. F14 A2/D3-A **no está cerrado**: todavía falta garantía de exclusión HTTP/operaciones privilegiadas, timeout/retry/retención y CDN/browser/backup antes de habilitar eliminación real. `f14-moderation-purge` permanece HTTP 503, PR #35 sin merge, `main`/Production/A3/A4 sin avanzar y sin gasto.


## F14 A2 — Reconciliación de lector de servicio y fail-closed ante carreras (2026-10-09)

**Rama:** `f14/block02-moderation-mvp-20261008`, PR #35 DRAFT, ningún merge a main. Usuario autorizó autónomamente modificaciones técnicas no visuales de la fase vigente; sigue vigente la necesidad de autorización específica antes de nuevas migraciones/borrados reales/release.

**Cobertura CI ampliada y verificada:** se incorporó por fin `supabase/drafts/f14_media_purge_v2/serviceEvidenceRpc.test.mjs` a `npm run test:f14` (en la iteración anterior existía pero NO se ejecutaba). Además se implementó un adaptador PURO `serviceReaderDryRun.mjs` entre el retorno real `f14_get_media_claim_evidence` (service_role) y `inspectHostedClaimEvidence`/`inspectExactVersionPreflight`. Sus pruebas adversariales están en `serviceReaderDryRun.test.mjs`. **GitHub Actions run `37916517423` SUCCESS** sobre SHA `7d544a160db014640fe9112b7dfb880e76c0d0c2`; log de job `113773919200` mostró **112 pruebas / 112 PASS / 0 FAIL**, governance estático F14 PASS y Vite build PASS. ESLint legacy registra errores fuera del gate, explícitamente no bloqueante; no interpretar CI como lint completo limpio.

**Prueba adicional alojada PASS, SQL reversible:** `supabase/tests/database/f14_service_evidence_reader_drift_rollback.test.sql`. Crea solo post/reporte/claim/metadata sintéticos en `BEGIN/ROLLBACK`; con JWT de servicio, el lector devuelve candidato con `mayDelete:false` en estado válido y devuelve NULL para **URL compartida**, **hold vencido**, **denuncia descartada**, **restricción no pendiente** y **versión Storage modificada**. Prueba repetida luego de corregir selección de ID sintético, sin exponer UUID de prueba en resultados. `scripts/f14-moderation-check.mjs` exige la existencia, integridad y `ROLLBACK` del fixture SQL. **El fixture SQL se ejecutó directamente en Supabase, no se ejecuta como parte del CI Node**; distinguir ambos PASSES.

**Nuevo adaptador SOLO SIMULACIÓN:** `assessServiceReaderDryRun` evalúa evidencia con formato RPC real y siempre deja `mayDelete:false` y `cdnAbsentVerified:false`, aun si obtiene `selector:{bucket,path,versionId}` válido. Exige una barrera contra escritores privilegiados y bitácora durable de operaciones en vuelo (ambas aún inexistentes); nunca llama Storage, ni publica endpoint, ni habilita Edge. 112 tests incorporan fuente/reporte/restricción/version/metadata cambiadas, reference sharing y entradas malformadas.

**Backend read-only posterior:** 20 objetos Storage originales, 0 claim, 0 events, 0 reports, 0 restrictions, 0 restos `f14-version-probe-*`; RPC lectora EXECUTE `service_role=true`/`authenticated=false`; confirmación antigua sin EXECUTE para service_role; trigger anti `purged` instalado. No hubo nuevas migraciones de Supabase, cambios de policy, borrados ni costos.

**Bloqueo legítimo pendiente de F14 A2/D3-A:** el lector y la selección `versionId` ya están probados; queda **fencing/serialización durable** para HTTP DELETE vs escritores privilegiados (las políticas RLS no vinculan `service_role`), además de tratamiento probado de timeout/reintentos, reconciliación del origen y el alcance de CDN/browser/backup/retención en plan Free. No afirmar que las pruebas de simulación demuestran exclusión real, no invocar `remove` para medios moderados, no activar Edge 503 ni `purged`. A3/A4, PR merge/main/Production siguen cerrados.


## F14 A2 — Modelo de intentos privilegiados e interleavings (2026-10-09)

**Rama:** `f14/block02-moderation-mvp-20261008`, PR #35 DRAFT. **Sin nuevas migraciones, secretos, operaciones Storage ni publicación.**

Se añadieron `supabase/drafts/f14_media_purge_v2/privilegedAttemptProtocol.mjs` y `.test.mjs`. Es un simulador **puro, NO desplegado**, de estados hipotéticos de registro previo HTTP, fencing token/generación, timeout, resultado de transporte y consulta al origen. **Siempre** emite `mayDelete:false`, `shouldSendHttp:false`, `mayFinalizePurge:false`, `canReleaseHold:false` y `cdnAbsentVerified:false`. Nunca incluye transición `RETRY_DELETE`, `RELEASE_HOLD` ni `MARK_PURGED`. Una respuesta HTTP incierta no habilita reenvío ni libera el path. Rechaza token/generación obsoletos y solicitudes duplicadas. Los booleanos sintéticos de barrera NO constituyen un fencing durable ni prueban que todos los escritores `service_role` cooperan.

**Evidencia CI:** el primer run `37917363095` encontró un error del simulador con entrada `null` que lanzaba TypeError. Se corrigió para devolver rechazo seguro y se repitió. Run `37917583521`, SHA `46423d0605639f7fd1244745297f8430892832a0`: **SUCCESS**, Node **122/122 PASS**, compilación Vite PASS. La suite evalúa **1,331 secuencias** de tres eventos y las condiciones de seguridad; `scripts/f14-moderation-check.mjs` exige el simulador y su inclusión en `npm run test:f14`. Lint legacy sigue no bloqueante.

**Contrato previo a cualquier servicio real:** `supabase/drafts/f14_media_purge_v2/PRIVILEGED_ATTEMPT_FENCE_GATE.md` especifica registro duradero de intento **antes** del HTTP, idempotencia, barrera real que incluya absolutamente todos los writers privilegiados, generación monotónica, recuperación tras crash/timeout y no liberación de holds vencidos por cron. **No se instalaron ledger, RPC nueva, Edge destructiva ni locks cross-service**. La prueba HTTP sintética de `versionId` del PO sigue PASS y no debe repetirse.

**Última lectura backend previa al código nuevo:** 20 archivos Storage originales, 0 claims/reportes, lector `service_role` autorizado, `f14_confirm_media_cleanup` revocado. No hubo backend mutations en este hito. F14 A2/D3-A siguen ABIERTOS por writer fence real, reintentos HTTP y CDN/browser/backups/retención; no habilitar `purged`, no main/Production/A3/A4.


## F14 A2 — Ledger privado DDL en BORRADOR + inventario de writers (2026-10-09)

**Contexto del gate:** tras el lector de evidencia service-only y la simulación de fencing (CI previo 122/122 PASS), el PO pidió continuar ingeniería no visual. A2/D3-A permanece ABIERTO: ningún servicio real coordina todos los escritores `service_role` durante HTTP. Rama `f14/block02-moderation-mvp-20261008`, PR #35 DRAFT; no merge, no release ni gastos.

**Hecho en este checkpoint:**
- `supabase/drafts/f14_media_purge_v2/WRITER_INVENTORY_AND_BOUNDARIES.md`: revisión de rutas Auth confirmadas en `CreatePostModal.tsx` (`post-photos`, upload UUID/upsert:false, limpieza de fallo por path), `communityService.ts` (`community-post-photos`, upload UUID/upsert:false, limpieza de fallo y delete voluntario del post por path), y ensayo artificial `F14VersionProbe.tsx`. Separados los buckets de avatares y documentos (fuera de D3-A). **No se ha demostrado que no existan service_role writers externos**; el inventario del repositorio no equivale a inventario de claves/proveedores.
- `supabase/drafts/f14_media_purge_v2/20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql`: **propuesta privada NO aplicada**, con esquema de tres tablas: `media_purge_attempts`, `media_writer_fences`, `media_purge_attempt_events`. Claim FK + unicidad de claim, bucket/path exclusivo, identidad compuesta de operación/fence, versión/UUID/generación, eventos idempotentes por operación/tipo/generación; RLS ENABLE+FORCE, REVOKE de `PUBLIC/anon/authenticated/service_role`, ninguna RPC ni GRANT ni operación DELETE ni estado `purged`. Se eliminó un índice de path/generación redundante para minimizar costo futuro. **No se ha compilado ni aplicado el DDL en PostgreSQL**: la revisión fue estática y para moverlo a `supabase/migrations/` hace falta un gate/aprobación concreta de nueva migración.
- `privilegedAttemptLedgerDraft.test.mjs` añadido a `npm run test:f14` y governance estático ampliado: comprueba no-DML/no-grants, tablas privadas, unicidad y enlace de identidad, paths seguros, trazabilidad mínima, roles y rutas conocidas. CI inicial `37918572108` falló **solamente** por aserción de texto literal sobre el documento del protocolo; corregida. CI `37918721107` en SHA `9ceaa867`: **SUCCESS, 128/128 Node PASS y build PASS**, previo al último ajuste de índice; consultar CI del HEAD final. No confundir estos tests estáticos con seguridad interservicios ni compilación DDL.
- Auditoría Supabase tras los cambios: `to_regclass` de las tres tablas = NULL; 20 objetos Storage, 0 claims/reportes, antigua confirmación de purge revocada, trigger no-purged instalado. No se han ejecutado DDL, Storage HTTP ni mutaciones de backend en este checkpoint.

**Próximo gate real:** validación SQL aislada/reversible del nuevo DDL y tests de roles + identidad bajo `BEGIN/ROLLBACK` en entorno apropiado, sin tocar objetos reales; inventario y control de claves `service_role` externas; diseño de RPC de registro/in-flight y operación auténtica con **dos servicios concurrentes** sobre fixtures sintéticos. No aceptar un fence solo de Postgres como garantía contra HTTP externos. Luego se pedirá autorización **específica** de cualquier migración remota, nunca inferirla de aprobación previa para el lector. La purga Edge continúa HTTP 503, estado `purged` bloqueado, PR #35 DRAFT, A3/A4 sin iniciar.


### F14 A2 — SQL propuesta de ledger COMPILADA en PostgreSQL temporal (2026-10-09)

Se extendió CI existente `.github/workflows/ci.yml` con paso `F14 ledger draft — disposable PostgreSQL only`. `scripts/test-f14-ledger-ephemeral.sh` exige `GITHUB_ACTIONS=true`, inicia **Postgres 16-alpine desechable, aislado de PAZO**, roles y `media_claims` stub, aplica el SQL DRAFT `20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql` exclusivamente a ese contenedor, ejecuta `privileged_attempt_ledger_ephemeral.test.sql` con `ROLLBACK` y destruye el contenedor.

**Verificación:** tres tablas creadas correctamente en Postgres 16; restricciones SQL y roles probados: RLS ENABLE+FORCE sin grants `anon/auth/service`, ruta compartida rechazada, asociación FK bucket/ruta/operación cruzada rechazada, duplicado de evento rechazado, nombre de ruta inseguro y estado `purged` rechazados. Primer run `37919265959` falló por fixture que topó UNIQUE antes que FK; corregido. Siguiente run `37919380212` falló al iniciar el contenedor con diagnóstico insuficiente; script de cleanup/logs corregido. **Run `37919563316`: SUCCESS, 128/128 pruebas Node PASS, `F14 private ledger DRAFT: disposable PostgreSQL smoke PASS` y build PASS**. CI del HEAD documental posterior debe reconfirmarse.

**Backend PAZO read-only pre-check:** `to_regclass` de `moderation_private.media_purge_attempts`, `media_writer_fences`, `media_purge_attempt_events` todos NULL, 20 objetos Storage, 0 claims/reportes, confirmación vieja sin EXECUTE y guard anti-purged activo. **No hubo ninguna migración Supabase ni Edge DELETE.** Compilar tablas en un contenedor temporal NO equivale a ledger durable desplegado, writer fence en producción ni prueba concurrente real de Storage. Falta inventario de writers service_role externos, diseño/revisión de RPC de registro y exclusión antes de HTTP, pruebas de 2 procesos, fallos/crash/reintentos y tratamiento de CDN/browser/backups. F14 A2/D3-A ABIERTOS; PR #35 DRAFT y main/Production/A3/A4 intactos.

### F14 A2 — Estabilización del CI PostgreSQL efímero (2026-10-09)

Tras actualizar documentos, el run `37919915744` falló por **race de arranque Docker**: `pg_isready` pudo conectarse al servidor PostgreSQL **temporal de initdb**, el cual se apagó antes del primer `psql` del fixture. Esto no es error del DDL ni del esquema alojado. Se corrigió `scripts/test-f14-ledger-ephemeral.sh` para esperar el mensaje `PostgreSQL init process complete; ready for start up.` y verificar SELECT 1 contra **el servidor final** antes de crear roles y ejecutar SQL. **Run `37920033089` SUCCESS** (commit `155511cf`): `Final disposable PostgreSQL is accepting connections`, `F14 private ledger DRAFT: disposable PostgreSQL smoke PASS`, **128/128 tests Node PASS**, Vite build PASS. Esto estabiliza el gate del SQL aislado.

**Permanece sin cambios**: 3 tablas de ledger SOLO en propuesta bajo `supabase/drafts`; en Supabase PAZO real `to_regclass` de las 3 tablas NULL, Storage 20 objetos y 0 claims/reportes; Edge purge 503 y guard anti-purged activo. No declarar D3-A ni A2 cerrado. No aplicar el DDL remoto sin autorización concreta y sin resolver exclusión de escritores privilegiados HTTP y alcance CDN/retención.


## F14 A2 — Journal SQL con carreras PostgreSQL reales, SOLO draft (2026-10-09)

En la rama `f14/block02-moderation-mvp-20261008` / PR #35 DRAFT, se añadieron:
- `supabase/drafts/f14_media_purge_v2/20261009_attempt_transitions_SIMULATION_ONLY.sql`: dos funciones **SECURITY INVOKER privadas, sin EXECUTE API**, para registrar un intento hipotético antes de HTTP y registrar timeout/error/success. Siempre retornan `mayDelete:false`, `shouldSendHttp:false` y no liberan el fence. La primera transacción bloquea con `FOR UPDATE OF a,f,c` filas de intento, fence y claim `held`; tokens/generación obsoletos y dispatch duplicado son rechazados. El borrador de ledger se reforzó con FK compuesta `active_operation_id,bucket,object_path,generation` → identidad de intento `operation_id,bucket,object_path,fence_generation`.
- `attempt_transitions_ephemeral.test.sql` ejecuta casos de duplicación, claim invalidado, token antiguo, timeout y confirmación tardía bajo `ROLLBACK` en PostgreSQL Docker desechable. `attempt_concurrency_*.sql` usan **DOS conexiones reales**: conexión A bloquea fila y registra, conexión B con `lock_timeout=450ms` es denegada mientras A no hace COMMIT; después del COMMIT no se permite reenviar el mismo intento. `scripts/test-f14-ledger-ephemeral.sh` y el check estático exigen estos fixtures.
- CI `37921483402`, SHA `fcacbe45d0d4e8c1aab2abfbff302a9e4211c416`: **SUCCESS, 128/128 pruebas Node PASS, SQL transitions PASS, carrera real de dos conexiones PostgreSQL PASS, schema draft smoke PASS, build PASS**. ESLint legacy aún no bloqueante. Confirmación de CI de commit documental posterior es independiente.
- Supabase PAZO **no recibió DDL**: `to_regclass` de las tres tablas = NULL, 20 objetos Storage intactos, cero claims/reportes, confirmación purged antigua revocada, guard anti-purged activo.

**Límite crítico:** la prueba con dos conexiones demuestra exclusión solo dentro de PostgreSQL cuando ambos actores cooperan con la misma transacción. **NO** demuestra que un writer `service_role` externo use ese fence ni garantiza compare-and-delete de Storage HTTP. No se puede habilitar `f14-moderation-purge` (HTTP 503) ni marcar medios purged. Antes del siguiente backend gate: inventario/cierre de escritores privileged externos, elección de servicio único, prueba HTTP sintética concurrente, manejo de ACK perdido y política CDN/retención. Cualquier nueva migración remota necesita autorización específica del PO; PR sigue DRAFT, main/Production/A3/A4 inalterados.
