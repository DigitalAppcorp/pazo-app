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
