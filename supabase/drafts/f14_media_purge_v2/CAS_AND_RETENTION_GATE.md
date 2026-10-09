# PAZO F14 A2 — Gate de confirmación de medios y concurrencia (DISEÑO, SIN EJECUCIÓN)

**Estado:** diseño no ejecutable. No autoriza eliminar archivos de usuarios ni cambiar `media_status` a `purged`. La Edge `f14-moderation-purge` permanece en HTTP 503. **Solo aplica a A2** (Feed/Comunidad con medios); `pet_profile`, documentos privados, avatares de comunidad y enlaces externos siguen en revisión manual.

## Evidencia y alcance auditados (2026-10-08, Preview + consulta Supabase de solo lectura)

- Product Owner: prueba autenticada `F14StorageProbe` PASS, imagen artificial de 1 píxel creada → localizada con Storage API → eliminada → ausencia confirmada con Storage API. Captura aportada por PO. **No** fue un archivo moderado ni una operación con `service_role`.
- Supabase post-prueba: `storage.objects` 20; rutas `post-photos/%/f14-storage-probe-%` 0; claims/eventos/reportes/restricciones 0. No borrado manual ni cambio de datos del producto.
- RLS real de `storage.objects`: políticas restrictivas F14 sobre `INSERT` y `DELETE` en rutas `held`; ninguna política `UPDATE` permisiva actualmente, así que el `upsert` autenticado no tiene autorización para sobrescribir un objeto. Añadir una política permisiva más adelante podría reabrir la superficie; exigir una política `UPDATE AS RESTRICTIVE` con `USING` **y** `WITH CHECK` antes de conceder capacidad de sustitución. Verificar además copia/movimiento, rutas antiguas y accesos de servicio.
- `service_role` omite RLS. Las reservas de cinco minutos + `FOR SHARE` / `FOR UPDATE` solo protegen transacciones individuales; no bloquean una operación HTTP de Storage que empieza antes de la reserva o termina después de un recheck.

## Invariantes antes de permitir una eliminación de medios moderados

1. **Autoridad:** petición dirigida a un endpoint privado, autenticación real verificada en servidor, rol moderador comprobado en base de datos y ninguna clave privilegiada entregada al navegador. Operaciones con rol usuario o `anon` deben fallar.
2. **Objetivo:** denuncia `removed`, restricción exacta `pending_review`, ruta canónica de este proyecto, titular correcto, referencia exclusiva, `storage.objects.id`, `version`, `updated_at`, hash de metadata y `claim_id` persistidos. Desconocido/compartido/externo/perfil con referencias derivadas => `manual_review`.
3. **Congelación real:** impedir **INSERT, UPDATE, DELETE, MOVE, COPY y UPSERT** sobre la ruta reservada para el actor autenticado; comprobar específicamente API de Storage y operaciones que puedan cambiar ruta/bytes. Los administradores/servicios deben serializar sus escrituras. Una reserva expirada no es autorización de borrado.
4. **Carrera DB ↔ Storage:** el endpoint `remove([path])` es por ruta; no asumir que soporta un `If-Match` sobre `object_id/version`. Un `recheck` justo antes no elimina la ventana TOCTOU. **Si no se demuestra una forma real de exclusión o borrado condicional, detener purga automática y conservar revisión manual.**
5. **Confirmación segura:** crear en un futuro gate un procedimiento **nuevo** ligado a `claim_id + report_id + target_kind/id + bucket/path + storage_object_id/version + resultado de Storage API`. No usar `f14_confirm_media_cleanup(kind,id)`: hoy marca `purged` sin prueba del objeto. Registrar intentos/reintentos sin secretos ni imágenes. Fallo/parcial => estado pendiente, jamás `purged`.
6. **Verificación:** respuesta de Storage API no basta; consultar ausencia en origen, evitar recreación de ruta y revisar URL pública en ventana razonable. No interpretar `list` sin error como certificación de CDN global. Cualquier estado final debe expresar por separado origen y caché.
7. **Retención D3-B:** reclamos, eventos y evidencias mínimas con propósito, fecha y vencimiento; no implementar borrados automáticos 90/180 días aquí sin autorización A4. No prometer que PostHog, Vercel, backups o cachés de navegador ya cumplen esas metas.

## Máquina de estados propuesta (NO instalada)

`candidate_only` → `held` → `origin_delete_pending` → `origin_absent_verified` → `cdn_pending/observed` → `closure_review`. Los estados de error o identidad inconsistente van a `manual_review`; nunca saltar a `purged` por recibir un HTTP 2xx. Un estado `held` debe durar durante cualquier operación real, no solo cinco minutos, y disponer de recuperación idempotente.

**Nota de costes:** Supabase documenta que el purge manual de CDN está disponible en Pro o superior; PAZO no tiene autorización para actualizar de plan. Smart CDN y caches de navegador tienen semánticas diferentes. [Documentación](https://supabase.com/docs/guides/storage/cdn/purge-cdn-cache).

## Siguientes verificaciones técnicas SIN mutación

- Confirmar en documentación/API si existe borrado condicional real por versión y cómo se gestionan MOVE/COPY/UPSERT; evitar inventar garantías.
- Audit de las invocaciones `SECURITY DEFINER` expuestas, incluida `f14_storage_media_path_unclaimed`, y diseñar helper privado/grants mínimos antes de nuevas migraciones.
- Preparar pruebas aisladas para política `UPDATE`, reservas expiradas, claim-vs-service, carreras simuladas, drift de versión y referencias compartidas. No insertar/borrar archivos reales.
- Actualizar plan de ejecución y pedir **aprobación específica** para migración de control de escritura y, por separado, cualquier eliminación de bytes. No activar la Edge ni usar documentos privados.

**Gate de aceptación pendiente:** demostrar exclusión segura de operaciones concurrentes + evidencia de origen/CDN o decidir retener purga como revisión manual. F14 A2 sigue abierto; no A3/A4, merge a main ni publicación oficial.
