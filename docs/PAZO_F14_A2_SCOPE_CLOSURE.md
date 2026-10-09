# PAZO — F14 A2: reconciliación de alcance y cierre

**Checkpoint:** 2026-10-09 UTC. **Estado general:** `EN CURSO`; PR #35 `DRAFT`, ninguna fusión con `main`. Este documento solo registra evidencia, no sustituye una aprobación pendiente ni autoriza A3/A4.

## Contrato de producto aprobado que gobierna A2

- F14 Gate 5/6/7: moderación humana mínima para denuncias de Feed post/comentario, perfil de mascota y Comunidad post/comentario. Privacidad D1: contenido público legítimo permanece visible anónimamente; moderado/retirado debe restringirse en API.
- D3-A (CERRADA): además de despublicar, verificar eliminación en origen activo y Storage cuando proceda; distinguir origen, URL pública/CDN/navegador, backups y proveedores. **No reducir silenciosamente a moderación manual.**
- D3-B: matriz operativa aprobada de diseño (30 días para determinadas eliminaciones activas; 90/180 días para reportes según resolución, etc.), pero implementación pertenece A4 y requiere prueba; no se permite prometer cumplimiento en producción ni iniciar A4 aquí.

## Matriz Gate 8: evidencia real, sin extrapolaciones

| Requisito de A2 | Estado | Evidencia / restricción |
|---|---|---|
| Denunciar por sesión Auth y límites de rol | PARCIAL VALIDADO | Preview real `spam` de Feed, cierre `dismiss`; SQL/RPC permisos simulados y QA de navegador dos cuentas 6/6 PASS; matriz de todos los cinco objetivos con sesión real no completada |
| Cola de moderación y autoridad independiente | VALIDADO EN CASOS PROBADOS | Cuenta moderadora real y denegación de cuenta normal en Preview; no equivale a todas las combinaciones de API o prueba HTTP sin UI |
| Despublicar contenido y registrar decisión | VALIDADO EN CASO SIN MEDIO | PO retiró post de prueba de texto, SQL para lectura anon/auth confirmó exclusión; otras clases/medios requieren verificación si forman parte del DoD |
| Clasificación de medios de publicaciones | SQL VALIDADO | Migración `20261009010551`: caso sin foto no genera tarea; perfiles y casos con foto conservadores |
| Revisión visual de medios | **PO VISUAL PASS** | Captura 2026-10-09 de Preview `a650dd8`: mensajes de revisión, estado vacío, botón de refresco y ausencia de botón destructor. No se probó ejecutar refresco ni listar casos reales |
| Auth real 2 cuentas y Storage sintético | PASS GATES AISLADOS | QA Auth normal/moderadora 6/6 PASS; prueba Storage de un píxel subida/localizada/eliminada y ausencia confirmada, sin medios de moderación |
| Protección de rutas retenidas `held` | SQL VALIDADO | `20261009040957`, `20261009054411` y `20261009055801`: RLS para inserción, update, delete y copia de origen; `service_role` fuera de RLS y HTTP concurrente no probado |
| Confirmación de purga | PROTEGIDA, NO IMPLEMENTADA | `20261009055955` deshabilita RPC antigua; `20261009061213` bloquea `media_status='purged'` no certificado. Edge `f14-moderation-purge` HTTP 503 |
| Eliminación física de medio moderado, exclusividad y origen exacto | **BLOQUEANTE** | No existe borrado condicional activo / garantía de exclusión entre DB, Storage HTTP y operaciones privilegiadas; no eliminar fotos reales para simular PASS |
| CDN, URL pública y caché del navegador | **BLOQUEANTE** | Ocultar fila API no revoca URL pública; no se certificó invalidez de CDN/cliente. Purga manual CDN depende del plan; no autorizar cargos |
| Retención D3-B y terceros | PENDIENTE A4 | Metas documentadas, configuración real de proveedores y rotación/restauración sin verificar; no iniciar implementación A4 dentro de A2 |
| Code + CI | PASS para SHA visual | GitHub Actions `37892849139` SUCCESS en `a650dd8`; Preview Vercel `dpl_6iFoQUQ9QVYi8JBzR2FDWKtmmnRE` READY mismo SHA. Los commits documentales posteriores requieren su propio check |
| Release | NO AUTORIZADO | PR #35 es DRAFT; `main`, Vercel Production y F14 A3/A4 intactos |

## Siguiente gate real de ingeniería

1. Preservar el estado **fail-closed**: contenido moderado retirado de API, archivos en revisión manual; Edge 503; ningún estado `purged` sin verificación.
2. Diseñar y demostrar mecanismo serializado para escritores con privilegios (`service_role`) y operaciones Storage en vuelo, con enlace inmutable `claim_id + bucket/path + object_id/version + report_id`. Si la API disponible no permite una comprobación y eliminación condicionada al objeto actual, **no habilitar borrado automático**. Cualquier experimento debe ser aislado, sin medios de usuarios ni registros ajenos.
3. Conservar la separación de evidencias: CI PASS ≠ Preview visual PASS ≠ prueba de medio retirado/CDN ≠ retención. No solicitar repetición de pantallas ya aprobadas.
4. Si el Product Owner desea pasar a beta con revisión manual sin eliminación física probada, necesita **modificar expresamente D3-A** y revisar el riesgo de URLs públicas. El alcance actual ya fue aprobado, por lo que no asumir ese cambio ni marcar A2 como completado.
5. No iniciar A3/A4, `main` merge, Vercel Production, nuevos proveedores/pagos, ni borrar contenido real hasta sus gates.

**Principio:** preferir un gate abierto verificable a un PASS engañoso que pueda destruir contenido o exponer datos.


### Actualización: selector de versión exacta por API, QA pendiente

La referencia vigente del cliente Storage documenta `remove([{path,versionId}])` para versión exacta tanto actual como archivada. Esto abre una alternativa a borrado por ruta, **pero no prueba por sí solo atomicidad, operaciones HTTP en vuelo ni CDN**. La suite pura `exactVersionPreflight.test.mjs` está incorporada a CI; un test de UI Preview con archivo artificial `F14VersionProbe` está versionado, todavía sin evidencia visual ni ejecución autenticada del PO. El elemento de eliminación física/CDN sigue bloqueante hasta validar versión real y exclusión de escritores privilegiados.


**Gate operativo 2026-10-09:** GitHub Actions sobre `2e8a32c` pasó (run `37895742885`); Vercel respondió `402 api-deployments-free-per-day` (más de 100 deploys diarios, esperar ~24 h) a la petición de Preview actualizado. Se verificó que no existe deployment para ese SHA. La QA HTTP con versión real queda **NO EJECUTADA** hasta poder publicar Preview, y no implica aprobación para borrar medios reales. Los buckets Storage PAZO tienen `versioning_status=DISABLED`; los 20 objetos retienen una versión de 36 caracteres. No configurar versionado ni subir de plan para esta prueba.


### Evidencia de CDN/cacheControl y ensayo sintético ampliado

Auditoría Supabase únicamente agregada: 4 buckets públicos, 1 privado y 20 objetos actuales con `cacheControl=max-age=3600`. La caché del navegador puede mantener copias aproximadamente una hora o según gestión cliente; despublicación/Storage origin/CDN son estados distintos. Supabase documenta invalidación automática Smart CDN para Pro+ y API de purga manual Pro+ (requiere credencial privilegiada); el plan actual no debe modificarse ni crear cargos. La prueba opt-in de versión exacta agrega una sola observación HTTP del CDN sobre su píxel sintético recién eliminado, SIN certificar invalidación global. No confundirla con cachés de fotos moderadas. La eliminación física D3-A sigue abierta y la QA HTTP requiere un Preview nuevo con el último SHA.

### Reconciliación backend de claim/source — CI PASS, eliminación aún NO validada

El preflight offline ahora exige un `f14_media_probe(kind,id)` **actual**, comparado con `media_claims.snapshot`, referencias URL/path recomputadas, `storage.objects` actual, reporte y restricción vigentes. No autoriza borrar; si cambia el autor, mascota, URL, versión, metadata o estado, exige revisión manual. Tests ejecutados en GitHub CI `37900262964` SUCCESS. La capacidad real de `remove([{path,versionId}])` en PAZO, CDN, carreras HTTP, `service_role`, recuperación y retención siguen pendientes. Preview actualizado bloqueado por cuota Vercel; no solicitar clic en Preview anterior ni revalidar QA visual aprobadas.


### Gate de integración — consulta real PostgreSQL para evidencia, sin borrado

Preparado `supabase/drafts/f14_media_purge_v2/hosted_claim_evidence_readonly.sql` y contrato Node `hosted_claim_evidence_readonly.test.mjs`. Selección privada de reserva/restricción/reporte, objeto vigente, `f14_media_probe` fresco, referencia única y reloj servidor, sin acceso a bytes ni información de denuncia libre. SQL preparado y ejecutado en Supabase con un ID sintético inexistente: `[]` sin errores; no existen reservas actuales. CI `37901053491` PASS. **No concluir que el caso positivo, aislamiento de transacciones o un DELETE de versión hospedado hayan sido validados**; este query no sostiene locks durante HTTP. Mantener purga Edge 503 y estado `purged` bloqueado. D3-A y F14 A2 abiertos, Preview nuevo pendiente.


### Evidencia positiva de Postgres (Feed y Comunidad) — 2026-10-09

Dos escenarios alojados de solo fixture transaccional `BEGIN/ROLLBACK` pasaron. Feed: una reserva `held` sintética produjo `snapshot` igual a `f14_media_probe` fresco, único uso de URL e identidad Storage/version; al cambiar `posts.photo_url`, el probe invalidó la fuente. Comunidad: `snapshot`, bucket y referencias de URL/path coherentes; al borrar **ambos** campos emparejados de foto en `community_posts`, `currentSourceSnapshot` pasó a JSONB `null` y el contador path a 0. Sin archivos físicos ni expedientes persistentes. El SQL de prueba no está versionado porque una escritura al repositorio fue bloqueada por controles de seguridad; no inferir cobertura CI de estos fixtures alojados.

**Nuevo bloqueador de integración:** `service_role` no dispone de `USAGE` del esquema privado `moderation_private`; el SELECT probado con el rol administrativo no es una RPC accesible desde Edge. Una interfaz de lectura estrictamente limitada a servidor requiere otro gate de seguridad; no ampliar grants del esquema ni instalar funciones no verificadas. `F14VersionProbe` aún sin Preview actualizado/QA HTTP; carreras entre API/DB, retención/CDN y D3-A físico continúan pendientes. **A2 no completado**.


### A2 — Cinco vías de denuncia y resoluciones SQL, Preview de versión disponible

**Nuevo SQL hosted PASS** en `supabase/tests/database/f14_five_report_kinds_hosted_rollback.test.sql`: normal `authenticated` sin permisos moderadores denunció los cinco objetivos aprobados; duplicado `23505`, sexto reporte/24h `22023`, lectura y decisión de moderación por normal `42501`; moderador autorizado descartó cinco y quedaron cinco acciones de auditoría, sin restricciones. Ejecución `BEGIN/ROLLBACK` sin registros finales. Esto sube el gate de **matriz de backend de los cinco tipos** a PASS SQL, pero no convierte cinco formularios en QA visual probada. Referencias FK existentes y comentario sintético temporal; no fotos ni texto de usuarios reproducidos.

**Cambio externo:** Vercel ahora dispone de Preview `READY` `dpl_7sfQj6vL7LrKuT9QCkyp6LRkSSVW` en SHA `ac167b4` con `F14VersionProbe` y CI del SHA SUCCESS. El QA HTTP autenticado por el PO con el píxel sigue **PENDIENTE DE EJECUCIÓN**. No cerramos la protección contra service-role in-flight, CDN ni D3-A hasta evidencia positiva. PR #35 DRAFT.

### Verificación independiente de RLS para los cinco tipos — PASS SQL

`supabase/tests/database/f14_five_target_visibility_hosted_rollback.test.sql` fue ejecutada en Supabase. Con sesión `authenticated` simulada en Postgres, los cinco targets eran legibles **antes** de moderación; tras restricciones sintéticas, dejaron de serlo. Con `anon`, Feed post/comentario y mascota dejaron de ser legibles. Comunitarios no ofrecen SELECT `anon` por las políticas originales de diseño. `BEGIN/ROLLBACK`; cero datos duraderos. `f14_five_report_kinds_hosted_rollback.test.sql` PASS (cinco denuncias, deduplicación, límite diario, denegación de usuario normal para acciones moderadoras, cinco decisiones `dismissed` y cinco entradas de auditoría). Resultado **PASS de backend SQL/RLS para cinco clases**, no de cinco flujos visuales. Queda abierto D3-A: bytes/versionId exactos HTTP, concurrencia privilegiada, caché/CDN y QA visual del nuevo `F14VersionProbe`.


### Gate 8 — HTTP de `versionId` exacto: PO PASS aislado

**Actualización 2026-10-09:** el PO ejecutó en Preview `ac167b4` el ensayo nuevo `F14VersionProbe`. Captura: subida de píxel sintético PASS, lectura de ID+versión PASS, versión incorrecta no eliminó la actual PASS, versión correcta eliminó y origen `info/list` ausente PASS. Confirmación backend de sólo lectura: 20 objetos previos, **cero** `f14-version-probe-*` remanentes, cero claims/reportes/restricciones. **Este gate concreto cambia a PASS de API/HTTP hospedado con fixture sintético; QA no se debe repetir.** No prueba que una operación moderada real pueda ser borrada de forma coordinada, ni escrituras privilegiadas concurrentes.

**CDN separado — INCONCLUSO:** captura muestra HTTP 400 en `fetch` con `cacheNonce` tras el borrado. No significa caché viva HTTP 200 ni certifica `404` o invalidación global, pues faltan body/headers y una prueba de nodos/browsers. El CDN básico del plan gratuito puede conservar bytes cacheados hasta TTL y navegadores pueden conservar copias. Mantener abierto D3-A por coherencia entre fuentes y Storage API, `service_role` y acceso privado, recuperación de holds, CDN/browser/backup y retención. No cerrar F14 A2, PR #35 sigue DRAFT.


### Gate de incidentes y false-success — cobertura nueva validada

Se añadió diagnóstico operativo **sin DML y sin PII** `held_claim_reconciliation_readonly.sql`: distingue `held` actual/coherente, vencido, metadata ausente, fuente derivada, moderación derivada e `invalidated`. La prueba alojada `f14_held_claim_operator_diagnostics_rollback.test.sql` validó cinco condiciones **PASS** mediante fixtures sintéticos y `ROLLBACK`; no borra bytes ni libera claims. Runbook `HELD_CLAIM_OPERATOR_RUNBOOK.md` explica por qué caducar no permite invalidar automáticamente con solicitudes HTTP en vuelo.

`exactVersionOutcome.mjs` + tests clasifican intento con versionId exacto y ausencia posterior `info/list`. Nunca emite `purged` ni `mayFinalizePurge:true`, y trata timeout, reintento, versión distinta y HTTP CDN como **no concluyentes** para el cumplimiento D3-A. Auditaron los permisos de las RPC y el esquema privado en `f14_private_claim_permissions_readonly.test.sql` alojado PASS: rol service_role autorizado solo a las RPC necesarias, no al esquema privado ni a la antigua confirmación purged. No hay nuevo lector de evidencia implementado por bloqueo previo del conector; la protección fail-closed sigue vigente.

**Estado:** diagnóstico/prevención de falso éxito PASS; eliminación real moderada, serialización `service_role`/HTTP, lectura privada del backend y política CDN/retención siguen BLOQUEANTES. El PO ya aprobó la prueba aislada por `versionId` (4/4), no repetirla. A2 no cerrado, PR #35 DRAFT.


### Gate de autorización concreta: RPC service-only de evidencia

Hay diseño verificable en `supabase/drafts/f14_media_purge_v2/PRIVATE_SERVICE_READ_GATE.md` para crear `public.f14_get_media_claim_evidence(uuid)` con lectura transaccional, EXECUTE únicamente `service_role`, sin acceso directo al esquema privado desde rol API. **No existe en backend**. Necesita DDL versionado, pruebas negativas anon/auth, pruebas de source/version/ref mismatch, aprobación remota específica del PO y reconciliación de migraciones. El intento anterior de crear el archivo RPC fue detenido por seguridad del conector; no eludirlo. Aunque se apruebe e instale, no autoriza habilitar purga mientras sigan concurrencia HTTP y CDN pendientes.


### Gate lector privado de evidencia — PASS alojado, no autoriza purga

**2026-10-09:** PO autorizó migración puntual; Supabase `apply_migration` exitoso, versión registrada `20261009095635_f14_service_only_media_evidence_reader`, repositorio sincronizado en `supabase/migrations/20261009095635_f14_service_only_media_evidence_reader.sql`. RPC `public.f14_get_media_claim_evidence(uuid)` SECURITY DEFINER y `search_path=''`. Grants efectivos: `anon=false`, `authenticated=false`, `service_role=true` para EXECUTE, sin USAGE privado concedido. El test reproducible `f14_service_only_evidence_reader_permissions_rollback.test.sql` PASS en servidor, incluyendo denegación JWT falso y NULL para IDs inexistentes. Pruebas de expedientes sintéticos Feed/Comunidad dentro de `ROLLBACK` PASS: obtiene candidato `mayDelete:false`; cambios de versión o fuente producen NULL. Sin bytes eliminados ni datos persistentes.

**CI caveat:** `serviceEvidenceRpc.test.mjs` existe, pero la integración a `package.json` fue bloqueada por controles del conector; no se ejecuta automáticamente con `npm run test:f14`. Pruebas reales SQL y revisión estática explícita ejecutadas aparte. La auditoría positiva del lector ya no es bloqueante; siguen pendientes bloqueo de HTTP/delete in-flight, CDN/caché/navegador, retención/reintentos y reconciliación D3-A. **F14 A2 ABIERTO**; Edge DELETE 503 y estado purged sin autorización.
