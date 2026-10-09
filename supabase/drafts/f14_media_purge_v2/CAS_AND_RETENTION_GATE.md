# PAZO F14 A2 — Gate de confirmación de medios y concurrencia (DISEÑO, SIN EJECUCIÓN)

**Estado:** diseño no ejecutable. No autoriza eliminar archivos de usuarios ni cambiar `media_status` a `purged`. La Edge `f14-moderation-purge` permanece en HTTP 503. **Solo aplica a A2** (Feed/Comunidad con medios); `pet_profile`, documentos privados, avatares de comunidad y enlaces externos siguen en revisión manual.

## Evidencia y alcance auditados (2026-10-08, Preview + consulta Supabase de solo lectura)

- Product Owner: prueba autenticada `F14StorageProbe` PASS, imagen artificial de 1 píxel creada → localizada con Storage API → eliminada → ausencia confirmada con Storage API. Captura aportada por PO. **No** fue un archivo moderado ni una operación con `service_role`.
- Supabase post-prueba: `storage.objects` 20; rutas `post-photos/%/f14-storage-probe-%` 0; claims/eventos/reportes/restricciones 0. No borrado manual ni cambio de datos del producto.
- RLS real de `storage.objects`: políticas restrictivas F14 sobre `INSERT` y `DELETE` en rutas `held`; ninguna política `UPDATE` permisiva actualmente, así que el `upsert` autenticado no tiene autorización para sobrescribir un objeto. Añadir una política permisiva más adelante podría reabrir la superficie; exigir una política `UPDATE AS RESTRICTIVE` con `USING` **y** `WITH CHECK` antes de conceder capacidad de sustitución. Verificar además copia/movimiento, rutas antiguas y accesos de servicio.
- `service_role` omite RLS. Las reservas de cinco minutos + `FOR SHARE` / `FOR UPDATE` solo protegen transacciones individuales; no bloquean una operación HTTP de Storage que empieza antes de la reserva o termina después de un recheck.

## Invariantes antes de permitir una eliminación de medios moderados

1. **Autoridad:** petición dirigida a un endpoint privado, autenticación real verificada en servidor, rol moderador comprobado en base de datos y ninguna clave privilegiada entregada al navegador. Operaciones con rol usuario o `anon` deben fallar.
2. **Objetivo:** denuncia `removed`, restricción exacta `pending_review`, ruta canónica de este proyecto, titular correcto, referencia exclusiva, `storage.objects.id`, `version`, `updated_at`, hash de metadata y `claim_id` persistidos. Desconocido/compartido/externo/perfil con referencias derivadas => `manual_review`.
3. **Congelación real:** impedir **INSERT, UPDATE, DELETE, MOVE, COPY y UPSERT** sobre la ruta reservada para el actor autenticado; comprobar específicamente API de Storage y operaciones que puedan cambiar ruta/bytes. Los administradores/servicios deben serializar sus escrituras. Una reserva expirada no es autorización de borrado.
4. **Carrera DB ↔ Storage:** la API acepta `remove([{path,versionId}])`; en el código fuente actual de Supabase Storage, `deleteObjectVersions` ejecuta una eliminación de metadata condicionada por `(bucket_id,name,version)` en una transacción. Eso es una protección específica contra borrar una versión distinta de la solicitada, incluso si el nombre se reutilizó. **No se ha verificado que el servicio hospedado de PAZO ejecute exactamente ese código ni cómo maneja sus fallos HTTP y de backend**, y un CAS de versión NO es transacción distribuida DB ↔ Storage ni verifica la caché. El borrado ordinario `remove([path])` continúa siendo inseguro en presencia de sustituciones. Una comprobación previa por SQL deja ventanas TOCTOU; mantener purga y confirmación `purged` deshabilitadas hasta el QA autenticado y los gates de identidad/ausencia/CDN.
5. **Confirmación segura:** crear en un futuro gate un procedimiento **nuevo** ligado a `claim_id + report_id + target_kind/id + bucket/path + storage_object_id/version + resultado de Storage API`. No usar `f14_confirm_media_cleanup(kind,id)`: hoy marca `purged` sin prueba del objeto. Registrar intentos/reintentos sin secretos ni imágenes. Fallo/parcial => estado pendiente, jamás `purged`.
6. **Verificación:** respuesta de Storage API no basta; consultar ausencia en origen, evitar recreación de ruta y revisar URL pública en ventana razonable. No interpretar `list` sin error como certificación de CDN global. Cualquier estado final debe expresar por separado origen y caché.
7. **Retención D3-B:** reclamos, eventos y evidencias mínimas con propósito, fecha y vencimiento; no implementar borrados automáticos 90/180 días aquí sin autorización A4. No prometer que PostHog, Vercel, backups o cachés de navegador ya cumplen esas metas.

## Máquina de estados propuesta (NO instalada)

`candidate_only` → `held` → `origin_delete_pending` → `origin_absent_verified` → `cdn_pending/observed` → `closure_review`. Los estados de error o identidad inconsistente van a `manual_review`; nunca saltar a `purged` por recibir un HTTP 2xx. Un estado `held` debe durar durante cualquier operación real, no solo cinco minutos, y disponer de recuperación idempotente.

**Nota de costes:** Supabase documenta que el purge manual de CDN está disponible en Pro o superior; PAZO no tiene autorización para actualizar de plan. Smart CDN y caches de navegador tienen semánticas diferentes. [Documentación](https://supabase.com/docs/guides/storage/cdn/purge-cdn-cache).

## Siguientes verificaciones técnicas SIN mutación

- Confirmar en documentación/API si existe borrado condicional real por versión y cómo se gestionan MOVE/COPY/UPSERT; evitar inventar garantías.
- Audit de las invocaciones `SECURITY DEFINER` expuestas, incluida `f14_storage_media_path_unclaimed`, y diseñar helper privado/grants mínimos antes de nuevas migraciones.
- Preparar pruebas aisladas para política `UPDATE`, reservas expiradas, claim-vs-service, carreras simuladas, drift de versión y referencias compartidas. No insertar/borrar archivos reales.
- Actualizar plan de ejecución y pedir **aprobación específica** para migración de control de escritura y, por separado, cualquier eliminación de bytes. No activar la Edge ni usar documentos privados.

**Gate de aceptación pendiente:** demostrar exclusión segura de operaciones concurrentes + evidencia de origen/CDN o decidir retener purga como revisión manual. F14 A2 sigue abierto; no A3/A4, merge a main ni publicación oficial.


## Estado de seguridad posterior al Gate visual (2026-10-09)

Se añadieron controles remotos: `20261009054411` (hold persistente/UPDATE/recheck), `20261009055801` (origen COPY), `20261009055955` (RPC antigua `f14_confirm_media_cleanup` deshabilitada y EXECUTE revocado) y `20261009061213` (trigger prohíbe `media_status='purged'` sin protocolo). **La referencia anterior a que la vieja RPC 'marca purged' es histórica: ya no puede ejecutarse.** El estado efectivo es no-borrado (Edge 503), revisión administrativa solo lectura. El PO confirmó por captura el panel del nuevo Preview SHA `a650dd8`: visual PASS para ese estado vacío y mensajes; no demuestra eliminación física, caché o caso con medio real. La prueba automatizada de build/governance fue PASS en ese SHA. La reconciliación DoD actual es `docs/PAZO_F14_A2_SCOPE_CLOSURE.md`. Ni la mitigación COPY ni el trigger resuelven CAS/serialización entre Storage y escritores privilegiados. No habilitar purga automática hasta probar esa propiedad con fuente/versión exacta.


## 2026-10-09 — Revisión de API: selector exacto por `versionId` documentado

La referencia **actual** `https://supabase.com/docs/reference/javascript/file-buckets-remove` aclara que `remove([{path,versionId}])` apunta a una versión **exacta**, vigente o archivada. Esto reemplaza la antigua suposición de que solo servía para versiones no actuales. **No se ha probado su semántica HTTP real frente a carreras en PAZO**, ni la coincidencia con identidad de objectId en el Storage alojado, ni la conservación de otra versión tras sustituir una ruta. La protección de URL pública y CDN también sigue pendiente.

Se añadió el inspector puro `exactVersionPreflight.mjs` y suite de casos en `exactVersionPreflight.test.mjs`, integrados a `npm run test:f14`. Verifica coherencia `claim + source + objectId + versionId + updatedAt + fingerprint`, rechazo de expiración, versión sustituida, compartición incierta, fuente archivada o marcador de eliminación. **Siempre devuelve `candidate_only` o `manual_review` con `mayDelete:false` y no ejecuta Storage API.** El backend no se modificó.

Para verificar el comportamiento real se añadió `F14VersionProbe` exclusivamente a Preview, con consentimiento por botón. Sólo opera sobre un píxel artificial `uid/f14-version-probe-UUID.png` y prueba versión equivocada, versión correcta y ausencia de origen. El Product Owner todavía **no** ha pulsado esta prueba nueva; no inferir PASS del anterior `F14StorageProbe` que eliminaba solo por ruta. El texto de la UI advierte que no prueba CDN, claims de medios reales ni escritores privilegiados.

**Gate posterior aunque pase:** exigir confirmación de que una sustitución concurrente no se borra por error, serialización de writers privilegiados y prueba de origen/CDN independiente. Mantener Edge 503, bloqueo `purged` y PR DRAFT hasta todas las pruebas exigidas.


## Auditoría de código upstream y esquema PAZO — 2026-10-09

Se leyó el fuente público actual `supabase/storage`:

- [`src/storage/object.ts`](https://github.com/supabase/storage/blob/master/src/storage/object.ts): `deleteObjects` separa entradas `{path,versionId}` y pide `db.deleteObjectVersions(...)`, borrando los bytes de la versión devuelta. Si no devuelve filas, la llamada no debería borrar esos bytes; **no extrapolar a la versión desplegada sin HTTP QA**.
- [`src/storage/database/pg.ts`](https://github.com/supabase/storage/blob/master/src/storage/database/pg.ts): `deleteObjectVersions` compara explícitamente `bucket_id` y par `(name,version)` en la cláusula `DELETE ... RETURNING`, dentro de la transacción. El ID interno no se usa como condición de eliminación: debe validarse por separado en preflight/confirmación.
- **Postgres PAZO (read-only):** índice único `objects_bucket_id_name_version_key` sobre `(bucket_id,name,version)`, índice único de versión actual por `(bucket_id,name)` cuando `archived_at IS NULL`; recuentos actuales 20 objetos, 20 versiones únicas, y ningún path duplicado por bucket. Los cinco buckets tienen `versioning_status=DISABLED` pese a que cada objeto tiene un identificador interno de versión. Esta comprobación no tocó bytes.

**Conclusión acotada:** el código upstream respalda una eliminación condicional por versión, pero necesitamos comprobar el comportamiento alojado de una versión correcta y otra incorrecta usando exclusivamente una imagen artificial, y probar operaciones in-flight con sus casos límite. El test Preview `F14VersionProbe` está preparado pero no desplegado por la cuota de Vercel; revisión manual sigue obligatoria.


## Auditoría de caché real de PAZO — 2026-10-09

Consulta **solo agregada** a `storage.buckets` y `storage.objects.metadata`, sin extraer URLs privadas ni nombres: 4 buckets públicos (`community-avatars`, `community-post-photos`, `pet-avatars`, `post-photos`) y 1 privado (`pet-documents`); 20 objetos existentes con `cacheControl: "max-age=3600"`. Esto implica hasta una hora de retención de navegador conforme al encabezado cacheable, con posibles variaciones según cliente y caché. No confundir retiro de Feed ni ausencia del origen con revocación de bytes ya descargados.

Documentación de Supabase consultada:
- [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn): sincroniza invalidaciones de cambios/borrados en Pro o superior, con hasta 60 segundos de propagación descrita, pero **no elimina la caché del navegador**.
- [Purge CDN Cache](https://supabase.com/docs/guides/storage/cdn/purge-cdn-cache): purga manual por objeto solo Pro+ y key secreta de servidor. **PAZO no debe activar Pro, pagar ni exponer secretos** sin autorización.
- [Storage CDN fundamentals](https://supabase.com/docs/guides/storage/cdn/fundamentals): CDN puede servir copias del origen. No extrapolar garantías Pro a Free.

**Prueba actualizada solo en Preview:** `F14VersionProbe` calienta la URL pública **exclusivamente del píxel sintético propio** (cacheControl 60), verifica primero eliminación exacta y ausencia por Storage API, luego observa UNA solicitud HTTP al URL de prueba con `cacheNonce` y `cache:'no-store'`. Presenta código HTTP u observación no disponible sin confundirlo con un PASS global de CDN. No registra contenido de usuarios ni hace `purgeCache`. No prueba el comportamiento de `max-age=3600` de medios reales, ni otros nodos ni navegadores; no autoriza purga. El test no se ha ejecutado en Preview autenticado y sigue pendiente de cuota Vercel.


## Gate de extensibilidad Storage — NO instalar trigger privilegiado (auditoría 2026-10-09)

La guía oficial de [Supabase Storage Schema](https://supabase.com/docs/guides/storage/schema/design) recomienda tratar tablas `storage` como **solo lectura para DML de aplicación** y no modificar su esquema salvo extensiones recomendadas, como índices de soporte para RLS. Añadir un `BEFORE DELETE/UPDATE` personalizado a `storage.objects` para forzar los holds incluso sobre `service_role` parecería resolver el bypass, pero introduce un acoplamiento al backend gestionado por el proveedor, posible bloqueo de operaciones normales y riesgo de rotura en futuras actualizaciones.

La guía [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) confirma que el uso de `service_key` evita totalmente RLS. Por tanto, **no proponer un trigger de metadatos como solución automática de exclusión** sin diseño explícito que el proveedor admita; no implementarlo sobre el proyecto vivo. Las políticas RLS actuales sí están soportadas, pero solo protegen operaciones de usuarios sujetos a ellas.

**Arquitectura autorizable posterior (todavía no implementada):** centralizar todos los futuros escritores privilegiados de medios moderables detrás de un protocolo de exclusión en servicio de confianza, operar con `versionId` del objeto exacto, registrar estado/auditoría de operación en vuelo y comprobar identidad/ausencia tras HTTP. Cada escritor privilegiado no coordinado invalida la garantía de exclusión. Un borrado condicional de versión en la API reduce el riesgo de borrar bytes de una versión sustituida, pero no es una transacción distribuida con posts, comunidad, CDN o backups. Mientras no se demuestre el protocolo, mantener `f14-moderation-purge` 503 y `media_status='purged'` prohibido.


## Adaptador de evidencia real: reconciliación de snapshot F14 (2026-10-09)

Agregado `supabase/drafts/f14_media_purge_v2/hostedClaimEvidence.mjs` y pruebas `hostedClaimEvidence.test.mjs`, ahora incluidos en `npm run test:f14`. **Código puro NO desplegado**, sin acceso directo a SQL, credenciales ni Storage; nunca devuelve `mayDelete:true` ni ejecuta `remove`. Se mapean los nombres reales de `moderation_private.media_claims.snapshot`, `reports`, `content_restrictions` y `storage.objects` al inspector `exactVersionPreflight`.

El futuro ejecutor de confianza (que requiere gate y todavía NO existe) debe leer desde una **misma instantánea/transacción del servidor**, no del navegador: `media_claims` (con `snapshot`), su `content_restrictions`, reporte, objeto vigente `storage.objects` y `moderation_private.f14_media_probe(kind,id)` **recalculado en ese momento**, además de contar independientemente las referencias de URL (exactamente 1) y, para comunidad, `photo_storage_path` (exactamente 1). La huella actual del objeto debe venir calculada por SQL `md5(coalesce(metadata::text,'')) AS metadata_fingerprint`, no de una cabecera enviada por un usuario. `databaseNow` también debe ser del servidor. El adaptador rechaza cambios de report/restricción, host URL, propietario, pet/comunidad, versión, metadata, ID del objeto, referencia compartida, expiración, borrado lógico y archivo archivado. Si falta cualquiera de los datos actuales, falla cerrado.

**No confundir la transacción de lectura con exclusión HTTP:** al finalizar la consulta se liberan los locks. La salida `candidate_only` es únicamente evidencia para continuar revisión; el selector `{bucket,path,versionId}` no es autorización de DELETE. Se debe probar la API HTTP de versión exacta en un fixture aislado, coordinar los escritores privilegiados y diseñar recuperación de holds antes de cualquier activación de Edge.

**Verificación automatizada:** el primer run `37899973726` falló porque una regex nueva de UUID omitía el cuarto grupo; se corrigió a `8-4-4-4-12` y el run `37900073363` pasó. Se agregaron pruebas de deriva del `f14_media_probe` fresco y el run `37900262964` completó SUCCESS. Estos PASS no sustituyen QA HTTP ni CDN.


## Matriz de escritores y barrera real pendiente (auditoría puntual 2026-10-09)

Inspección actual de `src/services/communityService.ts` en rama F14: las cargas de avatares y fotos de posts comunitarios se hacen con sesión autenticada, `crypto.randomUUID()` y `upsert:false` en buckets separados; fallos de guardado utilizan `remove([path])` como *limpieza de objetos sintéticos/huérfanos recién subidos por ese flujo*, no por un servicio moderador. Una ruta sin post aún no está ligada a un claim moderado; la ruta de moderación no debe reutilizar esa limpieza por path. RLS con hold sobre buckets moderables sigue activo para rol Auth. Revisar también los otros módulos de subida antes de llamar exhaustivo al inventario.

Edge alojadas inspeccionadas previamente: `paypal-webhook` sin Storage y `f14-moderation-purge` con respuesta 503; **esto NO certifica que ningún tercero, script o administrador utilice una clave de `service_role` fuera del repositorio**. RLS de `storage.objects` no contiene bypass de `service_role`. Un ledger de operaciones y un fencing token por ruta/versión serían necesarios para serializar **todos** los writers privilegiados con el DELETE; los locks transaccionales de `f14_media_probe` terminan antes del HTTP. Un expediente `held` vencido **no** permite reintento ni invalidación automática por reloj.

Código puro nuevo `serviceReaderDryRun.mjs` y regresiones Node simulan el reader RPC seguido del inspector de snapshots y versionId, manteniendo `mayDelete:false` por contrato. El fixture SQL `f14_service_evidence_reader_drift_rollback.test.sql` prueba cinco fallos de coherencia y el caso positivo en Supabase con `ROLLBACK`. Se demostró fail-closed en el **lector**, no atomicidad entre servidor y Storage, ni eliminación moderada ni revocación CDN. Evitar proponer una Edge destructiva hasta definir y demostrar exclusión de escritores y estado/reconocimiento durable del intento de DELETE.
