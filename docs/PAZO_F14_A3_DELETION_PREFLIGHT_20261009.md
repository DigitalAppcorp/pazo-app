# PAZO — F14 A3 | Preflight de eliminación de cuenta y datos (2026-10-09)

**Estado: AUDITORÍA READ-ONLY / Gate A3 ABIERTO.** Este documento NO implementa ni aprueba borrado de cuentas, Storage o Auth. El PO confirmó una ronda exitosa de QA del MVP y autorizó continuar el cierre de F14; la sub-ruta F14 exige **autorización de alcance A3 independiente** antes de programar un flujo de eliminación. La aprobación histórica de Gate 7 de F14 no es permiso de DDL remoto, workers ni eliminación.

**Código de referencia:** PR #37 (basado en PR #36), F14 master en la rama PR #35 `f14/block02-moderation-mvp-20261008/docs/PAZO_F14_MASTER.md`. Leer contrato 3.4, Definition of Done y D3-A/D3-B antes de escribir código. El PR #35 contiene implementación avanzada A2 inacabada y NO debe integrarse automáticamente.

## Nueva evidencia de QA de autorización (2026-10-09)
- El PO volvió con su cuenta normal a `Mi mascota → Menú y utilidades` y respondió **«listo»** a verificar que las herramientas de `Moderación` NO aparecen; es **PASS reportado de visibilidad**, no prueba independiente de la sesión de un usuario en HTTP.
- Complemento técnico previo: `f14_is_moderator()` devuelve `false` al simular rol `authenticated` sin identidad JWT moderadora; `f14_moderation_queue(1,0)` respondió con `SQLSTATE 42501 / Moderator access required`. No inferir garantías más amplias ni conceder permisos nuevos.
- QA previa: denunciar, resolver `dismiss` y `remove` en Supabase con bitácora, SELECT público restringido para post realmente denunciado. Se conserva el aviso de discrepancia entre post previo y post nuevo en el handoff.

## Esquema real — inventario agregado, SOLO LECTURA
Consulta en Supabase alojado `mrybvqdebbgcayuvgkkr`, sin modificar filas, funciones ni roles.

| Objeto | Resultado |
| --- | --- |
| Auth | 6 cuentas de prueba |
| Mascotas | 6 |
| Comunidades | 1; contiene **1 post escrito por alguien distinto del administrador** |
| Comentarios Feed | **6 comentarios escritos desde otra cuenta que la dueña del post** |
| Comentarios Comunidad | 0 |
| Documentos privados | 1 |
| Cuidados / finalizaciones | 5 / 2 |
| Storage público | `community-avatars` 2, `community-post-photos` 3, `pet-avatars` 4, `post-photos` 10 |
| Storage privado | `pet-documents` 1 |
| Cuenta / borrado jobs `account_private` | No hay tabla de jobs/archivo identificada; **A3 aún no está implementado** |

No incluir UUIDs, emails ni rutas privadas en telemetría, UI pública o este documento. La composición de datos puede variar antes de Beta y exige re-inventario al aplicar.

### Riesgos verificados por catálogo FK PostgreSQL
1. `communities.owner_user_id → auth.users` con **ON DELETE CASCADE** y `NOT NULL`. Borrar al admin borraría comunidad y **posts ajenos** en cascada. Este riesgo se materializa en el fixture actual con un post de no propietario.
2. `community_posts.author_user_id → auth.users` y `community_posts.author_pet_id → pets` tienen CASCADE. Sus comentarios/likes ligados al post también se eliminan en cascada. Evitar pérdida de contribuciones ajenas a la cuenta eliminada, incluso cuando el post padre lo escribió ella.
3. `post_comments.post_id → posts` CASCADE, con **6 comentarios actuales** de dueños distintos al del post. Requiere tombstone/archivo privado según contrato D2; borrar posts propios puede borrar aportaciones ajenas.
4. `pets.owner_id → auth.users` y `posts.user_id → auth.users` son NO ACTION: eliminación directa puede fallar aunque otros objetos sí estén en cascada en esa transacción.
5. `pet_documents.pet_id → pets` es RESTRICT y `care_items.pet_id` / `care_completions.pet_id` / `care_completions.care_item_id` son NO ACTION. Requiere procedimiento de limpieza dependiente y verificar archivos antes de eliminar mascotas.
6. 5 buckets (4 públicos, 1 privado) no desaparecen al borrar filas DB; Storage API y URLs públicas/CDN exigen verificación separada. Token JWT existente puede seguir vigente después de borrar Auth: comprobar control de sesión en procedimientos privilegiados.

## Diseño A3 que debe prepararse **si el PO abre el gate**
- **Inicio con sesión vigente y reautenticación reciente**, confirmación explícita no engañosa y petición a un servicio del servidor: el navegador no recibe `service_role`, nunca llama `auth.admin.deleteUser`.
- **Job privado durable** (`account_private.deletion_jobs` o equivalente versionado) solo autenticado para consultar el **propio** estado, administrador/worker para mutar, claves idempotentes y fecha de solicitud, retries, etapas y errores sanitizados. No retornar datos de terceros.
- **Bloqueo de nuevas escrituras para cuenta pendiente** y despublicación de la información del titular en RLS/RPC antes de limpieza, sin revocar contenido legítimo de otras cuentas. Validar el rol administrado por el servidor; no confiar en `user_metadata`.
- **Comunidades / aportes ajenos:** permitir dueño `NULL` solo cuando comunidad esté `archived`, cambiar cascada de FK antes de usar borrado, establecer `CHECK` activo+dueño, conservar aportes ajenos despublicados en archivo privado con tiempo de revisión 90/180d. No reasignar administración automáticamente.
- **Posts del solicitante con comentarios de terceros:** conservar únicamente tombstone desidentificado y aportes ajenos en archivo privado, sin contenido identificable original del titular, con FKs y acceso revisados. Probar dos propietarios diferentes.
- **Medios:** inventariar propiedad real/versión del objeto, comprobar rutas y referencias compartidas, separar borrado en origen Storage y confirmación de CDN/cache; **NO reutilizar ni habilitar Edge F14 503** ni marcar `purged` sin prueba D3-A. En fallo: job `failed/retryable`, sin mensaje de «cuenta eliminada».
- **Orden final:** tras verificación de media y dependencias, limpiar referencias propias y datos privados, volver a comprobar integridad/roles, cerrar sesiones con garantías acordes a JWT, eliminar `auth.users` **al final**. Prevenir rescate tras restaurar backup sin ledger de solicitudes confirmado.
- **Panel mínimo:** `Mi mascota → ajustes de cuenta → solicitar eliminación`, estado pendiente/errores y enlace a contacto de privacidad cuando el proceso requiera revisión humana. No mostrar botón «Eliminar inmediatamente» mientras el backend no pueda cumplirlo.
- **No mezclar** la limpieza masiva de las 6 cuentas de prueba **pre-lanzamiento** con la capacidad permanente de autoservicio de eliminación para usuarios posteriores. Para la limpieza final habrá otro inventario y autorización, preservando configuración/roles administradores semilla, migraciones, buckets y tablas.

## Pruebas obligatorias (antes de aplicar/desplegar)
- Fixture de 2–3 cuentas con varias mascotas, una comunidad cuyo dueño solicita eliminación pero existen posts de otra persona; post con comentarios cruzados; documentos privados y fotos; rescate QR, follows, ubicaciones/cuidado.
- SQL/pgTAP y API simulada: roles falsa propiedad, JWT antiguo, escrituras concurrentes, deletion job duplicate/retry, FK/cascadas.
- Storage: archivo correcto, ruta compartida o huérfana, error parcial, expiración de enlace CDN, reintentos, confirmación de origen e inventario; nada de borrar objetos existentes para fingir PASS.
- QA humana Antigravity/localhost con backend de prueba **solo después de un gate propio**, sin necesitar Vercel, y un registro claro de qué operaciones solo se simularon.
- Definition of Done: no publicación de datos pendientes, no pérdida de aportes ajenos, no secretos al cliente, Auth al final, 0 orfandad, errores recuperables, retención/public policies reales, pruebas antes de beta. Ningún plazo prometido de privacidad si no está implementado.

## Estado / decisión requerida
**PREPARADO PARA SOLICITAR GATE A3 de implementación en rama DRAFT, sin aplicar migraciones.** A3 implica rediseñar FKs de comunidades/contribuciones y desarrollar un worker seguro: no es un delete rápido. Solicitar permiso específico del PO para preparar **código y migraciones como borradores sin aplicar**. Requerir **otra autorización** para SQL en Supabase alojado, borrar cuentas/storage, merge, despliegue o cambio de planes. No marcar Beta lista por aprobar este preflight.
