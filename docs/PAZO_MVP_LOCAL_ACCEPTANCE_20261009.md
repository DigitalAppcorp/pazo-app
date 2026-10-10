# PAZO — aceptación funcional local del MVP (2026-10-09)

**Evidencia:** Product Owner ejecutó la versión de código `b49ecd3` del PR #36 desde worktree `pazo-visual-qa` en su equipo, con Vite en localhost y Supabase alojado. Resultados **reportados por el usuario**, no inspección independiente de vídeo, logs de navegador o SQL. No se hizo deploy ni merge.

| Recorrido | Evidencia reportada | Resultado |
| --- | --- | --- |
| Acceso y formulario «¿Olvidaste tu contraseña?» | Vista abre, regreso a login, sesión usada para demás pruebas | PASS funcional; email completo NO probado |
| Feed | Carga normal, scroll y paginación sin anomalías observadas | PASS local |
| Mensajes | En cuenta real avisa desarrollo, sin chats inventados; cierre correcto | PASS local |
| Crear publicación | Texto sin foto; aparece en Feed/perfil | PASS local; creó dato de prueba |
| Like/Save | Alternar ambos, contadores/estados | PASS local |
| Comentarios | Creación y persistencia tras F5 | PASS local; creó dato de prueba |
| Perfil ajeno / Following | Abrir perfil, seguir y dejar de seguir, contadores y persistencia F5 | PASS local |
| Otros módulos | PO confirma: «ya hice las pruebas y si funcionan todos los modulos» | Aceptación funcional general; pasos no detallados |

## Aceptado / no aceptado
- La aceptación del PO **cubre funcionamiento observado en esa ejecución local**. No prueba por sí sola RLS/roles cruzados, emails reales de Auth, recuperación de cuenta mediante link, UX de foco por teclado, accesibilidad/reduced-motion, performance de dispositivos ajenos, privacidad, borrado de datos ni funcionamiento de un bundle servido en Vercel.
- La separación entre frontend `localhost` y Supabase **de producción** fue decisión explícita del PO para QA visual rápida. No requerir Docker, CLI local de Supabase ni reconstruir toda la infraestructura para las siguientes revisiones.
- No repetir pruebas aprobadas salvo cambios que afecten esas rutas, defectos informados o release candidate final.
- El PO señaló posible **espaciado corto entre field y botón** del formulario: propuesta posponer a F13/estética; no hay aprobación para rediseño o aumentar espaciado de forma arbitraria.
- Regla **cero contornos** absoluta salvo fields de texto necesarios, conforme `AGENTS.md` #21.

## Release gates pendientes — ordenar por riesgo, no por fase nueva
1. PR #36 código/build/tests PASS, pero sigue DRAFT y fuera de main; falta autorización de integración y verificar CI del último SHA.
2. F14 A2/PR #35 sigue incompleto; el producto debe contar con el alcance mínimo de seguridad, reportes y cierre/eliminación de cuenta antes de beta pública, **sin importar** que el smoke visual sea satisfactorio.
3. Validar enlace real de Auth y su redirect; no afirmar que la recuperación está probada por haber abierto su UI.
4. Políticas públicas de privacidad y condiciones deben reflejar operaciones existentes y contratos reales de terceros; cleanup de datos de prueba solo cuando se conozca dueño/alcance y haya autorización explícita.
5. Solucionar rollout/costo del Mapa si se integra PR #35/#34; revisar Preview/Production y los límites de Vercel. No autorizar upgrade pago implícito.
6. QA release candidate acotada en móvil para lo cambiado desde esta prueba, sin restablecer ronda completa de módulos.

## No hacer
- No mezclar o borrar carpeta original `pazo-app` con F14 sin commit.
- No usar validación local como autorización de `merge`, SQL de producción, Vercel deploy o borrado masivo.
- No continuar agregando features opcionales, mensajería backend, arquitectura de moderación avanzada o retoques estéticos indiscriminados.

**Siguiente trabajo del agente:** cerrar checklist de release y presentar un gate específico de PR #36. Esta evidencia se actualiza solo ante una nueva prueba real.

## Aceptación visual PO de denuncias — 2026-10-09

Con código `b184a66` del PR #37, el PO confirmó la opción «Denunciar perfil» en mascota de otra cuenta, y a continuación «listo» tras verificar apertura de formulario y opciones para publicaciones/comentarios de Feed/Comunidades. **PASS visual reportado** únicamente: no se envió reporte real ni se ejecutó cola o decisión moderadora. El backend existe pero sigue necesitando prueba controlada de Auth, persistencia, deduplicación, rate-limit y permisos. Ningún dato de otro usuario debe denunciarse por comodidad.

## F14 QA hosted: resolución Descartar verificada (2026-10-09)

- PO, usando sesión moderadora en localhost/PR #37, confirmó haber pulsado **Descartar** sobre la denuncia de prueba previamente enviada.
- Consulta Supabase **solo lectura**: moderación privada contiene una fila feed_post/spam ahora status `dismissed`, resolved_at=2026-10-09 15:02:52.31554+00.
- Consulta JOIN `moderation_private.moderation_actions` + `moderation_private.reports`: existe una acción `dismiss` con fecha coincidente y reporte `dismissed`. **PASS de transición y bitácora de moderador para ese caso**. No se eliminó ninguna publicación, foto ni archivo; el asistente no ejecutó SQL de escritura.
- Esto amplía evidencia del flujo «enviar -> pendiente -> moderador descarta»; todavía no valida `remove`, otros cuatro tipos con envío, rechazo directo de API a no moderador, Storage/CDN, eliminación de cuenta o release.
- Siguiente ensayo: publicación SOLO TEXTO de prueba de la otra cuenta controlada, denuncia desde cuenta normal y **Despublicar** con la moderadora. Verificar estado/bitácora y exclusión de API. Sin imágenes para evitar confundir despublicación con purga física.

## QA hosted de despublicación: PASS técnico del objetivo real, discrepancia de objetivo del ensayo (2026-10-09)

- El PO comunicó «listo» después de ejecutar la prueba **Despublicar** con su sesión moderadora, en su frontend local (PR #37). Todas las filas referidas a cuentas y publicaciones son datos de prueba pre-lanzamiento.
- Supabase de solo lectura: nueva denuncia `feed_post` / `spam` con detalle «Prueba F14 - despublicación» tiene `status=removed`, `resolved_at=2026-10-09 15:07:07+00`; `moderation_private.moderation_actions` tiene acción `remove` vinculada a esa denuncia. **PASS registro y decisión del moderador.**
- **Discrepancia precisa:** `target_id=26faf724-036f-41b5-9082-efa781a3d20e` corresponde a la publicación ANTERIOR «Prueba de publicación PAZO» (la misma del reporte anterior que fue `dismissed`); la nueva publicación «Prueba F14 - despublicación» existe con `id=2158592e-627e-4ff1-af17-82db400a487d` y sin foto, **pero NO fue el objetivo del nuevo reporte**. No confundir `details` de la denuncia con el texto de la publicación.
- `public.f14_content_visible('feed_post',id)` devuelve `false` para la publicación anterior restringida y `true` para la nueva. `moderation_private.content_restrictions` tiene registro de la anterior con `media_status=none`; la nueva no tiene restricción.
- Prueba real de consulta DB con `BEGIN READ ONLY; SET LOCAL ROLE anon; SELECT ... FROM public.posts ...; ROLLBACK`: **solo aparece la publicación nueva**, NO la anterior. Esto demuestra RLS efectiva del rol público simulado contra estas dos filas en PostgreSQL. No equivale a comprobar caché de navegador, CDN, URL Storage ni endpoint HTTP independiente.
- **Resultado:** PASS para `remove` + bitácora + exclusión SELECT `anon` **del ID realmente denunciado**, pero la prueba específica de despublicar el post NUEVO queda **pendiente** hasta que PO denuncie ese post exacto desde la otra cuenta y lo resuelva la moderadora. No hacer SQL destructivo ni crear restricciones de prueba directamente para simular UI. No bloquear el proceso por datos de prueba.

## Aceptación PO de correo de recuperación en localhost (2026-10-09)

Con PR #37 commit `298458dc`, el PO indicó «listo, funciono» tras recibir y abrir el enlace de recuperación solicitado. **PASS reportado** del enlace y llegada al formulario con el guard `PASSWORD_RECOVERY`. No consta una prueba diferenciada de actualización definitiva + nuevo login; no inventar esa evidencia ni repetir todo el recorrido sin regresión.
