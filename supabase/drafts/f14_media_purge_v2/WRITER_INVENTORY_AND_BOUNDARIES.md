# PAZO F14 A2 — Inventario de operaciones Storage y límites de exclusión

**Fecha/auditoría:** 2026-10-09. **Rama:** `f14/block02-moderation-mvp-20261008`. Inventario de las rutas conocidas del repositorio **no exhaustivo de actores externos**. No contiene credenciales, archivos, IDs de usuarios ni datos de denunciantes. Sin cambios de producción.

## Operaciones Auth que modifican medios en los buckets moderables

| Ruta verificable en esta rama | Bucket | Operación/propiedad | Implicación de seguridad |
|---|---|---|---|
| `src/components/modals/CreatePostModal.tsx` | `post-photos` | `upload` con path `user.id/currentPet.id/randomUUID.ext` y `upsert:false`; `remove([uploadedPath])` en error de creación | Usuario autenticado, **NO service_role**. Limpieza por path de un archivo recién creado y aún sin post confirmado. Política Storage `held` puede impedir DELETE de rutas reservadas; conservar fail closed |
| `src/services/communityService.ts`, `createCommunityPost` | `community-post-photos` | `upload` con path `communityId/user.id/randomUUID.ext`, `upsert:false`; `remove([storagePath])` tras fallo | Auth, path nuevo. Debe seguir siendo un flujo de limpieza de nueva subida, no un ejecutor de purga moderada |
| `src/services/communityService.ts`, `deleteCommunityPost` | `community-post-photos` | DELETE de fila y después `remove([post.photoStoragePath])` | Borrado voluntario por Auth, no `service_role`. Si hay un `held`, RLS restrictiva de Storage protege la ruta mientras el claim siga retenido. **No confundir con purge D3-A** |
| `src/features/moderation/F14VersionProbe.tsx` | `post-photos` | Prueba opt-in en Preview, path `f14-version-probe-UUID.png`, SDK `remove([{path,versionId}])` | **Únicamente píxel sintético**, QA aprobada por PO, no backend privilegiado ni dato real; no repetir |

## Buckets fuera de D3-A (no deben introducirse en su ledger)

| Código | Bucket/tipo | Motivo |
|---|---|---|
| `src/services/petService.ts` | Avatar mascota, bucket configurado por `AVATAR_BUCKET` | Los perfiles no están en la purga D3-A de fotografías de publicaciones |
| `src/services/communityService.ts`, `replaceCommunityImage` | `community-avatars` | Tiene subida/limpieza de portadas, pero fuera de los dos buckets protegidos |
| `src/services/documentService.ts` | `DOCUMENT_BUCKET` / documentos privados | Categoría sensible con ciclo de vida separado; jamás incluir en purge F14 de publicaciones |

## Servicios privilegiados actualmente conocidos

- `src/services/supabaseClient.ts` crea el SDK cliente normal desde configuración pública; no evidencia de clave `service_role` en los flujos de subida enumerados.
- `supabase/functions/f14-moderation-purge/index.ts`: stub sin operación de borrado, Edge alojada sigue devolviendo **HTTP 503**.
- `paypal-webhook`: no contiene acceso Storage según inspección previa del backend Edge desplegado.
- La RPC `f14_get_media_claim_evidence` devuelve únicamente evidencia candidata y `mayDelete:false`. No realiza HTTP.
- **NO comprobado desde GitHub/Supabase:** claves `service_role` utilizadas por terceros, paneles administrativos, scripts externos, otros proyectos, administradores o llamadas directas a Storage HTTP. Este vacío impide garantizar exclusión global.

## Reglas para la futura frontera de escritores

1. Nunca conceder `service_role` al navegador ni usarlo para cargas normales.
2. Todas las rutas/versions de escrituras privilegiadas en `post-photos` y `community-post-photos` **deben** pasar por un servicio que posea la generación/fence vigente antes de invocar Storage. Una tabla de Postgres **no impide** un HTTP directo que evade ese servicio.
3. El esquema propuesto `20261009_privileged_attempt_ledger_PROPOSAL_ONLY.sql` es privado, sin API/grants, con unicidad de ruta/claim, generación y enlace compuesto entre `active_operation_id,bucket,object_path`. **NO está aplicado.**
4. Si el inventario externo no puede verificarse, mantener `f14-moderation-purge` HTTP 503, evitar `purged`, reintentos automáticos o liberación de `held` por expiración.
5. Probar posteriormente cambios Auth RLS, escritor service_role concurrente, reintento, timeout, versión exacta y caché, **solo con objetos sintéticos** y con gate/permiso de backend aplicable.

El inventario es evidencia parcial de código; no sustituye auditoría de llaves, despliegues y accesos externos.
