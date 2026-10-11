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

## T09 — protocolo físico mínimo

Prerrequisito: último Preview HTTPS protegido que cargue realmente, con cuenta de prueba controlada. La instalación puede quedar limitada por protección Vercel: no desactivarla sin decisión PO.

| Dispositivo real | Verificación mínima | Resultado actual |
|---|---|---|
| Android / Chrome | Manifest/iconos/SW por HTTPS; instalar; abrir standalone; navegar Crear/Feed/Mascota; recargar; cerrar/abrir; logout/login; actualizar al nuevo build sin contenido privado de otra sesión | BLOQUEADO: sin teléfono/acceso runtime |
| iPhone / Safari | Compartir → Añadir a inicio; icono; standalone; mismas rutas, sesión, actualización y aislamiento | BLOQUEADO: sin teléfono/acceso runtime |

Guardar solo versión de build, dispositivo/navegador, fecha y booleanos; no capturar correos, tokens ni contenido privado. Tests PWA estáticos PASS (manifest, dimensiones PNG, scope/standalone, zoom y SW network-only); no sustituyen dispositivos ni prueba HTTPS.

## T11 — inventario, conservación y release futuro

Inventario agregado READ ONLY de esta ejecución: **6 Auth, 1 profile, 1 pet, 0 posts, 0 communities, 0 community posts, 1 objeto `pet-avatars`, 1 grant moderador, 0 claims held, 1 baja completed; 55 FK hacia Auth/pets**. No incluir IDs ni inferir que estas filas son basura de QA. Preservar las seis cuentas originales, el último moderador, mascota y archivo existente. No se ejecutó limpieza.

Preflight de salida:

1. Identificar privadamente solo datos de prueba cuya titularidad/descartabilidad apruebe el PO; mapear las 55 FK, propietarios, comunidades y referencias/claims antes de proponer borrados. Por defecto el inventario actual se **conserva completo**.
2. Revisar `PAZO_BACKUP_RESTORE_RUNBOOK.md`: copia DB, copia binaria Storage y revisión de restore en entorno separado. No declarar respaldo/restore PASS por tener un runbook. Falta acceso DB de exportación y evidencia de un respaldo recuperable; los archivos Storage no vuelven con un restore SQL.
3. Conservar SHA anterior para rollback de frontend; revisar diff RC/main y configuración pública. Comparación remota previa a este cierre: main `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`, RC 238 commits ahead/0 behind; esto no aprueba los cambios históricos ni garantiza un merge futuro sin nueva revisión. El rollback de frontend no revierte migraciones ni eliminaciones; estas requieren plan específico antes de su gate. No promover un Preview ni hacer producción durante esta orden.
4. Tras P0 y F13 aprobados, PO autoriza por separado datos de prueba, migraciones concretas, merge RC/main, deployment/dominio/fecha efectiva y publicación. Revisar CI y producción candidata del SHA acordado. **No** ejecutar el merge preparado, activar flags globales o automatizar lanzamiento ahora.

T11 permanece DECISIÓN PO; planificación/inventario terminados, respaldo efectivo y autorizaciones pendientes. T12 solo puede cerrar tras smoke HTTPS/Mapbox/Auth/PWA esenciales. La deuda heredada de lint y warnings de tamaño se informan separadamente; no se inventa PASS runtime a partir del build.
