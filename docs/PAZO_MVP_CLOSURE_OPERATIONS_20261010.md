> **F14 / T08 — AUDITORÍA LOCAL CORREGIDA (2026-10-11): PASS LOCAL**, sobre RC baseline f29937d. Dos carreras reproducidas y corregidas: nueva referencia tras preflight y DELETE Storage con snapshot RLS anterior al commit del claim. Ambas migraciones pendientes ejecutadas/repetidas con postgres NOSUPERUSER; 42 casos SQL, 300 aliases, 12 escenarios de concurrencia, 38 tests Edge/HTTP y build PASS. Catálogo/ACL/RLS fieles al contrato F14 con diferencias de entorno declaradas. Infraestructura PostgreSQL17 aislada incorporada al CI; comprobar su ejecución en el SHA final publicado. [Informe y próximo gate](PAZO_F14_T08_SECURITY_LOCAL_AUDIT_20261011.md). **T08 retirada física sigue PENDIENTE DE AUTORIZACIÓN/PRUEBA HOSTED**, no PASS de producción. A candidata a ensayo acotado; mantener B para beta hasta aprobarlo. Cero migraciones/filas/objetos/Edge/flags alojados modificados; purga global OFF. T05/T06/T07/T09/T10/T11/T12 y F13 no se reabrieron. Este delta supersede únicamente los bloqueos históricos de laboratorio F14.

# PAZO — operaciones pendientes del cierre RC (2026-10-10)

Preparación ejecutable, **sin autorización de lanzamiento ni borrado**. Complementa la subhoja maestra. Computer Use permanece bloqueado. No se aplicó SQL alojado ni se modificaron Edge, datos existentes o `main`.

## T16 — fotos de comunidad y fallos parciales

El cliente borra únicamente el post autorizado por RLS y exige una fila devuelta con el ID exacto. Obtiene la ruta de esa fila, no del DTO proporcionado por el cliente. Una respuesta vacía/error no confirma eliminación. Para fotos, informa **retirada pendiente**; no ejecuta `Storage.remove` desde esta ruta. Un frontend sujeto a RLS no puede demostrar ausencia global de referencias ocultas/compartidas. Tras un upload/INSERT no confirmado conserva el objeto, muestra su referencia y bloquea otro envío en ese formulario; una respuesta de INSERT perdida puede haber confirmado el post. Al recargar hay que comprobar publicaciones existentes antes de reenviar.

La referencia persistente es `storage.objects` (bucket, ruta, ID y fecha ya existentes), no una cola nueva en datos personales ni localStorage. El inventario `supabase/sql/community_media_cleanup_inventory.sql` consulta todas las referencias de PAZO conocidas: rutas de community posts y URLs de posts, avatares de posts, community posts, pets, communities y profiles; reconoce sufijos exactos, query strings y slash `%2F`. Todo claim de moderación conserva el objeto fuera de la limpieza ordinaria. Las URLs no canónicas/transformadas o referencias externas necesitan revisión individual adicional; cero referencias **no** autoriza borrado.

Operador designado: revisar este inventario y avisos de soporte antes de cada jornada de beta y tras un fallo notificado. El PO debe confirmar quién asume esa revisión antes de salida pública. Los resultados con rutas/IDs se guardan exclusivamente en bitácora privada; Git solo conserva conteos. No añadir payloads ni referencias a PostHog/logs.

1. Ejecutar el inventario READ ONLY con acceso autorizado al esquema completo. Si falta un esquema/permiso, parar la limpieza, no inferir cero referencias.
2. Para un único candidato autorizado, obtener su fila exacta usando el SELECT parametrizado del archivo. Confirmar que el upload terminó, que no hay publicación guardada tras respuesta perdida, titularidad, referencias no canónicas, claims y retenciones. No limpiar uploads recientes/en curso; edad no constituye permiso.
3. Conservar `referenced_keep` y `claimed_hold`. Resolver la publicación no confirmada antes de cualquier limpieza. Si hay contenido de terceros o una referencia ambigua, conservar y escalar.
4. Solo con autorización independiente del PO y operador disponible, retirar el objeto exacto por la API oficial de Storage o su panel administrativo. Nunca borrar filas de `storage.objects` por SQL, prefijos, carpetas completas o buckets.
5. Verificar metadatos Storage, URL original y URL con cache-bust; ante timeout/401/403/5xx o URL aún servida, registrar pendiente. No afirmar purga de CDN, réplicas o backups. No escribir `purged` desde este procedimiento.

Evidencia actual: inventario ejecutado en READ ONLY sobre el esquema real; **0 objetos** en `community-post-photos`. Pruebas sintéticas del servicio real y del coordinador cubren respuesta vacía, error, DTO manipulado, post sin foto, upload correcto e INSERT con respuesta perdida. **No** prueban retirada física alojada ni PostgreSQL de F14.

## T08 — alternativa manual acotada y verificable

Ruta A sigue BLOQUEADA: el SQL histórico F14 está archivado, pero no existe conexión autorizada para `pg_dump --schema-only` del esquema base anterior al historial. La migración `20261010222006` sigue ausente del historial alojado. No crear tablas reducidas y declarar PASS.

Ruta B está preparada para decisión del PO; **no verificada físicamente**. Es una alternativa de beta pequeña, no activa A3/Edge. Mantener `F14_MEDIA_PURGE_RELEASE_APPROVED=false`.

Prueba posterior mínima, únicamente después de autorización de **un medio nuevo descartable**:

1. Crear un post propio sintético con una foto nueva sin personas/terceros. Registrar privadamente target, propietario, bucket/ruta, object ID y URL. Verificar coincidencia exacta con la fila y que ninguna otra superficie referencia la foto. No usar medios anteriores.
2. Denunciar/retirar ese contenido con moderador autorizado. Comprobar ocultación social y estado pendiente; la retirada social no prueba borrado físico. Revisar claim/retenciones antes de intervenir como administrador.
3. Ejecutar `node --experimental-strip-types scripts/verify-single-media.mjs before` desde un entorno operativo seguro, con `PAZO_VERIFY_MEDIA_BUCKET`, `PAZO_VERIFY_MEDIA_PATH` y `PAZO_VERIFY_STORAGE_READ_KEY` en variables de sesión. La credencial debe ser autorizada para leer Storage; no solicitarla en chat, introducirla en `VITE_*`, Git o Actions. El script solo lee y no imprime identidades ni credenciales. No concede privilegios.
4. El operador retira **solo ese objeto** mediante Storage oficial después del gate exacto. No invocar Edge ni aplicar la migración pendiente para probar la vía manual; no alterar claims/status por SQL improvisado.
5. Ejecutar el verificador en etapa `after`. Requiere ausencia confirmada por Storage (404 explícito), 404 de URL original y 404 con cache-bust. Una respuesta ambigua es BLOQUEADO/FAIL. Registrar momento, resultados y alcance privado; mantener estado pendiente si cualquier prueba falla. Este PASS puntual no certifica purga universal de CDN/backups.
6. El PO evalúa si acepta el método manual y su operador para beta. Si opta por automatización, siguen necesarios snapshot fiel, PostgreSQL aislado, aprobación de aplicación y ensayo separado. La vía B no valida ni autoriza la migración.

El script pasó comprobación de sintaxis y rechaza configuración ausente sin efectuar solicitudes. No se ejecutó contra objetos reales. **T08 permanece BLOQUEADO**.

## T05/T06 — Preview y Auth

- Proyecto único `pazo-app-t83r`, `prj_K40UBOjEcIpvUMYy1A2SdRHlG0IH`. Protección SSO activa (`all_except_custom_domains`). La URL pública de Supabase se hizo explícita solo para Preview de la rama RC; la publishable key Preview se comparó con las claves públicas activas del proyecto y coincide. No se cambiaron variables de producción ni secretos.
- No existe `VITE_MAPBOX_ACCESS_TOKEN`. El PO debe disponer una clave **pública** `pk.*`, con orígenes Preview adecuados, mediante el canal autorizado de configuración. No usar `sk.*`, inventar token ni copiar secretos. El código muestra error honesto cuando falta. Modelos glTF empaquetados no acreditan render 3D real.
- El conector puede leer metadatos pero recibe `403` en `read_protection_bypass`. Falta acceso de la conexión al contenido protegido de este proyecto/equipo. No se desactivó protección ni se usó navegador/CU para eludirlo.
- Callback de recuperación usa `window.location.origin` y `/?auth=recovery`; no contiene un localhost fijo. Para prueba HTTPS usar la URL estable RC `https://pazo-app-t83r-git-release-mvp-beta-fast-track-f4f99c-digitalapp.vercel.app/?auth=recovery` y autorizarla exactamente en Supabase Auth. El conector disponible no expone lectura/edición de configuración Auth (`SITE_URL`/allowlist). Un operador autorizado debe verificarlas; no asumirlas desde SQL de tablas de usuarios.
- Tras corregir acceso/allowlist, efectuar una recuperación con una cuenta controlada designada por el PO, comprobar entrega y evento `PASSWORD_RECOVERY`, pantalla correcta y cambio consentido. No usar ninguna de las seis cuentas preservadas como descartable, enviar correos sin cuenta designada ni repetir QA Auth histórica. Hasta ello T06 BLOQUEADO.

## T07/T10 — solicitudes, textos y operador

Los tres RPC de baja están presentes y admiten authenticated/service_role, sin grant PUBLIC/anon; el ensayo E2E previo sigue PASS, no se repitió. Hay una solicitud `completed`, ninguna abierta. El flag público no existe en Preview y permanece OFF. El contacto aprobado `appdigital.corp@gmail.com` está en onboarding/textos legales y ahora también directamente junto a la opción de baja deshabilitada. Un mailto no demuestra entrega ni capacidad del operador.

Textos ES/EN coherentes con retirada social y revisión manual de archivos; fecha efectiva `null`, PostHog hardcoded OFF aunque existan variables antiguas. No se prometen tiempos, purga total ni verificación documental 18+. Confirmar operador, canal atendido, frecuencia real de revisión y tratamiento de incidentes/menores antes de activar `VITE_F14_DELETION_REQUESTS_ENABLED` en el entorno autorizado. Leaked Password Protection sigue como gate previo del plan Free; no se contrató plan ni se certificó su configuración con esta ejecución. Se conserva mitigación de contraseña de UX, que no sustituye detección de filtraciones.


## T10 — Protocolo mínimo de moderación aprobado por Product Owner (2026-10-11)

**Decisión expresa del PO:** el PO operará personalmente el buzón público `appdigital.corp@gmail.com` y la cola privada de solicitudes/denuncias **cada día durante la beta**. Esta decisión designa al responsable y la cadencia; no constituye prueba de que ya se estén atendiendo peticiones externas ni de que existan avisos automáticos. Nunca afirmar que el correo recibe automáticamente cada denuncia o baja: la cola privada se revisa por separado.

Procedimiento mínimo aprobado para la beta:

1. Revisar diariamente el correo de soporte/privacidad y las colas autorizadas de moderación y baja en Supabase; usar las consultas READ ONLY ya versionadas y las funciones operadoras permitidas. No exportar UUID, correos personales, teléfonos, enlaces de recuperación ni otros datos sensibles a Git/capturas.
2. Priorizar amenazas, acoso grave, divulgación de datos privados y sospechas razonables de que una cuenta pertenece a un menor de 18 años. Evaluar el contexto sin presumir automáticamente la infracción; si corresponde, ocultar o restringir contenido mediante los mecanismos moderadores existentes y registrar evidencia mínima en bitácora administrativa privada. Escalar incidentes que excedan las herramientas actuales, sin borrar datos ajenos ni prometer resultados inmediatos.
3. No solicitar documentos de identidad innecesarios. Para peticiones de eliminación, verificar titularidad y alcance conforme a `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`; **solicitar baja no equivale a borrado**. La cuenta del único moderador sigue protegida. No ejecutar SQL de borrado de Auth ni Storage directamente.
4. Mantener un registro privado de revisiones, decisión, fecha y resultado mínimo, sin copiar contenido personal en Git, analítica ni documentos públicos. Solicitudes bloqueadas permanecen pendientes; informar al titular por canal autorizado sin prometer borrado inmediato ni purga universal de caché/backups.
5. Si el operador no puede realizar la revisión o responder incidentes, detener intake/publicación y reevaluar capacidad operativa. La revisión diaria no certifica SLA, asesoramiento jurídico ni un sistema de alertas automático.

**Alcance del gate:** protocolo y responsable APROBADOS por PO; operación bajo carga, canal efectivo, textos finales, botón `VITE_F14_DELETION_REQUESTS_ENABLED` y respuesta real al público aún requieren verificación separada. Flag público sigue OFF. F14 purga OFF. No lanzar beta ni habilitar flags como consecuencia de esta aprobación.

**Seguridad, solo lectura, 2026-10-11:** el asesor de Supabase reportó protección de contraseñas filtradas desactivada; según su documentación oficial requiere plan Pro o superior. La UX exige min. 8 caracteres y mezcla de tipos, pero no verifica fugas. **No activar plan pago**. También reportó advertencias de RPC SECURITY DEFINER ejecutables, incluidas `f14_content_visible` en rol `anon`; un aviso exige revisar intención/privilegios y código, **no** revocar grants automáticamente ni tratar todos los avisos como vulnerabilidades demostradas. `f14_content_visible` fue inspeccionada en modo READ ONLY: solo devuelve booleano para `p_id` y `moderation_private.is_removed`. Continuar revisión de exposición antes de beta.

## T11 — Respaldo y preparación para salida (gate NO completado al 2026-10-11)

Fuente operativa: `docs/PAZO_BACKUP_RESTORE_RUNBOOK.md`. Preparación documentada, **sin evidencia de backup+restore PASS**. Antes de publicar: exportación lógica DB real; copia binaria de Storage respetando privacidad; copia off-site segura; restore drill en destino aislado y verificación de Auth/RLS/Storage; inventario de datos prebeta y aprobación individual para eliminar los estrictamente descartables; rollback frontend y gates separados de cambios de DB/Storage y de merge/main/dominio. Nunca subir secretos/backups al repositorio, crear proyecto pagado sin gate ni restaurar sobre hosted para "probar". El PO aún no autorizó una eliminación masiva, merge ni beta pública.

## T09 — protocolo físico mínimo

Prerrequisito: último Preview HTTPS protegido que cargue realmente, con cuenta de prueba controlada. La instalación puede quedar limitada por protección Vercel: no desactivarla sin decisión PO.

| Dispositivo real | Verificación mínima | Resultado actual |
|---|---|---|
| Android / Chrome | Manifest/iconos/SW por HTTPS; instalar; abrir standalone; navegar Crear/Feed/Mascota; recargar; cerrar/abrir; logout/login; actualizar al nuevo build sin contenido privado de otra sesión | BLOQUEADO: sin teléfono/acceso runtime |
| iPhone / Safari | Compartir → Añadir a inicio; icono; standalone; mismas rutas, sesión, actualización y aislamiento | BLOQUEADO: sin teléfono/acceso runtime |

Guardar solo versión de build, dispositivo/navegador, fecha y booleanos; no capturar correos, tokens ni contenido privado. Tests PWA estáticos PASS (manifest, dimensiones PNG, scope/standalone, zoom y SW network-only); no sustituyen dispositivos ni prueba HTTPS.

## T11 — inventario, conservación y release futuro

**Decisión del PO, 2026-10-11:** Google Drive será el repositorio privado off-site de respaldos. **Solo cargar archivos cifrados localmente**, nunca dumps o archivos privados sueltos en carpetas sincronizadas. Ver contrato detallado en `PAZO_BACKUP_RESTORE_RUNBOOK.md`; DB+Storage, subida, descarga y restore siguen **PENDIENTES**. No se conectó Drive ni se trasladaron datos.

Inventario agregado READ ONLY de esta ejecución: **6 Auth, 1 profile, 1 pet, 0 posts, 0 communities, 0 community posts, 1 objeto `pet-avatars`, 1 grant moderador, 0 claims held, 1 baja completed; 55 FK hacia Auth/pets**. No incluir IDs ni inferir que estas filas son basura de QA. Preservar las seis cuentas originales, el último moderador, mascota y archivo existente. No se ejecutó limpieza.

Preflight de salida:

1. Identificar privadamente solo datos de prueba cuya titularidad/descartabilidad apruebe el PO; mapear las 55 FK, propietarios, comunidades y referencias/claims antes de proponer borrados. Por defecto el inventario actual se **conserva completo**.
2. Revisar `PAZO_BACKUP_RESTORE_RUNBOOK.md`: copia DB, copia binaria Storage y revisión de restore en entorno separado. No declarar respaldo/restore PASS por tener un runbook. Falta acceso DB de exportación y evidencia de un respaldo recuperable; los archivos Storage no vuelven con un restore SQL.
3. Conservar SHA anterior para rollback de frontend; revisar diff RC/main y configuración pública. Comparación remota previa a este cierre: main `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`, RC 238 commits ahead/0 behind; esto no aprueba los cambios históricos ni garantiza un merge futuro sin nueva revisión. El rollback de frontend no revierte migraciones ni eliminaciones; estas requieren plan específico antes de su gate. No promover un Preview ni hacer producción durante esta orden.
4. Tras P0 y F13 aprobados, PO autoriza por separado datos de prueba, migraciones concretas, merge RC/main, deployment/dominio/fecha efectiva y publicación. Revisar CI y producción candidata del SHA acordado. **No** ejecutar el merge preparado, activar flags globales o automatizar lanzamiento ahora.

T11 permanece DECISIÓN PO; planificación/inventario terminados, respaldo efectivo y autorizaciones pendientes. T12 solo puede cerrar tras smoke HTTPS/Mapbox/Auth/PWA esenciales. La deuda heredada de lint y warnings de tamaño se informan separadamente; no se inventa PASS runtime a partir del build.
