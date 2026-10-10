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
