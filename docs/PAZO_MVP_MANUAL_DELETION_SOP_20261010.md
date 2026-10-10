# PAZO MVP — solicitud y baja manual supervisada (procedimiento provisional)

**Decisión PO, 2026-10-10:** parar el ejecutor automático A3 y priorizar el primer MVP. Este procedimiento **no** introduce servicio, cron, dependencia ni permisos elevados. El código avanzado A3 permanece en PR #37/#38, **desactivado**; no instalar sus SQL `NOT_APPLIED` ni Edge `f14-account-deletion`.

**Estado verificable ahora:** en Supabase ya funcionan `pazo_deletion_request()`, `pazo_deletion_status()`, `pazo_deletion_cancel()`, con tabla privada `account_requests_private.deletion_requests`. La pantalla de PAZO puede enviar, consultar y cancelar solicitudes; explica correctamente que una solicitud **no elimina** la cuenta. En una consulta alojada de solo lectura el 2026-10-10 no había solicitudes pendientes. No existe una ejecución automatizada de baja verificada, así que **NO se declara todavía apto para beta pública** hasta probar la vía manual completa con una identidad de prueba creada expresamente para ello.

## Operación provisional — sin cambiar producción por código

**Responsable:** cuenta de operador de PAZO designada por el PO en conversación y confirmada en Auth, sin concederle `service_role` ni privilegios mediante el frontend. El acceso al Dashboard administrativo es independiente y debe estar controlado por su titular. No escribir su dirección de correo ni UUID en GitHub, reportes públicos o analítica.

1. **Recepción:** la persona inicia sesión, abre Cuenta y datos → Solicitar eliminación, escribe la confirmación y obtiene estado `requested`. Puede cancelar mientras siga `requested`. Si no puede iniciar sesión, hace falta un canal de privacidad publicado y verificación separada; el contacto público está **pendiente de confirmación del PO**.
2. **Revisión privada periódica:** el operador abre Supabase SQL Editor con su acceso autorizado y ejecuta `supabase/queries/f14_beta_deletion_request_queue_READ_ONLY.sql`. Revisar cada día hábil durante beta; NO afirmar que haya alertas automáticas. Una fila no autoriza borrado. Priorizar solicitudes más antiguas y registrar fecha de revisión en bitácora privada, sin contenido personal.
3. **Verificar identidad y alcance:** comprobar mediante Auth el titular exacto `subject_user_id` que generó la solicitud, que `status='requested'`, que no fue cancelada y que la petición esté vigente. Validar titularidad, posibles obligaciones de retención, reclamaciones y contenido de terceros. **No solicitar claves de acceso** ni publicar datos privados del solicitante.
4. **Preflight sin mutaciones:** ejecutar `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql`, que analiza dependencias, y revisar medios bajo cada bucket de Storage mediante API/Dashboard. Si hay comentarios, posts, comunidades, documentos, alertas, claims `held`, archivos compartidos, medios externos o incertidumbre de FKs, **NO** usar el botón de borrar Auth ni SQL genérico. Escalar a revisión específica de esa cuenta. No despublicar, eliminar o cambiar datos de otras personas.
5. **Atención manual supervisada:** para un caso sencillo, primero respaldar/reconciliar dependencias sujetas a política de retención, retirar **solo objetos verificados de ese titular** mediante el flujo de Storage autorizado, confirmar que no quedan referencias y datos personales activos (incluido post/feed, mascotas, cuidados, documentos, QR/rescate). Solo después usar Auth Admin para cerrar el usuario. **Nunca** `DELETE FROM auth.users` directo, `DELETE FROM storage.objects` ni borrar un bucket entero. Si falla una verificación, detenerse y dejar constancia interna del bloqueo; no marcar completada ni intentar un cascade a ciegas. No ejecutar bajas sobre las seis cuentas de prueba existentes.
6. **Confirmación:** verificar que ya no existe el usuario en Auth, que el contenido propio y archivos aplicables fueron reconciliados y que siguen intactas las aportaciones de terceros. Registrar solo la evidencia mínima en registro administrativo privado. **Solo con prueba completa** un operador puede marcar el estado `completed` mediante un procedimiento administrativo aprobado y auditado; hoy **no existe una RPC pública para esa transición**. No cambiar estatus mediante un UPDATE improvisado. Si no se puede completar, mantener solicitud abierta, comunicar el bloqueo por el canal de privacidad y resolver el caso individual.

## Único ensayo necesario antes de permitir registro de público externo

Crear **una cuenta descartable nueva y claramente autorizada** (distinta de las seis actuales), publicar contenido/archivo de prueba que se pueda retirar, pedir la baja desde la app, y ejecutar el procedimiento privado para comprobar la recepción, eliminación real y persistencia de terceros. Mantener otra cuenta de test para asegurarse de que ninguna contribución ajena desaparece. No probar con mascotas/fotos antiguas. Registrar el resultado como PASS/FAIL, sin capturas con correo/token/IDs.

## Requisitos mínimos de lanzamiento (no negociables)

- **Privacidad/Terms:** responsable jurídico, contacto público de privacidad, texto claro de tratamiento/retención y mecanismos verdaderos de acceso/eliminación; `LEGAL_RELEASE_READY` permanece falso hasta validación.
- **Canal de atención:** asignar un responsable que realmente revise la cola y atienda solicitudes; si no puede operarse o cerrar una baja conforme a los requisitos aplicables, **no lanzar beta pública**. Una beta interna limitada puede seguir probando funciones sin estas afirmaciones públicas.
- **Seguridad y moderación:** solo marcar contenido/medios retirados cuando exista confirmación; no abrir bypasses de RLS/Storage ni activar scripts A3 no probados.
- **Plazos y conservación:** determinar en la política los plazos/criterios efectivos y excepciones legales pertinentes; no inventarlos en UI ni prometer borrado inmediato. Mantener acceso restringido a la bitácora.

## Qué hacer ahora, en vez de continuar A3

1. Validar integración del candidato MVP existente PR #36 → #37, preservar Mapa real y mantener PR #35 separado. Una sola rama release/RC revisable, sin desplegar Vercel ni fusionar sin gate del PO.
2. Cerrar Auth real con **enlace de confirmación** y **recuperación de contraseña completa** en localhost (la pantalla sola no certifica cambio de clave).
3. Verificar moderación y medios de **un único objeto descartable**; no asumir purga global del CDN.
4. Cerrar textos legales/contacto y probar solo el recorrido manual de baja para una cuenta creada específicamente para ello.
5. QA RC acotada en móvil y evidencia PASS/FAIL; después revisar con el PO merge, limpieza de test y Vercel. No rehacer módulos ya aceptados.

**Regla antiestancamiento:** cualquier problema de baja complejo fuera de este flujo vuelve al backlog de A3 avanzado con caso real y consentimiento verificable; no detiene las tareas de integración, Auth y QA interna del MVP. **A3 pausada ≠ obligación legal suspendida.**
