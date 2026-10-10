# PAZO — Fast-track al MVP lanzable | decisión PO 2026-10-09

**Decisión vigente:** avanzar más rápido, sin intervenir Vercel hasta que el MVP esté listo para lanzamiento. Prioridad: cerrar funcionamiento e integración, no incrementar experimentos, scripts sueltos ni borradores A3. **No autoriza merge, deploy, SQL permanente, eliminación de datos ni gasto.**

## Estado fundamentado

- `PR #36` DRAFT `beef7a68`: Feed/Auth/recuperación/mensajes no ficticios; CI #37942243258 SUCCESS; QA local PO reportada PASS salvo enlaces reales de confirmación y recuperación de contraseña.
- `PR #37` DRAFT `9142dbf0`: desciende directamente de #36 (**ahead_by=9, behind_by=0**), contiene sus cambios, más denuncias en cinco superficies y moderación. CI #37950837207 SUCCESS y QA PO de formulario/reportes y decisión moderadora con datos descartables; pendiente E2E completo para casos restantes y medios.
- `PR #38` DRAFT `65bc92f8`: **A3 PAUSADA PARA EVITAR SOBREINGENIERÍA**, 13 SQL NOT_APPLIED y worker sin ejecución real. Preservar rama/documentos; no seguir agregando borradores hasta resolver una brecha concreta del MVP. Pausada ≠ apta para Beta.
- `PR #35` DRAFT permanece sin integrar por riesgo de regresión en Mapa: cambio `PLACES_MAP_DEVELOPMENT_ONLY`; `PR #34` rollout alternativo requiere decisión posterior. La versión PR #37 conserva `MapView` real y no tiene ese guard.

## Carril único de cierre — lotes con resultado comprobable

| Orden | Entregable completo | Prueba de aceptación antes de pasar |
| --- | --- | --- |
| 1 | **Candidato de integración MVP:** validar coherencia de #36 + #37, diferencias con main, código CI y regresión de Mapa. Presentar gate concreto de merge para autorización PO; integrar en orden después, jamás automáticamente. | Build/CI del HEAD y check de que ninguna fake door sustituye Mapa, y que no se pierden datos/código ajenos. |
| 2 | **Auth real:** comprobar alta con confirmación y recuperación por enlace recibido, redirect autorizado al localhost, sesión, contraseña y estados de error. | El usuario usa correo real de prueba y ejecuta link E2E sin Vercel; registrar evidencia o bloqueo de configuración preciso. |
| 3 | **Seguridad social mínima:** cinco superficies de denuncia, control moderador/no moderador, retirar contenido con resultado público correcto, y solución verificable para archivos/URLs persistentes. | Pruebas focalizadas con cuentas de prueba; no afirmar purga de Storage/CDN mientras el medio siga público. |
| 4 | **Privacidad y eliminación:** definir e implementar una ruta **real y proporcional** para solicitudes de eliminación de cuenta/mascota y medios con conciliación y protección de aportes de terceros. Resumir PR #38 en un gate de aceptación único, no seguir una migración por turno. | Solicitud, verificación, limpieza real/registro, resultado Auth/Storage, terceros intactos y políticas/retención coherentes; si no está resuelto, no abrir Beta externa. |
| 5 | **RC en local:** QA de cambios afectados en móvil, estados vacíos/error y privacidad/Terms; inventario seguro de datos de prueba y plan de limpieza pre-lanzamiento. | Un checklist PASS/FAIL con evidencia, sin repetir suites históricas aprobadas. Solo entonces autorizar evaluación de Vercel para release. |

## Protocolo antiestancamiento
1. **Vercel en pausa absoluta** durante desarrollo y validación local; no Preview, deploy, team settings, upgrades, variables ni llamadas al conector. Se reabre solo con RC listo y decisión del PO.
2. **Frontend local Antigravity + Supabase actual con datos de prueba**, sin crear infraestructura adicional. Nunca limpiar esos datos hasta inventario + autorización.
3. **Un lote verificable por intervención** (implementación + tests + QA/cierre), no commits seriales de 1 guard/caso hipotético. Reducir actualizaciones intermedias; informar resultados y el único bloqueo que requiera intervención del PO.
4. Trabajo opcional **PAUSADO**: F13 cosmética, mensajería backend F10, notificaciones genéricas F11, features premium, y ampliaciones A3 que no destraben un gate de beta.
5. **No rebajar P0 de seguridad**: moderación y retirada de medios, propiedad de datos, derechos de cuenta y políticas son condiciones reales para beta pública. Si falta algo, continuar con QA interna y no publicar externamente ni declarar MVP listo.
6. PRs #36/#37 están pendientes de merge **por autorización explícita del PO**; A3 #38 no va al merge del MVP tal como está. Conservar ramas y no reescribir historial. GitHub Actions CI reemplaza pruebas repetitivas, pero no cubre E2E ni revisión de seguridad externa.

**Próximo trabajo concreto:** auditar integración #36/#37 como candidato MVP y presentar un único gate de merge + QA Auth sobre localhost. Evitar nuevas subfases de A3. Este documento prevalece sobre los próximos pasos cronológicos antiguos en los handoffs mientras rija la decisión PO.

## Lote 1 — integración MVP y Auth fail-closed

- Auditoría GitHub: `main` sigue `ae7e63f`; PR #37 conserva descendencia directa de #36 y usa `MapView` real en tab mapa, sin `PLACES_MAP_DEVELOPMENT_ONLY`. No integrar PR #35 que contiene el guard dev-only; no se reescribe ninguna rama ni se aplica backend.
- Hallazgo en PR #37: `?auth=recovery` era suficiente para abrir la pantalla y `sessionReady=Boolean(user)` permitía llegar a la acción de cambio de contraseña desde una sesión normal existente, sin constancia de un enlace de recuperación validado. **Corrección propuesta:** exigir evento `PASSWORD_RECOVERY` con usuario de sesión, y validar el mismo gate al llamar a `updateUser`; al completar/salir/signout se revoca ese estado. El URL sigue siendo solo marcador de UI; un enlace caducado muestra aviso y no habilita el formulario.
- La prueba Node verifica la matriz (evento válido × usuario); falta **QA real de clic de correo** y comprobar si el evento llega en todos los flujos/reload del navegador. Seguridad fail-closed: ante ausencia de evento se pide solicitar un enlace nuevo. No asumir que `supabase/config.toml` local refleja URLs Auth permitidas en el proyecto alojado.
- Pendiente gate de integración: autorización específica de merge y confirmación de que no disparará deploy automático a Vercel; por ahora branch DRAFT y ejecución local.

## Moderación: mejorar precisión de objetivo en las cinco superficies

La QA anterior despublicó el post antiguo cuando se pretendía comprobar uno nuevo. El formulario mostraba principalmente autor o tipo, no el contenido preciso. Se añadió una etiqueta de contexto con extracto acotado para posts/comentarios de Feed y Comunidad, nombre de mascota para perfiles y sufijo de UUID idéntico al del target backend. La confirmación de moderación usa exclusivamente el tipo y UUID de la denuncia devuelta por RPC, nunca un texto libre del denunciante. No se guarda ni transmite el extracto extra ni se agrega analytics.

Supabase confirma que `f14-moderation-purge` está desplegado únicamente como **stub 503** y `f14_pending_media` devuelve un target, no un objeto Storage validado; la purga/URL/CDN sigue P0 abierta. El cambio de identificación ayuda a evitar reportar el elemento incorrecto, **no** certifica purga física ni una vista previa fiable del contenido para el moderador.

Auth: el PO confirmó correo de recuperación y presentación del formulario en localhost. No repetir QA salvo nueva regresión.

## D3-A — Retirada verificable de fotos en servidor (lote integrado, todavía sin desplegar)

Implementación real versionada: `supabase/functions/f14-moderation-purge/index.ts` + `core.ts`, `supabase/sql/f14_moderation_media_gate.sql`, tests integrados en `npm run test:mvp` y acción de moderador condicionada por `VITE_F14_MEDIA_PURGE_ENABLED=true` (default OFF). En Edge, `F14_MEDIA_PURGE_ENABLED=true` también es obligatorio (default OFF); cliente nunca selecciona bucket/path ni recibe secretos.

Flujo: JWT validado por Auth + RPC `f14_is_moderator`; fila actual obtenida con service client; URL exacta del dominio Storage PAZO/solo buckets `post-photos` o `community-post-photos`; path de comunidad coincide con referencia guardada; RPC privativa `f14_moderation_media_gate(...,'preflight')` exige restricción `pending_review`, owner de objeto = owner de publicación y exactamente una referencia a URL entre posts/avatars/comunidad; Storage API `.remove()` (nunca SQL); `.exists()` confirma ausencia; HEAD sobre URL literal + cache-bust rechaza 200; RPC `...('complete')` valida de nuevo referencia/objeto ausente y cambia `media_status` a `purged`. Si cualquier parte falla, permanece en `pending_review`, con reintentos de conciliación. Se rechazan enlaces externos, otro proyecto, paths inseguros y fotos compartidas.

**Alcance intencional:** posts Feed/Comunidad. `pet_profile` involucra imágenes múltiples y aportes cruzados: permanece manual; contenido sin Storage propio, referencias legacy o URLs externas también requieren revisión. `purged` significa ausencia del objeto de origen y verificaciones HTTP puntuales, **NO** garantía de invalidación instantánea en todos los nodos CDN; un enlace guardado podría mantenerse en caché. Políticas públicas y gate de Beta deben reflejarlo.

**Nada aplicado todavía**: hosted `f14-moderation-purge` sigue stub 503. `supabase/sql/f14_moderation_media_gate.sql` es SQL concreto de backend revisable, no una migración aplicada. Requiere gate explícito para instalar SQL, reemplazar Edge y habilitar flags para pruebas con **una fotografía desechable propia**; comprobar URL antes/después, BOLA/no-moderador, contadores/bitácora y CDN. No tocar Vercel ni realizar borrado remoto hasta entonces.

### Gate de implementación aprobado por PO (2026-10-09)

PO autorizó instalar **únicamente** `f14_moderation_media_gate` (función SQL) y publicar la nueva versión de `f14-moderation-purge` **inactiva**, sin activar frontend ni ejecutar borrado de objetos. Se agregó lock de despliegue de código `F14_MEDIA_PURGE_RELEASE_APPROVED=false` además del flag de entorno `F14_MEDIA_PURGE_ENABLED` y el flag visual `VITE_F14_MEDIA_PURGE_ENABLED`, para impedir cambios accidentales por secreto preconfigurado. No asumir autorización de ensayo destructivo, Vercel o merge.

### Descubrimiento en auditoría de preinstalación — protección histórica prioritaria

En Supabase alojado están **activos** un trigger `f14_no_unverified_media_purge` (deniega `media_status='purged'`) y los leases `moderation_private.media_claims`, cuyo guard de Storage prohíbe operaciones con claim `held`. El SQL nuevo original no reconciliaba esos controles anteriores; instalarlo como ejecutor completo implicaría contradicciones y posible pérdida de garantías. Se refactorizó el SQL autorizado como **preflight de servicio**: precisa claim `held` válido, verificado y coincidente con el objeto; etapa `complete` devuelve `false` sin `UPDATE`. Se conserva el trigger histórico. El nuevo Edge conserva latch fijo `F14_MEDIA_PURGE_RELEASE_APPROVED=false`; ninguna eliminación real está autorizada en esta instalación. Para activar y probar purga física se requiere reconciliar guards y autorización específica del PO.

### Instalación backend aprobada y auditada — 2026-10-10 UTC

La autorización PO alcanzó **instalar SQL y Edge con eliminación desactivada**. Migración aplicada en Supabase: `20261010033538_f14_moderation_media_preflight_locked`; función `public.f14_moderation_media_gate` solo de prevalidación, exige claim histórico `held` verificado y devuelve `false` para etapa `complete` sin modificar datos. El trigger `f14_no_unverified_media_purge` y las protecciones de claims de Storage no se deshabilitaron. Edge `f14-moderation-purge` actualizada a versión **2**, `verify_jwt=true`, con latch fijo `F14_MEDIA_PURGE_RELEASE_APPROVED=false` aun si secret env se configurase accidentalmente.

Verificación SQL alojada: grant EXECUTE anon/authenticated **false** y service_role **true**, una función gate presente, 13 objetos post-photos + community-post-photos antes y después, cero restricciones `purged` y cero `pending_review`. CI del código #38021054637 PASS. Hubo aviso del asesor de seguridad sobre otra función preexistente, `f14_content_visible` ejecutable desde rol anon; auditar el contrato público antes de tocarlo.

**Gate abierto:** integrar de forma segura el sistema de claims/locks y el trigger existente para permitir eventual eliminación física con prueba específica autorizada. La presente autorización NO cubrió habilitar flags, ejecutar purga, cambiar triggers anteriores, merge ni Vercel. CDN no se declara purgada.

### Lote consolidado D3-A: claims existentes y confirmación exacta

Se integró el workflow histórico `f14_prepare_media_claim` → `f14_recheck_media_claim` → `f14_moderation_media_gate(preflight)` antes de llamar Storage. Se preserva la reserva `held` mientras la Edge realiza la eliminación para impedir cambios de usuarios normales al archivo. La etapa de confirmación en `supabase/sql/f14_moderation_media_finalize.sql` exige objeto ausente y claim original verificado; el trigger `f14_reject_unverified_purged` se conserva y SOLO permite `purged` a `service_role` con claim exacto/checked y Storage ausente. No se introducen bypasses mediante GUC ni roles públicos. La Edge aún mantiene `F14_MEDIA_PURGE_RELEASE_APPROVED=false`, y la interfaz `VITE_F14_MEDIA_PURGE_ENABLED` está apagada.

**Gate controlado único restante**: ejecutar E2E con una fotografía nueva descartable identificada inequívocamente, y verificar GET directo/actualización en Storage, sin utilizar fotos preexistentes; nunca declarar CDN global purgada. Sin Vercel y sin merge a main.

### D3-A — Instalación completa de claims y finalización protegida, 2026-10-10 UTC

Backend consolidado y aplicado tras CI PASS #38021681379: migración `20261010034610_f14_finalize_media_after_verified_claim` sustituye `f14_moderation_media_gate` anterior por comprobación de claim exacto, `moderation_private.f14_media_probe` live para preflight, referencia única, propietaria, reporte `removed`, y finalización `purged` SOLO con objeto de Storage inexistente y claim verificado. Se actualizó sin retirar el trigger `f14_no_unverified_media_purge`: ahora conserva rechazo general, permitiendo exclusivamente transición `pending_review→purged` en rol service_role con claim verificado y objeto ausente. Edge versión **3**, `verify_jwt=true`, integra `f14_prepare_media_claim` / `f14_recheck_media_claim` antes de preflight y antes de Storage API.

**Estado verificado:** `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true`; trigger anterior activo; 13 objetos en buckets `post-photos/community-post-photos`, 0 filas `purged`, 0 `pending_review`, 0 `media_claims`. `F14_MEDIA_PURGE_RELEASE_APPROVED = false` hardcoded en Edge y UI `VITE_F14_MEDIA_PURGE_ENABLED` OFF. Por tanto **ninguna eliminación ha sido ni puede ser ejecutada por este frontend/Edge en este despliegue**.

**Una prueba pendiente, sin nuevas microfases:** usuario crea NUEVA publicación con foto descartable en una cuenta de prueba, la denuncia desde otra cuenta de prueba y moderador la despublica, conservando ID/URL sólo para la verificación privada; limitar el posterior desbloqueo temporal a ese `target_id`, ejecutar API, comparar bytes/HEAD+GET antes y 404 después, estado `purged` de ese único registro y todas las demás fotos intactas, y volver a apagar la capacidad. No probar sobre las 13 fotos anteriores de estado ambiguo. Si la foto falla, revisar el fallo concreto en lugar de reiniciar arquitectura. No Vercel, no merge ni borrar datos de test por lote.

Los hallazgos de Security Advisor preexistentes incluyen `rls_enabled_no_policy`, `anon_security_definer_function_executable`, `authenticated_security_definer_function_executable` y `auth_leaked_password_protection`; no se modificaron fuera del scope de este gate.

### QA con un solo objeto descartable, identificado por auditoría (2026-10-10 UTC)

Entre dos publicaciones despublicadas con foto, solo `aa00d5b6-9626-4e16-90a1-3b6e7bf4076e` fue creada ahora (2026-10-10 04:02 UTC); la otra data de 2026-10-05 y NO está autorizada para el ensayo. El nuevo objeto: 1 referencia en posts, cero en pets/community, owner de Storage coincide, registro pending_review, reporte removed y f14_media_probe=true. Se agregó allowlist temporal servidor `feed_post + aa00d5b6-9626-4e16-90a1-3b6e7bf4076e` hasta 2026-10-11T07:00:00Z, con JWT Auth y f14_is_moderator exigidos, más botón exclusivo DEV/local para ese mismo ID. Release general sigue false, sin Vercel ni merge; después de E2E quitar excepción en GitHub y desplegar Edge bloqueado. Ni los demás 13 objetos ni las cuentas se borran por este cambio de código.

### Estado posterior a despliegue de ensayo único

Se instaló Edge `f14-moderation-purge` v4 con `verify_jwt=true` y excepción temporal solo para `feed_post/aa00d5b6-9626-4e16-90a1-3b6e7bf4076e` hasta `2026-10-11T07:00:00Z`. La liberación global `F14_MEDIA_PURGE_RELEASE_APPROVED=false` sigue fija; el botón nuevo aparece únicamente en `npm run dev` y exclusivamente en el registro objetivo. CI del código `05b665cf` #38023048144 PASS. Inventario de auditoría de antes y después de deploy: Storage publicaciones = 14 (13 anteriores + imagen nueva), purged=0, target pending_review=1, foto existe; ACL de finalización anon/authenticated=false. **No hubo eliminación ni mutación de usuario por despliegue**. Falta ejecutar solo esta operación desde el moderador y restablecer la Edge bloqueada tras verificar.

### D3-A 04:28 UTC — Error de preflight identificado

Los logs alojados mostraron un único POST 409 de Edge sin solicitudes Storage: getUser, isModerator, prepare_media_claim y recheck_media_claim exitosos; gate SQL 200 devolvió boolean false. La captura del usuario era correcta. Prueba controlada bajo BEGIN/ROLLBACK con `request.jwt.claims={'role':'service_role'}` confirmó `auth.role()='service_role'` pero `current_setting('request.jwt.claim.role')=NULL`, por lo que el preflight original era false. Con legacy role explícito el preflight era true. Corregir ambas guards con `auth.role()`, conservar grants/RLS/claims y extender 60 min solo claim de prueba ya verificado. Ningún objeto fue borrado; no pedir publicar otro post ni probar otro target.

### F14 D3-A — Hotfix de JWT PostgREST aplicado (2026-10-10 04:33 UTC)

Tras un único intento de eliminación del test, Edge devolvió HTTP 409, pero auth/getUser/isModerator/prepare_claim/recheck_claim pasaron. La verificación manual SQL probó que PostgREST almacena el rol en `request.jwt.claims`, mientras las funciones de gate/trigger solo leían `request.jwt.claim.role`. Nuevo archivo SQL versionado: `supabase/sql/f14_media_auth_role_compat_single_trial.sql`, instalado como migración `20261010043307_f14_media_jwt_claim_compat_single_test`. Reemplazadas ambas comprobaciones por `auth.role() IS DISTINCT FROM 'service_role'`, manteniendo EXECUTE solo service_role, los guards de claim/report/object y el trigger activo.

Para evitar recrear medios y el vencimiento de cinco minutos, se extendió UNA sola claim de objeto ya comprobado bajo condición `status='held'` y snapshot vivo exacto, únicamente el post nuevo `aa00d5b6-9626-4e16-90a1-3b6e7bf4076e`, hasta 05:33 UTC. No se ejecutó Storage API DELETE. Prueba de rol `BEGIN; SET LOCAL request.jwt.claims='{"role":"service_role"}'; SELECT preflight; ROLLBACK;` PASS: gate true, cero nuevas autorizaciones a anon/authenticated. Inventario 14 objetos y uno exactamente para el target, `purged=0`, `pending_review=1`. CI #38024417241 PASS.

**Siguiente acción del PO:** en localhost `Medios pendientes` → `Actualizar estado` → únicamente `7bf4076e` → `Retirar foto de prueba`. Con respuesta OK o fallo, verificar inmediatamente Storage + CDN + registro y **desactivar la excepción de Edge v4**. Si CDN sigue cacheando, registrar evidencia y no afirmar retirada completada; no reintentar la eliminación indiscriminadamente. El otro post antiguo de 2026-10-05 permanece intocable.

### D3-A: excepcion temporal revertida (2026-10-10 04:37 UTC)

Para no dejar permisos destructivos activos, se publicó Edge **v5** desde el código seguro anterior, `verify_jwt=true`, constante `F14_MEDIA_PURGE_RELEASE_APPROVED=false` y sin allowlist de UUID. Los 14 objetos siguen en Storage y `purged=0`. No se ejecutó la eliminación física; el usuario pidió automatizar todo y evitar más rondas manuales. El ensayo E2E queda P0 pendiente de una sesión real de moderador o prueba equivalente autenticada; no sustituirla por DELETE de metadata SQL. Se retiró también el botón DEV de único post de la rama PR #37. El hotfix de `auth.role()` del backend permanece aplicado y se verificó con transacción ROLLBACK. Priorizar el siguiente lote MVP mientras esta prueba espera.

### Lote MVP — información preliminar de privacidad y reglas

Se añadió `src/features/legal/` con copias ES/EN sin promesas de retención, contacto o borrado instantáneo. Acceso en A02 registro (sin casilla premarcada ni consentimiento falso) y menú de Mi Mascota (sin tocar módulos existentes). Dialog con Escape/teclado, foco devuelto y sin contornos. **No es la Privacy Policy/Terms pública final**, flag de código `LEGAL_RELEASE_READY=false` y tests de exactitud básica. Contrato de operadores, datos de contacto, políticas, plazos y derechos efectivos pendiente de verificación/PO antes de beta. No Vercel, no despliegue.

### Lote de privacidad — solicitudes de eliminación de cuenta (implementación completa, gate de aplicación abierto)

El backend anterior no tenía ni esquema `account_private` ni registro de solicitudes. En vez de reactivar trece borradores A3, se versionó **una sola migración aditiva NO APLICADA**, con tabla `account_requests_private.deletion_requests`, una solicitud por UUID sin email ni contenido, consulta y cancelación hasta `processing`. Las RPC request/status/cancel derivan el sujeto exclusivamente de `auth.uid()`, requieren existencia del usuario Auth, son `SECURITY DEFINER search_path=''`, grants solo authenticated, y la tabla privada no tiene permisos de browser/RLS enabled. No hay executor, alteración de auth.users ni Storage DELETE.

UI `Mi mascota → Cuenta y datos → Solicitar eliminación` ES/EN, confirmación escrita, estado verificable, cancelación segura; botón apagado de fábrica con `VITE_F14_DELETION_REQUESTS_ENABLED=true` hasta instalar SQL y verificar permisos con sesión real. El texto explica que **solicitud ≠ eliminación efectiva**. SQL requiere gate PO de migración según AGENTS.md. Esto facilita recepción, pero Beta pública sigue bloqueada por procesamiento/reconciliación de datos y política definitiva. No usar el estado `completed` sin evidencia de borrado total y verificación de aporte externo. 

### QA SQL completa de solicitud de cuenta — PASS (2026-10-10 04:50 UTC)

Commit `8925f2d5`, GitHub CI #38025574055 SUCCESS. Se compiló la migración de solicitud con DDL/RPCs reales en Supabase dentro de transacción íntegra `BEGIN ... ROLLBACK`, simulando dos identidades JWT en instrucciones SQL separadas. PASS: usuario A request/status, doble envío idempotente, usuario B no puede ver/cancelar solicitud A, solicitud propia B independiente, A cancelación propia y re-solicitud, y revocación de SELECT schema/table a rol authenticated y EXECUTE a anon. Se ajustó el estado ausente para devolver SQL NULL (no JSONB null); no se modificaron tablas persistentes.

**Gate de backend PENDIENTE:** AGENTS.md exige aprobación PO para aplicar permanentemente `20261010_f14_account_request_intake_NOT_APPLIED.sql`. Al autorizar, verificar permisos en alojado y activar `VITE_F14_DELETION_REQUESTS_ENABLED` únicamente para QA local. Procesamiento irreversible Auth/Storage/posts y política legal permanecen bloqueados y exigen su propia prueba, no declarar el MVP lanzable por recepción de solicitud.

### F14 — Instalación autorizada de solicitudes de cuenta (2026-10-10 UTC)

La migración `20261010045708_f14_account_request_intake` está **aplicada en Supabase alojado** tras autorización explícita PO. El archivo fuente conserva nombre histórico `20261010_f14_account_request_intake_NOT_APPLIED.sql` pero ese sufijo **ya no representa el estado actual**; la fuente remota de verdad es la tabla de migraciones. Verificación posterior: 1 esquema `account_requests_private` protegido con RLS, 3 RPC de identidad propia; roles anon sin execute, authenticated con execute sobre RPC pero sin acceso directo a tabla ni schema; 0 solicitudes, 6 cuentas Auth y 14 archivos sin cambio.

Prueba adicional real en la instalación, con transacción que termina en `ROLLBACK` y `SET LOCAL ROLE authenticated` para las dos identidades: PASS request/status, segundo envío idempotente, BOLA de consulta/cancelación denegada, cancelación por owner, reapertura desde cancelled, prohibición de cancelar/reiniciar cuando status processing. Ninguna petición ni transición sobrevivió la transacción. La UI permanece apagada por `VITE_F14_DELETION_REQUESTS_ENABLED` y no está desplegada; su activación de QA local aún debe verificarse por navegador. No hay ejecutor de eliminación y eso continúa impidiendo declarar beta externa lista. No Vercel ni merge.

**Siguiente bloque de ingeniería:** reconciliar reglas reales de FK/Storage/Auth sobre solicitudes aprobadas y proteger aportes de terceros antes de cualquier intento irreversible. Un estado `requested` no habilita un delete y no debe activar un worker automáticamente. Consolidar evidencia con pruebas aisladas antes de un gate PO separado para cualquier borrado.

### F14 — Prevalidación de dependencias reales sin borrado (2026-10-10)

Se verificaron las FK instaladas y un inventario agregado de las 6 cuentas prelaunch: una comunidad propiedad de una cuenta contiene un post ajeno, dos cuentas tienen en total seis comentarios ajenos en sus posts Feed, un documento privado y 21 objetos Storage repartidos entre cinco buckets. `pets.owner_id` y `posts.user_id` referencian Auth sin cascada; `communities.owner_user_id` sí tiene cascada, incluyendo contenido de terceros. El delete Auth no debe invocarse sin reconciliación explícita.

Se implementó **un preflight ejecutable y solo lectura**: `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql`, limitado en operación normal a solicitudes `requested`, retorna contadores y clasifica bloqueos por terceros/limpieza pendiente. `may_delete_auth` y `may_delete_storage` siempre `false`. El evaluador puro `src/features/account/deletionPreflight.ts` y pruebas Node codifican las mismas decisiones, validan contadores y rechazan permiso de borrado incluso en cuenta vacía. No hay DDL, migración pendiente ni worker con permisos destructivos en este lote.

Como la migración de intake **ya está instalada y verificada**, la UI de enviar/consultar/cancelar solicitudes queda disponible por defecto únicamente con `import.meta.env.DEV` en localhost, sin Vercel. En producción se mantiene el flag apagado. No interpretar QA de intake ni preflight como eliminación efectiva. Siguiente gate: diseñar/probar el plan real de limpieza de cada dependencia y Auth/Storage con sesión y permisos verificados, sin destruir datos de terceros.

### Auditoría ejecutada, seis cuentas de prueba — PASS sin mutaciones

La consulta de prevalidación fue ejecutada en Supabase sobre `auth.users` como entrada de auditoría temporal (sin SQL de escritura). Clasificación agregada: **3 cuentas `blocked_third_party`**, **2 `cleanup_required`** y **1 `awaiting_executor`** porque no aparecieron dependencias entre las categorías analizadas, no porque esté verificada como totalmente vacía. En las seis `may_delete_auth=false` y `may_delete_storage=false`; nunca se conceden capacidades destructivas. CI #38026303714 SUCCESS (`c4140424`).

El scanner operacional usa solo las solicitudes `requested` y no tiene exposición pública. Hay 0 solicitudes registradas, 6 Auth, 21 Storage (14 en buckets de publicaciones), 0 filas purged; la Edge de medios v5 está apagada. QA de crear/cancelar solicitud desde la cuenta propia podrá probarse con `npm run dev` sin setting adicional. La prevalidación enumera bloqueos conocidos, pero **no es exhaustiva de todos los datos legados, JWT/Storage/CDN ni de todos los FK**, por lo que `awaiting_executor` tampoco autoriza borrar.

**Decisión de producto aún pendiente:** en la baja de un propietario de comunidad con contribuciones ajenas, elegir un proceso de transferencia a nuevo administrador o archivo/cierre que preserve derechos y contenido pertinente, antes de crear el ejecutor. No predeterminar borrar el grupo en cascada. La siguiente implementación técnica debe incorporar esa decisión y respetar la vida útil de archivos, moderación y derechos de terceros.
