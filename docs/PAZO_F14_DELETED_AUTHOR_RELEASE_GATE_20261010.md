# F14 — Gate de hilos de «Autor eliminado» (2026-10-10)

**Estado:** código implementado y CI PASS; migración NO aplicada. El PO aprobó la política funcional, no la ejecución irreversible.

## Contrato de producto
- Al salir la persona, retirar nombre, foto, ubicación, textos, etiquetas y otros datos asociados al autor.
- Si su publicación tiene comentarios de personas distintas, conservar el identificador del hilo con `Autor eliminado`, sin perfil ni mascota navegable y sin permitir nuevas interacciones.
- Conservar comentarios ajenos según su propia identidad y controles de moderación, sin reasignarles la autoría.
- Si no hay comentarios ajenos, no conservar por esta política una publicación de la persona que se va; su borrado definitivo requiere un ejecutor separado.

## Implementación
- Frontend: `src/features/account/deletedAuthorThread.ts`, `HomeView.tsx`, `CommunityDetailView.tsx` y mappers de `App.tsx`/services.
- SQL versionado: `supabase/drafts/20261010_f14_deleted_author_threads_NOT_APPLIED.sql`.
- Columnas de estado `author_deleted_at`, constraints fail-closed, FKs `SET NULL`, guardas de escritura y RPC service-only.
- Recomendaciones incluyen tombstones que sí contienen comentarios, respetando moderación.
- `VITE_F14_DELETED_AUTHOR_THREADS_ENABLED` sigue OFF hasta instalar SQL (necesario para la consulta explícita de Comunidades).

## Evidencias verificadas
- GitHub CI #38031508038: PASS en `17b1bd42`.
- SQL DDL, restricciones, permisos de ejecutor y cuatro triggers: PASS en Supabase bajo `BEGIN/ROLLBACK`. No modificaciones persistentes.
- Inventario previo: 6 cuentas Auth, 21 objetos Storage, 3 publicaciones con comentarios JSON heredados, 8 URL fotos sin correspondencia exacta, 1 reserva de moderación `held`.
- No hay demostración end-to-end de eliminación de usuario, medios/CDN, pet-documentos ni limpieza de todas las interacciones.

## Puertas de seguridad antes de Beta
1. Gate PO explícito para instalar únicamente esta migración SQL, luego QA de dos cuentas y permisos reales, y confirmación local/visual.
2. Definir un ejecutor mínimo de baja **aparte** de la migración: congelar nuevas escrituras, resolver documentos privados, Storage API y CDN, reclamar identidad, redaccionar hilos y borrar posts sin comentarios ajenos con limpieza de interacciones.
3. Resolver y auditar los ocho URLs antiguos, los tres JSON de comentarios y la reserva `held`, sin asumir equivalencia o propiedad.
4. Reconciliar aportes de terceros, necesidades de retención legal, moderación, Auth y petición antes de marcar `completed`.
5. Continuar **sin Vercel ni merge** hasta RC y aprobación del PO.
