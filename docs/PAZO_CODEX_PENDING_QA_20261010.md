# PAZO — Trabajo delegado a Codex: ÚNICA baja descartable (PENDIENTE)

**Responsable de ejecución:** Codex con acceso autorizado al equipo local Windows del PO. **Estado:** suspendido por límite temporal de uso de Codex/Work; NO es un fallo de PAZO. **No se ejecuta automáticamente** cuando se restablece el límite: el PO debe reabrir Codex y ordenar que lea este documento. **No reanudar desde el principio.**

**Alcance estricto y aprobado por el PO:** una sola cuenta nueva exclusivamente para este ensayo y su eliminación definitiva con datos propios; se conservarán las seis cuentas preexistentes, el moderador y los datos de terceros. No avanzar otras tareas, no merge, no Vercel, no A3 avanzado, no desplegar ni cambiar configuración ajena a este ensayo. El usuario no tiene que autorizar otra vez la eliminación de esta cuenta QA.

## Estado al pausar, comprobado mediante SELECT de Supabase (2026-10-10)

- Proyecto Supabase: `mrybvqdebbgcayuvgkkr`.
- Rama autorizada: `release/mvp-beta-fast-track-20261010`.
- **Auth = 7 usuarios:** seis existentes más la cuenta descartable con alias exacto `appdigital.corp+pazo-baja-qa@gmail.com`.
- La cuenta QA **YA ESTÁ CREADA Y CONFIRMADA**; no registrarla ni duplicarla.
- Cuenta QA: **0 mascotas, 0 archivos, 0 posts y 0 solicitudes de eliminación**. Ningún paso de baja ejecutado.
- Moderadores = **1**, cuenta operativa `appdigital.corp@gmail.com`; no cambiar ni borrar.
- Línea base anterior al ensayo: 6 Auth originales, 1 mascota existente y 1 objeto Storage existente. Los identificadores sensibles de estas cuentas y archivos NO van en GitHub.
- Verificar de nuevo todas las cifras, correo y titularidad al retomar. No inferir que el navegador sigue autenticado ni reutilizar credenciales de otra sesión.

## Reinicio de Codex (cuando vuelva a estar disponible)

1. En la computadora Windows, localizar el repositorio local PAZO que ya está abierto. Respetar modificaciones locales del PO; no reset, checkout destructivo ni `git clean`. Actualizar referencias remotas y leer `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md` y este documento desde la rama RC.
2. Confirmar acceso legítimo al localhost PAZO, Supabase Dashboard y mecanismos oficiales de Auth Admin/Storage. **Antes de modificar nada, asegurar acceso a todos los pasos indispensables**, en especial ejecución de SQL Editor de administración, eliminación Auth y confirmación de la cuenta QA. Si falta una capacidad esencial, detenerse sin generar más datos.
3. Capturar en ubicación privada, no en Git ni chat, el UUID de la cuenta QA y los seis UUID originales; confirmar que la QA no tiene grant de moderación. No crear una octava cuenta ni restablecer credenciales de terceros.
4. Acceder únicamente a la sesión de **la QA ya confirmada** en localhost; completar onboarding mínimo y crear solo una mascota/avatar descartable, si los mecanismos de retirada están disponibles.
5. Usar **la UI real de PAZO** para solicitar eliminación desde la QA; comprobar que aparece una sola solicitud `requested`. **No simularla por SQL.**
6. Ejecutar `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` y verificar identidad, propiedad de archivos, FKs y ausencia de contribuciones ajenas/claims. No seguir si el resultado es inseguro o ambiguo.
7. Ejecutar **SOLO** `supabase/queries/f14_qa_begin_processing_ADMIN_ONLY.sql` con acceso administrativo autorizado y **solo** cuando cumpla las guardas. Verificar que únicamente la solicitud QA pasó a `processing`.
8. Eliminar **únicamente** avatar/objetos propios mediante API/Dashboard Storage, limpiar de forma auditada los datos propios sin cascadas a terceros, verificar que no quedan referencias problemáticas y eliminar la cuenta por **Supabase Auth Admin** oficial. Nunca SQL directo sobre `auth.users` o `storage.objects`.
9. Verificar que siguen intactos los **seis UUID originales** (no basta comparar el conteo), el único moderador, la mascota y el objeto Storage originales. Verificar la ausencia de Auth, registros y archivos de la QA.
10. Únicamente entonces revisar `supabase/queries/f14_qa_complete_verified_ADMIN_ONLY.sql`, reemplazar **en la ejecución local exclusivamente** el UUID de ceros por el UUID QA capturado, comprobar todas las guardas y ejecutar para marcar la **única** solicitud como `completed` con `processed_at`. No cambiar ni suavizar guardas si falla. No registrar el UUID sensible en el repositorio.

**STOP obligatorio:** si caducó la sesión, el frontend local no está accesible, el formulario no registra una solicitud auténtica, la eliminación de datos no es segura, los conteos basales han cambiado por trabajo paralelo o la transición no puede auditarse, conservar todo lo existente y reportar **BLOQUEADO**. No usar Edge temporales, atajos por SQL Auth ni cuenta diferente. La aprobación no autoriza afectar otras cuentas.

## Entrega final de Codex

Informe de solo una tabla PASS/FAIL/BLOQUEADO: cuenta QA existente confirmada, onboarding/avatar opcional, solicitud UI, preflight, transición a processing, datos/medios propios retirados, Auth QA eliminado oficialmente, estado completed real, seis cuentas intactas, moderador y terceros intactos. Aclarar límites de CDN y respaldos.

**Al terminar, detener la ejecución.** El PO y ChatGPT continuarán PAZO por separado.

## Restricción durante el desarrollo en paralelo

**La tarea QA queda delegada a Codex y no debe paralizar otras tareas del MVP que sean independientes.** Mientras esté pendiente, no añadir usuarios ni datos de prueba que alteren las guardas de la cuenta QA; si cambian los baselines, Codex se detendrá a reconciliar, sin forzar SQL. La beta pública sigue bloqueada hasta que el ensayo sea verificado; no cambiar `LEGAL_RELEASE_READY` ni activar purga automática por tener este documento.
