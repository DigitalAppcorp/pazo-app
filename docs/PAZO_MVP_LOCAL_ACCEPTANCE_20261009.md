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
