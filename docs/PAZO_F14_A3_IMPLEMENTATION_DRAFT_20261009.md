# F14 A3 — diseño y preparación para implementación, sin aplicar

**Product Owner autorizó preparar código + migraciones como borradores el 2026-10-09.** Ninguna autorización para ejecutar SQL, alterar RLS/FK, eliminar datos o desplegar.

## Lo implementado en rama DRAFT
1. `src/features/account/`: servicio de solicitudes y lectura, interfaz en `Mi mascota → Menú y utilidades`, resumen de dependencias, solicitud explícita con texto `ELIMINAR`, cancelación solo en estado `requested`. Es un pedido de revisión, **no** un botón que elimina instantáneamente.
2. Feature gate **cerrado por defecto**: `VITE_F14_A3_REQUESTS_ENABLED` debe ser exactamente `true`, pero no debe habilitarse antes de aplicar y verificar el backend mediante otro gate. En el branch del PR #37 sin flag, la UI sigue sin cambios.
3. SQL `supabase/drafts/20261009_f14_a3_request_preflight_NOT_APPLIED.sql`: tabla privada de jobs, eventos auditables, funciones RPC autenticadas para inventario/status/solicitud/cancelación; RLS activa, sin grants directos, sin acceso anon. El archivo incorpora un **RAISE EXCEPTION intencional** antes de `BEGIN`: no se puede aplicar accidentalmente tal como está. Requiere revisión, reconciliar migraciones remotas y autorización expresa de aplicación.
4. Tests con `node --experimental-strip-types --test`: estados coherentes, cancelación y parsing fail-closed. CI compila/frontend pero **no prueba el SQL** porque no se ha instalado.

## No implementado ni fingido como completado
- Ejecutor/worker de borrado, reautenticación fuerte verificada en backend, bloqueo de nuevas escrituras, separación de cuenta/más de una mascota, despublicación de QR/rescate/comunidades al recibir solicitud, archivo privado de aportes ajenos, borrado físico exacto/Storage/CDN, invalidación JWT y Auth al final. **No se debe activar el feature gate mientras cualquiera de esos puntos impida dar expectativas válidas**. Se puede habilitar solo el intake de revisión mediante Gate separado, dejando por escrito limitaciones.
- Sin emails/identidad de usuarios en nuevos logs/telemetría; service_role sigue solo en backend.
- No confundir la futura limpieza masiva de datos de prueba del PO con el derecho individual de usuarios post lanzamiento.

## Próximos incrementos A3 — diseño ya aprobado en Gate 7, sin DDL real
### A3.2: Privacidad de terceros / FK
- Mover `communities.owner_user_id` de CASCADE a `ON DELETE SET NULL` **solo cuando** `status='archived'`; hacer dueño nullable con `CHECK(status<>'active' OR owner_user_id IS NOT NULL)` y RLS `anon/auth` que niegue lecturas de archived. Construir archivo privado con contribuciones de terceros sin crear nuevas vistas públicas.
- Proteger `community_posts.author_user_id` y `author_pet_id` de CASCADE, adaptar constraints de autor borrado y reglas RLS. Archivar contribuciones ajenas en modo privado, nunca transferir administrador ni mantener una comunidad huérfana pública.
- En posts propios con comentarios de otra cuenta crear `tombstone` sin texto/foto/nombre originales para preservar referencias privadas; cambiar FK solo tras pruebas de integridad. Auditar también comentarios/likes de comunidad y notificaciones.
- Reglas F14 D2/D3-B de revisión de archivo 90/180 días se mantienen como **objetivos de diseño, no retención ya implementada**.

### A3.3: Media/Storage dependiente de D3-A
- Inventario verificable por bucket/ruta/versión, referencias compartidas y archivos fuera de Supabase, lease contra race y eliminación exacta únicamente mediante API privilegiada revisada. Estado `media_pending` hasta verificar origin; CDN/cache y backups con avisos honestos.
- El `f14-moderation-purge` Edge 503 no se activa ni reutiliza automáticamente.

### A3.4: Backend de ejecución e identidad
- Worker autorizado por servicio y deduplicado con estado transaccional. Antes de iniciar operación irreversible validar reautenticación reciente con evidencia **del servidor**, no confiar en JWT `iat` (puede refrescarse sin contraseña), flag UI o simple texto `ELIMINAR`.
- Bloquear escrituras concurrentes de cuenta en eliminación con política/RPC server-side; la mera UI de carga no bloquea PostgREST.
- Procesar archivos y contribuciones en fases reintentables. En error, estado `failed` o `blocked`, **nunca decir «eliminado»**. Auth `deleteUser` solo en backend y **al final**, tras resolver FK y verificar trabajo. Sesiones JWT viejas y restores exigen control propio.
- Documento de retención por proveedor antes de publicidad pública. Solicitudes de menor conocida requieren tratamiento prioritario según reglas del proyecto.

## Pruebas de aceptación A3
- Datasets sintéticos con 2+ cuentas, 2+ mascotas, comunidad de una cuenta con post de otra, post con comentarios ajenos, documentos privados, cuidados y fotos.
- Rol anon/auth distinto, suplantación, RLS/grants, doble click/retry/timeout, al menos un error Storage simulado, borrado del propietario sin borrar contribuciones ajenas, referencia pública inaccesible y sesión vieja no autorizada.
- SQL reversible/pgTAP primero; pruebas reales de usuario/Storage solo después de aprobar y aplicar paso a paso, sin activar Vercel ni alterar datos de prueba hoy.

**Siguiente gate después de validar build/CI de esta rama:** diseño seguro de A3.2 y backend de archivo/worker, con test reversible. No aplicar SQL, no activar flag, no merge. Una propuesta adicional de PR de borrado no significa que la función ya elimine cuentas.

### Revisión de consistencia del SQL borrador

La FK de `deletion_jobs.user_id` se diseñó nullable **solamente** si `status='completed'`, manteniendo `ON DELETE RESTRICT`. Así un trabajador final, no implementado, podrá registrar cierre tras validar todas las fases y desvincular el identificador antes de `auth.admin.deleteUser` en su transacción final. Si el proceso Auth falla después de desvincular, el job debe reanudar desde un registro segregado; esto es **otro bloqueo A3.4** y no se presume resuelto. La tabla no admite nulificar `user_id` para evitar su FK mientras una solicitud esté pendiente. Este archivo sigue protegido por excepción hard-fail.

## Incremento A3.2 — snapshot privado con medios bloqueados (borrador)

`supabase/drafts/20261009_f14_a3_preserve_contributions_NOT_APPLIED.sql` prepara tres tablas privadas con RLS: `deletion_post_tombstones`, `deletion_preserved_posts` y `deletion_preserved_comments`. Función `account_private.f14_a3_snapshot_contributions(job_uuid)` concede EXECUTE solo al rol service_role y no expone endpoints públicos. Requiere job en estado `archiving`, **no borra filas** y devuelve explícitamente `ready_to_delete_auth=false` / `ready_to_delete_media=false`.

- Captura posts de autores ajenos dentro de comunidades del titular; comentarios de otras cuentas en publicaciones Feed propias; comentarios ajenos dentro de comunidades propias. Conserva tombstone mínima (ID y fecha, nunca texto/foto/nombre propios).
- Aborta transaccionalmente si la comunidad o cualquier post de ella contiene `image_url`, `photo_url` o rutas Storage: **no mover contenido audiovisual público por SQL**. Se debe agregar un preflight de referencias a medias compartidos y confirmar D3-A con API antes de seguir.
- **No prueba aún escritura congelada**, archivo exacto de likes o mensajes, medios de comentarios legacy ni verificación de concurrencia. El worker futuro tiene que impedir escrituras mientras se toma el snapshot, comparar conteos y decidir archivo de aportes externos con propiedad verificada. Si eso falla, no puede continuar a Auth.
- El script tiene `RAISE EXCEPTION` inicial deliberada, por lo que no debe aplicarse ni habilitarse la función sin remover guard bajo gate aprobado. Sin cambios de cascade FK ni políticas de lectura en hospedado.
