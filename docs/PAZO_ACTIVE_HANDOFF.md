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
